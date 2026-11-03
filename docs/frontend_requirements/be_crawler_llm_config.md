# be-crawler LLM 配置管理 - 前端需求

> 对应后端：`be-bilibili-crawler` 的云端 LLM 实例池（`CONFIG.py::LLMApiConfig`、
> `Service/llm_service/pool.py`）、`controller/common/CommonRouter.py` 的 `/llm/*` 路由。

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

配置本身**不落库**：`settings.llm_apis` 来自 `.env.fastapi.*`，热更新只改进程内存，
**服务重启即回退为环境变量**（这是既有设计，页面必须显式提示）。

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
- 保存即热更新；失败时 crawler 侧 `set_llm_apis` 整体回滚；
- 写操作在 be-message 打审计日志：`管理员 {mid} 更新 crawler LLM 配置：N 个实例（模型名…）`。

## 4. 页面设计

### 4.1 入口

- 位置：管理后台 → **抽奖数据** 分组（与「抽奖数据」汇总并列），标题「LLM 配置」，图标 `Star` / `Cpu`；
- 路由：`/app/admin/crawler-llm-config`，路由名 `ADMIN_CRAWLER_LLM_CONFIG`，`requiresAdmin: true`、`hidden: true`；
- 页面：`src/views/rpa-browser/admin/CrawlerLlmConfigAdmin.vue`。

### 4.2 结构

1. **说明卡片**（`el-alert`，`type="warning"`）：
   - 修改只对当前进程生效，**重启后回退为 `.env` 的 `llm_apis`**；
   - token 回显为脱敏值，编辑时**留空表示不修改**；
   - 采样参数（temperature / top_p / top_k / num_predict）由服务端固定，页面只读。
2. **实例表格**（`el-table` + 行内编辑）：
   - 可编辑列：模型名、Base URL、密钥（`el-input` `show-password`，placeholder「留空则不修改」）、限流 RPS（`el-input-number`，`step=0.1`，`min=0.1`）；
   - 只读列（来自 stats，按 `base_url + model_name` 匹配）：可用 / 状态、调用次数、成功率、最近使用时间（秒级时间戳格式化）、已消耗 token；
   - 行操作：删除（`el-popconfirm` 二次确认）。
3. **操作区**：新增实例 / 保存配置 / 重新读取；右侧提示「有未保存的修改」/「当前为服务端最新配置」
   （本地 payload 签名与服务端快照比对，与签到奖励配置页同一套模式）。
4. **空态**：`el-empty` 提示「未配置任何 LLM 实例，crawler 将无法进行云端判断」。

### 4.3 前端预校验（后端同样校验）

- `base_url` 必须以 `http://` 或 `https://` 开头；
- `model_name` 非空；
- `requests_per_second` 必须 > 0（允许小数，如 `0.5` 表示 2 秒 1 次）；
- 新增行时密钥必填，编辑行留空表示沿用原密钥；
- 至少保留 1 个实例（清空会导致 crawler 云端判断直接报错），如需全部清空必须二次确认。

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
4. 编辑时不填 token 保存，密钥未被脱敏串覆盖（后端 `tests/test_crawler_llm_admin.py` 已覆盖）；
5. 统计列能对上 crawler `/llm/stats` 的实时数据（`stats` 按 `base_url + model_name` 匹配）；
6. 窄屏下表格可横向滚动、操作区不溢出；页面无 `<style>` 块与内联样式；
7. 保存动作在 be-message 日志中留下「管理员 {mid} 更新 crawler LLM 配置」审计记录；
8. crawler 不可达时页面提示 `crawler 不可达：…`（`code=1003`），不白屏。
