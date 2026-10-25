# 运行消息「焦点轮次」渲染 - 前端需求

> 涉及目录：`src/components/rpa-browser/`（运行消息悬浮面板 `WorkflowRunMessageDock`）
> 树侧工具：`src/utils/rpa/workflowRunMessageTree.ts`
> 本文档为纯前端展示层改动，**不涉及后端接口 / SSE 事件结构 / hey-api SDK 重新生成**。

## 1. 背景（用户反馈）

批量工作流一次运行的循环轮次可达数百个（如 368 轮 × 9 动作）。运行消息面板
此前把**所有轮次的分组头**都挂载，即使折叠也只省了子树：

- 打开面板 / 跟随新运行时，几百个分组头的挂载与每条 SSE 消息触发的整树
  patch 累计耗时可达数百毫秒甚至秒级，面板明显卡顿；
- 内容多了之后滚动、点击都会掉帧。

## 2. 目标

运行消息改为**一次只显示一个 loop 的内容**（类虚拟滚动）：任意时刻只完整渲染
当前轮次及其祖先链，其余轮次不产生 DOM；同时保留回看任意轮次的能力。

## 3. 方案：焦点轮次（focus round）

### 3.1 状态模型

| 状态 | 含义 |
| --- | --- |
| `activeKey = null` | 跟随最新：焦点永远是最新一轮（正在跑的那轮） |
| `activeKey = 'run_id-seq'` | 钉住某一轮：只渲染该轮到根的路径 |

派生量：`latestGroupKey`（先序最后一个分组）、`activeLoopKey`（校验后生效的
焦点，旧 key 失效时回退最新）、`pathKeys`（焦点到根的 key 链）、
`rootRows` / 组内 `bodyRows`（渲染行，见 3.2）。

### 3.2 渲染规则（`buildBodyRows`）

- 焦点链上的分组：完整渲染（分组头 + 全部组内消息 + 路径上的子分组，递归）；
- 不在链上的循环分组：**连续的一段合并成一条占位行**
  `· 另有 N 轮已折叠`，不渲染任何分组元素；
- 占位行可点击：跳转到**离焦点最近**的那一轮（焦点之前取该段最后一轮，
  之后取该段第一轮）；
- 普通消息（非循环）按原顺序渲染，位置不因折叠而错位。

效果：几百个轮次时 DOM 里只有一轮的内容，每条新消息的 patch 范围从
「整棵树」缩小到「当前轮次」。

### 3.3 轮次切换入口

1. **上一轮 / 下一轮**（工具栏 `‹ ›`）：同一父分组下的相邻轮次
   （`locateLoopNode` 取兄弟），无相邻轮次时置灰；
2. **定位轮次**下拉：沿用原有懒渲染下拉（数百轮次不常驻实例化），
   选中即设为焦点并滚动到该分组；
3. **占位行点击**：跳到附近轮次；
4. **分组头点击**：把该轮设为焦点（嵌套场景可「放大」到外层轮）；
5. **跟随最新**（工具栏刷新图标）：开启 = `activeKey = null`；关闭 = 钉住
   当前轮次。用户上翻阅读时自动钉住，不会被新消息把正在看的内容整体换掉；
6. **「回到最新」浮动按钮**：焦点不在最新一轮时出现，点击恢复跟随并滚底。

### 3.4 与旧行为的差异

- 移除「展开全部 / 收起全部」按钮与逐组展开状态（焦点模型下分组永远展开）；
- `latestChainKeys`（默认展开链）不再需要，从工具库移除；
- 清空消息 / 切换运行时焦点自动回到「跟随最新」。

## 4. 涉及文件

| 文件 | 改动 |
| --- | --- |
| `src/utils/rpa/workflowRunMessageTree.ts` | `LoopNode` 新增 `parentKey`；新增 `findLoopNode` / `pathKeysOf` / `locateLoopNode` / `buildBodyRows` 与 `BodyRow` 类型；移除 `latestChainKeys` |
| `src/components/rpa-browser/WorkflowRunMessageGroup.vue` | 改为焦点轮次渲染：新增 `pathKeys` / `activeKey` props 与 `focus-round` 事件；组体按 `bodyRows` 渲染，非路径轮次出占位行；分组头点击 = 设焦点 |
| `src/components/rpa-browser/WorkflowRunMessageDock.vue` | `activeKey` 焦点模型；工具栏「展开/收起全部」替换为「上一轮/下一轮」；根列表按 `rootRows` 渲染；上翻自动钉住；「回到最新」恢复跟随 |
| `tests/unit/workflowRunMessageFocus.spec.ts` | 新增：渲染路径、同层导航、占位行合并与位置保真 |

## 5. 验收

- 单测：`npx vitest run tests/unit/workflowRunMessageFocus.spec.ts`（10 项）；
- 手动：跑一个多轮次（含嵌套循环）工作流，确认面板只渲染当前轮次、
  占位行可跳转、上翻不丢内容、「回到最新」可恢复跟随；
- 类型检查：`npm run type-check` 通过。
