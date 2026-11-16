// 密码库（KeePass 格式）。
// server 模式：KDBX 由本机 Node 服务解密（/api/vault/*），主密码只发给本机服务；
// browser 模式：kdbxweb + hash-wasm 在浏览器内加解密，库文件只存本地/配置同步组。
const BROWSER_MODE = typeof window !== 'undefined' && window.ZB_HOST?.vaultMode === 'browser';
const TOKEN = window.__LOCAL_TOKEN__;
const APP_ID = 'zip-browser';
const VAULT_KEY = '/vault';
const LOCAL_KEY = 'zip-browser:vault:v1';
// 缺省解压密码：与密码库无关，独立存于同一本地仓库 + localStorage 兜底。明文保存，仅本机只读工具使用。
const DEF_KEY = '/defaultPassword';
const DEF_LOCAL = 'zip-browser:defaultpw:v1';

let repo = null;
let vaultData = null;        // base64 字符串，null 表示还没有库
let sessionId = null;        // server 模式的会话
let db = null;               // browser 模式已解锁的 Kdbx 实例
let entries = [];
let autoLockTimer = null;
let stateCb = null;
let pickerResolve = null;    // openVaultForPassword 的回调
let defaultPassword = null;  // 缺省解压密码（明文，本地）

function apiUrlOf(url) {
  return typeof window !== 'undefined' && window.ZB ? window.ZB.url(url) : String(url || '');
}

function authHeaders() {
  if (typeof window !== 'undefined' && window.ZB_HOST?.auth === 'bearer') {
    const token = localStorage.getItem('zb-token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
  return { 'X-Local-Token': TOKEN };
}

function fpFor(abs) {
  try {
    return 'fp:' + btoa(unescape(encodeURIComponent(String(abs))));
  } catch {
    return 'fp:' + String(abs);
  }
}

function readLocal() {
  try { return localStorage.getItem(LOCAL_KEY); } catch { return null; }
}
function writeLocal(value) {
  try {
    if (value == null) localStorage.removeItem(LOCAL_KEY);
    else localStorage.setItem(LOCAL_KEY, value);
  } catch { /* 隐私模式：仍有内存态 */ }
}
function writeRepo(value) {
  if (!repo || typeof repo.setConfig !== 'function') return;
  try {
    if (value == null) repo.removeConfig?.(VAULT_KEY);
    else repo.setConfig(VAULT_KEY, value);
  } catch { /* 降级 localStorage */ }
}
function persist() {
  writeLocal(vaultData);
  writeRepo(vaultData);
}

async function callApi(path, body) {
  const resp = await fetch(apiUrlOf(path), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    credentials: typeof window !== 'undefined' && window.ZB_HOST?.auth === 'bearer' ? 'same-origin' : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data.error || `HTTP ${resp.status}`);
  return data;
}

// ---- browser 模式：kdbxweb + hash-wasm（按需加载，standalone 不付这份体积） ----

let kdbxLoading = null;
function loadScriptOnce(name) {
  if (!kdbxLoading) kdbxLoading = {};
  if (!kdbxLoading[name]) {
    kdbxLoading[name] = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = typeof window !== 'undefined' && window.ZB ? window.ZB.url(`/vendor/${name}`) : `vendor/${name}`;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`${name} 加载失败`));
      document.head.appendChild(script);
    });
  }
  return kdbxLoading[name];
}

async function ensureKdbx() {
  if (!window.kdbxweb) await loadScriptOnce('kdbxweb.js');
  if (!window.hashwasm) await loadScriptOnce('hash-wasm.js').catch(() => {});
  const lib = window.kdbxweb;
  if (!lib || typeof lib.Kdbx !== 'function') throw new Error('kdbxweb 未加载，无法读写密码库');
  return lib;
}

let argon2Ready = false;
function setupArgon2(lib) {
  if (argon2Ready) return;
  const hw = window.hashwasm;
  if (!hw) return; // KDBX3 不需要 argon2；KDBX4 缺 hash-wasm 会在保存时报错
  lib.CryptoEngine.setArgon2Impl((password, salt, memory, iterations, length, parallelism, type) => {
    const fns = { 0: hw.argon2d, 1: hw.argon2i, 2: hw.argon2id };
    const fn = fns[type] || hw.argon2id;
    return fn({
      password: new Uint8Array(password),
      salt: new Uint8Array(salt),
      parallelism,
      iterations,
      memorySize: memory,
      hashLength: length,
      outputType: 'binary',
    });
  });
  argon2Ready = true;
}

function bytesToBase64(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode.apply(null, bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

function base64ToBytes(text) {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
}

function fieldText(entry, key) {
  const value = entry.fields.get(key);
  if (value == null) return '';
  return typeof value.getText === 'function' ? value.getText() : String(value);
}

function fieldPassword(entry) {
  const value = entry.fields.get('Password');
  if (value == null) return '';
  return typeof value.getText === 'function' ? value.getText() : String(value);
}

function entryId(entry) {
  const uuid = entry.uuid;
  if (!uuid) return Math.random().toString(36).slice(2);
  if (typeof uuid === 'string') return uuid;
  if (typeof uuid.toString === 'function') return uuid.toString();
  return Math.random().toString(36).slice(2);
}

function collectEntries() {
  entries = [];
  if (!db) return entries;
  for (const entry of db.groups[0].entries) {
    entries.push({
      id: entryId(entry),
      title: fieldText(entry, 'Title'),
      username: fieldText(entry, 'UserName'),
      url: fieldText(entry, 'URL'),
      ref: entry,
    });
  }
  return entries;
}

function credentialsFor(lib, master) {
  // kdbxweb 2.x 的构造函数接受 ProtectedValue；老版本示例里的 Credentials.createPassword 并不存在。
  return new lib.KdbxCredentials(lib.ProtectedValue.fromString(String(master)));
}

async function saveDb() {
  if (!db) throw new Error('密码库未解锁');
  const buffer = await db.save();
  vaultData = bytesToBase64(buffer);
  persist();
}

function snapshot() {
  return {
    hasVault: !!vaultData,
    locked: BROWSER_MODE ? !db : !sessionId,
    entries: entries.map((e) => ({ id: e.id, title: e.title, username: e.username, url: e.url })),
  };
}
function notify() {
  if (stateCb) stateCb(snapshot());
  renderVault();
}

function startAutoLock() {
  stopAutoLock();
  autoLockTimer = setTimeout(() => lock(), 15 * 60 * 1000);
}
function stopAutoLock() {
  if (autoLockTimer) { clearTimeout(autoLockTimer); autoLockTimer = null; }
}
function scheduleLockOnHide() {
  const unlocked = BROWSER_MODE ? db : sessionId;
  if (document.visibilityState === 'hidden' && unlocked) {
    autoLockTimer = setTimeout(() => lock(), 60 * 1000);
  }
}

// ---- 对外状态操作 ----

export async function initVault(onState) {
  stateCb = onState;
  const lib = window.ZenFSConfig;
  if (lib && typeof lib.createConfigRepo === 'function') {
    try { repo = await lib.createConfigRepo(APP_ID); } catch { repo = null; }
  }
  vaultData = readLocal();
  if (repo && !vaultData) {
    try {
      const r = repo.getConfig(VAULT_KEY);
      if (typeof r === 'string') { vaultData = r; writeLocal(vaultData); }
    } catch { /* 没有就保持 null */ }
  }
  defaultPassword = readLocalDef();
  if (repo && !defaultPassword) {
    try {
      const r = repo.getConfig(DEF_KEY);
      if (typeof r === 'string') { defaultPassword = r; writeLocalDef(defaultPassword); }
    } catch { /* 没有就保持 null */ }
  }
  document.addEventListener('visibilitychange', scheduleLockOnHide);
  window.addEventListener('beforeunload', () => {
    if (BROWSER_MODE ? db : sessionId) lock();
  });
  notify();
  updateDefPwButton();
  return snapshot();
}

export async function createVault(master) {
  if (BROWSER_MODE) {
    const lib = await ensureKdbx();
    setupArgon2(lib);
    db = lib.Kdbx.create(credentialsFor(lib, master), 'zip-browser');
    entries = [];
    await saveDb();
    startAutoLock();
    notify();
    return true;
  }
  const res = await callApi('/api/vault/create', { master });
  vaultData = res.data;
  sessionId = res.sessionId;
  entries = res.entries || [];
  persist();
  startAutoLock();
  notify();
  return true;
}

export async function unlockVault(master) {
  if (!vaultData) throw new Error('还没有密码库');
  if (BROWSER_MODE) {
    const lib = await ensureKdbx();
    setupArgon2(lib);
    try {
      db = await lib.Kdbx.load(base64ToBytes(vaultData), credentialsFor(lib, master));
    } catch {
      db = null;
      entries = [];
      throw new Error('主密码不正确，或库文件已损坏');
    }
    collectEntries();
    startAutoLock();
    notify();
    return true;
  }
  const res = await callApi('/api/vault/unlock', { data: vaultData, master });
  sessionId = res.sessionId;
  entries = res.entries || [];
  startAutoLock();
  notify();
  return true;
}

export function lock() {
  if (!BROWSER_MODE && sessionId) {
    callApi('/api/vault/lock', { sessionId }).catch(() => {});
  }
  sessionId = null;
  db = null;
  entries = [];
  stopAutoLock();
  notify();
}

export async function refreshEntries() {
  if (BROWSER_MODE) {
    if (!db) return entries;
    collectEntries();
    notify();
    return entries;
  }
  if (!sessionId) return entries;
  const res = await callApi('/api/vault/entries', { sessionId });
  entries = res.entries || [];
  notify();
  return entries;
}

export async function saveZipPassword(abs, name, password) {
  if (BROWSER_MODE) {
    if (!db) return false;
    const lib = await ensureKdbx();
    setupArgon2(lib);
    const fingerprint = fpFor(abs);
    const hit = db.groups[0].entries.find((entry) => fieldText(entry, 'UserName') === fingerprint);
    const entry = hit || db.createEntry(db.groups[0]);
    entry.fields.set('Title', name);
    entry.fields.set('UserName', fingerprint);
    entry.fields.set('URL', abs);
    entry.fields.set('Password', lib.ProtectedValue.fromString(password));
    await saveDb();
    collectEntries();
    notify();
    return true;
  }
  if (!sessionId) return false;
  const res = await callApi('/api/vault/save', {
    sessionId,
    entry: { title: name, username: fpFor(abs), password, url: abs },
  });
  vaultData = res.data;
  persist();
  await refreshEntries();
  return true;
}

export function findPasswordByPath(abs) {
  const unlocked = BROWSER_MODE ? db : sessionId;
  if (!unlocked) return null;
  const fp = fpFor(abs);
  const hit = entries.find((e) => e.username === fp);
  return hit ? hit.id : null;
}

export async function getPassword(entryId) {
  if (BROWSER_MODE) {
    const hit = entries.find((entry) => entry.id === entryId);
    if (!hit || !hit.ref) throw new Error('条目不存在');
    return fieldPassword(hit.ref);
  }
  const res = await callApi('/api/vault/password', { sessionId, entryId });
  return res.password;
}

async function removeEntry(id) {
  if (!BROWSER_MODE || !db) return;
  const index = db.groups[0].entries.findIndex((entry) => entryId(entry) === id);
  if (index < 0) return;
  db.groups[0].entries.splice(index, 1);
  await saveDb();
  collectEntries();
  notify();
}

// 打开密码库并让用户挑一个密码，挑选后调用 resolve(password)。
export function openVaultForPassword(resolve) {
  pickerResolve = resolve;
  showVaultModal(true);
}

// 单纯打开密码库面板（非挑选模式），用于顶栏「密码库」按钮。
export function openVault() {
  showVaultModal(false);
}

// 供缩略图封面等场景读取当前密码库会话 id（未解锁或浏览器模式返回 null）。
export function getVaultSessionId() {
  return BROWSER_MODE ? null : sessionId;
}

// ---- 缺省解压密码（独立于密码库） ----

function readLocalDef() {
  try { return localStorage.getItem(DEF_LOCAL); } catch { return null; }
}
function writeLocalDef(value) {
  try {
    if (value == null) localStorage.removeItem(DEF_LOCAL);
    else localStorage.setItem(DEF_LOCAL, value);
  } catch { /* 隐私模式 */ }
}
function writeRepoDef(value) {
  if (!repo || typeof repo.setConfig !== 'function') return;
  try {
    if (value == null) repo.removeConfig?.(DEF_KEY);
    else repo.setConfig(DEF_KEY, value);
  } catch { /* 降级 localStorage */ }
}
function persistDef() {
  writeLocalDef(defaultPassword);
  writeRepoDef(defaultPassword);
}
export function getDefaultPassword() {
  return defaultPassword;
}
export async function setDefaultPassword(pw) {
  defaultPassword = pw || null;
  persistDef();
  updateDefPwButton();
  return true;
}
export async function clearDefaultPassword() {
  return setDefaultPassword(null);
}
export function openDefaultPasswordModal() {
  showDefPwModal();
}
function updateDefPwButton() {
  const btn = document.getElementById('defPwBtn');
  if (!btn) return;
  if (defaultPassword) {
    btn.textContent = '缺省密码✓';
    btn.title = '已设置缺省解压密码：打开不知道密码的加密压缩包时会先用它尝试';
  } else {
    btn.textContent = '缺省密码';
    btn.title = '设置缺省解压密码：打开不知道密码的加密压缩包时会先用它尝试';
  }
}

// ---- UI ----

let modalEl = null;
let bodyEl = null;
let titleEl = null;
let hintEl = null;
let pickerMode = false;

function ensureModal() {
  if (modalEl) return;
  modalEl = document.getElementById('vaultModal');
  bodyEl = document.getElementById('vaultBody');
  titleEl = document.getElementById('vaultTitle');
  hintEl = document.getElementById('vaultHint');
  document.getElementById('vaultClose').addEventListener('click', closeVaultModal);
  modalEl.addEventListener('click', (e) => { if (e.target === modalEl) closeVaultModal(); });
}

function showVaultModal(picker = false) {
  ensureModal();
  pickerMode = picker;
  modalEl.classList.remove('hidden');
  renderVault();
}
function closeVaultModal() {
  modalEl.classList.add('hidden');
  pickerMode = false;
  if (pickerResolve) { pickerResolve = null; }
}

// ---- 缺省密码弹窗 ----

let defPwModalEl = null;
function ensureDefPwModal() {
  if (defPwModalEl) return;
  defPwModalEl = document.getElementById('defPwModal');
  document.getElementById('defPwClose').addEventListener('click', closeDefPwModal);
  defPwModalEl.addEventListener('click', (e) => { if (e.target === defPwModalEl) closeDefPwModal(); });
  document.getElementById('defPwSave').addEventListener('click', async () => {
    const inp = document.getElementById('defPwInput');
    const err = document.getElementById('defPwError');
    const pw = inp.value;
    if (!pw) { err.textContent = '请输入密码，或点「清除」去掉缺省密码'; return; }
    await setDefaultPassword(pw);
    closeDefPwModal();
  });
  document.getElementById('defPwClear').addEventListener('click', async () => {
    await clearDefaultPassword();
    closeDefPwModal();
  });
  const show = document.getElementById('defPwShow');
  show.addEventListener('change', () => {
    document.getElementById('defPwInput').type = show.checked ? 'text' : 'password';
  });
}
function showDefPwModal() {
  ensureDefPwModal();
  updateDefPwButton();
  const inp = document.getElementById('defPwInput');
  inp.value = '';
  const show = document.getElementById('defPwShow');
  show.checked = false;
  inp.type = 'password';
  document.getElementById('defPwError').textContent = defaultPassword
    ? '当前已设置缺省密码（输入新值可覆盖，或点「清除」去掉）。'
    : '';
  defPwModalEl.classList.remove('hidden');
  inp.focus();
}
function closeDefPwModal() {
  defPwModalEl.classList.add('hidden');
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function renderVault() {
  if (!bodyEl) return;
  const st = snapshot();
  if (!st.hasVault) {
    titleEl.textContent = '创建密码库';
    hintEl.textContent = '设置一个主密码，以后所有 zip 密码都保存在这个 KeePass 格式的库里（存于 zen-fs-config，可随后端同步）。';
    bodyEl.innerHTML = `
      <input id="vaultMaster" type="password" placeholder="设置主密码" autocomplete="new-password">
      <input id="vaultConfirm" type="password" placeholder="再次输入主密码" autocomplete="new-password">
      <div id="vaultError" class="modal-error"></div>
      <div class="modal-actions inline">
        <button id="vaultCreate" type="button" class="primary">创建</button>
      </div>`;
    document.getElementById('vaultCreate').addEventListener('click', async () => {
      const m = document.getElementById('vaultMaster').value;
      const c = document.getElementById('vaultConfirm').value;
      const err = document.getElementById('vaultError');
      if (m.length < 4) { err.textContent = '主密码至少 4 位'; return; }
      if (m !== c) { err.textContent = '两次输入不一致'; return; }
      err.textContent = '正在创建…';
      try { await createVault(m); if (pickerMode) renderVault(); }
      catch (e) { err.textContent = e.message; }
    });
    return;
  }
  if (st.locked) {
    titleEl.textContent = '解锁密码库';
    hintEl.textContent = '输入主密码解锁。解锁后可以从库里挑选 zip 密码。';
    bodyEl.innerHTML = `
      <input id="vaultMaster" type="password" placeholder="主密码" autocomplete="off">
      <div id="vaultError" class="modal-error"></div>
      <div class="modal-actions inline">
        <button id="vaultUnlock" type="button" class="primary">解锁</button>
      </div>`;
    const inp = document.getElementById('vaultMaster');
    inp.focus();
    const doUnlock = async () => {
      const err = document.getElementById('vaultError');
      err.textContent = '正在解锁…';
      try { await unlockVault(inp.value); if (pickerMode) renderVault(); }
      catch (e) { err.textContent = e.message; }
    };
    document.getElementById('vaultUnlock').addEventListener('click', doUnlock);
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') doUnlock(); });
    return;
  }
  // 已解锁：列出条目
  titleEl.textContent = pickerMode ? '从密码库选择密码' : '密码库';
  hintEl.textContent = pickerMode
    ? '点击「使用」把对应密码填入当前加密压缩包。'
    : `已解锁 · 共 ${st.entries.length} 条记录（主密码不会保存，15 分钟或切到后台后自动锁定）。`;
  const rows = st.entries.length
    ? st.entries.map((e) => `
      <div class="vault-entry">
        <div class="vault-entry-main">
          <span class="vault-entry-title">${esc(e.title || '(未命名)')}</span>
          <span class="vault-entry-meta">${esc(e.url || '')}</span>
        </div>
        <div class="vault-entry-actions">
          ${pickerMode ? `<button type="button" class="vault-use" data-id="${esc(e.id)}">使用</button>` : ''}
          <button type="button" class="vault-del" data-id="${esc(e.id)}" title="删除">✕</button>
        </div>
      </div>`).join('')
    : '<div class="vault-empty">还没有任何记录。解密 zip 成功后会自动保存。</div>';
  bodyEl.innerHTML = `
    <div class="vault-list">${rows}</div>
    <div class="modal-actions inline">
      <button id="vaultLock" type="button">锁定</button>
    </div>`;
  document.getElementById('vaultLock').addEventListener('click', () => lock());
  bodyEl.querySelectorAll('.vault-use').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      try {
        const pw = await getPassword(id);
        const resolve = pickerResolve;
        closeVaultModal();
        if (resolve) resolve(pw);
      } catch (e) { /* 忽略 */ }
    });
  });
  bodyEl.querySelectorAll('.vault-del').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        if (BROWSER_MODE) {
          await removeEntry(btn.dataset.id);
        } else {
          const res = await callApi('/api/vault/delete', { sessionId, entryId: btn.dataset.id });
          vaultData = res.data;
          persist();
          await refreshEntries();
        }
      } catch (e) { /* 忽略 */ }
    });
  });
}
