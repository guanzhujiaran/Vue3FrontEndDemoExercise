# RPA 报错反馈（前端需求）

## 目标
让普通用户（不通过 MCP）也能把 RPA 运行中遇到的报错 / 异常 / 改进建议提交给服主。落库后实时通知服主（站内 + 邮件/Webhook），便于及时定位问题、改进设计。同一能力也通过 MCP 暴露（工具 `rpa_feedback_submit` / `rpa_feedback_list`），用户的 LLM 可自动上报。

后端契约见 `RPA-Browser/docs/用户提交报错与实时推送服主计划书.md`，接口 `POST /api/v1/rpa/browser/feedback/submit|list`。

## 页面
路由 `/app/rpa-browser/feedback`，侧边「协作」分组新增「报错反馈」入口。两个区块：

### 1. 提交表单
| 字段 | 必填 | 控件 | 说明 |
| --- | --- | --- | --- |
| 分类 | 否 | select | bug(缺陷/报错) / suggestion(改进建议) / other |
| 标题 | 是 | input | 一句话概括，≤256 |
| 详细描述 | 是 | textarea | 错误现象、期望行为、复现步骤 |

「错误上下文（可选）」折叠区，默认折叠，展开后可填：错误摘要、页面 URL、相关动作 id、相关工作流 id、相关运行 id、相关浏览器 id、错误详情/堆栈。

- 页面 URL 默认取 `window.location.href`，来源 `source='web'`；空值不提交。
- 提交前校验标题与描述非空，否则 warning 提示。
- 提交成功：清空标题/描述/错误字段，提示「已提交并通知服主」（`notified=false` 时提示「已提交（未配置推送，服主可在后台查看）」），刷新列表。

### 2. 我的反馈
el-table 展示当前用户自己的反馈：标题 / 分类 / 状态（待处理 warning、已处理 success、已忽略 info）/ 提交时间 / 描述（省略号）。分页（10/20/50），支持刷新。数据来自 `listFeedback`。

## 规范约束
- 样式：Tailwind 原子类 + `theme.css` 语义色，无 `<style>` 块、无内联样式。
- 请求经 `api/browser/feedback_api.ts`（hey-api 通用 `client.post`，复用 baseUrl/响应处理，不手改生成 SDK）。
- 字段新增来源见 `feedback_api.ts` 的 ★ 标注；类型本地建模，不改预生成 types。
- 无外链跳转，不涉及 `linkPolicy`。
