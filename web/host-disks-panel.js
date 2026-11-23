// 「主机磁盘」面板 UI 层：读 RS 遥测 → 读清单卷 → 读手工 SN 映射 → 归并 → 三视图展示 → 写回。
import { getConnectedFs, getRsCredentials, getActiveDataGroup, fetchLocalHostInfo } from './manifest-sync.js';
const getManifestFs = getConnectedFs;
import { collectVolumes } from './manifest-volume-import.js';
import { fetchUfsNodesRaw, normalizeUfsNodes, getLastReadDiagnostic } from './ufs-nodes-reader.js';
import { mergeHostsWithVolumes, buildHostDiskDocument, buildHostTree } from './host-disk-merge.js';
import {
  createDeviceRegistryStore, mappingBySerial, listVolumeMappings,
  hostAliasIndex, listHostAliases, diskAliasIndex, listDiskAliases,
} from './device-registry-store.js';
import { invalidateHostDisksDoc, readHostDisksFrom, readHideNoDisk, writeHideNoDisk, HOST_DISKS_V2_PATH, HOST_DISKS_MIRROR_PATH, attachVolumeAliases } from './host-disks-browser.js';

const $ = (id) => document.getElementById(id);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

// 写回主路径用 v2：旧的 host-disks.json 已被同步组记成"删除过"，继续往它写会不断被同步删掉。
const HOST_DISK_PATH = HOST_DISKS_V2_PATH;
const HOST_DISK_MIRROR_PATH = HOST_DISKS_MIRROR_PATH;

/** 折叠状态（跨重新读取保留）：vol:<volumeId> / host:<hostId> / disk:<hostId>:<serial> / orphan */
const collapsedKeys = new Set();
const foldKey = (prefix, id) => `${prefix}:${id}`;
const foldAttrs = (key) => `data-hd-key="${esc(key)}"${collapsedKeys.has(key) ? '' : ' open'}`;

let currentMerge = null;
let currentDoc = null;
let currentTree = null;
let currentView = 'volumes';
let currentRaw = [];
let volumesCache = [];
/** /api/hostinfo 的本机卷身份：{ host, volumes: { C: '<volumeId>' } }。读不到时为 null。 */
let localHostInfo = null;
let localHostError = '';
const registry = createDeviceRegistryStore();

/** 「隐藏无磁盘的主机」开关，与虚拟挂载点共用同一份设置（见 host-disks-browser.js）。 */
let hideNoDiskHosts = readHideNoDisk();
function setHideNoDisk(on) {
  hideNoDiskHosts = !!on;
  writeHideNoDisk(hideNoDiskHosts);
}

function setStatus(text, ok = null) {
  const el = $('hdStatus');
  if (!el) return;
  el.textContent = text;
  el.dataset.state = ok === true ? 'ok' : ok === false ? 'bad' : 'idle';
}
function setError(text) {
  const el = $('hdError');
  if (el) el.textContent = text || '';
}
function setMapError(text) {
  const el = $('hdMapError');
  if (el) el.textContent = text || '';
}
function setHostAliasError(text) {
  const el = $('hdHostAliasError');
  if (el) el.textContent = text || '';
}
function setDiskAliasError(text) {
  const el = $('hdDiskAliasError');
  if (el) el.textContent = text || '';
}

/** 读取清单卷（复用 manifest-volume-import 的解析，读同一数据组 struct/）。 */
async function loadVolumes() {
  const connected = getManifestFs();
  if (!connected) throw new Error('同步组未连接：请先在「同步收藏」面板连接一个含远端后端的同步组');
  const { fp, pathFor } = connected;
  let names = [];
  try { names = await fp.readdir(pathFor('struct')); } catch (e) {
    throw new Error(`读取 struct/ 失败：${e?.message || e}`);
  }
  const docs = [];
  for (const name of (Array.isArray(names) ? names : []).map(String).filter((n) => /\.json$/i.test(n))) {
    try {
      const raw = JSON.parse(await fp.readFile(pathFor(`struct/${name}`), 'utf8'));
      if (raw && typeof raw === 'object') docs.push({ base: name.replace(/\.json$/i, ''), raw });
    } catch { /* 单文件跳过 */ }
  }
  return collectVolumes(docs);
}

const MATCH_BADGE = {
  'manual-sn': '<span class="hd-match hd-match-manual">手工 SN 映射</span>',
  'manual-sn-unverified': '<span class="hd-match hd-match-part">手工映射 · 遥测未见</span>',
  'local-volume-id': '<span class="hd-match hd-match-ok">本机卷 ID</span>',
  'local-only': '<span class="hd-match hd-match-part">本机卷 · 清单未见</span>',
  'host+drive': '<span class="hd-match hd-match-ok">主机名+盘符</span>',
  'host-only': '<span class="hd-match hd-match-part">仅主机名</span>',
  unmatched: '<span class="hd-match hd-match-none">未关联</span>',
};

function rowCard(r) {
  const badge = MATCH_BADGE[r.matchBy] || MATCH_BADGE.unmatched;
  const t = r.telemetry;
  // 本机读到的卷 ID 与清单 volumeId 不一致时单独标出来：两个都是同一块盘的身份，不能丢。
  const localId = r.localVolumeId && r.localVolumeId !== r.volumeId ? `本机卷 ID ${r.localVolumeId}` : null;
  const meta = t
    ? [t.hostname || t.deviceName, t.serial ? `SN ${t.serial}` : null,
       t.volumeName, t.sizeGB != null ? `容量 ${t.sizeGB} GB` : null,
       t.freeSpaceGB != null ? `剩余 ${t.freeSpaceGB} GB` : null,
       t.health ? `SMART ${t.health}` : null, localId].filter(Boolean).map(esc).join(' · ')
    : (r.localOnly
      ? `本机卷 ID ${esc(r.localVolumeId || r.volumeId)} · 本机磁盘还没导出清单，文件列表未知`
      : (r.manualSerial ? `映射 SN ${esc(r.manualSerial)} · （遥测无记录）` : '（遥测无匹配记录）'));
  const key = foldKey('vol', r.volumeId);
  return `<details class="hd-item hd-fold" ${foldAttrs(key)}>
    <summary class="hd-item-title"><code>${esc(r.volumeId)}</code>${r.drive ? ` · <span class="mv-drive">${esc(r.drive)}</span>` : ''} ${badge}</summary>
    <div class="hd-item-meta">${meta}</div>
  </details>`;
}

function renderVolumes() {
  const list = $('hdList');
  const cand = $('hdCandidates');
  const summary = $('hdCandSummary');
  if (!currentMerge) {
    if (list) list.innerHTML = '';
    if (cand) cand.innerHTML = '';
    if (summary) summary.textContent = '设备身份注册表候选（0）';
    return;
  }
  if (list) {
    list.innerHTML = currentMerge.rows.length
      ? currentMerge.rows.map(rowCard).join('')
      : '<div class="dc-empty">没有读到卷清单。请先在「同步收藏」导出目录结构清单 v2。</div>';
  }
  if (summary) summary.textContent = `设备身份注册表候选（${currentMerge.candidates.length}）`;
  if (cand) {
    cand.innerHTML = currentMerge.candidates.length
      ? currentMerge.candidates.map((c) => `<div class="hd-cand">
          <div class="hd-cand-id">${esc(c.canonicalId)} <span class="hd-conf">${esc(c.confidence)} · ${esc(c.evidence)}${c.confirmed ? ' · 已确认' : ''}</span></div>
          <div class="hd-cand-aliases">${c.aliases.map((a) => `<span class="hd-alias"><b>${esc(a.kind)}</b> ${esc(a.value)}</span>`).join('')}</div>
          <button type="button" class="dc-mini hd-cand-adopt" data-volume="${esc(c.canonicalId)}" data-serial="${esc(c.aliases.find((a) => a.kind === 'serial')?.value || '')}" ${c.aliases.some((a) => a.kind === 'serial') && !c.confirmed ? '' : 'disabled'}>采纳为 SN 映射</button>
        </div>`).join('')
      : '<div class="dc-empty">无可生成的候选。需先有关联上的卷。</div>';
  }
}

/** RS 读取诊断：直接展示列目录/读文件/分类结果，定位「只有卷没有主机」断在哪一步。 */
function diagnosticHtml() {
  const d = getLastReadDiagnostic();
  if (!d) return '<div class="hd-unassigned">尚未读取 RS 遥测。点右上角「重新读取」。</div>';
  const kinds = {};
  for (const f of d.files) kinds[f.kind || 'unparsed'] = (kinds[f.kind || 'unparsed'] || 0) + 1;
  const summary = `RS 诊断 · ${esc(d.href || '(无 href)')} · 尝试 ${d.attempts.length} 个目录 · 枚举 ${d.files.length} 个 JSON · 解析成功 ${d.rawCount} 份 · 分类 ${Object.entries(kinds).map(([k, v]) => `${k}:${v}`).join(' / ') || '—'}`;
  const attempts = d.attempts.map((a) => `<div class="hd-unassigned">${esc(a.dir)} → ${a.error ? `失败 ${esc(a.error)}` : `${a.count ?? '?'} 项${a.sample?.length ? `（${a.sample.map(esc).join('、')}）` : ''}`}</div>`).join('');
  const files = d.files.slice(0, 30).map((f) => `<div class="hd-unassigned">${esc(f.name)} → ${esc(f.kind || '解析失败')}${f.identity ? ` · ${esc(f.identity)}` : ''}${f.hostname ? ` · ${esc(f.hostname)}` : ''}${f.readError ? ` · 读取失败 ${esc(f.readError)}` : ''}${f.parseError ? ` · ${esc(f.parseError)} · 头 ${esc(f.head || '')}` : ''}</div>`).join('');
  const hint = d.rawCount === 0
    ? '<div class="hd-unassigned">解析成功 0 份：凭据或路径不对，或该目录没有 JSON。看上面目录尝试结果。</div>'
    : (!kinds.detail && !kinds.heartbeat && !kinds.disk
      ? '<div class="hd-unassigned">有 JSON 但没有主机明细/心跳/SMART：说明这些文件不是 ufs-nodes 遥测格式。</div>'
      : '');
  const rawPreview = currentRaw.length
    ? `<details class="hd-candidates-wrap"><summary>原始遥测 JSON（前 3 份）</summary><pre class="hd-unassigned">${esc(JSON.stringify(currentRaw.slice(0, 3), null, 2).slice(0, 12000))}</pre></details>`
    : '';
  return `<div class="hd-diag"><div class="hd-unassigned">${summary}</div>${attempts}${files}${hint}${rawPreview}</div>`;
}

function orphanCard(r) {
  const key = foldKey('vol', r.volumeId);
  return `<details class="hd-item hd-fold" ${foldAttrs(key)}>
    <summary class="hd-item-title"><code>${esc(r.volumeId)}</code>${r.drive ? ` · <span class="mv-drive">${esc(r.drive)}</span>` : ''} ${MATCH_BADGE[r.matchBy] || MATCH_BADGE.unmatched}</summary>
    <div class="hd-item-meta">清单卷（其来源主机未在遥测中解析出来）${r.sourceHost ? ` · 来源 ${esc(r.sourceHost)}` : ''}${r.fileCount != null ? ` · 文件 ${esc(r.fileCount)}` : ''}</div>
  </details>`;
}

function renderHosts() {
  const el = $('hdHostList');
  if (!el) return;
  const diag = diagnosticHtml();
  if (!currentTree) { el.innerHTML = diag; return; }
  if (!currentTree.hosts.length && !currentTree.orphans.length) {
    el.innerHTML = `${diag}<div class="dc-empty">遥测主机 0 台，清单卷 0 个。</div>`;
    return;
  }
  // 「隐藏无磁盘的主机」只影响本视图渲染，不改变归并结果与写回内容。
  const allHosts = currentTree.hosts;
  const visibleHosts = hideNoDiskHosts ? allHosts.filter((h) => (h.disks || []).length) : allHosts;
  const hiddenCount = allHosts.length - visibleHosts.length;
  syncHideNoDiskUi(hiddenCount);
  if (!visibleHosts.length && !currentTree.orphans.length) {
    el.innerHTML = `${diag}<div class="dc-empty">${allHosts.length} 台主机都没有磁盘（已按筛选隐藏）。取消勾选可查看。</div>`;
    return;
  }
  const hostHtml = visibleHosts.map((h) => {
    const label = h.hostname || h.deviceName || h.hostId;
    const disks = h.disks.map((d) => {
      const vols = d.volumes.map(rowCard).join('');
      const ids = [d.diskId && d.diskId !== d.serial ? `标识 ${d.diskId}` : null,
        d.diskUuid ? `UUID ${d.diskUuid}` : null,
        (d.aliasIds || []).filter((a) => a !== d.serial && a !== d.diskUuid && a !== d.diskId).length
          ? `别名 ${d.aliasIds.filter((a) => a !== d.serial && a !== d.diskUuid && a !== d.diskId).join('/')}` : null]
        .filter(Boolean).map(esc).join(' · ');
      const smart = [d.model, d.deviceId, ids || null, d.health ? `SMART ${d.health}` : null,
        d.temperature != null ? `${d.temperature}°C` : null].filter(Boolean).map(esc).join(' · ');
      const logical = (d.logicalDisks || []).map((l) => {
        const parts = [l.deviceId, l.volumeName, l.fileSystem,
          l.sizeGB != null ? `容量 ${l.sizeGB} GB` : null,
          l.freeSpaceGB != null ? `剩余 ${l.freeSpaceGB} GB` : null,
          l.usagePercent != null ? `已用 ${l.usagePercent}%` : null].filter(Boolean).map(esc).join(' · ');
        return `<div class="hd-unassigned">${parts}</div>`;
      }).join('');
      const diskKey = foldKey('disk', `${h.hostId}:${d.serial}`);
      return `<details class="hd-disk hd-fold" ${foldAttrs(diskKey)}>
        <summary class="hd-disk-title">磁盘 <code>${esc(d.serial)}</code> <span class="hd-disk-smart">${smart}</span></summary>
        ${logical}
        <div class="hd-disk-vols">${vols || '<div class="hd-unassigned">未关联到清单卷（可在「SN映射」里建立关联）</div>'}</div>
      </details>`;
    }).join('');
    const unassigned = h.unassigned.length
      ? `<details class="hd-disk hd-fold" ${foldAttrs(foldKey('disk', `${h.hostId}:unassigned`))}>
          <summary class="hd-disk-title">未归属到磁盘的卷（${h.unassigned.length}）</summary>
          <div class="hd-disk-vols">${h.unassigned.map(rowCard).join('')}</div>
        </details>`
      : '';
    const online = h.online == null ? '' : ` <span class="hd-match ${h.online ? 'hd-match-ok' : 'hd-match-none'}">${h.online ? '在线' : '离线（无心跳）'}</span>`;
    const localMark = h.local ? ' <span class="hd-match hd-match-ok">本机</span>' : '';
    const hostKey = foldKey('host', h.hostId);
    return `<details class="hd-host hd-fold" ${foldAttrs(hostKey)}>
      <summary class="hd-host-title">${esc(label)}${h.deviceUuid ? ` <span class="hd-host-uuid">${esc(h.deviceUuid)}</span>` : ''}${online}${localMark}</summary>
      ${disks || '<div class="dc-empty">该主机无遥测磁盘</div>'}
      ${unassigned}
    </details>`;
  }).join('');
  const orphanHtml = currentTree.orphans.length
    ? `<details class="hd-host hd-fold" ${foldAttrs('orphan')}><summary class="hd-host-title">未关联遥测的卷（${currentTree.orphans.length}）</summary>${currentTree.orphans.map(orphanCard).join('')}</details>`
    : '';
  const hostCount = `<div class="hd-unassigned">遥测主机 ${allHosts.length} 台 · 未关联卷 ${currentTree.orphans.length} 个${hiddenCount ? ` · 已隐藏无磁盘主机 ${hiddenCount} 台` : ''}</div>`;
  el.innerHTML = hostCount + diag + hostHtml + orphanHtml;
}

/** 让勾选框与提示文字跟当前渲染状态一致（切换/重读后都同步）。 */
function syncHideNoDiskUi(hiddenCount = 0) {
  const box = $('hdHideNoDisk');
  if (box) box.checked = hideNoDiskHosts;
  const hint = $('hdHideNoDiskHint');
  if (hint) hint.textContent = hideNoDiskHosts
    ? `（已隐藏 ${hiddenCount} 台）`
    : '';
}

function renderMappings() {
  const list = $('hdMapList');
  const count = $('hdMapCount');
  const datalist = $('hdMapVolumeOptions');
  const mappings = listVolumeMappings(registry.data);
  if (count) count.textContent = String(mappings.length);
  if (datalist) {
    datalist.innerHTML = volumesCache.map((v) => `<option value="${esc(v.volumeId)}">${esc([v.drive, v.sourceHost, `文件 ${v.fileCount}`].filter(Boolean).join(' · '))}</option>`).join('');
  }
  if (!list) return;
  list.innerHTML = mappings.length
    ? mappings.map((m) => `<div class="hd-map-row">
        <div><code>${esc(m.serial)}</code> → <code>${esc(m.volumeId)}</code>${m.hostname ? ` <span class="hd-host-uuid">${esc(m.hostname)}</span>` : ''}</div>
        <button type="button" class="dc-mini hd-map-del" data-volume="${esc(m.volumeId)}" title="删除这条映射">删除</button>
      </div>`).join('')
    : '<div class="dc-empty">尚无手工映射。填写上方 SN 与 volumeId 添加，或在「按卷」视图的候选里点「采纳为 SN 映射」。</div>';
}

function renderHostAliases() {
  const list = $('hdHostAliasList');
  const count = $('hdHostAliasCount');
  if (count) count.textContent = String(listHostAliases(registry.data).length);
  if (!list) return;
  const datalist = $('hdHostAliasUuidOptions');
  if (datalist) {
    const seen = new Set();
    const uuids = [];
    for (const h of (currentTree?.hosts || [])) {
      for (const u of [h.deviceUuid, ...(h.aliasUuids || [])]) {
        const k = lowerUuid(u);
        if (u && k && !seen.has(k)) { seen.add(k); uuids.push(u); }
      }
    }
    datalist.innerHTML = uuids.map((u) => `<option value="${esc(u)}"></option>`).join('');
  }
  const groups = listHostAliases(registry.data);
  if (!groups.length) {
    list.innerHTML = '<div class="dc-empty">尚无 UUID 归并。同一台主机换 UUID 后，把旧 UUID 归并到新 UUID，主机、磁盘与卷会自动合并显示。</div>';
    return;
  }
  list.innerHTML = groups.map((g) => `<div class="hd-map-row">
    <div>
      <div><span class="hd-unassigned">规范</span> <code>${esc(g.canonicalUuid)}</code></div>
      <div>${g.aliases.map((a) => `<span class="hd-unassigned">别名</span> <code>${esc(a)}</code>`).join('<br>') || '<span class="hd-unassigned">（无别名）</span>'}</div>
      ${g.hostnames.length ? `<div class="hd-host-uuid">${esc(g.hostnames.join(' · '))}</div>` : ''}
    </div>
    <div class="hd-host-alias-actions">${g.aliases.map((a) => `<button type="button" class="dc-mini hd-host-alias-del" data-canonical="${esc(g.canonicalUuid)}" data-alias="${esc(a)}" title="删除这条别名">×</button>`).join('')}</div>
  </div>`).join('');
}

function renderDiskAliases() {
  const list = $('hdDiskAliasList');
  const count = $('hdDiskAliasCount');
  const groups = listDiskAliases(registry.data);
  if (count) count.textContent = String(groups.length);
  if (!list) return;
  const datalist = $('hdDiskAliasIdOptions');
  if (datalist) {
    const seen = new Set();
    const ids = [];
    for (const h of (currentTree?.hosts || [])) {
      for (const d of (h.disks || [])) {
        for (const id of [d.diskId, d.serial, d.diskUuid, ...(d.aliasIds || [])]) {
          const k = lowerUuid(id);
          if (id && k && !seen.has(k)) { seen.add(k); ids.push(id); }
        }
      }
    }
    datalist.innerHTML = ids.map((id) => `<option value="${esc(id)}"></option>`).join('');
  }
  if (!groups.length) {
    list.innerHTML = '<div class="dc-empty">尚无磁盘归并。同一块盘的 SN 与 UUID 指向不同视图时，把别名归并到规范标识，磁盘会自动合并。</div>';
    return;
  }
  list.innerHTML = groups.map((g) => `<div class="hd-map-row">
    <div>
      <div><span class="hd-unassigned">规范</span> <code>${esc(g.canonicalId)}</code>${g.primaryName && g.primaryName !== g.canonicalId ? ` <span class="hd-host-uuid">${esc(g.primaryName)}</span>` : ''}</div>
      <div>${g.aliases.map((a) => `<span class="hd-unassigned">别名 · ${esc(a.kind)}</span> <code>${esc(a.value)}</code>`).join('<br>') || '<span class="hd-unassigned">（无别名）</span>'}</div>
    </div>
    <div class="hd-host-alias-actions">${g.aliases.map((a) => `<button type="button" class="dc-mini hd-host-alias-del hd-disk-alias-del" data-canonical="${esc(g.canonicalId)}" data-alias="${esc(a.value)}" title="删除这条别名">×</button>`).join('')}</div>
  </div>`).join('');
}

function renderStats() {
  const el = $('hdStats');
  if (!el) return;
  if (!currentMerge) { el.textContent = ''; return; }
  const s = currentMerge.stats;
  const local = s.localVolumes
    ? ` · 本机卷 <b>${s.localVolumes}</b>（ID 精确 <b>${s.localMatched}</b>${s.localOnly ? ` · 未入清单 <b>${s.localOnly}</b>` : ''}）`
    : '';
  el.innerHTML = `卷 <b>${s.volumes}</b> · 遥测主机 <b>${s.hosts}</b> · 已关联 <b>${s.matched}</b>（手工 <b>${s.manualMatched}</b>） · 未关联 <b>${s.unmatched}</b>${local}`;
}

/** 本机卷身份：把 /api/hostinfo 读到的「盘符 → volumeId」明明白白列出来，写回文档的 localHost 就是这个。 */
function renderLocalVolumes() {
  const el = $('hdLocalVolumes');
  if (!el) return;
  if (!localHostInfo) {
    el.innerHTML = localHostError
      ? `<div class="hd-unassigned dc-warn">本机卷身份读取失败：${esc(localHostError)}（归并结果里不会有本机卷 ID）</div>`
      : '';
    return;
  }
  const entries = Object.entries(localHostInfo.volumes || {});
  if (!entries.length) {
    el.innerHTML = '<div class="hd-unassigned">本机没有读到卷身份：盘根没有 <code>.dir-struct-id</code>，卷序列号也取不到。</div>';
    return;
  }
  el.innerHTML = `<details class="hd-candidates-wrap"><summary>本机卷身份（${entries.length}） · ${esc(localHostInfo.host || '本机')}</summary>
    ${entries.map(([drive, id]) => `<div class="hd-unassigned">${esc(drive)}: → <code>${esc(id)}</code></div>`).join('')}
  </details>`;
}

function render() {
  renderStats();
  renderLocalVolumes();
  renderVolumes();
  renderHosts();
  renderMappings();
  renderHostAliases();
  renderDiskAliases();
}

function setView(view) {
  currentView = view;
  const views = { volumes: 'Volumes', hosts: 'Hosts', mappings: 'Mappings', hostaliases: 'HostAliases', diskaliases: 'DiskAliases' };
  for (const [v, suffix] of Object.entries(views)) {
    $(`hdView${suffix}`)?.classList.toggle('hidden', v !== view);
    $(`hdTab${suffix}`)?.classList.toggle('active', v === view);
  }
}

/** 重新归并（不重新拉 RS）：映射变化后调用。即使尚无归并数据也要刷新映射列表。 */
function recompute() {
  if (!currentMerge || !volumesCache.length) { renderMappings(); return; }
  const hosts = normalizeUfsNodes(currentRaw).hosts;
  const index = mappingBySerial(registry.data);
  const aliases = hostAliasIndex(registry.data);
  const diskAliases = diskAliasIndex(registry.data);
  currentMerge = mergeHostsWithVolumes(hosts, volumesCache, index, aliases, diskAliases, localHostInfo);
  currentTree = buildHostTree(currentMerge);
  currentDoc = buildHostDiskDocument(currentMerge, 'zip-browser');
  render();
}

async function reload() {
  setError('');
  setStatus('正在读取 RemoteStorage 遥测…');
  try {
    // 本机卷身份先读：/api/hostinfo 不依赖 RS，读不到（如兼容层没有该接口）只降级提示，不阻断归并。
    localHostError = '';
    try {
      localHostInfo = await fetchLocalHostInfo();
    } catch (err) {
      localHostInfo = null;
      localHostError = err?.message || String(err);
    }
    const creds = getRsCredentials();
    if (!creds) {
      throw new Error('未找到 RemoteStorage 凭据：请先在「同步收藏」面板连接一个含 RemoteStorage 后端的同步组');
    }
    const raws = await fetchUfsNodesRaw(creds);
    setStatus(`读到 ${raws.length} 份遥测记录，正在读取清单卷…`);
    currentRaw = raws;
    const { hosts } = normalizeUfsNodes(raws);
    volumesCache = await loadVolumes();
    const index = mappingBySerial(registry.data);
    const aliases = hostAliasIndex(registry.data);
    const diskAliases = diskAliasIndex(registry.data);
    currentMerge = mergeHostsWithVolumes(hosts, volumesCache, index, aliases, diskAliases, localHostInfo);
    currentTree = buildHostTree(currentMerge);
    currentDoc = buildHostDiskDocument(currentMerge, 'zip-browser');
    render();
    const s = currentMerge.stats;
    const local = s.localVolumes
      ? ` · 本机卷 ${s.localVolumes}（ID 精确 ${s.localMatched}${s.localOnly ? ` / 未入清单 ${s.localOnly}` : ''}）`
      : '';
    setStatus(`归并完成：${s.volumes} 卷 / ${s.hosts} 主机 / ${s.matched} 已关联（手工 ${s.manualMatched}）${local}${localHostError ? `｜本机卷身份读取失败：${localHostError}` : ''}`, true);
  } catch (err) {
    currentMerge = null;
    currentDoc = null;
    currentTree = null;
    render();
    setError(err?.message || String(err));
    setStatus('读取/归并失败', false);
  }
}

async function addMapping() {
  setMapError('');
  const serial = $('hdMapSerial')?.value?.trim();
  const volumeId = $('hdMapVolume')?.value?.trim();
  if (!serial || !volumeId) { setMapError('请填写磁盘 SN 与 volumeId'); return; }
  try {
    registry.upsert({ serial, volumeId, hostname: volumesCache.find((v) => v.volumeId === volumeId)?.sourceHost });
    await registry.flush();
    $('hdMapSerial').value = '';
    $('hdMapVolume').value = '';
    recompute();
    setStatus(`已添加映射 SN ${serial} → ${volumeId}`, true);
  } catch (err) {
    setMapError(err?.message || String(err));
  }
}

async function removeMapping(volumeId) {
  setMapError('');
  try {
    registry.remove(volumeId);
    await registry.flush();
    recompute();
    setStatus(`已删除 ${volumeId} 的 SN 映射`, true);
  } catch (err) {
    setMapError(err?.message || String(err));
  }
}

async function addHostAlias() {
  setHostAliasError('');
  const canonicalUuid = $('hdHostAliasCanonical')?.value?.trim();
  const aliasUuid = $('hdHostAliasUuid')?.value?.trim();
  if (!canonicalUuid || !aliasUuid) { setHostAliasError('请填写规范 UUID 与别名 UUID'); return; }
  try {
    const oldHost = currentTree?.hosts?.find((h) => lowerUuid(h.deviceUuid) === lowerUuid(aliasUuid));
    registry.upsertHost({
      canonicalUuid, aliasUuid,
      primaryName: oldHost?.hostname || oldHost?.deviceName || canonicalUuid,
      hostname: oldHost?.hostname || oldHost?.deviceName,
      hostnames: oldHost ? [oldHost.hostname, oldHost.deviceName].filter(Boolean) : [],
    });
    await registry.flush();
    $('hdHostAliasCanonical').value = '';
    $('hdHostAliasUuid').value = '';
    recompute();
    setStatus(`已归并 UUID ${aliasUuid} → ${canonicalUuid}`, true);
  } catch (err) {
    setHostAliasError(err?.message || String(err));
  }
}

async function removeHostAlias(canonicalUuid, aliasUuid) {
  setHostAliasError('');
  try {
    registry.removeHost(canonicalUuid, aliasUuid);
    await registry.flush();
    recompute();
    setStatus(`已删除 UUID 归并 ${aliasUuid}`, true);
  } catch (err) {
    setHostAliasError(err?.message || String(err));
  }
}

async function addDiskAlias() {
  setDiskAliasError('');
  const canonicalId = $('hdDiskAliasCanonical')?.value?.trim();
  const aliasId = $('hdDiskAliasId')?.value?.trim();
  if (!canonicalId || !aliasId) { setDiskAliasError('请填写规范标识与别名标识'); return; }
  try {
    let model = null;
    for (const h of (currentTree?.hosts || [])) {
      const d = (h.disks || []).find((x) => [x.diskId, x.serial, x.diskUuid, ...(x.aliasIds || [])]
        .some((id) => lowerUuid(id) === lowerUuid(aliasId)));
      if (d?.model) { model = d.model; break; }
    }
    registry.upsertDisk({ canonicalId, aliasId, model });
    await registry.flush();
    $('hdDiskAliasCanonical').value = '';
    $('hdDiskAliasId').value = '';
    recompute();
    setStatus(`已归并磁盘标识 ${aliasId} → ${canonicalId}`, true);
  } catch (err) {
    setDiskAliasError(err?.message || String(err));
  }
}

async function removeDiskAlias(canonicalId, aliasId) {
  setDiskAliasError('');
  try {
    registry.removeDisk(canonicalId, aliasId);
    await registry.flush();
    recompute();
    setStatus(`已删除磁盘归并 ${aliasId}`, true);
  } catch (err) {
    setDiskAliasError(err?.message || String(err));
  }
}

function lowerUuid(value) {
  return value == null ? '' : String(value).trim().toLowerCase();
}

/** EEXIST：zenfs 的 errno 文案是 "file already exists"。 */
function isExistsError(err) {
  const msg = String(err?.message || err || '');
  return err?.code === 'EEXIST' || /already exists|EEXIST/i.test(msg);
}

function isDirMode(mode) {
  return typeof mode === 'number' && (mode & 0o170000) === 0o040000;
}

/**
 * 清除目标路径上残留的「已确认删除墓碑」。
 *
 * 若该文件历史上被删过，同步组会在 .meta/tombstones 留下三端确认的墓碑；
 * 下一轮 tombstone pass 会按墓碑再次把本地文件删掉，表现为「刚写回，下次打开就没了」。
 * 重新写入是更强的重建意图，写回前先撤掉这条墓碑，避免它拦截新文件。
 * 任何一步失败都静默降级：墓碑清理不阻断正常写回。
 */
async function clearStaleTombstone(relPath) {
  try {
    const group = await getActiveDataGroup();
    const tombstones = group?.tombstones;
    if (!tombstones || typeof tombstones.list !== 'function') return;
    const normalized = `/${relPath}`;
    const list = await tombstones.list().catch(() => []);
    const dirPrefix = '/host-disks/';
    for (const t of list) {
      const p = t.path || '';
      if (p === normalized || p.startsWith(`${normalized}/`) ||
        (p.startsWith(dirPrefix) && /^\.host-disks\..*\.tmp$/.test(p.slice(dirPrefix.length)))) {
        await tombstones.remove(t).catch(() => {});
        // 只删本地记录不够：远端副本（gitee / RemoteStorage）里的同一条墓碑会在下一轮
        // 同步时被重新拉回本地，再次把刚写回的文件删掉。这里把三端的墓碑记录一起删。
        await clearTombstoneOnBackends(group, p);
      }
    }
  } catch { /* 同步组未就绪 / 无墓碑能力：忽略 */ }
}

/** `.meta/tombstones/<编码路径>.json`：与 zen-fs-config 的 encodeMetaPath 同一套编码。 */
function tombstoneRecordPath(p) {
  return `/.meta/tombstones/${String(p).replace(/^\//, '').replace(/\//g, '__').replace(/\./g, '++')}.json`;
}

/**
 * 在数据组的每个后端副本上删除同一条墓碑记录。
 *
 * `.meta/tombstones` 自身参与同步，所以本地 `remove()` 只清掉本地副本时，远端会把它
 * 重新同步回来；墓碑回来后 tombstone pass 会按它再删一次文件（用户看到「又不行了」）。
 */
async function clearTombstoneOnBackends(group, path) {
  try {
    if (typeof group?.tombstoneTargets !== 'function') return;
    const targets = group.tombstoneTargets() || [];
    const record = tombstoneRecordPath(path);
    // 三端并行删，避免逐个等网络往返把写回拖到十几秒。
    await Promise.all(targets.map(async (target) => {
      const fs = target?.fs?.promises || target?.fs;
      if (!fs || typeof fs.unlink !== 'function') return;
      await fs.unlink(record).catch(() => {});
    }));
  } catch { /* 忽略：清不掉也不阻断写回 */ }
}

/**
 * 最近一次成功写回的文档快照。
 *
 * 用于「数据组里的文件被别的端用墓碑删掉」时一键恢复：本机缓存里的文档是刚归并出的
 * 完整结果，重建时不必要再花十几秒重读 RS 遥测。
 */
const DOC_CACHE_KEY = 'zip-browser:hd-doc-cache';

function saveDocCache(doc) {
  try {
    localStorage.setItem(DOC_CACHE_KEY, JSON.stringify({ at: Date.now(), doc }));
  } catch { /* 容量/隐私模式：忽略 */ }
}

function readDocCache() {
  try {
    const raw = localStorage.getItem(DOC_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && parsed.doc ? parsed : null;
  } catch { return null; }
}

/** 完整缓存快照 { at, doc }，供「主机磁盘」视图在连接建立前先渲染首屏。 */
export function hostDisksCachedDoc() {
  const cache = readDocCache();
  if (!cache) return null;
  return { at: Number(cache.at) || 0, doc: cache.doc };
}

/** 读到数据组里的真实文档时顺手刷新本机快照，保证下次冷启动有内容可显示。 */
export function cacheHostDisksDoc(doc) {
  if (doc) saveDocCache(doc);
}

/** 缓存摘要，供「主机磁盘」视图在文件缺失时提示一键恢复。 */
export function hostDisksCacheInfo() {
  const cache = readDocCache();
  if (!cache) return null;
  const doc = cache.doc;
  return {
    at: Number(cache.at) || 0,
    volumes: Number(doc?.stats?.volumes) || 0,
    hosts: Array.isArray(doc?.hosts) ? doc.hosts.length : 0,
  };
}

/**
 * 确保目录存在。
 *
 * 数据组的本地后端（zenfs store）不支持 mkdir 的 recursive，目录已存在时
 * 直接抛 EEXIST，而不是像 Node 那样静默返回。所以这里是「建 → 已存在则确认类型」，
 * 若同名路径上是个文件（历史误写），删掉再建目录。
 */
async function ensureDir(fp, dir) {
  try {
    await fp.mkdir(dir, { recursive: true });
    return;
  } catch (err) {
    if (!isExistsError(err)) throw err;
  }
  const st = await fp.stat(dir).catch(() => null);
  if (st && st.mode != null && !isDirMode(st.mode)) {
    // 目录位置上是个同名文件：这里**不能** unlink —— 数据组会把 unlink 转成 deleteFile，
    // 于是写出一条删除墓碑，下一轮同步再把刚写回的文件删掉。直接报错让用户处理。
    throw new Error(`/${dir} 位置上是同名文件，无法建立目录（请先手动处理该路径）`);
  }
}

/**
 * 写文本文件。
 *
 * 缓存层可能把「文件不存在」缓存成否定结果：VFS 于是走 createFile 分支，
 * 而底层存储的目录项里其实已有同名文件 → EEXIST（file already exists）。
 *
 * 这里**绝不使用 unlink / rename**：数据组把 unlink 转成 deleteFile → 在
 * `.meta/tombstones` 写下删除墓碑；而 zen-fs 的 rename 在目标已存在时同样会先
 * `remove(to)`，等于删掉目标顶文件。两种写法都会让下一轮 tombstone pass 把刚写回
 * 的文件删掉，gitee 上就会反复出现 Delete / Create 提交（用户看到的「一直在被删」）。
 *
 * 正确做法是刷新目录缓存后重试直接覆盖：后端 write 遇到已有 sha 会走 updateFile。
 */
async function writeTextFile(fp, path, text) {
  const slash = path.lastIndexOf('/');
  const dir = slash > 0 ? path.slice(0, slash) : '/';
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await fp.writeFile(path, text);
      return false;
    } catch (err) {
      if (!isExistsError(err)) throw err;
      // 刷新目录项，让 VFS 不再按「不存在」走 createFile 分支；随后重试覆盖。
      await fp.readdir(dir).catch(() => {});
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  throw new Error(`目标路径已有同名文件，刷新缓存后仍无法覆盖：${path}`);
}

/**
 * 把一份归并结果写进数据组，并立即读回校验。
 *
 * 写回前先撤掉该路径的三端墓碑，写完再撤一次（兜底路径会顺带生成墓碑）；
 * 成功后把文档存进本机缓存，供文件被其他端删掉时一键恢复。
 */
async function writeDocToGroup(doc) {
  const connected = getManifestFs();
  if (!connected) throw new Error('同步组未连接，无法写回');
  // 人工标注（卷别名）不在归并结果里，写回前必须从本机/旧文档带过来，否则重新归并一次就被冲掉。
  const payload = attachVolumeAliases(doc);
  const { fp, pathFor } = connected;
  await clearStaleTombstone(HOST_DISK_PATH);
  await ensureDir(fp, pathFor('host-disks'));
  const text = JSON.stringify(payload, null, 2);
  await writeTextFile(fp, pathFor(HOST_DISK_PATH), text);
  // 立即读回校验：写入返回成功但读不到，说明写进的是另一个数据组/本地库还没就绪。
  // 这一步把「写回成功但页面打不开」的静默失败变成可读的错误。
  try {
    await readHostDisksFrom(fp, pathFor, HOST_DISK_PATH);
  } catch (err) {
    throw new Error(`已写入 /${HOST_DISK_PATH}，但立即读回失败：${err?.message || err}`);
  }
  // 镜像副本（best-effort）：主路径被别处的墓碑反复删除时，读取侧仍能从镜像恢复。
  try {
    await clearStaleTombstone(HOST_DISK_MIRROR_PATH);
    await writeTextFile(fp, pathFor(HOST_DISK_MIRROR_PATH), text);
  } catch { /* 只是兜底副本，失败不阻断写回 */ }
  invalidateHostDisksDoc();
  saveDocCache(payload);
  window.dispatchEvent(new CustomEvent('zb:host-disks-change'));
  return { overwritten: false };
}

/**
 * 供「主机磁盘」视图直接写回一份已读到的文档（目前用于卷别名这类人工标注）。
 * 与面板「写回」走同一套路径：撤墓碑 → 建目录 → 覆盖写 v2 → 读回校验 → 写镜像 → 存本机快照。
 */
export async function writeHostDisksDoc(doc) {
  if (!doc) throw new Error('没有可写回的文档');
  await writeDocToGroup(doc);
}

/**
 * 记住/清除「卷 → 磁盘 SN」的手工映射（写进设备身份注册表，与面板「手工 SN 映射」同一份数据）。
 * 传空 SN 视为清除。注册表在 panels 未打开时也能写：init 后 data 已就绪，flush 失败不阻断。
 */
export async function rememberManualSerial(volumeId, serial) {
  const id = String(volumeId || '').trim();
  if (!id) throw new Error('缺少 volumeId');
  const sn = String(serial || '').trim();
  if (sn) {
    registry.upsert({ volumeId: id, serial: sn, hostname: volumesCache.find((v) => v.volumeId === id)?.sourceHost });
  } else {
    registry.remove(id);
  }
  await registry.flush();
  return { volumeId: id, serial: sn };
}

/**
 * 用本机缓存的文档恢复写回（数据组里的文件被别的端按墓碑删掉时使用）。
 * 返回缓存时间与文档统计，供调用方提示。
 */
export async function restoreHostDisksFromCache() {
  const cache = readDocCache();
  if (!cache) throw new Error('本机没有可恢复的主机磁盘缓存，请先读取遥测并写回');
  const { overwritten } = await writeDocToGroup(cache.doc);
  return {
    at: Number(cache.at) || 0,
    volumes: Number(cache.doc?.stats?.volumes) || 0,
    hosts: Array.isArray(cache.doc?.hosts) ? cache.doc.hosts.length : 0,
    overwritten,
  };
}

async function writeBack() {
  if (!currentDoc) { setError('请先读取并归并数据'); return; }
  setError('');
  const btn = $('hdWriteBack');
  if (btn) btn.disabled = true;
  setStatus('正在写回数据组…');
  try {
    const { overwritten } = await writeDocToGroup(currentDoc);
    setStatus(`已写回 /${HOST_DISK_PATH} · ${currentDoc.stats.volumes} 卷 / ${currentDoc.hosts.length} 主机 · 读回校验通过${overwritten ? '（已覆盖同名文件）' : ''}`, true);
  } catch (err) {
    const msg = err?.message || String(err);
    setError(isExistsError(err)
      ? `写回失败：${msg}（目标路径已存在但无法覆盖，请先手动删除 /${HOST_DISK_PATH} 后重试）`
      : msg);
    setStatus('写回失败', false);
  } finally {
    if (btn) btn.disabled = false;
  }
}

/** 一键折叠/展开弹窗内所有可折叠节点。 */
function toggleFoldAll(btn) {
  if (collapsedKeys.size) collapsedKeys.clear();
  else {
    for (const box of document.querySelectorAll('#hostDiskModal details[data-hd-key]')) {
      collapsedKeys.add(box.dataset.hdKey);
    }
  }
  render();
  if (btn) btn.textContent = collapsedKeys.size ? '全部展开' : '全部折叠';
}

function open() {
  $('hostDiskModal')?.classList.remove('hidden');
  currentMerge = null;
  currentDoc = null;
  currentTree = null;
  // 虚拟挂载点页面里也可能切换过这个开关，打开面板时按同一份设置刷新。
  hideNoDiskHosts = readHideNoDisk();
  setView('volumes');
  render();
  syncHideNoDiskUi();
  const foldBtn = $('hdFoldAll');
  if (foldBtn) foldBtn.textContent = collapsedKeys.size ? '全部展开' : '全部折叠';
  setError('');
  void reload();
}
function close() { $('hostDiskModal')?.classList.add('hidden'); }

export function initHostDisksPanel({ status } = {}) {
  void registry.init().then(() => { renderMappings(); });
  $('hostDiskBtn')?.addEventListener('click', open);
  $('hdClose')?.addEventListener('click', close);
  $('hdRefresh')?.addEventListener('click', () => void reload());
  $('hdHideNoDisk')?.addEventListener('change', (e) => {
    setHideNoDisk(e.target?.checked);
    renderHosts();
  });
  $('hdFoldAll')?.addEventListener('click', (e) => toggleFoldAll(e.currentTarget));
  $('hostDiskModal')?.addEventListener('toggle', (e) => {
    const box = e.target;
    if (!box?.matches?.('details[data-hd-key]')) return;
    if (box.open) collapsedKeys.delete(box.dataset.hdKey);
    else collapsedKeys.add(box.dataset.hdKey);
    const btn = $('hdFoldAll');
    if (btn) btn.textContent = collapsedKeys.size ? '全部展开' : '全部折叠';
  }, true);
  $('hdWriteBack')?.addEventListener('click', () => void writeBack());
  $('hdMapAdd')?.addEventListener('click', () => void addMapping());
  $('hdMapSerial')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') void addMapping(); });
  $('hdMapVolume')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') void addMapping(); });
  for (const view of ['volumes', 'hosts', 'mappings', 'hostaliases', 'diskaliases']) {
    const id = { volumes: 'Volumes', hosts: 'Hosts', mappings: 'Mappings', hostaliases: 'HostAliases', diskaliases: 'DiskAliases' }[view];
    $(`hdTab${id}`)?.addEventListener('click', () => setView(view));
  }
  $('hdHostAliasAdd')?.addEventListener('click', () => void addHostAlias());
  $('hdHostAliasUuid')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') void addHostAlias(); });
  $('hdHostAliasList')?.addEventListener('click', (e) => {
    const btn = e.target?.closest?.('.hd-host-alias-del:not(.hd-disk-alias-del)');
    if (btn?.dataset.canonical && btn?.dataset.alias) void removeHostAlias(btn.dataset.canonical, btn.dataset.alias);
  });
  $('hdDiskAliasAdd')?.addEventListener('click', () => void addDiskAlias());
  $('hdDiskAliasId')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') void addDiskAlias(); });
  $('hdDiskAliasCanonical')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') void addDiskAlias(); });
  $('hdDiskAliasList')?.addEventListener('click', (e) => {
    const btn = e.target?.closest?.('.hd-disk-alias-del');
    if (btn?.dataset.canonical && btn?.dataset.alias) void removeDiskAlias(btn.dataset.canonical, btn.dataset.alias);
  });
  $('hdMapList')?.addEventListener('click', (e) => {
    const btn = e.target?.closest?.('.hd-map-del');
    if (btn?.dataset.volume) void removeMapping(btn.dataset.volume);
  });
  $('hdCandidates')?.addEventListener('click', (e) => {
    const btn = e.target?.closest?.('.hd-cand-adopt');
    if (!btn || btn.disabled || !btn.dataset.serial || !btn.dataset.volume) return;
    const serial = btn.dataset.serial;
    const volumeId = btn.dataset.volume;
    try {
      registry.upsert({ serial, volumeId, hostname: volumesCache.find((v) => v.volumeId === volumeId)?.sourceHost });
      void registry.flush();
      recompute();
      setStatus(`已采纳候选：SN ${serial} → ${volumeId}`, true);
    } catch (err) {
      setError(err?.message || String(err));
    }
  });
  $('hostDiskModal')?.addEventListener('click', (e) => {
    if (e.target?.id === 'hostDiskModal') close();
  });
  return { ok: true, open };
}
