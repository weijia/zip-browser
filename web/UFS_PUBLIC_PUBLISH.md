# UFS public 标签文件发布到 public_target 网络存储

更新时间：2026-11-27（第四轮：onenav 读写侧同步改造）
状态：需求 + 设计 + **第一、二、三阶段实现完成**（发布功能 + onenav 分片读写 + UFS 树内打标签；旧标签迁移未做）
适用代码：`C:\codes\nodejs\zip-browser`（前端 `web/`，服务端 `server/`）、`C:\codes\nodejs\onenav`（`src/components/apps/filebrowser/`）

实现落点：
- zip-browser：`web/tags-sharded.js`、`web/ufs-public-publisher.js`、`server/ufs-publish.js`；`web/app.js`（UFS 页发布按钮、网盘卡片标签按钮、命令入口）、`server/index.js`（路由 + 静态白名单）、`tests/ufs-public-publish.test.mjs`。
- onenav：`src/components/apps/filebrowser/sharded-tags.ts`（与 zip-browser `tags-sharded.js` 逐字对齐）、`fetch.ts`（`getFileTags/putFileTags`）、`ufs.ts`（`readUfsTags/putUfsTags`）、`sharded-tags.test.ts`。
验证：zip-browser `npm test` 214 项、`npm run dist` 成功；onenav `npm test` 201 项（新增 10 项）、`npm run build` 成功。

## 0. 口径修正（先读这一节）

1. **磁盘/文件用户标签**的事实源是同步组数据组里的 `app_data/folders/file-tags/<key>.json`（旧单片格式；新格式见 §3.0）：
   ```json
   { "tags": { "C:/Photos/2024": ["旅行", "public"] } }
   ```
   `<key>` = `volumeId`（有 `.dir-struct-id` 时即 UUID，否则卷序列号 / `主机::盘符` 经安全化）。旧片的路径键是 host-relative；统一后新片改用**卷内相对路径 `rel`**（§3.0a），旧片只读兼容。
2. **UFS 快照标签**的事实源是**并列的** `app_data/folders/ufs-tags/<ufsTagKey>.json`，不是 `file-tags/`，也不是 zip-browser 自己的 `/annotations.json`：
   ```json
   {
     "version": 1,
     "bundleId": "vol:<volumeId>/<rel>",
     "updatedAt": 1730000000000,
     "tags": {
       "": ["public"],
       "子目录/文件.jpg": ["public", "精选"]
     }
   }
   ```
   根节点 `rel` 为空串；写侧是 onenav `UfsView`，读侧实现在 `onenav/src/components/apps/filebrowser/ufs.ts`。
3. 本需求只消费 **UFS 快照标签里的 `public`**；不读 `annotations.json`，不把 `public` 写回 bundle，也不改写 `file-tags/`。
4. **网络存储目前没有打标签功能**：`/drive-registry.json` 的条目字段里没有 tags，卡片也没有入口。因此 `public_target` 是本次要新增的能力，不能假设已经存在。
5. **全局写入原则（2026-11-27 确认）**：所有写进数据组的可变数据一律**按年目录分片**，且**只追加新文件、不修改已有文件**。这条原则适用于标签、网络存储标签、发布状态、迁移记录；已有的 `/ufs/<年>/ufs-*.jsonl` 就是符合该原则的范例（`ufs-store.js` 注释：「所有文件只新增、不改写」）。

## 0.5 全局写入原则：按年分片 + 只追加不覆盖

- 统一路径形态：`<类别>/<身份>/<年>/<时间戳>-<随机后缀>.json`；没有稳定身份的类别用 `<类别>/<年>/...`。
- 每次变更**新建一个片**；覆盖、原地修改、删除已有片都属于违规。删除标签表示为追加一条 `remove` 事件，不删旧片。
- 片名用 `YYYYMMDD-HHMMSS-<6 位十六进制随机>`，与 `web/ufs-store.js:shardFileName()` 同风格，避免多端并发撞名。
- 读取侧统一动作：**列举所有年目录** → 取片 → **按片名字符串升序排序** → 重放合并成当前状态。不用文件系统 mtime，也不用片内 `at`/`host` 参与排序——片名本身就是可比较的确定性键，两端排出的顺序天然一致。**读取侧必须能合并多片**，这是本原则的配套要求，不是可选项。
- **时间精度不需要严格（回答「跨主机时间需要这么严格吗」）**：年份目录只是**物理分桶**，目的是别把一个目录塞太多文件；某片因时钟偏差落到相邻年份目录也无妨，因为读取侧枚举所有年份。真正需要"顺序"的只有同一 key 的多次事件谁覆盖谁——只要**所有主机按片名排出的顺序一致**，结论就一致。两台主机时钟不同确实可能把"真实上谁更晚"判反，但这只在两台机器于偏差窗口内写**同一个 key** 时才有影响：这种情况极罕见，而且结果是两端一致地选了其中一份，不会各自算出不同状态。**因此不引入 `seq`、逻辑时钟或服务端发号**；片内 `at`/`host` 保留作审计来源，不参与排序。所谓"onenav 同步改造片序"因此只是要求它**按片名排序、能跨年目录枚举**，不需要实现复杂比较器。
- 结论：`file-tags/<volumeId>.json` 这种「一卷一文件、整表覆盖写」**不符合**本原则；`volumeId` 作为身份**段**（目录名/文件名前缀）仍然合理，因为它是跨主机一致的稳定卷身份。改为 `file-tags/<volumeId>/<年>/tags-<ts>-<rand>.json`。

## 1. 背景与目标

zip-browser 能把本地目录/文件以 UFS bundle 形式登记到数据组 `/ufs/<年份>/ufs-*.jsonl`；onenav 能给 bundle 的任意节点打用户标签。用户希望把其中标记为 `public` 的文件，放到一个被标记为 `public_target` 的网络存储里，作为一次明确的“发布”动作。

本轮明确不做定时：不要 `setInterval`、不要后台轮询、不要自动运行。触发方式是一个**手动按钮**，另留一个可编程命令入口，便于以后接命令或自动化。

## 2. 需求

### P0 必须满足

1. **手动触发**
   - UFS 页面提供“发布 public 文件”按钮。
   - 点击后先做预检并显示摘要，用户确认后才执行。
   - 没有定时器；页面打开、关闭、刷新都不会自动发布。

2. **来源识别**
   - 枚举数据组 `/ufs/<年>/ufs-*.jsonl`。旧格式 `/ufs/<年>/ufs-*.json` 分片本期不解析，但**预检摘要必须列出有多少个旧分片被跳过**，不能静默忽略（§2 非目标 4）。
   - 用 bundle 的 `meta.id` 按 `ufsTagKey` 规则定位 `/ufs-tags/<key>.json`，读取 `tags` 映射。
   - **大小写敏感**：标签字符串严格匹配 `public`（`Public` / `PUBLIC` 不算），路径 `rel` 也保留原始大小写、严格比较（§3.0a）。
   - 节点命中规则：
     - 根节点 `rel === ''` 带 `public` → 该 bundle 内全部文件节点；
     - 目录节点带 `public` → 该 `rel` 前缀下的全部文件节点；
     - 文件节点带 `public` → 仅该文件节点。

3. **目标识别（支持多目标）**
   - 新增网络存储标签能力；给网盘登记条目打上 `public_target`。
   - 精确按 `public_target` 匹配（大小写敏感）。
   - 命中 0 个：提示“未找到目标”，不写任何文件。
   - 命中 1 个：发布到该目标。
   - 命中 **≥2 个：发布到全部目标**（扇出），不再报错。每个目标有独立的幂等状态与结果；某个目标失败只影响该目标，其余目标继续。预检摘要列出全部目标名，用户确认的是这一整批目标。

4. **发布动作（优先硬链接，跨卷回退复制）**
   - `cached/<dir>/data` 是**本机中转站**，不是网盘本体；网盘不可达时它仍在本机，因此在同卷时可以用**硬链接**代替复制：目标路径与源文件指向同一份数据字节，不占额外空间，上传器照常读到内容。
   - 规则：
     1. 源与目标缓存根**同卷**（Windows 同盘符且同文件系统）→ 用 `fs.link()` 建硬链接；
     2. **跨卷** → `EXDEV`，自动回退为真实复制（`fs.copyFile()`）；
     3. 链接失败（权限、平台不支持等）→ 回退复制；
     4. 结果里记录实际用的 `method: 'link' | 'copy'`，便于审计。
   - 不默认使用**符号链接**：Windows 创建符号链接通常需要开发者模式或管理员权限；跨盘符后绝对目标路径会随盘符漂移失效；源卷未挂载时变悬空链接；部分上传/备份工具默认跳过符号链接。若确实需要，作为显式配置项 `linkMode: 'symlink'` 后续再加，不进本期默认路径。
   - 目标路径 `<目标缓存根>/data/public/<年>/<bundleKey>/<rel>`：**保留原目录层级，并在 `public/` 下先按年分片**。`bundleKey` = `ufsTagKey(bundleId)`，与标签文件同名，避免同源多次加入互相覆盖。
   - `<年>` 取 **bundle 的加入年**（即从 `/ufs/<年>/` 枚举到该 bundle 的那一年），不取文件 mtime 年：加入年稳定，文件 mtime 变了也不会让目标路径搬家、留下孤儿文件。年份从 UFS 枚举时顺带得到，不需要额外读数据。
   - 分层顺序固定为 `public/<年>/<bundleKey>/<rel>`：顶层是少量年份目录，中间隔离来源，底层保留原始相对路径。
   - 目标路径必须做安全化：拒绝绝对路径、`..`、盘符、尾部空格/点；只保留相对段，重复段折叠，不跟随符号链接逃逸。
   - 不改写 UFS bundle、不改写标签文件、不改动源目录。硬链接下修改源文件会同步影响中转文件；若源文件被"写临时文件+改名"方式替换，硬链接会留住旧 inode，靠 §4.4 的 hash/size/mtime 复检发现并重建链接。

5. **幂等**
   - 数据组写入发布状态片，按 `bundleId + '|' + rel + '|' + target` 记录 `{ hash, size, mtime, method, publishedAt }`（多目标各自独立，§3.4）。
   - 节点有 `hash` 时以 hash 为准；没有 hash 时先算 SHA-256 再比较。
   - 状态一致且目标文件存在时跳过；不一致时覆盖目标文件并更新状态。

6. **失败隔离**
   - 单个文件失败（源不存在、卷未挂载、权限不足、目标目录不可写）只记失败，不中断整批。
   - 结果摘要给出：总数、成功、跳过、失败，以及失败原因列表。

### P1 应该满足

1. 预检阶段显示：命中文件数、目标网盘名、预计字节数、将跳过数。
2. 执行过程显示进度，结束后保留最近一次结果摘要。
3. 提供可编程命令入口（例如 `window.zb.runPublicPublish()` / 自定义事件），供后续命令行或自动化调用；它与按钮走同一段逻辑。

### 非目标

1. 不做定时、不做后台轮询、不做页面关闭后继续运行的任务。
2. 不实现“取消 public 标签就删除目标端文件”；默认只停止更新。
3. 不处理 bundle 中 `source.kind === 'zip'` 的节点：包内条目不是磁盘上的独立文件，既不能硬链接也不能直接复制，必须先解包到临时文件；本期跳过并在结果里逐条标注，不静默忽略。外层 `.zip` 文件本身若作为 UFS 文件节点出现，按普通文件处理。
4. 不处理旧格式 `/ufs/<年>/ufs-*.json` 分片：它只有条目摘要、没有节点级 `rel`/`hash`，无法可靠定位到单个文件；本期跳过，但预检报告其数量。
5. 不通过 RemoteStorage HTTP PUT 直接写远端；本设计的写入端是本机受控 API + 网盘缓存目录。不默认使用符号链接（理由见 §2 P0-4）。
6. 不修改 `file-tags/` / `ufs-tags/` 的既有语义。

## 3. 数据与格式约定

### 3.0 三类标签的分片改造（与 onenav 共用的数据组）

按 §0.5 原则，三类标签统一改成「`<类别>/<身份>/<年>/<ts>-<rand>.json` + 事件片」：

| 类别 | 新路径 | 片内关键字段 |
|---|---|---|
| 卷/文件标签 | `file-tags/<volumeId>/<年>/tags-<ts>-<rand>.json` | `{version, at, host, events:[{op:'set'\|'remove', rel:'Photos/2024', tags:[...]}]}` |
| UFS 快照标签 | `ufs-tags/<bundleKey>/<年>/tags-<ts>-<rand>.json` | `{version, at, host, bundleId, events:[{op:'set'\|'remove', rel:'子目录/a.jpg', tags:[...]}]}` |
| 网络存储标签 | `net-drive-tags/<dir>/<年>/tags-<ts>-<rand>.json` | `{version, at, host, events:[{op:'set'\|'remove', tag:'public_target'}]}` |

- `<bundleKey>` = `ufsTagKey(bundleId)`，与 UFS 标签现状同名规则。
- `events[]` 是相对上一片的增量，不是整表快照；`op:'set'` 覆盖该 rel/tag 的标签数组，`op:'remove'` 清空。`rel` 一律是**不含盘符的相对路径**（卷标签为卷内相对，UFS 标签为 bundle 内相对，根节点为空串）；详见 §3.0a。
- 旧格式 `file-tags/<key>.json`、`ufs-tags/<key>.json`（整表 `{tags:{...}}`）移入只读兼容：读取侧先读旧单片作基线，再按片名升序重放新片；写入只产生新片。旧片不删、不改。
- **跨项目影响（必须同步改，否则数据不统一）**：onenav 的 `fetch.ts:getFileTags/putFileTags`、`ufs.ts:readUfsTags/putUfsTags` 目前是「固定路径 + 整表覆盖写」，读取侧要改为列目录+重放，写入侧要改为追加事件片；`FileBrowserApp.tsx` 与 `UfsView.tsx` 的调用签名若需变化一并调整。这两个项目连的是同一个数据组，任一侧不改就会互相覆盖。
- 这一改造是 §1 需求能成立的前置：发布逻辑读的是重放后的标签视图，不关心底层是旧片还是新片。

### 3.0a 路径模型：标签键必须适应不同环境（2026-11-27 追加）

**问题**：`annotations.json` 的 `fs:` key 与现有 `file-tags` 的路径键都含盘符（`fs:c:\photos\2024`、`C:/Photos/2024`）。`normalizeLocal` 只统一斜杠与大小写，是**写法级规范化**，不是跨机器适配——同一块物理盘插到另一台机器，盘符可能从 `C:` 变成 `E:`，标签键就对不上。统一后若沿用这种键，等于把 annotations 的局限搬进共享标签。

**原则**：标签键只存**跨环境稳定**的两样东西——稳定卷身份 `volumeId` + **卷内相对路径 `rel`（不含盘符）**。本机绝对路径是运行时派生值，绝不落进标签键。

| 标签类别 | 身份（键的一部分） | 路径键 | 环境适应性 |
|---|---|---|---|
| 卷/文件标签 `file-tags` | 目录名 `<volumeId>`（卷根 `.dir-struct-id` UUID，跨机器稳定） | 卷内 `rel`，如 `Photos/2024`，无盘符 | 换机器后按当前盘符重解，标签命中 |
| UFS 标签 `ufs-tags` | `<bundleKey>`（bundleId 派生，与机器无关） | bundle 内 `rel` | 天然稳定，无需改 |
| 网盘标签 `net-drive-tags` | `<dir>`（网盘登记名） | 无路径键，只有 `tag` | 天然稳定，无需改 |

**本机路径反解（复用现有代码，不另造）**：
- `web/app.js:relInVolume(abs)` 把本机绝对路径拆成 `{letter, rel}`；`localVolumeForPath()` 用 `hostInfo.volumes[letter]` 得到 `volumeId`；`localPathForVolume(volumeId, rel)` 用当前 `volumes` 映射反查盘符、拼回 `X:\<rel>`。
- 打标签：`本机路径 → relInVolume → {volumeId, rel}` → 写 `file-tags/<volumeId>/...` 的 `events[].rel`。
- 读标签/跳转：`{volumeId, rel} → localPathForVolume → 本机路径`；未挂载时返回 null，按 §4.8 记为 volume-not-mounted，不猜盘符。
- 发布源文件解析同样走这条链（§4.2），与 UFS `source.volumeId + rel` 完全同构。

**规范化与兼容**：
- `rel` 统一 `/` 分隔、去首尾斜杠，**保留原始大小写**（2026-11-27 确认大小写敏感）。不按 Windows 语义折叠：Linux 卷上 `Photos` 与 `photos` 是两个不同目录，折叠会撞键。原有 `annotations.json` 里已被 `normalizeLocal` 小写的旧 key，迁移时只能作为"历史写法"匹配到同名原样目录，不能反过来把新键改写为小写。
- 标签字符串同样大小写敏感：`public` 与 `Public` 是不同标签。
- 磁盘根本身用空串 `''`（与 UFS 根节点一致）。
- 旧 host-relative 标签（`C:/Photos/2024`）读取时按上表折算成 `{volumeId, rel}` 再参与重放；卷未挂载无法折算的按 §4.8 记 pending，不丢弃。旧片不删不改。
- 无 `.dir-struct-id` 的卷回退为 `主机::盘符`，此时 `volumeId` 本身含盘符、跨机器不稳定——这是既有约束，文档标注为"该卷不保证跨环境"，不强行修复。

### 3.1 UFS bundle

首行 meta 关键字段：`id`、`name`、`source`、`addedAt`、`rootNodeId`、`summary`。后续每行一个节点：`{ type, id, rel, name, parentId, mtime?, size?, hash?, hashError?, partial? }`。

`source.kind === 'volume'` 时，`source = { kind:'volume', volumeId, rel }`；`source.kind === 'local'` 时为绝对路径。发布时要据此反解本机源文件。

### 3.2 `ufsTagKey` 规则（必须与 onenav 完全一致）

```
raw = String(bundleId || 'unknown')
safe = raw.replace(/[^A-Za-z0-9._-]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_+|_+$/g, '')
          .slice(0, 64)
shortHash = FNV-1a 32bit(raw) >>> 0，转 base36
key = `${safe || 'bundle'}-${shortHash}`
```

标签文件：`/ufs-tags/<key>.json`。读取失败（不存在、损坏、401/403）一律按空标签处理，不阻断发布。

### 3.3 网络存储标签（新增）

与现有标签并列新增 `/net-drive-tags/`，按 §3.0 分片：

```
net-drive-tags/<dir>/<年>/tags-<ts>-<rand>.json
```

```json
{
  "version": 1,
  "at": 1730000000000,
  "host": "my-pc",
  "events": [
    { "op": "set", "tag": "public_target" }
  ]
}
```

- `<dir>` 与 `/drive-registry.json` 条目的 `dir` 一致，只做安全化（`[^A-Za-z0-9._-]` → `_`）。
- 读取某网盘当前标签 = 列 `net-drive-tags/<dir>/` 下所有年目录的片 → 按片名升序重放 `events`（`set` 加入、`remove` 移除）。
- 不塞进 `/file-tags/`（**已定**）：那套键空间是 `volumeId + 卷内相对路径 rel`（§3.0a），网络存储登记不是磁盘卷，混用会让筛选和路径解析产生歧义。独立命名空间还能避免"网盘登记名恰好等于某 volumeId"时的键碰撞。
- UI 在网盘卡片和“网盘信息登记”面板提供标签编辑入口；每次编辑追加一片，走数据组写 + flush。

### 3.4 发布状态文件

同样按年分片、只追加：

```
ufs-public-state/<runId>/<年>/publish-<ts>-<rand>.json
```

`runId` = 一次发布运行的标识（时间戳 + 随机）；一次运行写一片，记录本次对所有文件的判定：

```json
{
  "version": 1,
  "at": 1730000000000,
  "host": "my-pc",
  "targets": ["RemoteStorage-1", "WebDav-2"],
  "results": {
    "vol:xxx/相对路径|子目录/文件.jpg|RemoteStorage-1": {
      "action": "linked" | "copied" | "skipped" | "failed",
      "method": "link" | "copy",
      "hash": "sha256:...",
      "size": 12345,
      "mtime": 1730000000000,
      "destRel": "2024/bundle-key/trip/a.jpg",
      "reason": "仅 failed 时填写"
    }
  }
}
```

- 多目标时每个目标一条 `results` 项，键含 `target`；一次运行仍只写一片。
- **幂等判断不靠重放全部状态片**：对每个 `bundleId|rel|target` 取最近一次 `action != failed` 的片中记录（按片名排序，跨年目录枚举，§0.5），hash/size/mtime 一致且目标文件存在则跳过。`method` 只作审计，不参与幂等比较——从 link 切到 copy 不算内容变化。
- 保留整段历史便于回溯“某文件曾发布到哪个目标”；不删旧片、不覆盖。
- 状态只用于幂等与审计，不是文件清单的事实源。源标签撤销或 bundle 移出后，状态片保留，不清空、不删目标文件。

## 4. 设计

### 4.1 总体链路

```
[UFS 页面按钮 / 命令]
        ↓
读取 /ufs 年份与 bundle meta
        ↓
按 bundleId 重放 /ufs-tags/<bundleKey>/<年>/*.json 的事件片，筛出 public 节点
        ↓
重放 /net-drive-tags/<dir>/<年>/*.json 找 public_target（0 个 → 停止；N 个 → 全部目标）
        ↓
预检摘要（含目标列表、旧分片/zip 节点跳过数）→ 用户确认
        ↓
逐目标 × 逐文件：解析源路径 → 调服务端受控写入 API（优先 link，跨卷回退 copy）
        ↓
追加一片 /ufs-public-state/<runId>/<年>/... → 结果摘要
```

浏览器负责标签、目标选择、幂等状态和进度；服务端只做“把一个已批准的源文件写入某个已登记网盘缓存目录”的受控动作（同卷硬链接、跨卷复制）。三类标签的读都走「跨年目录枚举 → 按片名升序 → 重放事件片」，不假设单一文件存在（§0.5）。

### 4.2 源路径解析

- `source.kind === 'volume'`：用 `volumeId` 在主机磁盘映射里找到本机盘符/挂载点，拼接 `source.rel` 与节点 `rel`。找不到挂载点时记为失败并跳过该文件。
- `source.kind === 'local'`：直接用 `source.path` 拼接节点 `rel`；仍须经过服务端白名单校验。
- `source.kind === 'zip'`：本期跳过并在结果里明确标注“zip 源暂不支持”。
- **已知限制（不列入待确认）**：UFS bundle 可能来自别的主机，其 `volumeId` 或绝对路径在本机不存在/未挂载；这类节点逐条记为失败（原因 `volume-not-mounted` / `source-not-allowed`），不猜盘符、不跳过整批。这是"网盘不一定可达、源盘也不一定挂载"的正常情况。

### 4.3 服务端受控写入 API（新增，link/copy）

建议 `POST /api/ufs/publish`，单次提交一个目标的一批文件；多目标由浏览器循环调用 N 次（互不影响）：

```json
{
  "target": "RemoteStorage-1",
  "files": [
    {
      "source": "C:\\Photos\\2024\\trip\\a.jpg",
      "bundleId": "vol:xxx/Photos",
      "year": 2024,
      "destRel": "2024/bundle-key/trip/a.jpg",
      "hash": "sha256:..."
    }
  ]
}
```

服务端约束：

1. 沿用 `X-Local-Token` 鉴权。
2. `source` 必须过 `normalizeLocalPath` + `isPathAllowed`；不允许任意路径。
3. `target` 必须能在 `/drive-registry.json` 或本机 `info.json` 里查到对应 `cached/<dir>/data` 目录；不接受用户直接传绝对路径。`cacheRoot` 由 `resolveCodesRoot()` 决定（Windows 优先 `D:\codes\cached`，否则 `C:\codes\cached`），不硬编码。
4. `destRel` 安全化后必须仍在目标 `data/public/` 之内，拒绝 `..` 逃逸；并校验其形状为 `<年>/<bundleKey>/<rel>`——服务端用 `ufsTagKey(bundleId)` 重算 `bundleKey` 与第二段比对，`<年>` 必须是合法的 4 位年份，防止调用方伪造路径。
5. 写入策略：`path.parse(source).root === path.parse(destAbs).root`（且同文件系统）→ `fs.link(source, destAbs)`；捕获 `EXDEV`/`EPERM`/`EMLINK` → `fs.copyFile()` 回退。逐文件返回 `{ action, method, hash, size, reason }`，不因为一个失败回滚整批。
6. 覆盖写前先删目标文件再建链接：`fs.link` 不接受已存在的目标路径；删除只作用于中转站，不影响源文件。
7. 目标 `<dir>/data/public/<年>/<bundleKey>/` 不存在时由服务端递归创建；不要要求用户先手工建目录。

### 4.4 幂等判断顺序

1. 状态文件里没有该 key → 写入（link 或 copy）。
2. 有 key 但目标文件不存在 → 写入。
3. 有 key、目标文件存在，但节点 hash 与记录 hash / 目标文件 hash 不一致 → 删目标后重建。
4. 无节点 hash 时先计算源文件 hash，再重复 2/3。
5. **硬链接额外校验**：源文件若被"写临时文件+改名"替换，目标链接仍指向旧 inode；记录里的 size/mtime 与实际源文件不一致时强制重建。
6. 全部一致 → 跳过并计入“跳过”。`method` 不同（link↔copy）但内容一致仍算跳过。

### 4.5 触发方式

- UI：UFS 页面顶部按钮“发布 public 文件”。
- 命令：同一函数暴露为 `window.zb.runPublicPublish()`，返回摘要对象；可选自定义事件 `zb:publish-public`。
- 任何实现里都不得出现 `setInterval` / `setTimeout` 自触发循环；唯一入口是用户点击或显式命令调用。

### 4.6 建议新增/修改的代码落点（本轮未改）

| 文件 | 作用 |
|---|---|
| `web/tags-sharded.js`（新） | 通用「列目录 → 排序 → 重放事件片」读取器 + 追加片写入器；`ufsTagKey()` 从 onenav 逐字对齐搬过来 |
| `web/ufs-public-publisher.js`（新） | 候选收集、目标选择、预检、调用复制 API、写状态片、结果摘要 |
| `web/drive-cache-store.js` / `web/drive-cache.js` | 网盘标签读写与面板编辑入口（改为追加片） |
| `web/annotations-store.js` | `fs:`/`zip:` 旧标签的只读迁移源；迁移到 `file-tags/<volumeId>/...` 为追加片 |
| `web/app.js` / `web/index.html` | UFS 页按钮、网盘卡片标签徽章、结果展示、命令入口 |
| `server/index.js` + `server/ufs-publish.js`（新） | 受控写入 API（link/copy）、路径校验、逐文件结果 |
| `tests/ufs-public-publish.test.mjs`（新） | 标签筛选、目标选择、路径安全、幂等、失败隔离、事件片重放 |
| **onenav** `fetch.ts` / `ufs.ts` / `FileBrowserApp.tsx` / `UfsView.tsx` | 配套改造：`getFileTags/putFileTags`、`readUfsTags/putUfsTags` 改为跨年目录枚举 + 按片名排序 + 重放读取、追加片写入；不需要额外比较器（§0.5） |

如新增前端文件，必须同步更新 `server/index.js` 静态文件白名单，并重跑发布构建脚本。

### 4.7 zip 标签的独立规则（回答“Zip 需要单独定规则是什么意思”）

`file-tags` 的键是 `volumeId + 卷内相对路径 rel`（§3.0a），前提是文件在磁盘上真实存在、能定位到某块卷。zip 内条目不满足这个前提：

- zip 内文件路径在 `annotations.json` 里是 `zip:<zip 路径>#<包内路径>` 形式的**伪路径**，包内路径不属于任何卷的目录树，套不进 `volumeId + 卷内 rel`。
- zip 文件本身（外层 `.zip`）在磁盘上有真实路径，可以照常走 `file-tags/<volumeId>/...`；**包内条目**才需要独立规则。
- 建议独立命名空间 `zip-tags/<zipKey>/<年>/tags-<ts>-<rand>.json`：
  - `<zipKey>` = zip 文件内容的稳定标识（优先完整 SHA-256，其次 `volumeId + 卷内 rel` 的哈希），保证 zip 被移动/改名后标签仍跟随。
  - 片内事件 `path` 用包内路径（如 `docs/readme.md`），不带 `zip:` 前缀和外层路径。
- 读取侧：外层 zip 走 `file-tags`，包内条目走 `zip-tags`，两者不混；本次发布需求不涉及 zip 内条目（见 §2 非目标 3）。

### 4.8 `fs:` 旧标签迁移与未挂载卷（回答“保留旧 key 等待处理是什么意思”）

`annotations.json` 的旧 key 形如 `fs:c:\photos\2024`（规范化过的绝对路径字符串），统一后的 `file-tags` 键是 `volumeId + 卷内相对路径 rel`（§3.0a，不含盘符）。迁移要做两件事，正好复用 `app.js:relInVolume` 的两段输出：

1. **找到卷身份**：`relInVolume` 拆出盘符 `C:`，用 `hostInfo.volumes['C']` 得到 `volumeId`（卷根 `.dir-struct-id` UUID v4）；没有该文件的老卷回退到 `主机::盘符` 安全化值。
2. **换算路径**：取 `relInVolume` 的 `rel` 段，`Photos/2024`——**去掉盘符、只用卷内相对路径**，作为 `file-tags` 事件片的 `rel`。不写 `C:/Photos/2024`。

“没挂载的盘保留旧 key 等待处理”指第 1 步做不到：

- 移动硬盘/U 盘/网络盘当前没插、没连接，或盘符已变，本机枚举不到该卷，也就读不到 `.dir-struct-id`，无法得到 `volumeId`。
- 此时**不能猜**一个 volumeId 写进新格式（猜错会把标签挂到别的卷上），也不能丢掉旧 key。
- 处理：该 key 仍留在 `/annotations.json` 的 `tags` 里只读保留，不迁移、不删除；在迁移状态里记一条 `pending`（追加片到 `migration/<年>/...`，字段 `{key, tags, reason:'volume-not-mounted', at}`），等卷挂上后重跑迁移补上。
- 迁移是追加不是搬运：新 `file-tags` 片写入成功后，旧 `/annotations.json` 条目保留，直到确认新片已落稳才可在未来版本标为过期；本期不删旧数据。

## 5. 验收标准

1. 代码里搜索不到 `setInterval` 与发布相关的自触发调用。
2. 只在按钮被点击（或命令被显式调用）时产生发布动作。
3. `/ufs-tags/<key>.json` 里根节点打 `public`，bundle 内全部文件节点成为候选。
4. 目录节点打 `public`，只有该前缀下的文件节点成为候选；文件节点打 `public`，只有该文件成为候选。
5. 没有 `public_target` 目标时不写文件；1 个目标发布到该目标；2 个及以上目标全部发布，预检列出全部目标，单个目标失败不影响其余目标。
6. 目标文件路径形如 `data/public/<年>/<bundleKey>/<rel>`，保留原目录层级且按年分片；不越出 `<目标>/data/public/`，`..`、绝对路径、盘符被拒绝。年份取 bundle 加入年。
7. 重复点击发布，第二次全部计入“跳过”，不重复写入。
8. 源文件和目标文件内容一致（hash 校验通过）；同卷时结果为 `linked`、跨卷时为 `copied`，结果摘要能看到实际 `method`。
9. 单个文件/单个目标失败不影响其余，摘要里能看到失败原因。
10. zip 源节点与旧格式 `.json` 分片被跳过，且摘要里给出各自被跳过的数量，不被静默忽略。
11. 大小写敏感：`Public` 不算 `public`，`Photos` 与 `photos` 是两条不同的键。

## 6. 已确认口径（本轮）

1. **写入一律按年分片、只追加新文件、不修改已有文件**（§0.5）：适用于 `file-tags`、`ufs-tags`、`net-drive-tags`、`ufs-public-state`、迁移状态；已有 `/ufs/<年>/` 符合该原则。
2. `volumeId` 作为身份段合理，`volumeId.json` 单片覆盖写不合理，改为按年事件片（§3.0）。
3. zip 内条目用独立 `zip-tags/` 命名空间，不混进 `file-tags/` 的卷路径键空间（§4.7）。
4. 未挂载卷的 `fs:` 旧 key 保留在 `annotations.json`，记 `pending` 待补迁，不猜 volumeId、不丢标签（§4.8）。
5. **标签键适应不同环境**：身份用 `volumeId`（跨机器稳定），路径用卷内相对 `rel`（不含盘符），本机绝对路径运行时由 `volumes` 映射解析（§3.0a）；`annotations` / 现有 `file-tags` 的 host-relative 键只作只读折算源。
6. 不做定时，只有按钮 + 显式命令入口。
7. **中转站写入优先硬链接**：源与 `cached/<dir>/data` 同卷用 `fs.link`，跨卷/失败回退 `fs.copyFile`，结果记录 `method`；不默认用符号链接（§2 P0-4、§4.3）。
8. **多目标扇出**：所有打 `public_target` 的网盘都发布，各自独立幂等与失败隔离；0 个不写（§2 P0-3）。
9. **zip 源节点与旧格式 `.json` 分片本期跳过，但必须在预检/摘要里报告数量**，不能静默（§2 非目标 3/4）。
10. **大小写敏感**：标签字符串和路径 `rel` 都保留原样、严格比较，不做小写折叠（§3.0a）。
11. **网盘标签固定在独立命名空间 `net-drive-tags/`**，不塞进 `file-tags/`（§3.3）。
12. **目标路径 = `data/public/<年>/<bundleKey>/<rel>`**：按年分片 + 保留原目录层级；年份取 bundle 加入年，不取文件 mtime（§2 P0-4）。

## 7. 待确认项（每项已给推荐；未被否决则按推荐实现）

> 以下是**推荐**而非已定需求。实现默认按推荐值走；你不同意时直接推翻对应条目即可，不需要重新讨论其他项。

1. **中转站之后是否立即上传**
   - **推荐**：本期不做。发布动作只写本机 `cached/<dir>/data/public/`（§2 P0-4），上传交给既有网盘同步机制或用户手动触发。
   - 理由：网盘不一定可达，把上传塞进发布会让"发布"这个明确动作受网络状态影响；两步解耦也便于先验证发布链路。

2. **onenav 是否同步改造（排期）**
   - **推荐**：**发布功能先做，onenav 改造随后**。发布本身不依赖 onenav 改造——`ufs-tags` 目前由 onenav 写入，zip-browser 读"旧单片作基线 + 新片覆盖"即可；`net-drive-tags` 是 zip-browser 独占的新命名空间，不碰 onenav。
   - **但标签统一/迁移必须等 onenav**：`file-tags` 改成卷内 rel 事件片后，onenav 仍按旧单片读会看不到新标签。建议顺序：① 发布功能；② onenav 读取侧（跨年目录枚举 + 按片名排序 + 重放）；③ onenav 写入侧（追加片）；④ 旧标签迁移。

3. **兼容期是否合并旧片**
   - **推荐**：不合并，旧整表片永久只读保留；读取时"旧片为基线、新片按序覆盖"（§3.0）。
   - 理由：合并会写新片并需要标记旧片作废，反而增加复杂度；旧片数量有限，读取成本可忽略。若将来真要压缩，另做显式"压缩"功能（追加一张基线片 + tombstone），不改本期设计。

4. **硬链接的语义副作用**
   - **推荐**：接受现状——中转站是**可再生成的缓存**，不是归档快照；源改了中转内容跟着变是符合预期的。源文件被"写临时文件+改名"替换后靠 size/mtime 复检重建（§4.4-5），延迟发现可接受。
   - 若将来要求不可变副本，加显式 `linkMode: 'copy'` 选项，默认仍是 link。

5. **符号链接**
   - **推荐**：本期不做，保留为未来显式 `linkMode: 'symlink'`。
   - 理由：§2 P0-4 列出的 Windows 权限、盘符漂移、悬空链接、上传器跳过等问题，收益（跨卷也能省空间）不足以抵消运维成本。

## 8. 实现状态（2026-11-27）

已实现（第一阶段）：
- `web/tags-sharded.js`：`ufsTagKey`、按年分片事件片读写、跨年目录枚举 + 按片名排序重放；`readUfsTags` 同时读 onenav 旧单片作基线，保证 onenav 已打的 `public` 立即生效。
- `web/ufs-public-publisher.js`：预检、目标扇出、候选展开、hash 补齐、幂等、逐文件隔离、状态片、命令入口。
- `server/ufs-publish.js` + `POST /api/ufs/publish`：token 鉴权、源路径白名单、目标登记与 `destRel` 形状校验、同卷 `fs.link` / 跨卷 `fs.copyFile`、内容一致跳过、逐文件结果。
- `web/app.js`：UFS 首页/年份页「发布 public 文件」按钮、网盘卡片 `public_target` 切换按钮、`window.zb.runPublicPublish()` / `setPublicTarget()`。
- 测试与构建：`npm test` 214 项通过（本需求新增 9 项），`npm run dist` 生成 44 文件产物。

已实现（第二阶段：onenav 读写侧同步改造，2026-11-27）：
- `src/components/apps/filebrowser/sharded-tags.ts`（新）：`stamp` / `safeKey` / `listShards`（跨年枚举 + 片名升序）/ `appendShard` / `replayTagMap`（旧整表片基线 + 事件片重放）/ `readShardedMap` / `appendTagDiff`，与 zip-browser `web/tags-sharded.js` 逐字对齐。
- `fetch.ts`：`getFileTags` 改为跨年枚举 + 重放读取（旧单片 `file-tags/<sanitizeKey>.json` 作基线，新片目录用 `safeKey`）；`putFileTags` 改为整表 diff 成 set/remove 事件片追加，调用签名不变。
- `ufs.ts`：`readUfsTags` / `putUfsTags` 同样改造；清空标签用 `remove` 事件表达，不再 `unlink` 旧片。调用方 `FileBrowserApp.tsx` / `UfsView.tsx` 无需改动。
- `sharded-tags.test.ts`（新）：10 项测试覆盖 safeKey/stamp、重放与乱序、跨年枚举、diff 追加、清空语义、旧片损坏降级。
- 验证：onenav `npm test` 201 项全绿、`npm run build` 成功（`tsc -b` 通过）。

已实现（第三阶段：zip-browser UFS 树内打标签，2026-11-27）：
- `web/tags-sharded.js` 新增 `setUfsNodeTags(connected, bundleId, rel, tags)`：整表写回 diff 成单个 `set`/`remove` 事件片追加，不改旧片；标签大小写原样保留、去重；清空标签用 `remove` 表达。片格式与 onenav `appendTagDiff` 一致。
- `web/app.js`：UFS 树每行（目录/文件）与「整份快照」行都显示标签 chip + `+标签` 就地输入（逗号/顿号分隔，回车确认、Esc 取消）；标签编辑走事件委托并 `stopPropagation`，不会误触行导航；`public` 标签高亮。渲染树时用 `getConnectedFs()` 加载标签表，写入后即时刷新。
- `web/style.css`：新增 `.tz-public` 高亮样式。
- 测试：`setUfsNodeTags` 追加片/读回/清空/大小写敏感（新增 2 项）；`npm test` 217 项（216 通过 1 跳过）、`npm run dist` 44 文件成功。

意义：至此 `public` 标签可在 zip-browser 与 onenav 任一端的 UFS 视图里打，两端写的是同一份 `ufs-tags/` 事件片，发布流程读到的结果一致；不再需要跳到 onenav 打标签。

未实现（按推荐排期）：
- `annotations.json` 的 `fs:`/`zip:` 旧标签迁移。
- 中转站到真实网盘的上传（§7-1）。
- 显式 `linkMode: 'copy' | 'symlink'` 选项（§7-4/5）。

跨端互操作性说明：onenav 写的新事件片（`ufs-tags/<key>/<年>/tags-*.json`）zip-browser 的 `readUfsTags` 已能直接读取；zip-browser 写的发布状态片 onenav 不消费，互不干扰。两端的 `ufsTagKey`、`stamp`、`safeKey`、片名排序与事件结构均逐字一致，因此同一份标签在两端读出结果相同。

修复记录（2026-11-27，提交 `775b4fb`）：
- 现象：在 UFS 树行内标签输入框按 Enter 确认时，控制台报 `Failed to execute 'remove' on 'Element': The node to be removed is no longer a child of this node. Perhaps it was moved in a 'blur' event handler?`，页面加载/交互中断。
- 根因：`Enter` 分支调用 `input.remove()` 触发 `blur`，`blur` 又调用 `finish()`，同一输入框被二次删除。
- 修复：`finish` 增加一次性 `done` 标志；删除前先解绑 `keydown` / `blur` 监听；删除用 `parentNode.removeChild()` 并判空；`refreshUfsTags` 与根节点刷新跳过正含 `.row-tag-input` 的编辑区，避免重绘吞掉正在输入的 DOM。
- 验证：语法检查、`npm test` 217 项（216 通过 1 跳过）、`npm run dist` 44 文件成功；已推送 `git@github.com:weijia/zip-browser.git main`，`origin/main` 同步至 `775b4fb`。
