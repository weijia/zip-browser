# UFS 虚拟网盘过滤

## 需求（2026-11-27）

- 在 UFS 虚拟网盘的 bundle 目录树页增加文件名/路径过滤输入框。
- 输入子串（例如 `.APK`）后，把包含该子串的节点过滤出来，便于在大量文件中定位。
- 开发完成后提交并推送，随后休眠本机。

## 设计

- 过滤范围是当前 bundle 的全部节点，不受树视图「每个目录先显示 200 项」的限制。
- 按节点 `name` 或卷内相对路径 `rel` 做子串匹配；匹配大小写不敏感（纯 UI 便利），不改变标签与路径存储的大小写敏感语义。
- 结果以平铺列表展示完整相对路径，命中深层文件时不需要逐层展开；命中目录时点击可跳回树中对应位置并展开祖先链。
- 最多显示 500 条，超出在计数提示里说明。
- 输入即过滤，`Esc` 或「清除」按钮还原树视图；切换 bundle 时沿用上次查询。
- 过滤结果行仍保留标签 chip 与 hash 复制按钮，不影响打标签与发布流程。

## 实现与验证

- `web/app.js`：新增 `ufsFilterQuery`、`ufsFilterMatches()`、`ufsFilterRowHtml()`，改造 `renderUfsTreeBody()` 与 `renderUfsTree()`，事件委托新增 `ufs-filter-clear` / `ufs-filter-goto`。
- `web/style.css`：新增 `.ufs-filter-*` 样式。
- 验证：`node --check web/app.js` 通过；`npm test` 217 项（216 通过、1 跳过、0 失败）；`npm run dist` 成功（44 文件）。
