// 共享的 zen-fs-config repo 公告板：整个应用只 connect 一次（由 manifest-sync 的
// <sync-group-configurator> 发起），拿到的 repo 通过这里发布给三个 store 共用——
// 网盘信息 / 标注书签 / 清单选择集，appId 统一 dir-struct-gen。
//
// 为什么需要它：三个 store 的 init() 早于 configurator 的 connected 事件（时序见 app.js），
// 且 store 模块不能反向 import manifest-sync（manifest-sync 已 import manifest-selection，
// 会形成循环依赖）。所以用一个无依赖的小模块做单向发布/订阅。
//
// 注意：这里不创建 repo、不 connect，只保存并分发那一次 connect 的结果。
// repo 可能是「带远端 replica」或「纯本地 IndexedDB」，取决于用户是否配置了同步后端——
// zen-fs-config 在两种情况下都会给出可用的 repo，因此 store 不需要额外的存储后端。

let currentRepo = null;
const listeners = new Set();

/** 当前 connect 得到的 repo；未收到 connected 前为 null。 */
export function getConfigRepo() {
  return currentRepo;
}

/** 由 manifest-sync 在 connected / 断开时调用，把 repo 发布给所有订阅者。 */
export function publishConfigRepo(repo) {
  currentRepo = repo || null;
  for (const listener of [...listeners]) {
    try {
      listener(currentRepo);
    } catch (err) {
      console.warn('config-repo listener failed', err);
    }
  }
}

/**
 * 订阅 repo 变化。若当前已有 repo，会立即以它回调一次（覆盖 late subscriber）。
 * 返回取消订阅函数。
 */
export function onConfigRepo(listener) {
  listeners.add(listener);
  if (currentRepo) {
    try { listener(currentRepo); } catch (err) { console.warn('config-repo listener failed', err); }
  }
  return () => listeners.delete(listener);
}
