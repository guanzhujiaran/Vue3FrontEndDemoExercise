# 前端开发计划书（消息系统 message-service）

> 本文档**独立于后端**，只描述前端如何基于已生成的接口 SDK 逐步实现消息系统控制台。
> 后端服务（be-message-service）的接口契约已通过 `@hey-api/openapi-ts` 生成到
> `src/api/community/hey-api/`，下列每个模块都标注了可直接调用的 SDK 函数名，实现时按需 import 即可。
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
| 已生成 SDK | `src/api/community/hey-api/`（sdk.gen.ts / types.gen.ts / client.gen.ts） |
| 已存在页面 | `FeedbackView.vue`、`utils/notification-api-test.ts` |

**SDK 调用约定**：从 `@/api/community/hey-api` 导入对应函数，例如：
```ts
import { listNotifyApiV1MessageNotifyListGet } from '@/api/community/hey-api'
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
- [ ] **未登录访问拦截**：`MessageLayout.vue` 复用 `BiliErrorRouteTo` 未授权提示页（对齐 RPA 浏览器页面）：未登录（`biliUser.uid` 为空）时展示未授权页并倒计时返回首页；心跳在未登录期间暂停，避免未授权请求风暴。
- [x] **通用组件**：`EmptyState.vue`（空态）、`LoadingWrap.vue`（加载/错误）、`PaginationBar.vue`（分页，对接各 list 接口）、`TimeText.vue`（相对时间展示）。
- [x] **全局未读状态 store**：`stores/message_unread.ts`（Pinia，持久化），汇总 M2 未读数，供顶部徽标与各模块联动。

### Phase 1 — 通知中心（M1，核心）

- [x] 通知列表页 `NotifyListView.vue`：分页、按 `NotifyLevelEnum`（normal/important/urgent）与 `NotifyStatusEnum` 筛选、类型图标、相对时间。
- [x] UI 对齐 Bilibili 消息中心：左侧导航（我的消息 / 回复我的 / @我的 / 收到的赞 / 系统通知 / 消息设置）、直接使用 Element Plus 语义化类（`bg-bg-page`/`bg-bg`/`text-text-primary` 等，亮/暗模式自动切换；仅粉色 `msg-pink` 保留特殊色号）、`flex-1` 内部滚动、入口收敛到顶部头像下拉菜单。
- [x] ~~标记已读：`readNotify…Post`（支持批量 `NotifyReadReq.notify_ids`）~~ → **2.49.0 起移除**：后端「读取即已读」（`/notify/list` 返回前自动置为已读），前端不再调用任何标记已读接口，`markNotifyRead` 与「标记已读 / 全部已读」按钮删除；「仅看未读」筛选同步移除（读取即已读后 offset 分页会跳条），新到通知由出参 `is_read` 快照高亮。涉及 hey-api SDK 重新生成（需手动同步）。
- [x] 删除通知：`deleteNotify…Post`。
- [x] 未读角标联动：进入页面/心跳刷新时更新 `stores/message_unread`。
- [x] 通知详情抽屉 `NotifyDetailDrawer.vue`（点击列表项展示全文 + 来源）。
- [x] 管理后台 `NotifyAdminView.vue`：`adminListNotify…Get` 列表 + `createNotify…Post` 发布表单（标题/正文/等级/目标 `NotifyTargetTypeEnum`）+ `updateNotify…Post` 编辑 + `revokeNotify…Post` 撤回。
- [ ] 联调 `pullNotify…Get`（拉取增量）与列表的首次加载。

### Phase 2 — 消息流与未读汇总（M2）

- [x] 顶部未读徽标组件 `UnreadBadge.vue`：调用 `unreadSummaryApiV1MessageMsgFeedUnreadGet`，渲染各模块未读总数。
- [x] 心跳保活：`useHeartbeat.ts`（composable，定时调用 `heartbeatApiV1MessageMsgFeedHeartbeatPost`，间隔参考后端 60s）。
- [x] 与 M1 联动：心跳回调触发未读 store 刷新，列表页提供「刷新」按钮手动兜底。
- [x] **顶部头像下拉菜单挂载刷新未读**：`AvatarDropdown.vue` 在 `onMounted` 时调用 `fetchUnreadSummary`（`msg_feed/unread` 汇总）刷新 `message_unread` store，使「我的消息」徽标在页面挂载时即展示最新未读数，不必等待进入消息中心后的心跳刷新；未登录时跳过，避免未授权请求。
- [x] **子页面 keep-alive 缓存**：`MessageLayout.vue` 的 `<router-view>` 外包一层 `<keep-alive>`，缓存各子页面（会话/回复/@/赞/通知/设置），使切换子路由或切走再切回时**内容与滚动位置保留**、子页面组件不再重复挂载/重复请求数据。
- [x] **心跳防重复**：`useHeartbeat` 的 `onMounted`/`onActivated` 通过 `running` 标志防重，进入消息中心每轮仅触发一次 `sendHeartbeat + unread`；结合 keep-alive 后，子页面首次进入各拉取一次数据，避免重复请求。

### Phase 3 — 事件提醒（M3）

- [ ] 事件列表页 `EventListView.vue`：分页、`EventTypeEnum`（like/reply/at）筛选、来源 `SourceTypeEnum` 展示、已读/未读区分。
- [ ] 已读与批量已读：`readEvent…Post`（`EventReadReq`）、`unreadEvent…Get` 角标。
- [ ] 聚合统计视图 `EventStatsView.vue`：调用 `aggregateEvent…Get`，用 vue-echarts 展示趋势/分类占比。
- [ ] （可选）事件上报调试表单 `reportEvent…Post`（便于自测）。
- [ ] **`GET /event/list` 对齐 B 站 `x/msgfeed/*` 聚合结构**：后端 `EventListResp` 从「单事件明细」改为「按 source_type+source_id 聚合」：`data.latest`（最新若干条）+ `data.total`（cursor 分页，`items[]` 每条含 `users[]` 完整触发者数组 + `item` 内容实体 + `counts` 人数）；前端 `fetchEventList`/`AtListView`/`ReplyListView`/`LikeListView` 同步改解析。涉及 hey-api SDK 重新生成（需手动同步）。
- [ ] **触发者展示收敛**：后端 `users[]` 单条最多 4 个（去重后），删除 `follow` 字段；前端 `EventItemCard` 按 B 站样式：左侧最多 2 个头像堆叠 + 中间「用户 + 动作 + 等N人」+ 右侧「内容预览 + 视频封面」。涉及 hey-api SDK 重新生成（需手动同步）。
- [x] **互动通知点击跳转（bizType + bizId 定位原资源）**：后端 `EventMsgfeedContent` 新增 `biz_id`（见后端 `docs/消息系统实现计划书.md` Phase J，`business`=bizType、`biz_id`=bizId 唯一定位原资源）。前端 `ReplyListView` / `AtListView` / `LikeListView` 的 `openDetail` 改为按 `item.item.business` + `item.item.biz_id` 分发（抽公共函数 `openEventDetail`，位于 `src/utils/eventJump.ts`）：
  - `dynamic`（bizId=dynId）→ `router.push` `MOMENT_DETAIL`（`params.momentId=bizId`）；
  - `comment`（bizId=rpid）→ 调 `commentApi.detail(rpid)` 拿 `oid + type`：`type=dynamic` 跳 `MOMENT_DETAIL`（`query.rpid` 定位该评论）、`type=lottery` 跳 `LOTTERY_CARD_DETAIL`（`query.id=oid&query.rpid`，已有 focusRpid 支持）、其余回落 `uri`；
  - `lottery`（bizId=lotteryId）→ `LOTTERY_CARD_DETAIL`（`query.id=bizId`）；
  - 其它 / `biz_id` 为空 → 回落 `item.item.uri` 外链。
  同时 `MomentDetailView` 支持 `route.query.rpid` 透传给 `LotteryCommentSection.focusRpid`（评论区加载后滚动高亮）。`lottery_comment.ts` 新增 `commentApi.detail(rpid)` 封装。涉及 hey-api SDK 重新生成（需手动同步）。

### Phase 4 — 私信（M4）

- [ ] **评论区 @ 信息对齐 B 站模型**：后端 `CommentItem` 响应由「`@{mid}` 占位符 + `at_users`」改为 B 站式：`message` 直接含 `@昵称` 文本 + `at_name_to_mid`（昵称→mid 映射）+ `at_name_to_mid_str` + `members`（被@用户信息数组）；提交 `CommentAddReq` 支持 `@昵称` 文本 + `at_name_to_mid`。前端 `LotteryCommentItem`/`LotteryCommentSection` 渲染 `@昵称` 为链接、提交时解析 @ 昵称 → mid 映射。涉及 hey-api SDK 重新生成（需手动同步）。
- [ ] 会话列表 `DmSessionList.vue`：`listSessions…Get`，按 `DmRelationEnum`（normal/stranger）分组、未读高亮、最后一条消息预览。
- [ ] 聊天窗 `DmChatView.vue`：`listMessages…Get` 消息气泡（`DmMsgTypeEnum`：text/image/system），滚动加载更多。
- [ ] 发送消息：`sendDm…Post`（`DmSendReq`）。
- [ ] 删除/撤回：`deleteDm…Post`（`DmDeleteReq`）、`recallDm…Post`（`DmRecallReq`，受时间窗口限制，UI 提示）。
- [ ] 会话删除：`deleteDmSession…Post`（`DmSessionDeleteReq`）。
- [ ] 已读水位：`ackDm…Post`（`DmAckReq`，清空未读、抬高水位），进入会话自动 ack。

### Phase 4.5 — 动态话题限制/创建、举报、系统消息

- [x] **评论项布局对齐 B 站**：`LotteryCommentItem.vue` 时间从顶部用户名行移至**正文下方左下角**（与赞/踩/回复同一行左侧）；**右侧加 el-dropdown 三点菜单**（`MoreFilled` 图标），菜单项（对标 B 站）：「复制评论链接」「加入黑名单」「举报」（「删除」仍在底部操作行，仅作者本人可见）；链接复制调用 `navigator.clipboard.writeText`，加入黑名单与举报先占位 `biliMessage.info('功能开发中')` 后续接真实接口
- [x] **动态卡片跳转详情页触发区域收敛**：`MomentCard.vue` 不再整卡点击跳转详情页，仅当点击「发布时间标签（`moment-card__time-label`）」或「正文内容（`moment-content-renderer`）」时才触发 `click` 事件（父组件 `openDetail` 跳 `MOMENT_DETAIL`）。其余区域（头像/用户名/话题卡片/图片/转发卡/互动栏/评论区等）各自绑定独立的点击行为，`click` 事件不冒泡到详情页跳转。
- [ ] **动态话题限制与用户创建**：`MomentPublishForm` 的话题只能从话题广场选择（已支持 el-select），禁止正文里随便携带 `#话题#`；用户可创建话题（需审核，状态枚举 `pending/normal/rejected`，与评论审核一致），后端提供 `createTopic` 接口 + 话题广场 `topic/square` 过滤 `pending` 不展示。前端 `MomentPublishForm` 增加「申请新话题」入口（弹窗 el-input + 提交后提示「待审核」），`MomentContentRenderer` 渲染 `TOPIC` 节点时对 `pending` 话题给视觉区分。
- [ ] **动态卡片话题卡片**：`MomentCard.vue` 在内容上方增加「话题卡片」块（对齐 B 站样式：左侧话题 icon + 话题名 + 讨论数/动态数，hover 显示话题简介），点击跳转话题广场页。后端 `MomentFeedItem.topic` 扩展为 `MomentTopicRef`（含 `topicCover/topicDesc/discussionCount` 等）。
- [ ] **动态举报 + 系统消息通知**：`MomentCard` 右上角加 el-popover 或 dropdown 三点菜单，含「举报」按钮（需登录，`isLoggedIn` 检查），点击打开举报弹窗 `ReportDialog`（选择举报理由枚举 `ReportReasonEnum`：垃圾广告/人身攻击/色情低俗/违法违规/抄袭侵权/其他 + 备注），提交走 `reportMoment` 接口。后端写举报记录 + 通过站内系统消息（`NotifyMessage`）通知举报成功/失败给当前用户。前端 `NotifyListView` 已有系统消息渲染，需新增举报结果的消息类型枚举与卡片样式。涉及后端多项（举报表/系统消息写入）与 hey-api SDK 重新生成（需手动同步）。
- [ ] **话题详情与排序（对齐 B 站）**：后端 `GET /topic/detail/{topicId}` 返回 B 站式 `TopicDetailResp`（`top_details.topic_item`：view/discuss/fav/dynamics/like/share/jump_url/back_color/share_pic/description/ctime；`topic_creator`：uid/face/name；`has_create_jurisdiction`、`close_pub_layer_entry`）；`GET /topic/feed/{topicId}` 增加 `sort` 参数（`hot`/`time`，默认 `hot`）。后端 `TMomentTopic` 扩展 view/discuss/fav/dynamics/like/share/back_color/share_pic/description/ctime 字段（统计计数与话题元信息）；`POST /topic/create` 用户自建话题（需审核 `pending`，与评论审核一致）。前端新增 `TopicDetailView.vue`：顶部话题详情卡片（话题名 + 描述 + 4.5亿浏览/94万讨论/参与话题按钮 + 点赞/收藏/分享），下方 tab（热门/最新）切排序展示该话题下的动态列表。涉及后端多项 + hey-api SDK 重新生成（需手动同步）。

### Phase 5 — 推送（M5）

- [ ] 推送测试页 `PushTestView.vue`：调用 `testPush`（`TestPushRequest`），可选渠道配置（对接 `PushChannelConfig`）。
- [ ] 投递推送表单 `PushSendView.vue`：调用 `pushMessage`（`PushMessage`），标题前缀由后端拼用户标签。
- [ ] 反馈提交：复用/对接已有 `FeedbackView.vue` 与 `submitFeedback`（`FeedbackRequest`），确保回落全局 `MESSAGE_CONFIG`。

### Phase 6 — 消息设置（M6）

- [ ] 设置读取与表单 `SettingView.vue`：调用 setting get 接口（`MessageSettingResp`），编辑免打扰/渠道偏好等。
- [ ] 保存：`update…Setting…Post`（`MessageSettingUpdateReq`），成功提示 + 乐观更新 store。

### Phase 7 — 体验打磨与联调

- [x] **动态收藏夹**：后端新增 `/api/v1/favorite/*`（收藏夹 CRUD、收藏/取消、夹内动态、主页可见性设置）；`MomentDetailView.vue` 收藏按钮改为打开 `MomentFavoriteDialog.vue` 收藏夹选择弹窗（列夹、选夹收藏/取消、新建收藏夹，封面仅存 URL）；`MomentSpaceView.vue` 收藏 tab 展示收藏夹 + 各夹收藏动态（MomentCard 复用）；设置 tab 提供「主页展示收藏」开关（默认开，控制自身主页收藏 tab 显隐）。
- [x] **他人主页收藏展示**：后端新增公开读接口 `GET /favorite/user/folders` / `GET /favorite/user/dynamics`（无需登录，受主人 `showFavorites` 控制，网关已加代理与白名单）；前端 `moment-api.ts` 新增 `fetchUserFavoriteFolders(mid)` / `fetchUserFavoriteDynIds(mid, folderId, ...)`；`MomentSpaceView.vue` 他人主页收藏 tab 加载主人公开收藏夹 + 动态（`showFavorites=0` 或 403 时不展示收藏 tab）。
- [x] **收藏夹封面默认图兜底（纯前端）**：后端收藏夹封面「先审后发」——封面为空/审核未通过时 `coverUrl` 为空。前端 `MomentFavoriteDialog.vue` 收藏夹列表封面（`.moment-favorite-dialog__cover`）改为 `:src="folder.coverUrl || DEFAULT_FOLDER_COVER"` 兜底展示默认封面图（`https://i0.hdslb.com/bfs/vc/b8eb9637fec90527a6dc9737acdc3577e275c7b5.png`，组件内常量 `DEFAULT_FOLDER_COVER`），移除原空封面 Star 图标；不依赖 SDK 重新生成。
- [x] **评论项点击用户名/头像跳转用户空间**：`LotteryCommentItem.vue` 头像（`el-avatar`）与用户名（`.lottery-comment-item__name`）增加点击跳转（`router.push` 到 `MOMENT_USER_SPACE?mid=`），与动态卡（`MomentCard` 头像/用户名跳转）行为对齐；「回复 @用户名」中的被回复用户名同样可点击跳转其用户空间。
- [x] **UserCard 大头像/昵称点击跳转用户空间**：`UserCard.vue`（avatar dropdown 悬浮用户卡片）中的大头像（`.user-card__avatar`）与用户昵称（`.user-card__name`）增加点击跳转（`router.push` 到 `MOMENT_USER_SPACE?mid=`，用 `card.mid`），与其它用户跳转行为对齐。
- [x] **动态发布/转发成功提示**：`MomentPublishForm.vue` 发布/转发成功后改用 `ElMessageBox.alert` 弹出成功 messagebox，5 秒后自动关闭（用户手动关闭时取消定时器，避免泄漏）。
- [x] **评论区加载失败错误态（复用 `BiliError`）**：`LotteryCommentSection.vue` 的 `loadMain` 在 `resp.success === false`（请求失败）时置 `isError = true`，模板以通用错误组件 `BiliError`（`txt="评论加载失败"`、`@click-retry="loadMain"`）替换评论列表/空态区域，展示错误图 + 文案（「点击重试」）+ 重试按钮；`oid` 无效（0/空）的提前返回不视为错误，不展示错误态。复用 `src/components/CommonCompo/Bili-Feedback-Compo/BiliError.vue`（抽奖结果 `BiliAtariResultSlot.vue` 已用同款）。
- [ ] **attach 卡片独立模块渲染（对齐 B 站 `module_additional`）**：后端 2.21.0 起动态 attach 卡不再写入正文 `contentJson` 的 RESOURCE 节点，改存 `TMoment.bizType/bizRid` 只落 bizType+bizId，Feed/详情装配为独立 `moduleType="additional"` 模块（渲染于 desc 正文下方）。前端同步：① `moment-api.ts` 封装 `MomentCreateReq.attach` 字段（`attachResource` 单独提交，不再经 `buildMomentContentNodes` 追加 RESOURCE 节点）；② `MomentCard.vue` / `MomentDetailView.vue` 按 `moduleType="additional"` 在正文下方渲染附加卡（bizType 跳转落地页、name/cover/jumpUrl 由后端 RPC 实时返回）；③ `MomentContentRenderer` 移除 RESOURCE 节点内联渲染（旧数据兼容可保留）。涉及 hey-api SDK 重新生成（需手动同步）。
- [ ] 实时刷新策略：心跳（M2）+ 路由切换刷新 + 手动刷新三者统一，避免请求风暴。
- [ ] 空态 / 错误 / loading 全模块覆盖（复用 Phase 0 通用组件）。
- [ ] 响应式与移动端适配（Element Plus + Tailwind 栅格）。
- [ ] 类型与 lint 校验通过：`pnpm type-check`（vue-tsc）、`pnpm lint`。
- [ ] 后端联调：本地 `docker compose up be-message-service` 起服务，逐模块用真实接口走通 happy path 与异常路径。
- [ ] 文档补充：在 `README.md` 记录消息系统前端路由、所需权限、环境变量。

### Phase 8 — 布局统一与通用化

- [ ] **通用布局提取 `BiliSideNavLayout`**：将 `MessageLayout.vue`（`/app/message`）的「左侧小菜单栏（`el-menu`，可折叠）+ 右侧 header 小标题 + 内容区」布局骨架提取为通用组件 `src/components/CommonCompo/Bili-Container-Compo/BiliSideNavLayout.vue`（直接使用 Element Plus 语义化类：`bg-bg-page`/`bg-bg`/`text-text-primary`，跟随亮/暗主题自动切换）。
  - Props：`navGroups`（分组菜单：`{ title?, items: { name, title, icon?, badge?, badgeValue? }[] }`）、`collapsible`（默认 true）。
  - 折叠/展开切换逻辑内置在组件内，按钮行置顶；按钮内容分两个具名插槽——`collapse-expanded`（展开态显示的具体内容，默认 `Fold` 图标按钮）/ `collapse-collapsed`（折叠态显示的 icon，默认 `Expand` 图标按钮），外部可自行传入文案/样式。
  - **收起态纯图标**：收起态仅显示「icon」单图标（不显示菜单项标题文字，也不弹出 hover tooltip），展开态菜单项横排显示「icon + 完整 `title`（+ badge）」，形成大图（带全称文字）/小图（纯图标）两套形态。**分组标题（`group.title`）在折叠/展开两种状态下都保留显示**，作为分组分隔：展开态左对齐、显示完整 `title`；折叠态居中显示，且支持可选的 `shortTitle` 字段硬编码短名（例如 `RPA 管理` → `RPA`、`消息管理端` → `消息`、`动态管理端` → `动态`、`用户管理端` → `用户`），未提供 `shortTitle` 时回退到 `title`。实现上通过 `el-menu` 的 `:popper-class` 在折叠态传入 `bili-side-nav-layout__popper--hidden`，结合 `src/assets/theme.css` 中 `.bili-side-nav-layout__popper--hidden { display: none !important; }` 全局钩子把折叠态下 Element Plus 自动渲染的菜单标题 tooltip 弹层整个隐藏，从根上避免塌陷/片状样式。
  - **布丁弹性动画**：折叠/展开时侧边栏宽度用回弹曲线过渡 + 果冻摇摆（`scaleX` 先冲过再回弹，duang duang 感），折叠按钮图标同时做左右摇摆（`wobble`）；动画按 Tailwind 4 规范在 `src/assets/theme.css` 的 `@theme` 块内定义 `--animate-sidenav-jelly` / `--animate-sidenav-wobble` 变量（含对应 `@keyframes`），组件内通过 `animate-sidenav-jelly` / `animate-sidenav-wobble` 工具类使用，不写 `<style>`。
  - 内部：`activeIndex` 由 `route.name` 计算、`handleSelect` 跳 `router.push`、`pageTitle` 取 `route.meta.title`；`header-extra` 具名插槽支持 header 右侧按钮。
- [ ] **统一三处布局**：`MessageLayout.vue`（消息中心）/ `MomentLayout.vue`（`/app/moment` 动态）/ `AdminLayout.vue`（`/app/admin` 审核）全部复用 `BiliSideNavLayout`，保持「左侧小菜单栏、右侧主要内容、顶部小标题」统一样式，**三处均启用折叠**（默认 `collapsible=true`）：展开时显示带全称文字的导航、折叠时仅显示 icon 的导航，形成两套左侧导航形态，仅保留业务差异：
  - 消息：6 个菜单项 + 未读 badge + keep-alive 子页 + 未登录拦截；
  - 动态：动态广场/话题广场 + 管理员「审核队列」入口 + header「发布动态」按钮 + Feed keep-alive；
  - 审核：按 `isRpaAdmin`/`isMessageRoot` 权限分组的导航（RPA 管理/消息管理端/动态管理端/用户管理端），子页 `router-view` 直接渲染。

### Phase 9 — 抽奖卡片详情页按 id 拉取详情（`/app/lot-data/card-detail`）

- [x] **卡片数据改为接口拉取**：`LotteryCardDetailView.vue` 进入页面按 `route.query.id`（规范互动资源 ID = `lotdata.lottery_id`）调用爬虫新接口 `POST /api/v1/lottery_database/bili/GetLotteryDetail`（薄封装：`lottery_database_bili_api.ts#getLotteryDetailById`），返回 Lotdata 原始行 + `extra_info`，经 `normalizeLotteryData` 渲染完整卡片。**不再依赖 localStorage 旧缓存传参**：`lottery-detail` store 降级为 id 一致性兜底（缓存卡片的规范化 id 与 URL id 一致才使用），接口成功后回写 store 使旧缓存自愈。
- [x] **空态收敛**：加载中显示骨架屏；加载失败显示「卡片详情加载失败」错误态（`BiliError` 可重试）；仅 URL 无 id 时不渲染卡片。避免「请通过抽奖列表中的「评论区」按钮进入本页面以查看完整卡片…」在正常路径出现。
- [x] **互动 ID 口径**：详情页互动/评论/转发一律使用 URL 中的 lottery_id；缺失 `lottery_id` 的旧缓存数据（预约 sid / 天选 lot_id / 第三方 dynId）由 `BiliLotteryCard.vue` 的 `canInteract` 守卫禁用互动（含头部 ID 徽标隐藏）。
- [x] **hey-api SDK**：SDK 已重新生成，封装层 `getLotteryDetailById` 已切换为 `V1BiliService.getLotteryDetailApiV1LotteryDatabaseBiliGetLotteryDetailPost`（类型 `LotteryDetailResp` / `StandardResponseLotteryDetailResp`），不再 `client` 直连。
- [x] **首页「最新评论」改版**：`HomeView.vue` 将 `<HomeLatestComments />` 移至「功能导航区」上方（hero 之下）；`HomeLatestComments.vue` **保留按资源类型分组的分区框**，展示改为 **el-carousel 轮播**——每页一个资源类型分区框（5s 自动轮播 + hover 箭头 + 底部指示条），框内评论列表超高可滚动，点击跳转对应资源评论区的逻辑不变。
- [x] **最新评论未登录可访问**：be-gateway `JwtModule.js` jwtAuth `unless` 白名单补充 `GET /api/v1/comment/latest`（与 comment/main、/comment/detail、/comment/sub 同口径）；be-message 侧本就经 `resolve_optional_viewer` 允许匿名（匿名仅不回填点赞态），评论写接口仍走 jwtAuth + 上游 RequiredUser。

---

## 四、实现规范（必须遵守，与项目既有规则一致）

1. **UI 组件优先用 Element Plus**：`el-button` / `el-text` / `el-drawer` / `el-table` / `el-form` 等，禁止用原生 `<button>`/`<p>` 替代；尺寸统一用 `large`/`default`，**禁止使用 `small`**。
2. **样式只用 Tailwind 语义化类**：颜色/尺寸走 `src/assets/theme.css` 定义的主题类（如 `text-info-light-3`、`bg-primary`），**禁止 `<style>` 块、禁止 `:style` 内联、禁止手写 `var()`**。
3. **功能命名**：每个业务元素带功能 class（BEM 风格，如 `notify-list__item`），禁止纯 Tailwind 工具类组合作为唯一标识。
4. **数据层隔离**：业务组件只调用 Phase 0 封装的 `message-api.ts`，不要直接散落 hey-api 函数；类型从 `types.gen.ts` 引用，不重复定义。
5. **错误处理**：统一走封装层的错误兜底 + `ElMessage` 提示，列表/表单需有 loading 与空态。
6. **增量推进**：按 Phase 顺序实现，每完成一项打勾；一个模块跑通 happy path 后再进入下一个模块。
7. **分页器收敛到表格 footer**：使用 `el-table-v2` 的管理列表页（如 `CommentAdminView.vue` / `DmAdminView.vue` / `NotifyAdminView.vue`），分页器统一放入表格 `#footer` 插槽，并同步传 `:footer-height`（等于 `PaginationBar` 实际高度，默认 64px；`total <= pageSize` 不显示分页时传 0），不再在表格容器外单独放置 `PaginationBar`。
8. **管理端列表统一 `el-table-v2`**：`MomentAuditListView.vue`（动态审核）/ `TopicAuditListView.vue`（话题审核）/ `AvatarAuditListView.vue`（头像审核）/ `MessageAdminPermission.vue`（管理端权限）从普通 `el-table` 升级为 `el-table-v2` 虚拟滚动表格，整体对齐 `CommentAdminView.vue`：`el-auto-resizer` + 固定高度容器（`h-[calc(100vh-320px)] min-h-105`）+ `#footer` 分页（`PaginationBar`）+ 自定义 `#header-cell` / `#cell` / `#empty` 模板；**移除原 `el-table` 的 `stripe` 与内联 `:header-cell-style` / `:cell-style`（`var()` 内联样式，违反主题规范）**，状态/类型标签统一用 `el-tag` 语义化配色。
9. **管理列表页统一刷新按钮**：所有 `el-table-v2` 管理列表页在**表格紧上方**提供「刷新」按钮（独立一行右对齐，`:icon="Refresh"` `:loading="loading"` 点击重新拉取当前页数据），不再放页面最顶部工具栏（标题行仅保留标题与新建等业务按钮）。`CommentAdminView.vue`（评论审核）/ `DmAdminView.vue`（私信审核）/ `NotifyAdminView.vue`（通知管理）/ `MessageAdminPermission.vue`（管理端权限）/ `MomentAuditListView.vue`（动态审核）/ `TopicAuditListView.vue`（话题审核）/ `AvatarAuditListView.vue`（头像审核）七处统一。

---

## 五、验收口径

- 每个模块：列表加载、筛选/分页、关键写操作（已读/删除/发布等）均可在 UI 走通。
- 未读汇总（M2）在通知/事件/私信操作后实时更新。
- `pnpm type-check` 与 `pnpm lint` 零报错。
- 与 `be-message-service` 联调无 401/403（权限路径符合 `requiresAdmin`/`requiresRoot`）。
