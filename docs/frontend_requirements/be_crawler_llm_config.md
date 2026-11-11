# be-crawler LLM 配置管理 - 前端需求

> 对应后端：`be-bilibili-crawler` 的云端 LLM 实例池（`CONFIG.py::LLMApiConfig`、
> `Service/llm_service/pool.py`）、`controller/common/CommonRouter.py` 的 `/llm/*` 路由。
>
> **2026-11-08 修订（配置持久化）**：crawler 侧新增本地持久化
> `Service/llm_service/config_store.py`（`runtime/llm_apis.json`），
> 本页保存的列表**重启后仍然生效**；事实来源变为「runtime 文件 > `.env`」。
> 详见 `docs/be-bilibili-crawler-LLM配置持久化计划书.md`。
> 本文 §2 / §4.2 / §7 中「重启回退 `.env`」的旧表述已按此修订；
> 接口契约（§3）**未变**，SDK 与封装层无需重新生成。
>
> **2026-11-11 增补（获取模型列表）**：新增 `POST /api/v1/crawler/admin/llm/models`（§3.5），
> 模型名由自由输入改为「可搜索多选下拉 + 可手写」并新增「获取模型」按钮（§4.2）。
> hey-api SDK **已重新生成**：`CrawlerLlmModelsReq` / `CrawlerLlmModelsResp` /
> `CrawlerLlmAdminService.listLlmModelsApiV1CrawlerAdminLlmModelsPost`。
> 卡片 → 提交载荷的展开逻辑抽在 `src/utils/llmConfigPayload.ts`，由
> `tests/unit/llmConfigPayload.spec.ts` 覆盖。

## 1. 背景与目标

crawler 的云端 LLM 实例（`settings.llm_apis`：Base URL / 模型名 / 密钥 / 限流 RPS）
目前只能在服务器上改 `.env` 并重启，或直连容器调用**内部接口**。运营/服主无法在管理端
查看「当前有哪些模型、谁在冷却、调用成功率多少」，也无法在线增删实例。

目标：在管理后台新增「LLM 配置」页面，可视化维护 crawler 的 LLM 实例池并查看运行统计。

## 2. 现状与阻塞点（先读这一节）

crawler 侧**已有**完整能力，且支持热更新（`Service/llm_service/pool.py::set_llm_apis`）：

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/llm/config` | 读取全部实例（`token` 已脱敏为 `前4****后4`） |
| POST | `/llm/config` | 追加一条实例 |
| PUT | `/llm/config` | 整体替换（传 `[]` 清空） |
| PUT / PATCH / DELETE | `/llm/config/{index}` | 按索引改 / 删单条 |
| GET | `/llm/stats` | 各实例调用次数、成功/失败、是否可用、速率、最后使用时间、token 消耗 |

但**前端现在不能直接调**，原因有两条：

1. **无鉴权**：`/llm/*` 路由没有任何 `Depends(require_admin)` / header 校验，
   「不对外公开」仅靠网关不转发；
2. **网关不转发**：`be-gateway/ExpressServerEnd/Controller/ProxyEndPort.js` 对 crawler 只放行
   `/api/v1/lottery_database/bili/*`（写/查询）与 `/api/v1/samsClub/graphql`，其余 `/api/v1` 全给
   be-message；`/llm/*` 既不在白名单也不是 `/api/v1` 前缀，经网关必然 404。

配置**不落数据库**，但自 2026-11-08 起会落**本地 JSON 文件**：

- crawler 启动时按「`runtime/llm_apis.json` > `.env` 的 `llm_apis`」决定生效配置；
- 本页保存（`PUT`）在实例池构建成功后把整份列表原子写入该文件（权限 `0600`，含明文 token，
  目录在 `.gitignore` 内），因此**重启后仍然生效**；
- **不会回写 `.env`**（容器改宿主机文件不可靠且无审计）；
- 状态机判定不可恢复（401/404/410 / 模型下线）后的**自动摘除只改运行时内存、不落盘**，
  重启后该实例会从文件 / `.env` 回来（防误删兜底）。要永久删掉坏实例，必须在本页删除并保存。

结论：需要后端先补一层「管理端代理接口」（见 §3），前端才能接入；
本需求文档先定契约，后端实现后再由用户手动重新生成 hey-api SDK。

## 3. 建议后端接口契约（待实现）

**已实现**（be-message `app/api/crawler_llm_admin.py` + `app/services/admin/crawler_llm.py`
+ `app/services/infrastructure/crawler_llm.py`）：

- 鉴权：`AdminUser`（与其它管理端接口一致）；
- 转发目标：`settings.crawler_base_url`（容器内 `CRAWLER_BASE_URL=http://be-bilibili-crawler:23333`）；
- 统一响应 `StandardResponse{code,msg,data}`，**数值一律 str 传输**；
- 错误口径：入参非法 → `code=400`；crawler 不可达 / 非 2xx → `code=1003`（`NETWORK_ERROR`，HTTP 200，前端能拿到 msg）。

接口只有两个（统计与配置总是同时读，不单开 `/stats`）：

### 3.1 读取配置 + 统计

`GET /api/v1/crawler/admin/llm/config`

```json
{
  "code": 0,
  "data": {
    "items": [
      {
        "index": "0",
        "base_url": "https://api.example.com/v1",
        "model_name": "deepseek-chat",
        "token": "sk-1****abcd",
        "requests_per_second": "0.5"
      }
    ],
    "stats": [
      {
        "base_url": "https://api.example.com/v1",
        "model_name": "deepseek-chat",
        "state": "healthy",
        "available": true,
        "disabled": false,
        "disabled_reason": null,
        "invoke_count": "128",
        "success_count": "120",
        "failure_count": "8",
        "consecutive_failures": "0",
        "success_rate": "0.94",
        "rate_per_minute": "3",
        "avg_latency_seconds": "1.235",
        "total_tokens": "52310",
        "last_used_at": "1762000000",
        "resume_at": null,
        "last_error": null
      }
    ]
  }
}
```

- `token` 为脱敏值（长度 ≤8 时为 `****`）；
- `stats` 按 `base_url + model_name` 与 `items` 对应，数量可能少于配置（新加的实例还没被调用）；
- 统计是**弱依赖**：crawler `/llm/stats` 失败时只返回 `stats: []`，配置照常返回；
- `last_used_at` / `resume_at` 均为**秒级整数字符串**（禁止 ISO 字符串）；
- 采样参数（temperature / top_p / top_k / num_predict）不在接口里：crawler 侧
  `Service/llm_service/presets.py::SamplingPreset` 硬编码，页面仅用静态文案说明「服务端固定」。

### 3.2 整体保存

`PUT /api/v1/crawler/admin/llm/config`

```json
{
  "items": [
    {
      "base_url": "https://api.example.com/v1",
      "model_name": "deepseek-chat",
      "token": "sk-live-plain-or-empty",
      "requests_per_second": "0.5"
    }
  ]
}
```

- `token` 传**脱敏值**（含 `****`）或空串 → 后端按同索引**保留原密钥**；传明文才替换。
  新增实例（索引超出原配置长度）时 `token` 必填，否则返回 `code=400`；
- 校验：`base_url` 必须 `http(s)://` 开头、`model_name` 非空、`requests_per_second > 0`；
  `items` 为空直接拒绝（清空会让 crawler 云端判断整体不可用）；
- 保存即热更新，并**持久化到 crawler 的 `runtime/llm_apis.json`**（重启仍生效）；
  失败时 crawler 侧 `set_llm_apis` 整体回滚（含实例池缓存，不会出现「内存已改、文件未改」）；
- 写操作在 be-message 打审计日志：`管理员 {mid} 更新 crawler LLM 配置：N 个实例（模型名…）`。

### 3.3 撤销人工保存（2026-11-08 新增）

`DELETE /api/v1/crawler/admin/llm/config`（无请求体，`AdminUser` 鉴权）

- 语义：删除 crawler 的 `runtime/llm_apis.json` 并热切回 `.env` 的 `llm_apis`，**幂等**；
- 响应：与 `GET` 完全一致（`StandardResponse{data:{items,stats}}`），页面直接覆盖表格；
- 失败：crawler 不可达 / 非 2xx → `code=1003`（`NETWORK_ERROR`，HTTP 200）。

### 3.4 单实例连通性测试（2026-11-08 新增）

`POST /api/v1/crawler/admin/llm/config/test`（`AdminUser` 鉴权，代理 crawler 内部同名接口）

```json
// 请求（token 为空或含 **** 时按 index 沿用原密钥；新增卡片 index 传 null）
{"index": "7", "base_url": "https://api.example.com/v1", "model_name": "deepseek-chat", "token": ""}

// 响应（数值一律字符串；未发请求时 status_code 为 null、latency_ms 为 "0"）
{"code": 0, "data": {"ok": true, "base_url": "...", "model_name": "...",
  "status_code": "200", "latency_ms": "1234", "error": null}}
```

- 探测方式：crawler 直接 `POST {base_url}/chat/completions`，`max_tokens=1`、`stream=false`，
  超时由 crawler `llm_test_timeout` 控制（默认 **45s**）；be-message 代理这一条用独立超时
  `crawler_llm_test_timeout`（默认 **60s**），必须大于 crawler 侧，否则慢模型会被代理层提前掐断
  成「crawler 不可达」；
- **只做诊断**：不参与健康状态机、不改统计、不落盘、不影响冷却 / 自动摘除；
- 可测**未保存**的编辑态（用表单当前值），因此能「先测通再保存」；
- 失败也是正常响应（`ok=false`），页面就地显示；只有 crawler 不可达才走 `code=1003`；
- 上游错误文案会**抹掉密钥**并截断 200 字符。

### 3.5 获取模型列表（2026-11-11 新增）

`POST /api/v1/crawler/admin/llm/models`（`AdminUser` 鉴权，代理 crawler 内部 `POST /llm/models`）

```json
// 请求（token 为空或含 **** 时按 index 沿用原密钥；新增卡片 index 传 null）
{"index": "7", "base_url": "https://api.example.com/v1", "model_name": "", "token": ""}

// 响应（数值一律字符串；未发请求时 status_code 为 null、latency_ms 为 "0"）
{"code": 0, "data": {"ok": true, "base_url": "...", "status_code": "200",
  "latency_ms": "140", "models": ["deepseek-chat", "deepseek-reasoner"], "error": null}}
```

- 数据来源：crawler 用 `httpx` 直连上游 `GET {base_url}/models`（`Authorization: Bearer {token}`），
  超时 `llm_models_timeout`（crawler 侧默认 **20s**），代理层独立超时 `crawler_llm_models_timeout`（默认 **30s**）；
- `model_name` **可空**：主要用法就是「先拉列表再选模型」，此时模型名还没填；
- `models` 已**去重 + 升序**，兼容 OpenAI（`data[].id`）/ Ollama（`models[].name`）/ 裸数组三种响应；
- **只做诊断**：不参与健康状态机、不改统计、不落盘，不消耗 token（不产生推理调用）；
- 失败也是正常响应（`ok=false` + `error`），页面就地显示；只有 crawler 不可达才走 `code=1003`；
- 上游错误文案会**抹掉密钥**并截断 200 字符。

## 4. 页面设计

### 4.1 入口

- 位置：管理后台 → **抽奖数据** 分组（与「抽奖数据」汇总并列），标题「LLM 配置」，图标 `Star` / `Cpu`；
- 路由：`/app/admin/crawler-llm-config`，路由名 `ADMIN_CRAWLER_LLM_CONFIG`，`requiresAdmin: true`、`hidden: true`；
- 页面：`src/views/rpa-browser/admin/CrawlerLlmConfigAdmin.vue`。

### 4.2 结构

1. **说明卡片**（`el-alert`，`type="warning"`）：
   - 保存后立即热更新并写入 crawler 的 `runtime/llm_apis.json`，**crawler 重启后仍然生效**；
     配置来源优先级「本地文件 > `.env`」，不会回写 `.env`；
   - 运行状态里被判为不可恢复的实例会被 crawler **自动摘除（只影响运行时、不落盘，重启自愈）**，
     要永久删除请在本页删除并保存；
   - token 回显为脱敏值，编辑时**留空表示不修改**；
   - 采样参数（temperature / top_p / top_k / num_predict）由服务端固定，页面只读。
2. **实例卡片网格**（2026-11-08 由 `el-table` 改为卡片：表格一条行里塞 8 列，实例一多就很难找）：
   - 布局（偏窄、一行多个）：`grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4`，
     一张卡片一个实例；
   - 卡片容器：`rounded-xl border border-border-light bg-bg-secondary p-3`，
     `hover:border-primary-light-5` 做轻量悬浮反馈；一张卡 = 一个 `<article>`；
   - 卡片头（三行层次，便于扫读定位）：
     1) `#序号`（`bg-fill-dark` 小胶囊）+ 运行状态 `el-tag`（有 `reason` 时 `el-tooltip` 悬浮显示）；
     2) 模型名（`text-base font-semibold`，超长 `truncate`，未填时显示「（未填模型名）」）；
     3) Base URL 摘要（`text-xs text-text-secondary`，超长 `truncate`）；
     右上角「移除」用 `el-button link type="danger"`（降低视觉权重），仍走 `el-popconfirm` 二次确认；
   - 可编辑字段：卡片变窄后统一**竖向排列**（`flex flex-col gap-2`），避免输入框被压到不可用；
     字段名用小号 `el-text` 做标签；密钥用 `el-input show-password`，placeholder「留空则不修改」；
     限流用 `el-input-number`（`step=0.1`，`min=0.1`，`w-full`）；地址标签简化为「接口地址（Base URL）」；
   - **模型名（2026-11-11 改）**：`el-select`（`filterable` + `allow-create` + `default-first-option`
     + `clearable`），既能从「获取模型列表」拉到的候选里勾选，也能直接手打未列出的模型名；
     字段右侧「获取模型」按钮用该卡片的 `base_url + token` 拉候选（见 §3.5）：
     成功后就地显示「已获取 N 个模型」（`text-success`），失败显示原因（`text-danger`）；
     缺 `base_url` / 缺密钥 / 拉取中时按钮禁用；`base_url` 变更后清空该卡片的候选缓存
     （避免把上个厂商的模型留在下拉里）；
   - 统计区（只读，来自 stats，按 `base_url + model_name` 匹配）：三格等分
     `grid grid-cols-3 divide-x divide-border`（不用灰底大块，更紧凑），
     依次是调用次数 / 成功率、累计 token、最近一次调用（秒级时间戳格式化），
     数值 `truncate` 防溢出；
   - 卡片底部（`border-t border-border pt-3`）：左侧**「测试」按钮**（`plain`），右侧就地结果
     —— 成功：`CircleCheckFilled` 图标 + `text-success` 文案 `可用（HTTP 200，1234ms）`；
     失败：`CircleCloseFilled` + `text-danger` 文案 `不可用（HTTP 401，800ms）：…`；
     未测试时显示灰色提示「测试只验连通性，不会保存」。
3. **操作区**：新增实例 / 保存配置 / 重新读取 / **撤销人工保存（恢复 .env）**；
   右侧提示「有未保存的修改」/「当前为服务端最新配置」
   （本地 payload 签名与服务端快照比对，与签到奖励配置页同一套模式）。
   撤销按钮走 `el-popconfirm` 二次确认，执行期间其余按钮禁用。
4. **空态**：`el-empty` 提示「未配置任何 LLM 实例，crawler 将无法进行云端判断」。

### 4.3 前端预校验（后端同样校验）

- `base_url` 必须以 `http://` 或 `https://` 开头；
- `model_name` 非空；
- `requests_per_second` 必须 > 0（允许小数，如 `0.5` 表示 2 秒 1 次）；
- 新增行时密钥必填，编辑行留空表示沿用原密钥；
- 至少保留 1 个实例（清空会导致 crawler 云端判断直接报错），如需全部清空必须二次确认。

### 4.4 撤销人工保存（切回 `.env`）

**已实现**（2026-11-08）：

- crawler 内部接口：`DELETE /llm/config/override`（删 `runtime/llm_apis.json` +
  热切回 `.env` 并重建实例池，**幂等**）；
- be-message 代理：`DELETE /api/v1/crawler/admin/llm/config`（`AdminUser` 鉴权）
  → 内部转调上述接口后重新 `GET` 配置 + 统计，**响应结构与 `GET`/`PUT` 完全一致**
  （`StandardResponse{data:{items,stats}}`），页面可直接覆盖表格；审计日志
  `管理员 {mid} 撤销 crawler LLM 人工保存，已切回 .env 配置`；
- 前端：操作区新增 `撤销人工保存（恢复 .env）` 按钮（`type="warning" plain`），
  `el-popconfirm` 二次确认（文案写明「删除持久化配置、恢复部署 `.env`、不可撤销」），
  成功后用返回数据直接刷新表格；执行期间禁用新增 / 保存 / 重新读取；
- 封装层：`resetCrawlerLlmConfig()` 在 `src/api/notify/crawler_llm_api.ts`，
  用生成的 `client.delete({ url, responseStyle: 'data' })` 手写请求
  （与 `sys_config_api.ts` 同一取舍）。**SDK 重新生成后可平滑换成生成的 Service 函数**，
  URL / 响应结构完全一致，无需改页面。

## 5. SDK 与封装

后端接口已就绪（be-message 已注册 OpenAPI `crawler-llm-admin` tag），前端接入前需：

- **由用户手动重新生成 SDK**：拉取 be-message 的 `openapi.json` 并执行 `npx @hey-api/openapi-ts`
  （生成产物位于 `src/api/community/hey-api/services/`，预计新增
  `CrawlerLlmAdminService.gen.ts`，类型进 `types.gen.ts`）；**不要**手改生成文件；
- 生成后新增业务封装层 `src/api/notify/crawler_llm_api.ts`：
  - `GetLlmConfig()` → `GET /api/v1/crawler/admin/llm/config`
  - `SaveLlmConfig(payload)` → `PUT /api/v1/crawler/admin/llm/config`
  - 两者都返回 `{ items, stats }`；`requests_per_second` 等数值一律 `String(...)` 传输。

> 在 SDK 生成完成前，视图层不要引用尚不存在的符号（会直接构建报错）。

## 6. 样式与规范

- 禁止 `<style>` 块与 `:style` 内联样式，全部 Tailwind 原子类 + `theme.css` 语义色；
- 优先 Element Plus 组件（`el-table` / `el-input` / `el-input-number` / `el-alert` / `el-button`），尺寸用 `default` / `large`；
- 每个功能元素带业务语义 class（BEM，如 `crawler-llm-config__row-token`）；
- 表格行内编辑控件必须有可见标签（表头即标签，不再重复 placeholder 说明）。

## 7. 验收

1. 管理后台出现「LLM 配置」入口，URL `/app/admin/crawler-llm-config` 可直接打开；
2. 能读到当前实例列表，token 显示为脱敏值，采样参数以静态文案说明「服务端固定」；
3. 新增 / 修改 / 删除实例并保存后，重新读取与保存结果一致；
   且 crawler 容器重启后 `GET` 仍返回保存后的列表（持久化生效，2026-11-08 起）；
4. 编辑时不填 token 保存，密钥未被脱敏串覆盖（后端 `tests/test_crawler_llm_admin.py` 已覆盖）；
5. 统计列能对上 crawler `/llm/stats` 的实时数据（`stats` 按 `base_url + model_name` 匹配）；
6. 窄屏下表格可横向滚动、操作区不溢出；页面无 `<style>` 块与内联样式；
7. 保存动作在 be-message 日志中留下「管理员 {mid} 更新 crawler LLM 配置」审计记录；
8. crawler 不可达时页面提示 `crawler 不可达：…`（`code=1003`），不白屏；
9. 点「撤销人工保存（恢复 .env）」→ 二次确认 → 表格变为 `.env` 里的列表（行数 / 模型名与
   `.env` 一致）→ crawler 容器的 `runtime/llm_apis.json` 已不存在 → 重启 crawler 后仍是 `.env` 的列表；
10. 撤销按钮执行期间新增 / 保存 / 重新读取均禁用，不会出现并发写；
11. 卡片布局：窄屏单列、`lg` 两列、`2xl` 三列，卡片内字段不溢出，页面无 `<style>` 块与内联样式；
12. 「测试」：可用实例返回 `可用（HTTP 200，xxxxms）`（绿色）；把 Base URL 改成错误地址后
    返回 `不可用（未发出请求/HTTP xxx…）`（红色）且**表格数据不变**（测试不写任何状态）；
13. 未保存的编辑态可直接测试（改模型名/地址/密钥后先测再保存）；
14. 新卡片未填密钥点「测试」→ 前端直接提示「新实例需要先填写密钥才能测试」，不发请求；
15. 「获取模型」（2026-11-11）：点按钮后模型下拉出现上游候选（可搜索、可勾选），
    未列出的模型名可手打后直接保存；失败时卡片内显示原因（红色），已填内容不被清空；
    改完 `base_url` 后下拉不再保留上一个地址的候选。
