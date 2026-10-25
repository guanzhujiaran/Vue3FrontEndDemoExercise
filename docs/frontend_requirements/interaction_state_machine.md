# 点赞 / 收藏互动态状态机

> 状态：已落地（前端）
> 涉及：动态详情页、动态推荐流、个人空间动态 tab、话题流、空间时间线、抽奖卡片互动条、RPA/抽奖资源互动条

## 1. 问题背景

动态详情页「取消收藏后，收藏小按钮没有响应式变化」。排查后确认不是单点问题，而是**点赞/收藏态缺少统一状态模型**导致的一类问题：

| # | 问题 | 后果 |
|---|---|---|
| 1 | `MomentDetailView` 渲染的 `MomentCard` 未监听 `@status-change`（列表页有） | 详情页卡片收藏按钮点了没反应 |
| 2 | 详情页悬浮工具栏收藏按钮只绑定计数，无 `isFavorite` 激活态 | 收藏/取消后视觉无变化 |
| 3 | 收藏夹弹窗 `changed` 事件不携带数据，父组件只能整页重查互动态 | 多一次请求 + 重查回来前的旧态窗口 |
| 4 | `MomentFeedList.refreshStatus` 调用的 `loadStatus` 会过滤掉已缓存 id | 收藏后「刷新」等于什么都没做 |
| 5 | 4 个列表页各抄一份 `statusMap + 点赞乐观更新`，点赞取 `interaction` 模块的 `isLike`（与 `/interaction/status` 不同源） | 按钮态与计数打架，改一处漏三处 |
| 6 | `ResourceInteractionBar` 使用 `computed` 但未 import | 潜在运行期报错 |

## 2. 方案：互动态状态机

### 2.1 状态模型

`src/utils/interaction/interactionMachine.ts`（纯函数，无 Vue 依赖）

```
phase: 'idle' | 'syncing' | 'synced' | 'mutating' | 'error'
active: boolean     // 当前用户是否已赞 / 已收藏（收藏 = 收藏在任一收藏夹）
count: number       // 赞数 / 收藏数
snapshot: { active, count } | null   // 乐观更新快照，失败回滚用
error: string | null
```

事件与迁移：

```
idle ──SYNC──▶ syncing ──SYNC_OK──▶ synced
                   └────SYNC_FAIL──▶ synced
synced ──TOGGLE(nextActive)──▶ mutating ──TOGGLE_OK(active?, count?)──▶ synced
                                  ├────TOGGLE_FAIL──▶ error（回滚到快照）
                                  ├────APPLY────────▶ synced（外部权威数据浅合并）
                                  └────RESET────────▶ idle
```

约定：
- `TOGGLE` 在 `syncing` / `mutating` 阶段**被拒绝**（返回同一引用），天然防并发点击。
- `TOGGLE` 时按 `count ± 1` 乐观更新并落快照；`TOGGLE_OK` 优先采用后端回包计数。
- `APPLY` 用于弹窗 / 父组件回传权威数据，不经过乐观流程，直接落 `synced`。
- 非法转移一律返回原引用（`Object.is` 相等），调用方可据此跳过后续副作用。

### 2.2 分层

| 文件 | 职责 |
|---|---|
| `src/utils/interaction/interactionMachine.ts` | 纯 reducer + `formatInteractionCount` / `stepInteractionCount` |
| `src/utils/interaction/favoriteSync.ts` | `FavoriteChangedPayload`（收藏夹集合 + isFavorite + favoriteCount）与 `toFavoriteChanged` |
| `src/composables/useInteractionMachine.ts` | 单资源状态机（详情页、互动条）：`active/count/pending/failed` + `sync/toggle/toggleOk/toggleFail/apply/reset` |
| `src/composables/useInteractionStatusMap.ts` | 列表页互动态仓库：`statusOf / ensure(bizIds, force) / applyFavorite / toggleLike / clear` |

### 2.3 数据流

```
收藏夹弹窗 toggleFolder
  └─ addFavorite/removeFavorite → resp.favoriteCount
      └─ commitFavoriteSet(folders, resp.favoriteCount)
          ├─ favFolderIds = new Set(...)            // 弹窗内勾选态
          └─ emit('changed', FavoriteChangedPayload)  // 事件驱动，不再整页重查
                ├─ MomentCard        → 本地覆盖态 + emit('statusChange', id, payload)
                ├─ 列表页父组件       → applyFavorite(id, payload) 浅合并 statusMap
                ├─ 详情页            → favMachine.apply(...) 并回写 status
                └─ ResourceInteractionBar → favMachine.apply(...)
```

点赞：`toggleLike` / `handleThumb` 同样走乐观更新 + 失败回滚，并同步修正卡片 `interaction` 模块的 `isLike`，保持双数据源一致。

## 3. 验收标准

1. 动态详情页：收藏 → 取消收藏，卡片内收藏星标与右侧悬浮工具栏收藏按钮**同时**高亮/取消高亮，收藏数同步 ±1。
2. 推荐流 / 空间动态 tab / 话题流 / 空间时间线：卡片内收藏后按钮即时高亮，计数即时变化，不产生多余的互动态重查请求。
3. 点赞：连续快速点击不产生重复请求（状态机拒绝并发）；请求失败按钮态与计数自动回滚并提示。
4. 切换资源（详情页切动态 / 列表页换一换 / 切换空间、话题）后互动态复位，不残留上一资源的高亮与计数。

## 4. 单元测试

已引入 `vitest`（配置 `vitest.config.ts`，用例目录 `tests/unit/`，命令 `npm run test` / `npm run test:unit:watch`）。只覆盖纯逻辑层，不启 nuxt 环境；组件交互仍走 e2e（playwright）。

| 用例文件 | 覆盖点 |
|---|---|
| `interactionMachine.spec.ts` | 初始态、`SYNC/SYNC_OK/SYNC_FAIL`、`TOGGLE/TOGGLE_OK/TOGGLE_FAIL` 快照回滚、`APPLY/RESET`、并发与非法转移返回同引用、计数工具函数 |
| `useInteractionMachine.spec.ts` | composable 对外命令语义：`sync/syncStart/syncFail`、`toggle` 拒绝并发、`toggleOk` 回包落定、`toggleFail` 回滚 + `failed`、`apply/reset` |
| `useInteractionStatusMap.spec.ts` | `ensure` 缓存过滤与 `force`、`applyFavorite` 优先用后端计数 / 缺省按态翻转 / 同态不刷歪、无互动态兜底重查、`toggleLike` 乐观更新 + 回包落定 + 失败回滚、`clear` |
| `favoriteSync.spec.ts` | 载荷构造：空集合=未收藏、去重剔空、`favoriteCount` 透传与缺省 |

`tests/unit/**` 已加入 `tsconfig.app.json` 的 `include`，随 `npm run type-check` 一并检查。

## 5. 图标资源（一份资源 + 外部染色）

`assets/svgs/**` 已全部归一化为 `width="100%" height="100%"` + `fill="currentColor"`（`dislike.svg` / `dislike_active.svg` / `like_active.svg` / `side_toolbar/*.svg` 本轮改造）。原理：

- SVG 的 `fill` 是**继承属性**，且**CSS 声明优先级高于 presentation attribute**；
- 因此 `fill="currentColor"` + 外部 `text-*`（color）即可染色，也可用 Tailwind `fill-*` 直接覆盖；
- 新增 `src/components/CommonCompo/BiliIcon.vue` 统一收口：`name` 选图标、`size` 给尺寸 class、外部 class 给颜色，内部再兜底 `fill-current`（防止将来新 svg 漏写 currentColor 变黑块）。业务侧不再重复写 `el-icon` + `?component` + `w-full h-full`。

已迁移：`MomentStatBar`、`ResourceInteractionBar`、`MomentDetailView`（悬浮工具栏）、`BiliLotteryCard`。

约定：
- 只差颜色的状态**不拆资源**（收藏：未激活 `text-text-placeholder` / 已激活 `text-warning`）；
- 仅形状不同才成对（点赞 `like` / `likeActive`），且两份都需归一化写法；
- 遗留待补资源：`src/assets/svgs/dynamic/detail/side_toolbar/favorite_active.svg`（若要实心星形）。