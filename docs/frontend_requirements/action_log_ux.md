# 操作日志页可读性改造 - 前端需求

> 涉及页面：`src/views/rpa-browser/ActionLogView.vue`
> 后端接口前缀：`/api/v1/rpa/browser/control/action-logs/*`（全部 POST，mid 由请求头透传）
> 本文档使用的接口均为**现有接口**，不涉及 hey-api SDK 重新生成。

## 1. 背景（用户反馈）

操作日志页当前存在三个「看不懂、找不到」的问题：

1. **不知道怎么生成的、怎么显示的**：每条日志就是一次操作（action）的执行记录，
   但页面上只有裸 ID（`action_id` / `workflow_id` / `execution_id`），
   没有任何地方说明「来源 = 单操作/工作流/插件」「执行批次」「嵌套深度」是什么，
   用户无法建立心智模型。
2. **失败没有提示**：失败记录的红色错误信息只有一行且被 `line-clamp-2` 截断，
   不点进详情看不到完整错误；统计条显示「失败 109」但列表按时间倒序混排，
   要把失败翻出来只能手动翻页或记得去改筛选下拉框。
3. **找不到是哪个操作错的**：一次工作流运行的每个步骤各自落一条日志，
   页面没有按「执行批次」聚合/查看链路的入口；失败了只能逐条点开猜。

## 2. 目标

1. 页面自带「日志是怎么生成 / 怎么展示」的说明，字段语义一目了然；
2. 一键直达失败：快捷筛选 + 失败操作排行，不需要记筛选下拉框怎么用；
3. 从任一失败步骤能直接打开「同执行批次完整链路」，按嵌套层级还原调用树，
   失败步骤高亮、错误完整可见。

## 3. 需求明细

### R1 生成规则说明（新增）

- 页面标题区旁增加「日志说明」入口（popover），内容固定为：
  - 每条日志 = 一次操作（action）的执行记录；手动执行、工作流步骤、插件钩子各算一条；
  - 「来源」：单操作 = 手动运行；工作流 = 工作流中的步骤；插件 = 插件钩子；
  - 「执行批次」：一次完整运行（手动/定时触发）内所有步骤共享同一批次 ID，
    点击可按批次查看完整链路；
  - 「嵌套深度」：复合操作 / 循环 / 分支内部子步骤的层级（0 = 顶层步骤）；
  - 采集开关：工作流或操作的「执行日志」开关关闭时不产生日志；
    开启「仅出错时记录」后，成功的执行不会落库；
  - 列表只展示摘要字段，入参 / 结果 / 变量 / 过程日志在「详情」里按需加载。

### R2 快捷筛选 + 当前筛选条件（新增）

- 筛选区顶部增加快捷筛选按钮组（默认尺寸 el-button-group 或等价按钮）：
  - 「全部」「仅看失败」「仅看工作流」；
  - 「仅看失败」= `success=false`（等价覆盖 failed / timeout 两种状态），
    「仅看工作流」= `source=workflow``；
  - 与现有下拉筛选**双向同步**（下拉改动后快捷按钮高亮态随之更新，反之亦然）。
- 筛选区下方展示「当前筛选条件」chips：每项一个可关闭的 `el-tag` closable
  （关键字 / 操作ID / 浏览器ID / 状态 / 结果 / 来源 / 执行批次），
  全部关闭后回到无筛选状态；chips 仅为展示与快捷清除，不替代原筛选控件。

### R3 统计概览可点击 + 失败操作排行（增强）

- 统计条标签改为可点击：
  - 点「成功 N」→ `success=true` 查询；点「失败 N」→ `success=false` 查询；
  - 点「总计 N」→ 清除结果类筛选；hover 有 `cursor-pointer` 与视觉反馈。
- 统计条下方新增「失败较多的操作」区（取 `stats.items`，仅展示 `failed > 0` 的项，
  按 failed 降序，最多 5 条）：
  - 每项：操作名 + `失败 X / 共 Y`，点击 → 以该 `action_id` 筛选列表；
  - 无失败项时该区域不渲染。

### R4 列表项可读性（增强）

- 失败 / 超时项整卡左侧加 danger 色边框（`border-l-2` + 语义色 class），
  与成功项形成一眼可辨的层级；
- 错误信息**完整展示**（去掉 `line-clamp-2` 截断），失败项错误区默认展开；
- 元信息行语义化，逐项带标签：操作ID / 浏览器 / 耗时 / 工作流 / 批次 / 嵌套深度；
- 「执行批次」渲染为可点击 chip：点击打开该批次的链路弹窗（见 R5），
  不再只是一串十六进制 ID；
- 「详情」按钮保留；失败项的详情按钮保持默认样式即可（不额外强调）。

### R5 执行链路弹窗（新增组件）

- 新增 `src/components/rpa-browser/ActionLogChainDialog.vue`：
  - 入参：`executionId`、`v-model:visible`；
  - 数据：`POST /action-logs/by-execution`（`{ execution_id }`），
    经 `businessHandler` 调用 hey-api `操作日志管理Service` 的 by-execution 方法；
  - 汇总头部：共 N 步 / 成功 X / 失败 Y / 总耗时；
  - 步骤列表按 `id` 升序（写入顺序），按 `depth` 逐级缩进（depth × 16px，
    用 class 映射实现，禁止内联 style）；
  - 每步展示：状态标签（成功/失败/超时）、操作名、`action_id`、耗时；
    失败步骤整行 danger 高亮并完整展示 `error_message`；
  - 点击任一步骤 → 向父页面抛出 `select(log_id)`，父页面打开该步骤详情弹窗；
  - 空态文案：该批次暂无步骤日志（未开启日志开关或已过保留期）。

### R6 详情弹窗（增强）

- 「错误信息」区块从普通正文提为**常显区块**（不再依赖任何折叠），
  位置放在基本信息之后、入参之前；`whitespace-pre-wrap` 保留换行；
- 「执行过程日志」在记录为失败时默认展开（成功时默认收起）；
- 弹窗底部新增「查看同批次链路」按钮（有 `execution_id` 时展示），
  点击打开 R5 链路弹窗（两个弹窗可叠加，链路弹窗 `append-to-body`）。

### R7 空状态区分（增强）

- 无任何日志时：`el-empty` 文案「暂无操作日志」（保持现状）；
- 有筛选条件但无结果时：文案改为「没有符合当前筛选条件的日志」，
    并附「清除筛选条件」按钮，一键重置所有筛选。

### R8 规范落地（随本次改造一并处理）

- Element Plus 组件尺寸：移除所有 `size="small"`，统一默认 / large；
- 移除模板内全部内联 `style`（输入框宽度、`max-height` 等），
  改为 Tailwind class（`w-55` / `max-h-75` 等语义化数值类）；
- 颜色统一用主题语义类：`text-gray-400` → `text-text-secondary`，
  `text-danger` / `bg-danger-light-9` / `border-border-light` / `bg-fill-light` 保留；
- 所有业务元素补功能命名 class（`stats-bar__tag` / `quick-filter__btn` /
  `filter-chips__item` / `log-item__batch` 等），禁止纯工具类裸奔；
- 列表无限滚动容器由手写 `div + overflow-auto + @scroll` 改为统一
  `LoadingMoreContainer`（`fillParent` 模式，父级 flex 链 `flex-1 min-h-0`），
  遵守《滚动条与分页布局》规范；
- 清理未使用的图标 import（`ArrowDown` / `ArrowRight`）。

## 4. 接口依赖

| 能力 | 接口 | 现状 |
| --- | --- | --- |
| 列表 / 详情 / 链路 / 统计 / 删除 / 清空 | `action-logs/*` | 已存在，SDK 已生成 |
| 快捷筛选、chips、失败排行 | 全部基于 `list` / `stats` 已有字段前端派生 | 无新字段 |

## 5. 变更记录

### C1 列表加载方式：无限滚动 → 分页（用户反馈驱动）

- **背景**：R8 引入的 `LoadingMoreContainer` 无限滚动在日志页存在两个问题：
  1. 其内部 `BiliScrollbar` 传了 `noresize`，且滚动容器高度靠 flex 链压缩，
     内容增减 / 窗口缩放时滚动条刷新不可靠；
  2. 日志量可能很大，无限滚动会把本页 DOM 无限堆高，与「按条件查询」的页面定位不符。
- **决策**：用户确认二选一 ——（a）滚动完全交给最外层 `BiliSideNavLayout` 内容区的
  `BiliScrollbar`；（b）改为分页。经评估选 **(b) 分页**：
  - 选 (a) 会导致统计条 / 筛选栏随列表一起滚出视口（本页筛选控件多、位置高），
    且无限滚动失去触底的滚动元素后只能退化为「加载更多」按钮；
  - 选 (b) 符合《滚动条与分页布局》规范中「列表内部滚动 + 分页吸底」的标准结构
    （同模块 `BrowserFingerprintList.vue` 先例），筛选栏常驻、分页常驻，
    每翻一页内容整批替换，滚动条随内容变化自然刷新。
- **实现要点**（`src/views/rpa-browser/ActionLogView.vue`）：
  - `LoadingMoreContainer` → `BiliScrollbar`（`flex-1 min-h-0`，不传 `noresize`，
    恢复 EP 的 resize 监听）+ 列表下方 `el-pagination` 吸底
    （`layout="sizes, prev, pager, next, total"`，每页 10/20/50/100）；
  - `loadLogs` 固定按 `currentPage / pageSize` 整页加载；`handleSearch` /
    删除 / 清空后重置回第 1 页，避免落在越界空页；
  - 翻页 / 切换每页条数后通过 `wrapRef` 把列表滚动复位到顶部；
  - 移除 `loadingMore / hasMore / loadError` 等无限滚动专属状态。

## 6. 后续待办（本次不实现，需用户决策 / 后端配合）

- **T1 出参时间字段 unix 化**：`ActionLogItemResponse.started_at / finished_at`
  目前是 `datetime`（ISO 字符串出参），违反《unix-timestamp》规范；
  改造需后端将字段改为 `UnixTime / OptionalUnixTime` 并重新生成 SDK，
  按规范**暂停等待用户手动执行同步**后再改前端消费点。
- **T2 工作流名称缺失**：列表只能显示 `workflow_id` 裸 ID，
  需要后端在 list 出参附加工流名（或提供批量解析接口），
  前端才能显示「工作流：预约抽奖」。
- **T3 工作流级汇总记录**：一次工作流运行失败时，
  希望有一条 workflow 级汇总日志（触发方式、总步骤、失败数），
  当前只有步骤级（source=workflow）记录，需后端计划书支撑。
