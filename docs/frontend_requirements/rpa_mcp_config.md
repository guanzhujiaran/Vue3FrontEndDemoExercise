# RPA MCP 配置指南 - 前端需求

> 对应后端说明：`RPA-Browser/README.md` 的「RPA MCP」章节、`docs/mcp动作调试计划书.md`
> 后端 MCP 端点：`/api/v1/rpa/mcp`（Streamable HTTP，由 `fastapi-mcp` 挂载）

## 1. 背景与目标

RPA 服务把「用户可用的全部接口」以 MCP（Streamable HTTP）方式暴露出来，方便用户在
Cursor / Claude Desktop 等支持 MCP 的客户端里直接调用 RPA 能力（动作调试、工作流运行、日志查询等）。

但 MCP 客户端配置需要：

- 正确的端点 URL（走网关，不是直连 RPA 端口）；
- 登录态 `bili_jwt` Cookie（鉴权全部在网关完成，RPA 不解析 Cookie、也不接受写死 mid）；
- 区分「支持原生 HTTP 传输的客户端」与「Claude Desktop（需 mcp-remote 桥接）」两种写法。

目标：在 RPA 浏览器模块下新增一个「MCP 配置指南」页面，帮用户**一键生成可用配置并复制**，
避免手写出错（端口填错、漏 Cookie、用了 Authorization 等）。

## 2. 页面：MCP 配置指南（rpa-browser 下新页签）

### 2.1 入口

- 路由：`/app/rpa-browser/mcp-config`，`RouteName.RPA_BROWSER_MCP_CONFIG = 'MCP配置指南'`；
- 侧边导航分组：归入现有「协作」分组（审批中心同组），图标用 `Connection`（或 `Link`）；
- 受 `RpaBrowserLayout` 的 `isModuleAvailable` 约束（dev / 消息管理端 root 可见），与现有子页一致。

### 2.2 交互

- **网关地址输入框**：默认值取自 `window.location.origin`（前端本就跑在网关后），
  端点 URL 自动拼成 `<网关地址>/api/v1/rpa/mcp`，可手动修改；
- **bili_jwt 输入框**（`show-password`，不回显）：提示用户从浏览器登录后的 Cookie 里取
  `bili_jwt` 值（DevTools → Application → Cookies）；
- **客户端类型 Tab 切换**：
  - `Cursor / 原生 HTTP 客户端`：直接贴 `type: "http"` 的 `mcpServers` 配置；
  - `Claude Desktop`：用 `mcp-remote` 桥接的 `command/npx` 写法；
- **配置预览**：实时根据上述输入生成 JSON，等宽字体展示；
- **复制按钮**：调 `src/utils/rpa/clipboard.ts` 的 `copyToClipboard`（带 http 回退）。

### 2.3 说明卡片（必含）

- 鉴权口径：只能带 `Cookie: bili_jwt`，**不支持 `Authorization` 头**（网关 `JwtModule` 已注释掉该分支）；
- 为什么走网关：网关校验 JWT（含登出黑名单）后注入 `x-bili-*` 可信头，RPA 只透传；
- 端口提示：容器/生产网关端口 = `NODEJS_PPTR_PORT`（默认 10007），本地 dev 网关端口 9926；
  直连 RPA 调试仅限内网 `http://<rpa-host>:28000/api/v1/rpa/mcp`（不要暴露公网）；
- 网关对非 SSE 请求有 **180s 超时**，`rpa_debug_workflow_run` 等待超过 3 分钟会被断开；
- 服务端开关：RPA 侧 `RPA_MCP_ENABLED`（默认 dev 开、prod 关），一般无需改动。
- 自检命令（可选展示）：`python -m app.mcp --selftest`。

## 3. 样式与规范约束

- 不使用 `<style>` 块、不使用 `:style` 内联样式，全部走 Tailwind 原子类 + `src/assets/theme.css` 语义色
  （`bg-primary-light-9` / `text-text-secondary` 等）；
- 跳转链接（如有）统一用 `openExternalLink` / `LINK_REL` / `LINK_REFERRER_POLICY`；
- 优先 element plus 组件（el-input / el-tabs / el-button / el-alert），尺寸用 large/default；
- 页面根节点沿用 `FlexContainer`，纵向滚动交给 `BiliSideNavLayout` 内容区，不写 overflow-auto。

## 4. 验收

- 进入 `/app/rpa-browser/mcp-config` 能看到指南、能填入 token、生成的两类配置正确；
- 复制按钮在 http / IP 访问方式下也能成功（走 textarea 回退）；
- 生成的 `url` 默认同源（当前 origin + `/api/v1/rpa/mcp`），Cookie 头正确；
- 侧边导航出现「MCP 配置指南」并可跳转。
