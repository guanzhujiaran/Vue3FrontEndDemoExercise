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
