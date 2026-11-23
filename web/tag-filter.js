// 标签视图的纯数据层：只认手动标签（annotations 的 tags + paths 描述）。
// 自动标签（server/tag-rules.js 按目录子项实时推断）不参与这里，避免每次筛选都去扫目录。

/** 把 annotations 的 {key: [tags]} 展开成可渲染的条目，缺路径描述的 key 直接丢弃。 */
export function tagEntries(data) {
  const entries = [];
  for (const [key, list] of Object.entries(data?.tags || {})) {
    const desc = data?.paths?.[key];
    if (!desc || typeof desc.path !== 'string' || !desc.path) continue;
    const tags = [...new Set((Array.isArray(list) ? list : []).map((tag) => String(tag || '').trim()).filter(Boolean))];
    if (!tags.length) continue;
    entries.push({
      key,
      kind: desc.kind === 'zip' ? 'zip' : 'dir',
      path: desc.path,
      zipPath: desc.zipPath || '',
      entry: desc.entry || '',
      label: desc.label || desc.path,
      tags,
    });
  }
  return entries.sort((a, b) => a.label.localeCompare(b.label, 'zh-CN') || a.path.localeCompare(b.path, 'zh-CN'));
}

/**
 * 按选中的标签筛条目：mode=and 要求条目同时带全部选中标签，mode=or 任一命中即可。
 * 没选标签时返回空（视图一开始就该是「请选择标签」的空态）。
 */
export function matchTagEntries(entries, selected, mode = 'and') {
  const wanted = [...new Set((Array.isArray(selected) ? selected : [])
    .map((tag) => String(tag || '').trim()).filter(Boolean))];
  if (!wanted.length) return [];
  return (Array.isArray(entries) ? entries : []).filter((entry) => (
    mode === 'or'
      ? wanted.some((tag) => entry.tags.includes(tag))
      : wanted.every((tag) => entry.tags.includes(tag))
  ));
}

/** 标签 → 出现次数，按次数降序、同次数按名称排，用于顶部标签云与侧栏。 */
export function tagCounts(entries) {
  const counts = new Map();
  for (const entry of Array.isArray(entries) ? entries : []) {
    for (const tag of new Set(entry.tags || [])) counts.set(tag, (counts.get(tag) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'zh-CN'));
}
