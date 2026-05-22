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
---

## 模块一：浏览器指纹列表页面

### 具体功能

1. 指纹的查看、修改、重命名、删除
2. 指纹的创建页面，包含所有创建页面所需的参数，有一个随机生成按钮，点击之后从后端获取随机数据，自动填充到表单中。修改界面和创建共用一个界面。
3. 显示的方式按照正常 pagination 组件加卡片显示的模式
4. 卡片具体内容：指纹如果没有custom_name就显示`未命名`，确保browser_id显示完整，缩略模式把重要信息显示出来，需要有查看详情的按钮，可以通过点击卡片的按钮查看详情，点击按钮跳转到模块二的`浏览器 Stream 页面`
---

## 模块二：浏览器 Stream 页面

### 2.1 共用布局

整个页面分为左右两个部分（直播盒子和调试盒子），左侧是 WebRTC 的直播页面，右侧是调试界面，中间是用一个可以收缩展开和拖动大小的 `el-splitter` 分隔开，最顶上是一个公用的状态栏，包括启停浏览器session、WebRTC 直播的网速监控、浏览器session状态展示等。

> **类型说明**：浏览器会话状态类型 `BrowserSessionStatus` 由后端 OpenAPI schema 自动生成，位于 [types.gen.ts](/src/api/browser/hey-api/types.gen.ts) 中的 `StandardResponseBrowserSessionStatus` 类型。实际字段结构以后端生成的类型为准。

WebRTC流量监控指标采用前端计算，分开显示上下行，KB/s为单位

### 2.2 直播盒子

#### 具体功能

- **2.2.1** 需要以 `browser_id` 为参数，每一个 `browser_id` 对应一个页面，如果后端查询的时候报错，需要返回到模块一的`浏览器指纹列表`页面
- **2.2.2** 顶部状态栏需要有一个截图按钮，可以查看历史截图。历史截图不需要持久化保存，只需要保存当前会话的内容，可以查看缩略图、点击放大、删除
- **2.2.3** WebRTC 的直播盒子上面参照 Edge，有标签栏，可以通过标签栏切换直播流/关闭页面/新建页面
- **2.2.4** 每次执行操作完成之后刷新浏览器状态和浏览器页面列表，方便用户查看变化
- **2.2.5** 启动直播时需要跳出确认窗口，提示流量消耗，是否启动
- **2.2.6** 直播流是标准的 WebRTC 协议，使用标准的 `RTCPeerConnection` API，前端直接处理 SDP 交换和 ICE 候选，切换页面的时候直接断开旧页面的直播流，然后重新启动一个新的直播流
- **2.2.7** 浏览器会话状态和 WebRTC 连接状态使用 Composition API 的 `provide/inject` 进行状态共享

### 2.3 调试盒子

#### 具体功能

- **2.3.1** 给后端的预注册操作都设计成卡片，包含两种显示状态：详情模式和缩略模式。里面可以有插件插槽，可以单独保存为插件，支持传入自定义数据，返回结果可以选择保存，接着在后续 action 里面使用。可以单步调试整个动作，可以拥有多个 plugin 插槽，用可收缩列表的形式，按照权重排序放置
- **2.3.2** 设计一个调试工具箱，外观类似 WinForm 开发工具，可以拖动到摆放到调试盒子里。里面分为公开/私有/工具三类，公开和私有底下有各自的自定义动作和插件。里面每一个类目都可以分页查询，还需要支持搜索功能，搜索插件/自定义动作
- **2.3.3** 保存的时候可以选择保存为自定义动作、插件、工作流，分配的参数不同。如果使用了公开的内容就需要 fork 到自己私有的里面再保存
- **2.3.4** 工作流编辑器的拖拽编排功能和工具箱里面的工具的拖拽摆放功能都使用 vue-flow 的拖拽功能实现
- **2.3.5** 后端一共定义了十几个操作，全都是从 API 里面获取的，前端需要根据不同的返回值，设置参数。后端是从 `/api/v1/rpa/browser/control/actions/registered` 这里获取到具体定义，返回的数据是一个列表，里面的内容类似以下 OpenAPI 的标准格式：

```json
{
  "action_id": "input",
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

- **2.3.6** 工作流（Workflow）的执行，前端通过单步调试接口，每执行一步获取一次结果并更新 UI。交互性强，便于调试
- **2.3.7** 插件核心模型

> **类型说明**：插件相关类型由后端 OpenAPI schema 自动生成，位于 [types.gen.ts](/src/api/browser/hey-api/types.gen.ts)。
> - 创建插件使用 `PluginCreateRequest` 类型
> - 插件列表项使用 `PluginListItemResponse` 类型
> - 插件详情使用 `PluginDetailResponse` 类型
> - 钩子类型为字符串，具体值从后端 API 获取

- **2.3.8** 关联表结构

| 表名 | 说明 | 关键字段 |
|------|------|----------|
| `WorkflowPluginRelation` | 工作流与插件的多对多关联 | `workflow_id` + `plugin_id` + `config_params` |
| `ActionPluginRelation` | 动作与插件的多对多关联 | `action_id` + `plugin_id` + `config_params` |

其中 `config_params` 为该资源下插件的特定配置参数。

- **2.3.9** 工作流节点的完整类型定义

> **类型说明**：工作流相关类型由后端 OpenAPI schema 自动生成，位于 [types.gen.ts](/src/api/browser/hey-api/types.gen.ts)。
> - 工作流步骤使用 `WorkflowStepRequest` 类型
> - 操作类型使用 `ActionType` 类型（`'navigation' | 'click' | 'input' | 'scroll' | 'hover' | 'wait' | 'screenshot' | 'evaluate' | 'select' | 'keyboard' | 'mouse' | 'llm' | 'loop' | 'if_else' | 'custom' | 'composite'`）
> - 工作流创建使用 `WorkflowCreateRequest` 类型
> - 工作流更新使用 `WorkflowUpdateRequest` 类型
> - 工作流执行使用 `WorkflowExecuteRequest` 类型

- **2.3.10** 步骤参数类型

> **类型说明**：所有 action 的参数类型由后端通过 `/api/v1/rpa/browser/control/actions/registered` 接口动态返回。
> 前端需要根据返回的 `json_schema` 动态渲染表单，无需硬编码任何参数模型。


---

## 模块三：社区公开页面

### 具体功能

分为自定义动作、插件、工作流，可以对每一个内容点赞、举报、fork。卡片复用 stream 页面的卡片，使用分页显示，加上筛选、排序、搜索功能
