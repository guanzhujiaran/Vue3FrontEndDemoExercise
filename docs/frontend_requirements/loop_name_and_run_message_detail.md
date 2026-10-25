# 循环名称与运行消息参数明细 - 前端需求

> 涉及目录：`src/components/rpa-browser/`（工作流编辑器 DebugBox / 运行消息面板）
> 后端计划书：`RPA-Browser/docs/循环名称与运行消息明细计划书.md`
> 本文档使用的接口均为**现有接口**，SSE 事件结构不变（复用 `detail` 字段），
> **不涉及 hey-api SDK 重新生成**。

## 1. 背景（用户反馈）

跑批量工作流（循环遍历数据列表）时：

1. **不知道每个循环在干什么**：循环步骤没有任何名称，运行消息里只能看到
   `循环「loop」`，多个循环（尤其嵌套）完全分不清是谁；进度条同样只有 `循环「loop」`。
2. **不知道基础操作用什么参数跑的**：运行消息的明细只有动作返回值，看不到
   选择器 / URL / 文本等执行参数，轮次失败时无法直接从消息栏定位是参数问题
   还是页面问题。

## 2. 目标

1. 循环步骤可以设置**名称**，名称支持 `{{变量}}` 模板（如 `处理 {{loop_item.title}}`），
   运行时逐轮解析，让「在循环干什么」一眼可见；
2. 运行消息（SSE）里展示循环名称（分组头、进度条、定位下拉自动生效）；
3. 运行消息明细里展示每个基础操作的**执行参数**（折叠一行摘要，点击展开全文）。

## 3. 需求明细

### R1 循环名称录入（LoopEditor）

- `LoopConfig` 新增 `name: string`（默认空串）；
- `LoopEditor.vue` 在「循环来源」上方新增「循环名称」输入框：
  - 占位文案提示可用变量，如 `如：遍历动态列表、处理 {{loop_item.title}}`；
  - 辅助说明：支持 `{{变量}}` 模板，每轮按当前循环项解析；留空则显示为「循环」；
  - 尺寸与现有表单项一致（`size="small"`），命名 class `loop-editor__name`。

### R2 序列化与还原（不丢数据）

- `serializeLoopConfig`：`name` 非空时写入 `params.name`，为空不写（保持 JSON 干净）；
- `parseLoopConfig` / `LOOP_PARAM_KEYS`：还原 `params.name`，并把 `name` 加入
  需从 formData 剔除的循环保留键，避免残留旧值被再次序列化。

### R3 画布节点徽标（actionFlow）

- `loopBadge`：设置了名称时优先展示名称（截断），否则维持现有来源摘要
  （`循环 N 次` / `遍历 xxx`），让画布上也能认出每个循环。

### R4 运行消息展示（无需改动组件）

- 后端 `loop_iteration` / `loop_finished` 消息的 `action_name` 与文案带上解析后的
  循环名称，`WorkflowRunMessageGroup` 分组头、`WorkflowRunProgressBar` 的
  `循环「名称」`、`workflowRunMessageTree` 的定位下拉自动生效；
- 基础操作的执行参数由后端并入 `detail` 首行（`参数: {...}`），
  `WorkflowRunMessageItem` 现有「首行摘要 + 点击展开」交互直接复用，无前端改动。

## 4. 明确不做

- 不给 `if_else` / `parallel` 加名称（后端本期只做 loop）；
- 不改 SSE 事件结构、不重新生成 hey-api SDK；
- 不做名称的变量自动补全（手动输入，占位文案提示）。
