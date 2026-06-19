# RPA-Browser 前端功能实现需求

根据 RPA-Browser 这个项目的后端，实现前端功能。admin的中台不需要实现，把需求拆分成一个个计划，等后续慢慢实现。

> **重要说明**：本文档中涉及的所有数据类型（Model、Enum、Request/Response 类型等）均以后端 OpenAPI schema 自动生成为准。
> 生成的类型文件位于 [src/api/browser/hey-api/types.gen.ts](/src/api/browser/hey-api/types.gen.ts)。
> 如有任何疑问，请先查阅该自动生成的文件，勿手动硬编码后端数据类型。

## 注意事项

1. **持久化会话数据**：后端实现的，前端不需要去管，只需要调用 API 就行了
2. **入口位置**：需要把入口放在 header 上，确保每一个界面都有办法访问
3. **浏览器区分**：后端是按照 `browser_id` 区分不同的浏览器，类似一个saas的服务，每个用户都有自己的浏览器指纹列表
4. **Action 编排**：给每一个 `action_type` 设计卡片，通过卡片的拖拽实现 action 的编排、插件的设置、workflow 的组合
5. **指纹响应处理**：针对浏览器指纹获取时的不同响应结果，做出不同的响应，比如指纹不存在，或者指纹不属于该用户等进行处理
6. **错误提示**：错误提示都通过现有的统一函数一起提示，类似一个ElMessage，不要分开提示
7. **TypeScript 类型检测**：确保所有代码都能通过 TypeScript 的类型检测，禁止使用任何 `any`类型绕过检测
8. **组件复用**：组件尽可能复用，比如 pagination 这种就可以直接复用，加几个参数来控制显示和 API 调用，还有一些公用组件放在了 [CommonCompo](/src/components/CommonCompo) 目录下
9. **路由组织**：相关 router 尽量都放到同一个一级导航里面，不要分成多个一级导航，通过增加子导航和对高一级导航进行重定向来实现路由，同时确保路由导航的逻辑不出错
10. **图标库使用**：使用 Element Plus 的图标库的时候确保图标名称存在，不要修改图标名称，不要用as+别名的形式导入图标，所有的图标都在 [element-plus 图标库](https://element-plus.org/zh-CN/component/icon) 这个页面里面
11. **浏览器接口**：浏览器相关接口直接使用 [browser_api](/src/api/browser/hey-api/index.ts) 导出的函数和类型，header设置直接使用一个现有的缓存用户信息的store，nav里面的uid和level_info的current_level
12. **前端样式**：禁止在vue文件里面写style块，所有的样式包括动画都采用tailwind的class命名的方法，如果有特殊需求的动画写到[theme.css](/src/assets/theme.css)里面，用tailwind的class方法写到对应组件里
13. **前端组件库**：尽量使用element plus和daisyui的组件，可以使用最新版本的全部组件
14. **代码质量**：前端代码需要符合 Vue3 的代码规范，同时需要使用 Linting 工具进行代码检查
15. **参数传递**：为避免精度丢失，前端获取到的int类型参数，如果有\_str结尾的对应参数，就以\_str结尾的参数为准，否则以int类型的参数为准，向后端传参的时候也是用\_str结尾的参数优先作为入参填入对应参数，如从后端接收到的数据为{browser_id:1,browser_id_str:'1'}，此时前端需要把browser_id_str作为使用的参数，而不是browser_id，因为browser_id_str是字符串，而browser_id是int类型，直接使用browser_id会导致精度丢失
16. **后端业务代码**：所有提示成功都需要对后端返回的数据里面的code字段（注意不是请求响应的status code）进行判断，非0一律判断为失败
17. **API 路径规范**：所有接口统一使用 POST 方法（除个别 Fork 列表和 GET 端点），基础前缀为 `/api/v1/rpa/browser`
18. **重要更名**：原 `CustomAction` 已更名为 `CompositeAction`（复合操作），所有相关类型、接口和字段名均已相应更新

---

## 后端 API 全景

### 基础前缀

| 模块 | 前缀 |
|------|------|
| 浏览器指纹 | `/api/v1/rpa/browser` |
| 浏览器会话 | `/api/v1/rpa/browser/session` |
| 浏览器默认设置 | `/api/v1/rpa/browser/default-settings` |
| 通知管理 | `/api/v1/rpa/browser/notify` |
| 浏览器控制（操作/工作流/插件/社区/WebRTC） | `/api/v1/rpa/browser/control` |

### 内置操作类型 (BuiltinActionType)

后端支持以下 12 种内置操作类型，对应 `action_id` 和 `action_type`：

| action_id | 操作名称 | 说明 |
|-----------|---------|------|
| `click` | 点击 | 点击指定选择器的元素 |
| `input` | 输入 | 在输入框中输入文本 |
| `wait` | 等待 | 等待元素出现或满足条件 |
| `scroll` | 滚动 | 滚动到指定元素 |
| `navigate` | 导航 | 导航到指定 URL |
| `screenshot` | 截图 | 对元素或页面截图 |
| `llm` | LLM | 使用 LLM 生成文本 |
| `hover` | 悬停 | 鼠标悬停在元素上 |
| `new_page` | 新页面 | 打开新的浏览器页面 |
| `loop` | 循环 | 循环执行子步骤 |
| `composite` | 复合操作 | 用户自定义的复合操作，`action_id` 格式为 `ca_xxx` |
| `if_else` | 条件判断 | 根据条件执行 true/false 分支 |

---

## 模块一：浏览器指纹列表页面

### 后端 API

| 接口路径 | 说明 |
|----------|------|
| POST `/api/v1/rpa/browser/gen_rand_fingerprint` | 生成随机指纹数据 |
| POST `/api/v1/rpa/browser/upsert_fingerprint` | 创建或更新指纹（创建+修改共用） |
| POST `/api/v1/rpa/browser/read_fingerprint` | 读取指纹详情 |
| POST `/api/v1/rpa/browser/delete_fingerprint` | 删除指纹 |
| POST `/api/v1/rpa/browser/count_fingerprint` | 统计指纹数量 |
| POST `/api/v1/rpa/browser/list_fingerprint` | 指纹列表（分页） |
| POST `/api/v1/rpa/browser/rename_fingerprint` | 重命名指纹 |

### 具体功能

1. 指纹的查看、修改、重命名、删除
2. 指纹的创建页面，包含所有创建页面所需的参数，有一个随机生成按钮，点击之后从 `/gen_rand_fingerprint` 获取随机数据，自动填充到表单中。修改界面和创建共用一个界面，通过 `/upsert_fingerprint` 统一处理。
3. 显示的方式按照正常 pagination 组件加卡片显示的模式
4. 卡片具体内容：指纹如果没有custom_name就显示`未命名`，确保browser_id显示完整，缩略模式把重要信息显示出来，需要有查看详情的按钮，可以通过点击卡片的按钮查看详情，点击按钮跳转到模块二的`浏览器 Stream 页面`

### 浏览器默认设置

| 接口路径 | 说明 |
|----------|------|
| POST `/api/v1/rpa/browser/default-settings/get` | 获取当前用户的浏览器默认设置 |
| POST `/api/v1/rpa/browser/default-settings/create-or-update` | 创建或更新默认设置 |
| POST `/api/v1/rpa/browser/default-settings/delete` | 删除默认设置 |
| POST `/api/v1/rpa/browser/default-settings/apply` | 将默认设置应用为当前浏览器配置 |
| POST `/api/v1/rpa/browser/default-settings/server-defaults/get` | 获取服务端预设的默认值 |

### 通知管理

| 接口路径 | 说明 |
|----------|------|
| POST `/api/v1/rpa/browser/notify/conf/upsert` | 创建/更新通知配置 |
| POST `/api/v1/rpa/browser/notify/conf/read` | 读取通知配置 |
| POST `/api/v1/rpa/browser/notify/conf/delete` | 删除通知配置 |
| POST `/api/v1/rpa/browser/notify/test` | 测试通知发送 |

---

## 模块二：浏览器 Stream 页面

### 后端 API

#### 浏览器会话管理

| 接口路径 | 说明 |
|----------|------|
| POST `/api/v1/rpa/browser/session/create` | 创建浏览器会话（启动浏览器） |
| POST `/api/v1/rpa/browser/session/status` | 查询浏览器会话状态 |
| POST `/api/v1/rpa/browser/session/close` | 关闭浏览器会话 |

#### 浏览器基础操作

| 接口路径 | 说明 |
|----------|------|
| POST `/api/v1/rpa/browser/control/operation/open_page` | 打开指定 URL，`page_index=-1` 表示新建页面 |
| POST `/api/v1/rpa/browser/control/operation/close_page` | 关闭指定索引的页面 |
| POST `/api/v1/rpa/browser/control/operation/switch_page` | 切换到指定索引的页面 |
| POST `/api/v1/rpa/browser/control/operation/execute_js` | 在指定页面执行 JavaScript 代码 |
| POST `/api/v1/rpa/browser/control/operation/get_page_info` | 获取指定页面的信息（标题、URL） |
| POST `/api/v1/rpa/browser/control/browser/info` | 获取浏览器整体信息 |

#### WebRTC 视频流

| 接口路径 | 说明 |
|----------|------|
| POST `/api/v1/rpa/browser/control/webrtc/offer` | 客户端发送 SDP Offer |
| POST `/api/v1/rpa/browser/control/webrtc/answer` | 客户端发送 SDP Answer |
| POST `/api/v1/rpa/browser/control/webrtc/ice-candidate` | 交换 ICE 候选 |
| POST `/api/v1/rpa/browser/control/webrtc/status` | 查询 WebRTC 连接状态 |
| POST `/api/v1/rpa/browser/control/webrtc/close` | 关闭 WebRTC 连接 |

#### 系统预注册操作（只读）

| 接口路径 | 说明 |
|----------|------|
| POST `/api/v1/rpa/browser/control/actions/registered` | 获取所有内置操作的元数据列表 |

返回结构：
```json
{
  "code": 0,
  "data": [
    {
      "action_id": "click",
      "action_type": "click",
      "json_schema": {
        "description": "点击操作参数",
        "properties": { "...": "..." },
        "required": ["..."],
        "title": "ClickParams",
        "type": "object"
      }
    }
  ]
}
```

#### 操作执行

| 接口路径 | 说明 | 关键参数 |
|----------|------|----------|
| POST `/api/v1/rpa/browser/control/actions/execute` | 执行单个操作 | `action_id`, `params`, `variables`, `page_index` |
| POST `/api/v1/rpa/browser/control/actions/preview` | 预览参数模板替换结果 | `action_id`, `params` |
| POST `/api/v1/rpa/browser/control/actions/validate` | 验证参数是否合法 | `action_id`, `params` |
| POST `/api/v1/rpa/browser/control/actions/execute-step` | 单步执行（用于单步调试） | `action_id`, `params`, `step_index`, `page_index` |

#### 复合操作（Composite Action）管理

> **类型说明**：复合操作即用户自定义操作，`action_id` 由系统自动生成（格式 `ca_xxx`），用户仅需提供显示名称 `name`。

| 接口路径 | 说明 |
|----------|------|
| POST `/api/v1/rpa/browser/control/custom-actions/create` | 创建复合操作 |
| POST `/api/v1/rpa/browser/control/custom-actions/list` | 查询复合操作列表（支持分页、筛选、排序） |
| POST `/api/v1/rpa/browser/control/custom-actions/get` | 查询复合操作详情 |
| POST `/api/v1/rpa/browser/control/custom-actions/update` | 更新复合操作 |
| POST `/api/v1/rpa/browser/control/custom-actions/delete` | 删除复合操作 |
| POST `/api/v1/rpa/browser/control/custom_actions/fork` | Fork 复合操作 |
| GET `/api/v1/rpa/browser/control/custom_actions/{id}/forks` | 查看 Fork 列表 |

创建复合操作的请求结构 `CompositeActionCreateRequest`：
- `name` (必填): 操作显示名称
- `description`: 描述
- `steps`: 步骤列表，每项包含 `action_id`, `params`, `retry`, `condition` 等字段（见 WorkflowStep 结构）
- `tags`: 标签列表
- `input_vars`: 输入变量定义（`name`, `type`, `default`, `required`, `description`）
- `output_vars`: 输出变量名称列表
- `timeout`: 超时时间(ms)，默认 30000
- `retry_on_error`: 错误时是否重试
- `retry_times`: 重试次数
- `retry_delay`: 重试延迟(秒)
- `enabled_plugins`: 关联的插件ID列表
- `is_public`: 是否公开

#### 工作流（Workflow）管理

| 接口路径 | 说明 |
|----------|------|
| POST `/api/v1/rpa/browser/control/workflows/create` | 创建工作流 |
| POST `/api/v1/rpa/browser/control/workflows/list` | 查询工作流列表（分页/筛选/排序） |
| POST `/api/v1/rpa/browser/control/workflows/get` | 查询工作流详情 |
| POST `/api/v1/rpa/browser/control/workflows/update` | 更新工作流 |
| POST `/api/v1/rpa/browser/control/workflows/delete` | 删除工作流 |
| POST `/api/v1/rpa/browser/control/workflows/duplicate` | 复制工作流 |
| POST `/api/v1/rpa/browser/control/workflows/execute` | 执行整个工作流 |
| POST `/api/v1/rpa/browser/control/workflows/execute-step` | 单步执行工作流（调试用） |
| POST `/api/v1/rpa/browser/control/workflows/fork` | Fork 工作流 |
| GET `/api/v1/rpa/browser/control/workflows/{id}/forks` | 查看 Fork 列表 |

工作流创建请求 `WorkflowCreateRequest`：
- `name` (必填): 工作流名称
- `description`: 描述
- `trigger_type`: 触发类型（`manual` / `cron`）
- `trigger_config`: 触发配置
- `is_public`: 是否公开

工作流执行请求 `WorkflowExecuteRequest`：
- `action_id`: 要执行的自定义操作ID（可选，与 `steps` 二选一）
- `steps`: 内联步骤列表（不提供 `action_id` 时使用）
- `variables`: 变量池
- `input_data`: 输入数据
- `output`: 输出字段列表
- `on_error`: 错误处理策略（`stop` / `continue` / `rollback`）
- `page_index`: 指定在哪个 tab 页执行

#### 插件（Plugin）管理

| 接口路径 | 说明 |
|----------|------|
| POST `/api/v1/rpa/browser/control/plugins/create` | 创建插件 |
| POST `/api/v1/rpa/browser/control/plugins/list` | 查询插件列表（分页/筛选/排序） |
| POST `/api/v1/rpa/browser/control/plugins/get` | 查询插件详情 |
| POST `/api/v1/rpa/browser/control/plugins/update` | 更新插件 |
| POST `/api/v1/rpa/browser/control/plugins/delete` | 删除插件 |
| POST `/api/v1/rpa/browser/control/plugins/fork` | Fork 插件 |
| GET `/api/v1/rpa/browser/control/plugins/{id}/forks` | 查看 Fork 列表 |

插件钩子类型（`PluginHookEnum`）：
- `before_action` — 操作执行前
- `after_action` — 操作执行后
- `on_success` — 操作成功后
- `on_error` — 操作出错时
- `on_timeout` — 操作超时时

插件创建请求 `PluginCreateRequest`：
- `name` (必填): 插件名称
- `hook_type` (必填): 钩子类型
- `custom_action_id` (必填): 要执行的自定义动作ID
- `description`: 描述
- `priority`: 优先级（默认 100，数字越小优先级越高）
- `is_public`: 是否公开

#### 社区互动

| 接口路径 | 说明 |
|----------|------|
| POST `/api/v1/rpa/browser/control/community/actions/list` | 社区公开操作列表 |
| POST `/api/v1/rpa/browser/control/community/workflows/list` | 社区公开工作流列表 |
| POST `/api/v1/rpa/browser/control/community/plugins/list` | 社区公开插件列表 |
| POST `/api/v1/rpa/browser/control/community/actions/fork` | Fork 社区操作 |
| POST `/api/v1/rpa/browser/control/community/workflows/fork` | Fork 社区工作流 |
| POST `/api/v1/rpa/browser/control/community/plugins/fork` | Fork 社区插件 |
| POST `/api/v1/rpa/browser/control/community/action/{action_id}/like` | 点赞/取消点赞操作 |
| POST `/api/v1/rpa/browser/control/community/workflow/{workflow_id}/like` | 点赞/取消点赞工作流 |
| POST `/api/v1/rpa/browser/control/community/plugin/{plugin_id}/like` | 点赞/取消点赞插件 |
| POST `/api/v1/rpa/browser/control/community/action/{action_id}/report` | 举报操作 |
| POST `/api/v1/rpa/browser/control/community/workflow/{workflow_id}/report` | 举报工作流 |
| POST `/api/v1/rpa/browser/control/community/plugin/{plugin_id}/report` | 举报插件 |
| POST `/api/v1/rpa/browser/control/community/report/update` | 修改自己的举报内容 |

筛选和排序枚举：
- **FilterType**: `all`, `private`, `public`, `community`, `verified`
- **SortBy**: `updated_at`, `likes_count`, `forks_count`, `created_at`, `name`
- **SortOrder**: `asc`, `desc`

### 2.1 共用布局

整个页面分为左右两个部分（直播盒子和调试盒子），左侧是 WebRTC 的直播页面，右侧是调试界面，中间是用一个可以收缩展开和拖动大小的 `el-splitter` 分隔开，最顶上是一个公用的状态栏，包括启停浏览器session、WebRTC 直播的网速监控、浏览器session状态展示等。

> **类型说明**：浏览器会话状态类型 `BrowserSessionStatus` 由后端 OpenAPI schema 自动生成，位于 [types.gen.ts](/src/api/browser/hey-api/types.gen.ts) 中。实际字段结构以后端生成的类型为准。

WebRTC流量监控指标采用前端计算，分开显示上下行，KB/s为单位

### 2.2 直播盒子

#### 具体功能

- **2.2.1** 需要以 `browser_id` 为参数，每一个 `browser_id` 对应一个页面，如果后端查询的时候报错，需要返回到模块一的`浏览器指纹列表`页面
- **2.2.2** 顶部状态栏需要有一个截图按钮，可以查看历史截图。历史截图不需要持久化保存，只需要保存当前会话的内容，可以查看缩略图、点击放大、删除
- **2.2.3** WebRTC 的直播盒子上面参照 Edge，有标签栏，可以通过标签栏切换直播流/关闭页面/新建页面。页面切换通过 `/operation/switch_page`、`/operation/close_page`、`/operation/open_page` 实现
- **2.2.4** 每次执行操作完成之后刷新浏览器状态和浏览器页面列表，方便用户查看变化
- **2.2.5** 启动直播时需要跳出确认窗口，提示流量消耗，是否启动
- **2.2.6** 直播流是标准的 WebRTC 协议，使用标准的 `RTCPeerConnection` API，前端直接处理 SDP 交换和 ICE 候选，通过 `/webrtc/offer`、`/webrtc/answer`、`/webrtc/ice-candidate` 与后端交互。切换页面的时候直接断开旧页面的直播流，然后重新启动一个新的直播流
- **2.2.7** 浏览器会话状态和 WebRTC 连接状态使用 Composition API 的 `provide/inject` 进行状态共享
- **2.2.8** 启动浏览器webrtc的时候需要确保浏览器先启动。浏览器会话通过 `/session/create` 启动，通过 `/session/status` 查询状态，否则会报错，提示用户先启动浏览器

### 2.3 调试盒子

#### 具体功能

- **2.3.1** 给后端的预注册操作都设计成卡片，包含两种显示状态：详情模式和缩略模式。里面可以有插件插槽，可以单独保存为插件，支持传入自定义数据，返回结果可以选择保存，接着在后续 action 里面使用。可以单步调试整个动作，可以拥有多个 plugin 插槽，用可收缩列表的形式，按照优先级排序放置
- **2.3.2** 设计一个调试工具箱，外观类似 WinForm 开发工具，支持拖拽摆放至调试盒子中。工具箱分为三类：**公开**、**私有**、**基础操作**。
  - **公开/私有**：每类下包含复合操作和插件，支持分页查询和搜索功能，以树状图形式展示。
  - **基础操作**：放置预置的 Action 卡片，数据从 `/actions/registered` 接口获取。
  - **Action 卡片**：每个卡片需具备独立的执行功能和插件槽，便于前端单独调试。卡片根据后端返回的 `action_id` 动态构建。复合操作和插件同样使用此卡片组件，后续的工作流、插件等功能均依赖这些卡片实现。
- **2.3.3** 保存的时候可以选择保存为复合操作、插件、工作流，分配的参数不同。如果使用了公开的内容就需要 fork 到自己私有的里面再保存
- **2.3.4** 工作流编辑器的拖拽编排功能和工具箱里面的工具的拖拽摆放功能都使用 vue-flow 的拖拽功能实现
- **2.3.5** 后端一共定义了 12 个操作，全都是从 API 里面获取的，前端需要根据不同的返回值，设置参数。后端是从 `/actions/registered` 这里获取到具体定义，返回的数据是一个列表，里面的内容类似以下 OpenAPI 的标准格式：

```json
{
  "action_id": "input",
  "action_type": "input",
  "json_schema": {
    "description": "输入操作参数 - 对应 locator.fill()",
    "properties": {
      "selector": {
        "description": "用于定位输入框元素的选择器",
        "maxLength": 500,
        "title": "Selector",
        "type": "string"
      },
      "value": {
        "description": "要输入的文本内容",
        "maxLength": 10000,
        "title": "Value",
        "type": "string"
      },
      "force": {
        "default": false,
        "description": "是否绕过可操作性检查，默认为 false",
        "title": "Force",
        "type": "boolean"
      },
      "timeout": {
        "default": 30000,
        "description": "最大等待时间（毫秒），默认为 30000。传入 0 禁用超时",
        "maximum": 300000,
        "minimum": 0,
        "title": "Timeout",
        "type": "number"
      }
    },
    "required": ["selector", "value"],
    "title": "InputParams",
    "type": "object"
  }
}
```

- **2.3.6** 工作流（Workflow）的执行，前端通过单步调试接口（`/workflows/execute-step` 和 `/actions/execute-step`），每执行一步获取一次结果并更新 UI。交互性强，便于调试
- **2.3.7** 插件核心模型

> **类型说明**：插件相关类型由后端 OpenAPI schema 自动生成，位于 [types.gen.ts](/src/api/browser/hey-api/types.gen.ts)。
> - 创建插件使用 `PluginCreateRequest` 类型
> - 插件列表项使用 `PluginListItemResponse` 类型
> - 插件详情使用 `PluginDetailResponse` 类型
> - 钩子类型为 `PluginHookEnum` 字符串枚举，具体值：`before_action`, `after_action`, `on_success`, `on_error`, `on_timeout`

- **2.3.8** 关联表结构

| 表名 | 说明 | 关键字段 |
|------|------|----------|
| `WorkflowPluginRelation` | 工作流与插件的多对多关联 | `workflow_id` + `plugin_id` + `config_params` |
| `ActionPluginRelation` | 动作与插件的多对多关联 | `action_id` + `plugin_id` + `config_params` |

其中 `config_params` 为该资源下插件的特定配置参数。

- **2.3.9** 工作流组合规范与节点类型

> **类型说明**：工作流相关类型由后端 OpenAPI schema 自动生成，位于 [types.gen.ts](/src/api/browser/hey-api/types.gen.ts)。
> - 工作流步骤使用 `WorkflowStepRequest` 类型
> - 操作类型使用 `BuiltinActionType` 类型（12 种：`click`, `input`, `wait`, `scroll`, `navigate`, `screenshot`, `llm`, `hover`, `new_page`, `loop`, `composite`, `if_else`）
> - 复合操作相关类型使用 `CompositeActionCreateRequest`、`CompositeActionUpdateRequest`、`CompositeActionListRequest`、`CompositeActionDetailResponse` 等
> - 工作流创建/更新/执行分别使用 `WorkflowCreateRequest`、`WorkflowUpdateRequest`、`WorkflowExecuteRequest`

**工作流步骤结构：** 每个 `WorkflowStep` 与 `BaseAction` 创建参数完全对齐，包含以下字段：
- `action_id`: 操作ID
- `action_type`: 操作类型（`BuiltinActionType` 或字符串）
- `params`: 操作参数（字典，支持 `{{变量名}}` 模板替换）
- `retry`: 失败重试次数（默认 0）
- `condition`: 执行条件表达式
- `output_var`: 结果变量键名
- `input_vars`: 输入变量
- `output_vars`: 输出变量名称列表
- `timeout`: 超时时间(毫秒)，默认 30000
- `children`: 子步骤列表（用于 `loop` 循环体和 `if_else` 分支）
- `loop_count`: 固定循环次数
- `loop_while`: 条件循环表达式（为 true 时继续）
- `loop_until`: 条件退出表达式（为 true 时退出）

**控制流操作参数结构：**
- **LoopParams**: 循环操作参数，包含 `loopBranch` 字段用于存放循环体步骤
- **IfElseParams**: 条件分支操作参数，包含 `TrueBranch` 和 `FalseBranch` 字段分别存放真/假分支步骤
- **CompositeParams**: 复合操作参数，包含 `steps` 字段用于存放复合操作步骤

**组合规范（与后端 `composition_spec` 一致，保存/执行前由后端校验）：

| 容器 | 允许包含 | 禁止 |
|------|---------|------|
| **工作流**（最终产物） | 复合操作、基础操作（含 loop/if_else）、依附于操作的插件 | 嵌套其他工作流；仅含插件 |
| **复合操作** | 其他复合操作、基础操作、依附插件 | 工作流；仅含单一插件 |
| **插件**（内容在关联的 composite_action 内） | 复合操作、基础操作、其他插件 | 工作流 |

**基础操作：** `loop` 循环体、`if_else` 各分支体均允许为空。

完整说明见后端文档：`RPA-Browser/docs/workflow_composition_spec.md`。

- **2.3.10** 步骤参数类型

> **类型说明**：所有 action 的参数类型由后端通过 `/actions/registered` 接口动态返回。
> 前端需要根据返回的 `json_schema` 动态渲染表单，无需硬编码任何参数模型。

- **2.3.11** 复合操作模型

> **类型说明**：复合操作相关类型由后端 OpenAPI schema 自动生成，位于 [types.gen.ts](/src/api/browser/hey-api/types.gen.ts)。
> - 复合操作唯一标识格式为 `ca_xxx`（由系统自动生成）
> - 复合操作包含 `steps` 字段，存储 `WorkflowStep` 列表
> - 支持 `input_vars` 定义输入变量，`output_vars` 定义输出变量
> - 支持 `timeout`、`retry_on_error`、`retry_times`、`retry_delay` 等重试配置
> - 支持 `enabled_plugins` 关联插件

---

## 模块三：社区公开页面

### 后端 API

#### 社区公开列表

| 接口路径 | 说明 |
|----------|------|
| POST `/api/v1/rpa/browser/control/community/actions/list` | 社区公开的复合操作列表 |
| POST `/api/v1/rpa/browser/control/community/workflows/list` | 社区公开的工作流列表 |
| POST `/api/v1/rpa/browser/control/community/plugins/list` | 社区公开的插件列表 |

以上接口均支持分页（`page`, `per_page`）、筛选（`filter_type`）、排序（`sort_by`, `sort_order`）。

社区列表默认 `filter_type=community`，即返回非当前用户的其他用户公开资源。

#### 社区 Fork

| 接口路径 | 说明 |
|----------|------|
| POST `/api/v1/rpa/browser/control/community/actions/fork` | Fork 社区公开的复合操作 |
| POST `/api/v1/rpa/browser/control/community/workflows/fork` | Fork 社区公开的工作流 |
| POST `/api/v1/rpa/browser/control/community/plugins/fork` | Fork 社区公开的插件 |

Fork 请求参数：`id`（原资源ID），`new_name`（可选，新名称，不提供则使用原名 + ' (Fork)'）

#### 社区点赞

| 接口路径 | 说明 |
|----------|------|
| POST `/api/v1/rpa/browser/control/community/action/{action_id}/like` | 点赞/取消点赞操作（toggle 模式） |
| POST `/api/v1/rpa/browser/control/community/workflow/{workflow_id}/like` | 点赞/取消点赞工作流 |
| POST `/api/v1/rpa/browser/control/community/plugin/{plugin_id}/like` | 点赞/取消点赞插件 |

#### 社区举报

| 接口路径 | 说明 |
|----------|------|
| POST `/api/v1/rpa/browser/control/community/action/{action_id}/report` | 举报操作 |
| POST `/api/v1/rpa/browser/control/community/workflow/{workflow_id}/report` | 举报工作流 |
| POST `/api/v1/rpa/browser/control/community/plugin/{plugin_id}/report` | 举报插件 |
| POST `/api/v1/rpa/browser/control/community/report/update` | 修改自己的举报内容 |

举报理由（`ReportReason`）：`SPAM`(垃圾信息)、`INAPPROPRIATE`(不当内容)、`VIOLATION`(违规)、`PLAGIARISM`(抄袭)、`OTHER`(其他)

### 具体功能

分为复合操作、插件、工作流，可以对每一个内容点赞、举报、fork。卡片复用 stream 页面的卡片，使用分页显示，加上筛选、排序、搜索功能。

社区页面通过以下三个 API 分别获取对应类型的公开资源列表：
- `/community/actions/list` — 复合操作
- `/community/workflows/list` — 工作流
- `/community/plugins/list` — 插件

每种资源卡片展示：名称、描述、作者、点赞数、Fork 数、是否已验证。点击卡片可查看详情，详情中包含步骤/关联操作信息。支持一键 Fork 到自己的空间。