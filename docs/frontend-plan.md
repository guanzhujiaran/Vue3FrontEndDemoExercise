# 前端开发计划书（消息系统 message-service）

> 本文档**独立于后端**，只描述前端如何基于已生成的接口 SDK 逐步实现消息系统控制台。
> 后端服务（be-message-service）的接口契约已通过 `@hey-api/openapi-ts` 生成到
> `src/api/notify/hey-api/`，下列每个模块都标注了可直接调用的 SDK 函数名，实现时按需 import 即可。
>
> 用法：每完成一项，把前面的 `- [ ]` 改成 `- [x]`。

---

## 一、技术栈与项目现状

| 项 | 现状 |
| --- | --- |
| 框架 | Vue 3 + TypeScript + Vite |
| UI | **Element Plus（默认/large 尺寸）+ Tailwind CSS 4**（二者共存，语义化主题类优先） |
| 状态 | Pinia + `pinia-plugin-persistedstate` |
| 路由 | Vue Router（已含 `/app/feedback`、admin 守卫 `requiresAdmin`） |
| 网络 | axios / ofetch + **hey-api 生成的 SDK**（`responseStyle: 'data'`，已注入 JWT） |
| 图表 | echarts / vue-echarts（事件聚合统计用） |
| 已生成 SDK | `src/api/notify/hey-api/`（sdk.gen.ts / types.gen.ts / client.gen.ts） |
| 已存在页面 | `FeedbackView.vue`、`utils/notification-api-test.ts` |

**SDK 调用约定**：从 `@/api/notify/hey-api` 导入对应函数，例如：
```ts
import { listNotifyApiV1MessageNotifyListGet } from '@/api/notify/hey-api'
const res = await listNotifyApiV1MessageNotifyListGet({ query: { page: 1, size: 20 } })
// res 已是 data（responseStyle:'data'），类型由 sdk.gen 推导
```

---

## 二、模块划分（与后端 API 一一对应）

| 模块 | 后端前缀 | 前端对应页面/组件 | 关键 SDK 函数 |
| --- | --- | --- | --- |
| **M1 通知中心 Notify** | `/api/v1/message/notify/*` | 通知列表、通知详情、管理后台 | `listNotify…Get` `pullNotify…Get` `unreadNotify…Get` `readNotify…Post` `deleteNotify…Post` `createNotify…Post` `updateNotify…Post` `revokeNotify…Post` `adminListNotify…Get` |
| **M2 消息流 MsgFeed** | `/api/v1/message/msg_feed/*` | 顶部未读徽标、心跳 | `unreadSummaryApiV1MessageMsgFeedUnreadGet` `heartbeatApiV1MessageMsgFeedHeartbeatPost` |
| **M3 事件提醒 Event** | `/api/v1/message/event/*` | 事件列表、聚合统计 | `listEvent…Get` `aggregateEvent…Get` `reportEvent…Post` `readEvent…Post` `unreadEvent…Get` `deleteEvent…Post` |
| **M4 私信 DM** | `/api/v1/message/dm/*` | 会话列表、聊天窗 | `listSessions…Get` `listMessages…Get` `sendDm…Post` `deleteDm…Post` `recallDm…Post` `ackDm…Post` `deleteDmSession…Post` |
| **M5 推送 Push** | `/api/v1/message/push/*` | 推送测试、投递、反馈 | `pushMessage`（push）`testPush`（test）`submitFeedback`（feedback） |
| **M6 消息设置 Setting** | `/api/v1/message/setting/*` | 设置表单 | `get…Setting…Get` `update…Setting…Post`（以 types.gen 中 `MessageSettingResp` / `MessageSettingUpdateReq` 为准） |
| **M0 基础设施** | `/health` | 布局/路由/权限/通用组件 | `healthHealthGet` |

> 说明：本服务鉴权依赖上游网关注入的 `x-bili-*` 头（前端走现有 JWT / admin 守卫即可，无需在前端处理 `x-bili-*`）。

---

## 三、分阶段实施计划

### Phase 0 — 基础设施与脚手架

- [x] **SDK 统一封装**：在 `src/api/notify/` 下新增 `message-api.ts`，对 hey-api 函数做薄封装（统一入参、loading/错误兜底、空数据处理），业务组件只调用封装层。
- [x] **布局骨架**：新增 `MessageLayout.vue`（侧边导航 + 内容区），作为消息系统所有页面的父布局；在 `router/index.ts` 注册 `/app/message` 路由组。
- [x] **权限守卫**：复用现有 `requiresAdmin` 逻辑，消息系统管理类页面（通知管理、设置）标记 `requiresAdmin`/`requiresRoot`。
- [x] **通用组件**：`EmptyState.vue`（空态）、`LoadingWrap.vue`（加载/错误）、`PaginationBar.vue`（分页，对接各 list 接口）、`TimeText.vue`（相对时间展示）。
- [x] **全局未读状态 store**：`stores/message_unread.ts`（Pinia，持久化），汇总 M2 未读数，供顶部徽标与各模块联动。

### Phase 1 — 通知中心（M1，核心）

- [x] 通知列表页 `NotifyListView.vue`：分页、按 `NotifyLevelEnum`（normal/important/urgent）与 `NotifyStatusEnum` 筛选、类型图标、相对时间。
- [x] UI 对齐 Bilibili 消息中心：左侧导航（我的消息 / 回复我的 / @我的 / 收到的赞 / 系统通知 / 消息设置）、暗色主题、`flex-1` 内部滚动、入口收敛到顶部头像下拉菜单。
- [x] 标记已读：`readNotify…Post`（支持批量 `NotifyReadReq.notify_ids`）。
- [x] 删除通知：`deleteNotify…Post`。
- [x] 未读角标联动：进入页面/心跳刷新时更新 `stores/message_unread`。
- [x] 通知详情抽屉 `NotifyDetailDrawer.vue`（点击列表项展示全文 + 来源）。
- [x] 管理后台 `NotifyAdminView.vue`：`adminListNotify…Get` 列表 + `createNotify…Post` 发布表单（标题/正文/等级/目标 `NotifyTargetTypeEnum`）+ `updateNotify…Post` 编辑 + `revokeNotify…Post` 撤回。
- [ ] 联调 `pullNotify…Get`（拉取增量）与列表的首次加载。

### Phase 2 — 消息流与未读汇总（M2）

- [x] 顶部未读徽标组件 `UnreadBadge.vue`：调用 `unreadSummaryApiV1MessageMsgFeedUnreadGet`，渲染各模块未读总数。
- [x] 心跳保活：`useHeartbeat.ts`（composable，定时调用 `heartbeatApiV1MessageMsgFeedHeartbeatPost`，间隔参考后端 60s）。
- [x] 与 M1 联动：心跳回调触发未读 store 刷新，列表页提供「刷新」按钮手动兜底。

### Phase 3 — 事件提醒（M3）

- [ ] 事件列表页 `EventListView.vue`：分页、`EventTypeEnum`（like/reply/at）筛选、来源 `SourceTypeEnum` 展示、已读/未读区分。
- [ ] 已读与批量已读：`readEvent…Post`（`EventReadReq`）、`unreadEvent…Get` 角标。
- [ ] 聚合统计视图 `EventStatsView.vue`：调用 `aggregateEvent…Get`，用 vue-echarts 展示趋势/分类占比。
- [ ] （可选）事件上报调试表单 `reportEvent…Post`（便于自测）。

### Phase 4 — 私信（M4）

- [ ] 会话列表 `DmSessionList.vue`：`listSessions…Get`，按 `DmRelationEnum`（normal/stranger）分组、未读高亮、最后一条消息预览。
- [ ] 聊天窗 `DmChatView.vue`：`listMessages…Get` 消息气泡（`DmMsgTypeEnum`：text/image/system），滚动加载更多。
- [ ] 发送消息：`sendDm…Post`（`DmSendReq`）。
- [ ] 删除/撤回：`deleteDm…Post`（`DmDeleteReq`）、`recallDm…Post`（`DmRecallReq`，受时间窗口限制，UI 提示）。
- [ ] 会话删除：`deleteDmSession…Post`（`DmSessionDeleteReq`）。
- [ ] 已读水位：`ackDm…Post`（`DmAckReq`，清空未读、抬高水位），进入会话自动 ack。

### Phase 5 — 推送（M5）

- [ ] 推送测试页 `PushTestView.vue`：调用 `testPush`（`TestPushRequest`），可选渠道配置（对接 `PushChannelConfig`）。
- [ ] 投递推送表单 `PushSendView.vue`：调用 `pushMessage`（`PushMessage`），标题前缀由后端拼用户标签。
- [ ] 反馈提交：复用/对接已有 `FeedbackView.vue` 与 `submitFeedback`（`FeedbackRequest`），确保回落全局 `MESSAGE_CONFIG`。

### Phase 6 — 消息设置（M6）

- [ ] 设置读取与表单 `SettingView.vue`：调用 setting get 接口（`MessageSettingResp`），编辑免打扰/渠道偏好等。
- [ ] 保存：`update…Setting…Post`（`MessageSettingUpdateReq`），成功提示 + 乐观更新 store。

### Phase 7 — 体验打磨与联调

- [ ] 实时刷新策略：心跳（M2）+ 路由切换刷新 + 手动刷新三者统一，避免请求风暴。
- [ ] 空态 / 错误 / loading 全模块覆盖（复用 Phase 0 通用组件）。
- [ ] 响应式与移动端适配（Element Plus + Tailwind 栅格）。
- [ ] 类型与 lint 校验通过：`pnpm type-check`（vue-tsc）、`pnpm lint`。
- [ ] 后端联调：本地 `docker compose up be-message-service` 起服务，逐模块用真实接口走通 happy path 与异常路径。
- [ ] 文档补充：在 `README.md` 记录消息系统前端路由、所需权限、环境变量。

---

## 四、实现规范（必须遵守，与项目既有规则一致）

1. **UI 组件优先用 Element Plus**：`el-button` / `el-text` / `el-drawer` / `el-table` / `el-form` 等，禁止用原生 `<button>`/`<p>` 替代；尺寸统一用 `large`/`default`，**禁止使用 `small`**。
2. **样式只用 Tailwind 语义化类**：颜色/尺寸走 `src/assets/theme.css` 定义的主题类（如 `text-info-light-3`、`bg-primary`），**禁止 `<style>` 块、禁止 `:style` 内联、禁止手写 `var()`**。
3. **功能命名**：每个业务元素带功能 class（BEM 风格，如 `notify-list__item`），禁止纯 Tailwind 工具类组合作为唯一标识。
4. **数据层隔离**：业务组件只调用 Phase 0 封装的 `message-api.ts`，不要直接散落 hey-api 函数；类型从 `types.gen.ts` 引用，不重复定义。
5. **错误处理**：统一走封装层的错误兜底 + `ElMessage` 提示，列表/表单需有 loading 与空态。
6. **增量推进**：按 Phase 顺序实现，每完成一项打勾；一个模块跑通 happy path 后再进入下一个模块。

---

## 五、验收口径

- 每个模块：列表加载、筛选/分页、关键写操作（已读/删除/发布等）均可在 UI 走通。
- 未读汇总（M2）在通知/事件/私信操作后实时更新。
- `pnpm type-check` 与 `pnpm lint` 零报错。
- 与 `be-message-service` 联调无 401/403（权限路径符合 `requiresAdmin`/`requiresRoot`）。
