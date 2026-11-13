// 密码库（KeePass 风格）：状态管理 + zen-fs-config 持久化 + 服务端 /api/vault/* 调用 + 弹窗 UI。
// 加密 zip 的密码从这里挑；解锁后自动把用过的密码按 zip 路径指纹存进库。
// 注意：KDBX 加解密在服务端完成（kdbxweb+hash-wasm），主密码只在「解锁」时一次性发给本机服务。

const TOKEN = window.__LOCAL_TOKEN__;
const APP_ID = 'zip-browser';
const VAULT_KEY = '/vault';
const LOCAL_KEY = 'zip-browser:vault:v1';
// 缺省解压密码：与密码库无关，独立存于同一本地仓库 + localStorage 兜底。明文保存，仅本机只读工具使用。
const DEF_KEY = '/defaultPassword';
const DEF_LOCAL = 'zip-browser:defaultpw:v1';

let repo = null;
let vaultData = null;        // base64 字符串，null 表示还没有库
let sessionId = null;
let entries = [];
let autoLockTimer = null;
let stateCb = null;
let pickerResolve = null;    // openVaultForPassword 的回调
let defaultPassword = null;  // 缺省解压密码（明文，本地）

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
  const resp = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Local-Token': TOKEN },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data.error || `HTTP ${resp.status}`);
  return data;
}

function snapshot() {
  return {
    hasVault: !!vaultData,
    locked: !sessionId,
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
  if (document.visibilityState === 'hidden' && sessionId) {
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
  window.addEventListener('beforeunload', () => { if (sessionId) lock(); });
  notify();
  updateDefPwButton();
  return snapshot();
}

export async function createVault(master) {
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
  const res = await callApi('/api/vault/unlock', { data: vaultData, master });
  sessionId = res.sessionId;
  entries = res.entries || [];
  startAutoLock();
  notify();
  return true;
}

export function lock() {
  if (sessionId) {
    callApi('/api/vault/lock', { sessionId }).catch(() => {});
  }
  sessionId = null;
  entries = [];
  stopAutoLock();
  notify();
}

export async function refreshEntries() {
  if (!sessionId) return entries;
  const res = await callApi('/api/vault/entries', { sessionId });
  entries = res.entries || [];
  notify();
  return entries;
}

export async function saveZipPassword(abs, name, password) {
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
  if (!sessionId) return null;
  const fp = fpFor(abs);
  const hit = entries.find((e) => e.username === fp);
  return hit ? hit.id : null;
}

export async function getPassword(entryId) {
  const res = await callApi('/api/vault/password', { sessionId, entryId });
  return res.password;
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

// 供缩略图封面等场景读取当前密码库会话 id（未解锁返回 null）。
export function getVaultSessionId() {
  return sessionId;
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
        const res = await callApi('/api/vault/delete', { sessionId, entryId: btn.dataset.id });
        vaultData = res.data;
        persist();
        await refreshEntries();
      } catch (e) { /* 忽略 */ }
    });
  });
}
