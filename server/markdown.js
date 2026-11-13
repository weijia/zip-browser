function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

function inline(value) {
  let text = escapeHtml(value);
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  text = text.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img alt="$1" src="$2">');
  text = text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  return text;
}

const DOC_STYLE = "body{margin:0;padding:32px 40px;background:#fff;color:#222;font:15px/1.75 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:860px} h1,h2,h3{line-height:1.3;margin:1.4em 0 .6em} h1{font-size:26px;border-bottom:1px solid #e5e5e5;padding-bottom:.3em} h2{font-size:21px} h3{font-size:17px} a{color:#185fa5} img{max-width:100%} code{background:#f4f4f2;padding:2px 5px;border-radius:4px;font-size:13px} pre{background:#f6f6f4;padding:14px;border-radius:8px;overflow:auto} pre code{background:none;padding:0} blockquote{border-left:3px solid #d0d0d0;margin:1em 0;padding:.2em 1em;color:#555} hr{border:0;border-top:1px solid #e5e5e5} table{border-collapse:collapse} td,th{border:1px solid #ddd;padding:6px 10px}";

function wrap(body, title) {
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${DOC_STYLE}</style></head><body>${body}</body></html>`;
}

export function renderMarkdown(source, title = 'Markdown') {
  const lines = String(source).split(/\r?\n/);
  const out = [];
  let inCode = false;
  let code = [];
  let inList = false;
  let paragraph = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      out.push(`<p>${inline(paragraph.join(' '))}</p>`);
      paragraph = [];
    }
  };
  const closeList = () => {
    if (inList) {
      out.push('</ul>');
      inList = false;
    }
  };

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      flushParagraph();
      closeList();
      if (inCode) {
        out.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
        code = [];
        inCode = false;
      } else {
        inCode = true;
        code = [];
      }
      continue;
    }
    if (inCode) {
      code.push(line);
      continue;
    }
    if (!line.trim()) {
      flushParagraph();
      closeList();
      continue;
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      flushParagraph();
      closeList();
      const level = heading[1].length;
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }
    if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      flushParagraph();
      closeList();
      out.push('<hr>');
      continue;
    }
    const item = /^\s*[-*+]\s+(.*)$/.exec(line);
    if (item) {
      flushParagraph();
      if (!inList) {
        out.push('<ul>');
        inList = true;
      }
      out.push(`<li>${inline(item[1])}</li>`);
      continue;
    }
    closeList();
    if (line.startsWith('> ')) {
      flushParagraph();
      out.push(`<blockquote>${inline(line.slice(2))}</blockquote>`);
      continue;
    }
    paragraph.push(line.trim());
  }
  if (inCode) out.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
  flushParagraph();
  closeList();
  return wrap(out.join('\n'), title);
}

export function renderTextPreview(text, title = 'Text') {
  return wrap(`<h1>${escapeHtml(title)}</h1><pre><code>${escapeHtml(text)}</code></pre>`, title);
}

export function renderNotice(title, message) {
  return wrap(`<h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p>`, title);
}

export function renderDirectory({ title, items, hint = '', view = 'list' }) {
  const thumbsMode = view === 'thumbs';
  const images = items.filter((item) => item.thumb && !item.dir);
  const folders = items.filter((item) => item.dir);
  const style = "body{margin:0;padding:28px 32px;background:#fff;color:#1f2329;font:14px/1.7 -apple-system,BlinkMacSystemFont,'Segoe UI','Microsoft YaHei',sans-serif;max-width:1100px} h1{font-size:20px;margin:0 0 4px} .hint{color:#777;font-size:13px;margin:0 0 16px} .switch{display:flex;gap:6px;margin:0 0 18px} .switch a{font-size:12px;padding:4px 12px;border:1px solid #e4e7ec;border-radius:6px;color:#6b7280;text-decoration:none} .switch a.on{border-color:#185fa5;background:#e6f1fb;color:#185fa5} ul{list-style:none;padding:0;margin:0} li{display:flex;justify-content:space-between;gap:16px;padding:7px 10px;border-bottom:1px solid #f0f0f0} li:hover{background:#f7f9fc} li a{color:#185fa5;text-decoration:none} li a:hover{text-decoration:underline} li span{color:#888;font-size:12px;white-space:nowrap} .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px} .card{display:block;border:1px solid #e4e7ec;border-radius:8px;overflow:hidden;color:inherit;text-decoration:none} .card:hover{border-color:#185fa5} .card img{display:block;width:100%;height:120px;object-fit:cover;background:#f7f8fa} .card .n{display:block;padding:7px 9px 0;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis} .card .s{display:block;padding:0 9px 8px;font-size:11px;color:#9aa1ac} .folders{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 16px} .folders a{font-size:12px;padding:4px 10px;background:#f7f8fa;border:1px solid #e4e7ec;border-radius:99px;color:#185fa5;text-decoration:none} .empty{padding:28px;text-align:center;color:#9aa1ac;border:1px dashed #e4e7ec;border-radius:8px}";
  const head = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${style}</style></head><body>`;
  const switcher = `<div class="switch"><a href="?view=list"${thumbsMode ? '' : ' class="on"'}>列表</a><a href="?view=thumbs"${thumbsMode ? ' class="on"' : ''}>缩略图${images.length ? ` (${images.length})` : ''}</a></div>`;
  let body;
  if (thumbsMode) {
    const folderLinks = folders.map((item) => {
      const href = `${item.href}${item.href.includes('?') ? '' : '?view=thumbs'}`;
      return `<a href="${escapeHtml(href)}">${escapeHtml(item.name)}/</a>`;
    }).join('');
    const cards = images.map((item) => `<a class="card" href="${escapeHtml(item.href)}" title="${escapeHtml(item.name)}"><img src="${escapeHtml(item.thumb)}" loading="lazy" alt=""><span class="n">${escapeHtml(item.name)}</span><span class="s">${formatSize(item.size)}</span></a>`).join('');
    body = `<p class="hint">图片 ${images.length} 张 · 仅当前目录 · 点击缩略图查看原图</p>`
      + (folderLinks ? `<div class="folders">${folderLinks}</div>` : '')
      + (cards ? `<div class="grid">${cards}</div>` : '<p class="empty">当前目录没有图片</p>');
  } else {
    const rows = items.map((item) => {
      const size = item.dir ? '文件夹' : `${item.size != null ? formatSize(item.size) : ''}`;
      return `<li><a href="${escapeHtml(item.href)}">${escapeHtml(item.name)}${item.dir ? '/' : ''}</a><span>${size}</span></li>`;
    }).join('\n');
    body = `<p class="hint">${escapeHtml(hint)}</p><ul>${rows}</ul>`;
  }
  return `${head}<h1>${escapeHtml(title)}</h1>${switcher}${body}</body></html>`;
}

function formatSize(bytes) {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  return `${(value / 1024 / 1024 / 1024).toFixed(1)} GB`;
}
