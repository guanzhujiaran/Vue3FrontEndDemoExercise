# RPA 浏览器时长与会员权益 - 前端需求

> 对应后端计划书：`RPA-Browser/docs/浏览器使用时长与会员权益计划书.md`
> 后端接口前缀：`/browser/membership`（全部 POST，mid 由请求头透传，数值字段均为 str）

## 1. 页面：时长账户（rpa-browser 下新页签「时长权益」）

### 1.1 账户概览卡片
- 余额展示：`balance_seconds`（秒, str）格式化为「X 小时 Y 分钟」。
- 月卡状态：
  - 生效中（`month_card.active=true`）：显示到期时间 `expire_at`，标签「月卡生效中」；
  - 无月卡 / 已过期：显示「未开通」，提供「兑换月卡」入口（滚动到兑换区）。
- 今日签到状态：`signed_today=true` 时签到按钮置灰并显示「今日已签到」。

### 1.2 签到
- 按钮「签到」→ 调 `POST /browser/membership/sign_in`。
- 成功后弹提示：本次获得时长（`reward_seconds` 格式化）与连续天数 `continuous_days`。
- 业务码 `5005`（今日已签到）按普通提示处理，不按错误弹窗。

### 1.3 兑换码
- 输入框 + 「兑换」按钮 → `POST /browser/membership/redeem`。
- 成功：区分结果类型展示「获得时长 XX」或「月卡已开通至 XX」。
- 业务码 5002/5003/5004 分别提示：码无效/已用尽/已兑换过。

### 1.4 时长流水
- 分页表格（page / per_page，均以 str 传参）→ `POST /browser/membership/ledger_list`。
- 列：时间、类型（签到/兑换/消耗/活动/调整）、变动（± 格式化）、变动后余额、关联（工作流名/备注）。
- CONSUME 类型展示 `workflow_id`/`run_id`，点击可跳转对应运行记录。

## 2. 页面：使用统计

- 日期范围选择（默认最近 30 天）→ `POST /browser/membership/usage_stats`。
- 汇总卡片：总使用时长、其中工作流消耗、手动调试时长（不扣费）、定时运行次数。
- 图表：按日堆叠柱状图（workflow_seconds / manual_seconds），按浏览器可筛选（`browser_id` 可选）。

## 3. 交互约束

- 数值统一 str 传输，展示层格式化（秒 → 人读时长）。
- 月卡生效期间定时工作流不扣时长，余额卡片需展示「月卡生效中，定时任务免扣」文案。
- 手动启动浏览器 / 手动运行工作流不产生扣费，统计页需注明「手动调试不计费」。

## 4. SDK 依赖

以上接口需要重新生成 `src/api/browser/hey-api/` SDK（新增 时长权益Service），
由用户手动执行同步后再进行前端接入。

## 5. 2026-10-03 变更：时长明细「获得 + 消耗」一起展示

背景：账户概览只有「剩余时长 / 累计获得 / 累计消耗」三个数字，用户看不到时长的来源与去向，
希望剩余时长旁有一份**获得明细**，且与消耗记录在同一个列表里一起展示。

### 5.1 明细区（原「时长流水」）调整
- 区块标题改为「时长明细」，语义为获得（签到 / 兑换 / 活动 / 调整）与消耗（定时工作流扣费）的统一流水。
- 顶部汇总行：`已加载 N / total 条` + `获得 X`（绿色）+ `消耗 Y`（红色），
  合计只统计**已加载**记录，账户级全量口径仍以概览卡片的 `total_granted_seconds` /
  `total_consumed_seconds` 为准。
- 筛选：`el-radio-group`（large）三档 —— 全部 / 仅获得 / 仅消耗，作用于已加载记录；
  筛选后为空展示对应空态文案（区分「暂无流水记录」与「已加载记录中暂无获得/消耗项」）。
- 列表项保持原有：类型标签、±变动、变动后余额、时间、工作流 / 运行 / 浏览器 / 备注关联信息。
- 新增「刷新」按钮，重新拉取第一页。

### 5.2 数值格式化修正
- `formatSeconds` 支持负数：消耗类记录此前被 `Math.max(0, ...)` 截断显示为「0 秒」，
  现在按绝对值格式化并保留负号（`-30 分钟`），正数项仍由模板补 `+` 前缀。

### 5.3 接口影响
- 后端 `ledger_list` 新增可选入参 `change_types`（逗号分隔的 `LedgerChangeType` 值，
  空 = 不过滤），配套计划书见 `RPA-Browser/docs/浏览器使用时长与会员权益计划书.md` §10。
- hey-api SDK 已由用户手动重新生成，`LedgerListRequest.change_types` 可用。
- 封装层 `membershipApi.LedgerList(page, perPage, changeTypes?)` 透传该参数；
  页面筛选映射：全部 → `''`、仅获得 → `sign_in,activity,redeem,adjust`、仅消耗 → `consume`。
- 筛选为**服务端过滤**：切换筛选后 `watch` 重置到第一页重新拉取，滚动加载同样按当前筛选条件翻页，
  因此「仅获得」也能翻到全部历史获得记录（不再是"只能过滤已加载的那一页"）。
- 顶部「获得 / 消耗」合计仍只统计已加载记录，全量口径以概览卡片的
  `total_granted_seconds` / `total_consumed_seconds` 为准。

## 6. 2026-10-04 变更：签到日历

需求：用一个日历展示本月签到了多少天，并把「连续签到每天递增的奖励时长」直接标在对应日期上。

### 6.1 布局
- 原「签到 & 兑换」一行拆成两栏（`grid lg:grid-cols-2`）：
  - 左：**签到日历卡片**（`el-calendar` + 汇总行 + 签到按钮）；
  - 右：**兑换码卡片**（输入框 + 兑换按钮 + 说明）。
- 汇总行：`本月签到 X 天 · 合计 <时长> · 当前连续 Y 天`。

### 6.2 日历格子
- 使用 `el-calendar` 的 `#date-cell` 插槽自定义格内内容：上行日期数字，下行当天奖励（`+30 分钟`、`+40 分钟`…）。
- 奖励文案取 `days[].reward_seconds`（`formatRewardShort` 紧凑格式化），直接反映连续签到递增规则，不在前端二次计算。
- 已签到格：`bg-success-light-9` + `border-success-light-8`；未签到格：`bg-fill-light`。
- `range` 收敛为当月 1 号 ~ 月末，避免补白日；`v-model` 绑展示月份，`watch` 变化后按该月重新请求。
- 加载态用 `v-loading`；签到成功后同时刷新账户概览与日历。

### 6.3 接口
- 新增 `POST /browser/membership/sign_in/calendar`（见计划书 §11），请求 `{ month?: "YYYY-MM" }`，
  响应 `month / days[] / signed_days / total_reward_seconds / current_continuous_days`。
- 封装层 `membershipApi.SignInCalendar(month?)`；hey-api SDK 已由用户手动重新生成。

## 7. 2026-10-04 变更：签到玩法改版前端（悬浮奖励 + 补登卡 + 档位兑换）

对应后端计划书 `RPA-Browser/docs/浏览器使用时长与会员权益计划书.md` §12 / §13（v1.4 / v1.5）。

### 7.1 规则口径（以后端 JSON 配置为准）
- 每日签到发**固定时长**（`sign_in_rewards.json` 的 `daily_reward_seconds`），不再连续递增；
- **累计签到天数**（断签不清零）解锁 7d / 14d / 28d 三档，**手动点「兑换」**才发奖；
- **补登卡**：仅来源为档位奖励，持有上限 `makeup_card_max`（发放封顶）；
- **补签**：可补未签到的过去日期（`makeup_window_days=0` 时仅当月），每次消耗 1 张卡。

### 7.2 日历
- 格内**只显示日期数字**；当天奖励改为 `el-tooltip` 悬浮显示：
  - 已签到：`已签到 · 获得 1 小时`（补签日追加「（补签）」）；
  - 可补登：`未打卡 · 可补登（消耗 1 张补登卡，获得 1 小时）`，**点击该格直接补签**；
  - 其他：`未打卡`。
- 格子配色：已签到 `bg-success-light-9`、可补登 `bg-warning-light-9`（可点击）、未签到 `bg-fill-light`；
- 下方图例：已打卡 / 未打卡 / 可补登（点击补签）。

### 7.3 顶部信息与进度
- 概览行：累计签到 X 天 · 本月 Y 天（补签 Z 天）· 补登卡 N/M 张（数据来自 `sign_in/overview`）；
- 里程碑进度条：`当前累计 / 下一档位天数` + 「再签 N 天可领 `tier` 档奖励（时长 + N 张补登卡）」；
- 每日签到按钮旁新增「选择奖励」按钮（打开档位弹窗），提示文案按档位汇总动态生成。

### 7.4 选择奖励弹窗
- 三张卡片（入门 7d / 进阶 14d / 巅峰 28d），展示：档位名、所需累计天数、时长、补登卡数量、状态标签；
- 状态：`locked` → 灰卡 + 「还差 N 天」；`unlocked` → 黄框高亮 + 「立即兑换」按钮；`exchanged` → 「已兑换」；
- 兑换成功提示包含时长与补登卡，并刷新概览 / 日历 / 账户；5013 / 5014 原样展示后端 msg。

### 7.5 接口
- `sign_in/overview`（新增，结构对齐外部抓包，资产项只有时长 + 补登卡）；
- `sign_in/calendar`（`can_makeup` / `is_makeup` / `next_milestone` 新增字段）；
- `sign_in/makeup`、`sign_in/reward_exchange`（新增）；原 `sign_in/rewards` 已由 overview 取代。
- hey-api SDK 已由用户手动重新生成；封装层 `SignInOverview` / `MakeupSignInRaw` / `ExchangeSignRewardRaw`。

## 8. 2026-10-04 变更：管理端签到奖励配置页

背景：§7 的签到玩法口径全部由后端 `app/data/sign_in_rewards.json` 驱动，运营此前只能改服务器上的文件。
本次在管理端补齐可视化配置入口。

### 8.1 入口与路由
- 位置：管理后台 → 「RPA 管理」分组 → **签到奖励配置**（与「兑换码管理」并列）；
- 路由：`/app/admin/rpa/membership-sign-rewards`，路由名 `ADMIN_RPA_MEMBERSHIP_SIGN_REWARDS`，`requiresAdmin`；
- 页面：`src/views/rpa-browser/admin/MembershipSignRewardAdmin.vue`。

### 8.2 页面结构
- 基础奖励参数：玩法上线日期（`el-date-picker`，`YYYY-MM-DD`）、签到判定时区（下拉可选 / 允许手填）、
  每日签到奖励（**按分钟录入，提交时 ×60 转秒**）、补登卡持有上限、补签窗口天数（`0` = 仅限当月）；
- 累计奖励档位：表格行内编辑，每行含档位标识（`7d / 14d / 28d`）、所需累计天数、发放时长（分钟）、发放补登卡；
  支持「新增档位」（自动跳过已用标识、天数取当前最大 +7）与「删除」；
- 底部操作：保存配置 / 重新读取，并展示「有未保存的修改」提示（本地 payload 签名与服务端快照比对）。

### 8.3 前端预校验（后端同时校验，此处提前拦截）
- 至少一个档位；
- 天数不重复且必须按升序排列；
- 档位标识只能取 `7d / 14d / 28d` 且不允许重复；
- 上线日期与时区不能为空。

### 8.4 接口与封装
- `POST /api/admin/rpa/membership/sign_in/rewards/get`（只读，后端不接收请求体）；
- `POST /api/admin/rpa/membership/sign_in/rewards/update`（整体覆盖保存，保存后即时生效）；
- 封装层：`membership_api.GetSignRewardConfig` / `membership_api.UpdateSignRewardConfig`，
  数值一律 `String(...)` 传输（对齐 Hey-api SDK 复 `SignRewardConfigPayload` / `SignRewardConfigResponse` 的 str 契约）。
