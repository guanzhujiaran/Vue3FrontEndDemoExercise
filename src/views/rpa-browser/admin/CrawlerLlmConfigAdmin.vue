<template>

  <!-- ============ 说明 ============ -->
  <!-- 不用 el-alert：其 .el-alert__content 是 max-content 弹性项，长文本不换行会被 overflow:hidden 裁掉 -->
  <div
    class="crawler-llm-config__notice flex min-w-0 items-start gap-2 rounded-lg border border-warning-light-7 bg-warning-light-9 p-3">
    <el-icon class="crawler-llm-config__notice-icon mt-0.5 shrink-0 text-warning">
      <WarningFilled />
    </el-icon>
    <div class="crawler-llm-config__notice-body flex min-w-0 flex-1 flex-col gap-1">
      <span class="crawler-llm-config__notice-title text-sm font-semibold text-warning">
        这里是 be-bilibili-crawler 的云端 LLM 实例池（按卡片顺序轮询，失败自动冷却/切换）
      </span>
      <el-text class="crawler-llm-config__notice-line block w-full whitespace-normal break-words text-text-secondary"
        tag="div">
        · 保存后立即热更新并持久化到 crawler 的
        <span class="crawler-llm-config__notice-emphasis font-semibold">
          runtime/llm_apis.json，crawler 重启后仍然生效
        </span>
        ；配置来源优先级「本地文件 &gt; .env」，不会回写 .env。
        要彻底回到部署配置，用下方「撤销人工保存（恢复 .env）」。
      </el-text>
      <el-text class="crawler-llm-config__notice-line block w-full whitespace-normal break-words text-text-secondary"
        tag="div">
        · 状态里被判为不可恢复（鉴权失败 / 模型下线等）的实例会被 crawler
        <span class="crawler-llm-config__notice-emphasis font-semibold">自动摘除</span>，
        但摘除只影响运行时、不落盘，重启后会自动恢复；要永久删掉请在这里删除并保存。
      </el-text>
      <el-text class="crawler-llm-config__notice-line block w-full whitespace-normal break-words text-text-secondary"
        tag="div">
        · 密钥读取时为脱敏值（前4****后4）；编辑时留空表示不修改，只有新增实例必须填明文。
        删除中间某一项后，后面的实例按新顺序逐条沿用原密钥，必要时请重新填写。
      </el-text>
      <el-text class="crawler-llm-config__notice-line block w-full whitespace-normal break-words text-text-secondary"
        tag="div">
        · 「测试」只发一次最小请求（1 token）验证连通性，
        <span class="crawler-llm-config__notice-emphasis font-semibold">
          不影响调用统计 / 健康状态，也不保存配置
        </span>
        ；慢模型可能超时（默认 45s），超时不代表配置错。
      </el-text>
      <el-text class="crawler-llm-config__notice-line block w-full whitespace-normal break-words text-text-secondary"
        tag="div">
        · 模型名可点「获取模型」拉取上游模型列表后勾选，也可直接手动输入；
        <span class="crawler-llm-config__notice-emphasis font-semibold">
          一张卡片可勾选多个模型，保存时按模型展开成多个实例
        </span>
        （共用该卡片的地址 / 密钥 / 限流）。
      </el-text>
      <el-text class="crawler-llm-config__notice-line block w-full whitespace-normal break-words text-text-secondary"
        tag="div">
        · 采样参数（temperature / top_p / top_k / num_predict）由 crawler 的 presets.py 固定，管理端不可调。
      </el-text>
    </div>
  </div>

  <!-- ============ 工具栏 ============ -->
  <div class="crawler-llm-config__toolbar flex flex-col min-w-0 gap-3 rounded-xl border border-border-light p-4">
    <div class="crawler-llm-config__toolbar-head flex items-center justify-between gap-2 flex-wrap">
      <span class="crawler-llm-config__toolbar-title text-base font-semibold text-text-primary">
        LLM 实例（{{ rows.length }} 个，卡片顺序 = 调用轮询顺序）
      </span>
      <el-text class="crawler-llm-config__dirty text-xs text-text-secondary" tag="span">
        {{ dirty ? '有未保存的修改' : '当前为 crawler 正在生效的配置' }}
      </el-text>
    </div>

    <div class="crawler-llm-config__actions flex items-center gap-3 flex-wrap">
      <el-button class="crawler-llm-config__add" size="large" :disabled="loading || saving || resetting"
        @click="handleAddRow">
        新增实例
      </el-button>
      <el-button type="primary" class="crawler-llm-config__save" size="large" :loading="saving"
        :disabled="loading || resetting" @click="handleSave">
        保存配置
      </el-button>
      <el-button class="crawler-llm-config__reload" size="large" :loading="loading" :disabled="saving || resetting"
        @click="loadConfig">
        重新读取
      </el-button>
      <el-popconfirm class="crawler-llm-config__reset-confirm" width="320"
        title="撤销所有人工保存？将删除 crawler 的持久化配置，恢复为部署 .env 里的 llm_apis（不可撤销）。" confirm-button-text="撤销并恢复"
        cancel-button-text="取消" @confirm="handleReset">
        <template #reference>
          <el-button class="crawler-llm-config__reset" type="warning" plain size="large" :loading="resetting"
            :disabled="loading || saving">
            撤销人工保存（恢复 .env）
          </el-button>
        </template>
      </el-popconfirm>
    </div>
  </div>

  <!-- ============ 实例卡片 ============ -->
  <div v-loading="loading"
    class="crawler-llm-config__grid grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
    <article v-for="(row, index) in rows" :key="row.key"
      class="crawler-llm-config__item flex flex-col min-w-0 gap-2 rounded-xl border border-border-light bg-bg-secondary p-3 transition-colors hover:border-primary-light-5">
      <!-- 卡片头：序号 + 运行状态，下面是模型名 / 地址摘要（便于一眼定位） -->
      <div class="crawler-llm-config__item-head flex items-start justify-between gap-2">
        <div class="crawler-llm-config__item-heading flex min-w-0 flex-col gap-1">
          <div class="crawler-llm-config__item-meta flex min-w-0 items-center gap-2">
            <span
              class="crawler-llm-config__item-index shrink-0 rounded-md bg-fill-dark px-1.5 py-0.5 text-xs font-medium text-text-regular">
              #{{ index + 1 }}
            </span>
            <el-tooltip v-if="rowState(row).reason" class="crawler-llm-config__item-state-tip"
              :content="rowState(row).reason" placement="top">
              <el-tag class="crawler-llm-config__item-state" :type="rowState(row).type">
                {{ rowState(row).label }}
              </el-tag>
            </el-tooltip>
            <el-tag v-else class="crawler-llm-config__item-state" :type="rowState(row).type">
              {{ rowState(row).label }}
            </el-tag>
          </div>
          <el-text class="crawler-llm-config__item-model w-full truncate text-sm font-semibold text-text-primary"
            tag="div">
            {{ modelSummary(row) }}
          </el-text>
          <el-text class="crawler-llm-config__item-host w-full truncate text-xs text-text-secondary" tag="div">
            {{ row.baseUrl || '（未填接口地址）' }}
          </el-text>
        </div>
        <el-popconfirm class="crawler-llm-config__item-remove-confirm" title="确定删除该实例？（保存后才会写入 crawler）"
          confirm-button-text="删除" cancel-button-text="取消" @confirm="handleRemoveRow(index)">
          <template #reference>
            <el-button class="crawler-llm-config__item-remove shrink-0" type="danger" link>
              移除
            </el-button>
          </template>
        </el-popconfirm>
      </div>

      <!-- 可编辑字段：卡片较窄，统一竖向排列，避免输入框被压缩 -->
      <div class="crawler-llm-config__fields flex flex-col gap-2">
        <div class="crawler-llm-config__field flex flex-col min-w-0 gap-1">
          <div class="crawler-llm-config__field-head flex items-center justify-between gap-2">
            <el-text class="crawler-llm-config__field-label text-xs text-text-secondary" tag="span">
              模型名（可多选，也可手动输入）
            </el-text>
            <el-button class="crawler-llm-config__row-fetch-models" link type="primary" :loading="row.fetchingModels"
              :disabled="!canFetchModels(row)" @click="handleFetchModels(index)">
              获取模型
            </el-button>
          </div>
          <el-select v-model="row.models" class="crawler-llm-config__row-model w-full" multiple filterable allow-create
            default-first-option clearable collapse-tags collapse-tags-tooltip :placeholder="MODEL_PLACEHOLDER">
            <el-option v-for="model in row.modelOptions" :key="model" :label="model" :value="model" />
          </el-select>
          <el-text v-if="row.modelMessage" class="crawler-llm-config__row-model-message text-xs"
            :class="row.modelMessageOk ? 'text-success' : 'text-danger'" tag="div">
            {{ row.modelMessage }}
          </el-text>
        </div>

        <div class="crawler-llm-config__field flex flex-col min-w-0 gap-1">
          <el-text class="crawler-llm-config__field-label text-xs text-text-secondary" tag="div">
            限流（次/秒）
          </el-text>
          <el-input-number v-model="row.rps" class="crawler-llm-config__row-rps w-full" :min="0.1" :max="100"
            :step="0.1" :precision="2" controls-position="right" />
        </div>

        <div class="crawler-llm-config__field flex flex-col min-w-0 gap-1">
          <el-text class="crawler-llm-config__field-label text-xs text-text-secondary" tag="div">
            接口地址（Base URL）
          </el-text>
          <!-- 占位文案走绑定常量：静态属性里出现 `//` 会被 vue-tsc 当成行注释，
                 导致后续模板表达式的 row/index 全部「Cannot find name」 -->
          <el-input v-model="row.baseUrl" class="crawler-llm-config__row-base-url" :placeholder="BASE_URL_PLACEHOLDER"
            clearable @change="handleEndpointChange(row)" />
        </div>

        <div class="crawler-llm-config__field flex flex-col min-w-0 gap-1">
          <el-text class="crawler-llm-config__field-label text-xs text-text-secondary" tag="div">
            密钥（留空 = 不修改）
          </el-text>
          <el-input v-model="row.token" class="crawler-llm-config__row-token" type="password" show-password clearable
            :placeholder="tokenPlaceholder(row)" @change="handleEndpointChange(row)" />
        </div>
      </div>

      <!-- 统计（服务端只读）：三格等分 + 细分隔线，比灰底大块更紧凑 -->
      <div class="crawler-llm-config__stats grid grid-cols-3 divide-x divide-border py-1.5">
        <div class="crawler-llm-config__stat flex min-w-0 flex-col gap-0.5 px-1.5 first:pl-0 last:pr-0">
          <span class="crawler-llm-config__stat-label text-xs leading-tight text-text-secondary">调用 / 成功率</span>
          <span class="crawler-llm-config__stat-value truncate text-sm font-medium text-text-primary">{{ invokeText(row)
            }}</span>
        </div>
        <div class="crawler-llm-config__stat flex min-w-0 flex-col gap-0.5 px-1.5 first:pl-0 last:pr-0">
          <span class="crawler-llm-config__stat-label text-xs leading-tight text-text-secondary">累计 token</span>
          <span class="crawler-llm-config__stat-value truncate text-sm font-medium text-text-primary">{{ tokensText(row)
            }}</span>
        </div>
        <div class="crawler-llm-config__stat flex min-w-0 flex-col gap-0.5 px-1.5 first:pl-0 last:pr-0">
          <span class="crawler-llm-config__stat-label text-xs leading-tight text-text-secondary">最近一次调用</span>
          <span class="crawler-llm-config__stat-value truncate text-sm font-medium text-text-primary">{{
            lastUsedText(row)
            }}</span>
        </div>
      </div>

      <!-- 底部：测试 + 就地结果 -->
      <div
        class="crawler-llm-config__item-footer flex min-w-0 items-center justify-between gap-2 flex-wrap border-t border-border pt-3">
        <el-button class="crawler-llm-config__item-test" plain :loading="row.testing"
          :disabled="loading || saving || resetting" @click="handleTest(index)">
          测试
        </el-button>
        <div v-if="row.testResult"
          class="crawler-llm-config__item-test-result-wrap flex min-w-0 flex-1 items-start justify-end gap-1">
          <el-icon class="crawler-llm-config__item-test-icon mt-0.5 shrink-0"
            :class="row.testOk ? 'text-success' : 'text-danger'">
            <CircleCheckFilled v-if="row.testOk" />
            <CircleCloseFilled v-else />
          </el-icon>
          <el-text class="crawler-llm-config__item-test-result min-w-0 whitespace-normal break-words text-xs"
            :class="row.testOk ? 'text-success' : 'text-danger'" tag="span">
            {{ row.testResult }}
          </el-text>
        </div>
        <el-text v-else class="crawler-llm-config__item-test-hint text-xs text-text-secondary" tag="span">
          测试只验连通性，不会保存
        </el-text>
      </div>
    </article>

    <el-empty v-if="!loading && rows.length === 0"
      class="crawler-llm-config__empty sm:col-span-2 xl:col-span-3 2xl:col-span-4"
      description="没有任何 LLM 实例，crawler 的云端判断会直接失败，请至少保留一个" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  CircleCheckFilled,
  CircleCloseFilled,
  WarningFilled,
} from '@element-plus/icons-vue'
import biliMessage from '@/utils/message'
import { formatDateTime } from '@/utils/dateFormat'
import { buildLlmSaveItems, normalizeCardModels } from '@/utils/llmConfigPayload'
import {
  fetchCrawlerLlmConfig,
  fetchCrawlerLlmModels,
  resetCrawlerLlmConfig,
  saveCrawlerLlmConfig,
  testCrawlerLlmConfig,
} from '@/api/notify/crawler_llm_api'
import type {
  CrawlerLlmConfigResp,
  CrawlerLlmSaveItem,
  CrawlerLlmStatsItem,
  CrawlerLlmTestResp,
} from '@/api/notify/crawler_llm_api'

/** 一张实例卡片（可编辑部分 + 服务端回显提示 + 测试结果） */
interface LlmRow {
  /** 卡片唯一 key（仅前端用，避免用 index 做 key 导致输入错位） */
  key: string
  baseUrl: string
  /** 该卡片勾选的模型名（保存时按模型展开成多条实例配置） */
  models: string[]
  /** 该卡片的下拉候选（来自「获取模型」，只做展示，不参与提交） */
  modelOptions: string[]
  /** 「获取模型」的结果文案（空 = 还没拉过） */
  modelMessage: string
  /** 上面的文案是否成功（决定颜色） */
  modelMessageOk: boolean
  /** 正在拉取模型列表（按钮 loading） */
  fetchingModels: boolean
  /** 用户新输入的明文密钥；留空 = 沿用原密钥 */
  token: string
  /** 服务端回显的脱敏密钥（仅用于 placeholder，绝不写回表单值） */
  tokenHint: string
  /** 限流：每秒请求数（提交时转字符串） */
  rps: number
  /** 新增卡片（索引超出服务端原配置 → 必须填密钥） */
  isNew: boolean
  /** 正在测试（按钮 loading） */
  testing: boolean
  /** 测试结果文案（空 = 还没测过） */
  testResult: string
  /** 测试结果是否成功（决定文案颜色） */
  testOk: boolean
}

/** 状态标签类型（Element Plus el-tag 的 type 取值） */
type TagType = 'success' | 'warning' | 'danger' | 'info'

/** Base URL 输入框占位文案（写成常量而不是静态属性，见模板里的注释） */
const BASE_URL_PLACEHOLDER = '如 https://api.example.com/v1'

/** 模型名输入框占位文案（同样走绑定常量，避免模板静态属性里的特殊字符问题） */
const MODEL_PLACEHOLDER = '选择或输入模型名，如 deepseek-chat'

const rows = ref<LlmRow[]>([])
const stats = ref<CrawlerLlmStatsItem[]>([])
const loading = ref(false)
const saving = ref(false)
/** 正在执行「撤销人工保存」（破坏性，需二次确认） */
const resetting = ref(false)
/** 服务端快照签名：用于提示「有未保存的修改」 */
const serverSignature = ref('')

let rowSeq = 0
function nextKey(): string {
  rowSeq += 1
  return `llm-row-${rowSeq}`
}

/** 统计按 `base_url + model_name` 与配置卡片对应 */
const statsMap = computed(() => {
  const map = new Map<string, CrawlerLlmStatsItem>()
  for (const item of stats.value) {
    map.set(`${item.base_url}||${item.model_name}`, item)
  }
  return map
})

/** 一张卡片可能勾了多个模型：统计取第一个能匹配上的模型（按 base_url + model_name） */
function statOf(row: LlmRow): CrawlerLlmStatsItem | undefined {
  for (const model of rowModels(row)) {
    const stat = statsMap.value.get(`${row.baseUrl}||${model}`)
    if (stat) return stat
  }
  return undefined
}

/** 卡片勾选的模型（去空白 + 去重，空值丢弃）；提交与校验都以它为准 */
function rowModels(row: LlmRow): string[] {
  return normalizeCardModels(row.models)
}

/** 卡片头的模型摘要（多选时只显示首个 + 数量，避免撑爆标题行） */
function modelSummary(row: LlmRow): string {
  const models = rowModels(row)
  if (models.length === 0) return '（未填模型名）'
  if (models.length === 1) return models[0]
  return `${models[0]} 等 ${models.length} 个模型`
}

function toRows(data: CrawlerLlmConfigResp): LlmRow[] {
  return data.items.map((item) => ({
    key: nextKey(),
    baseUrl: item.base_url,
    // 服务端一条配置 = 一个模型；卡片里仍以数组承载，用户可以继续勾选更多模型
    models: [item.model_name],
    modelOptions: [item.model_name],
    modelMessage: '',
    modelMessageOk: false,
    fetchingModels: false,
    // 脱敏值只做提示，不作为表单值回填，避免把 **** 当成新密钥提交
    token: '',
    tokenHint: item.token,
    rps: Number(item.requests_per_second) || 0.5,
    isNew: false,
    testing: false,
    testResult: '',
    testOk: false,
  }))
}

/**
 * 提交用的实例列表：一张卡片勾了 N 个模型就展开成 N 条配置
 * （共用该卡片的地址 / 密钥 / 限流；crawler 按 base_url 沿用同源密钥）。
 * 展开 / 归一逻辑抽在 `@/utils/llmConfigPayload`，由单测覆盖。
 */
function toPayload(): CrawlerLlmSaveItem[] {
  return buildLlmSaveItems(
    rows.value.map((row) => ({
      baseUrl: row.baseUrl,
      models: row.models,
      token: row.token,
      rps: row.rps,
    }))
  )
}

function buildSignature(): string {
  return JSON.stringify(toPayload())
}

const dirty = computed(
  () => serverSignature.value !== '' && buildSignature() !== serverSignature.value
)

function tokenPlaceholder(row: LlmRow): string {
  return row.isNew
    ? '必填，如 sk-xxxxxxxx'
    : `已配置 ${row.tokenHint}，留空则不修改`
}

const STATE_LABEL: Record<string, { label: string; type: TagType }> = {
  healthy: { label: '健康', type: 'success' },
  cooling: { label: '冷却中', type: 'warning' },
  quota_wait: { label: '额度等待', type: 'warning' },
  suspended: { label: '已暂停', type: 'danger' },
  removed: { label: '已被移除', type: 'danger' },
}

function rowState(row: LlmRow): { label: string; type: TagType; reason: string } {
  const stat = statOf(row)
  if (!stat) {
    return { label: '无统计', type: 'info', reason: '该组合尚未在 crawler 实例池中出现' }
  }
  const mapped = STATE_LABEL[stat.state] || { label: stat.state || '未知', type: 'info' as TagType }
  const reason = stat.disabled_reason || stat.last_error || ''
  return { label: mapped.label, type: mapped.type, reason }
}

function invokeText(row: LlmRow): string {
  const stat = statOf(row)
  if (!stat) return '—'
  const rate = Math.round(Number(stat.success_rate) * 100)
  return `${stat.invoke_count} 次 / ${Number.isNaN(rate) ? 0 : rate}%`
}

function lastUsedText(row: LlmRow): string {
  const stat = statOf(row)
  if (!stat?.last_used_at) return '尚未调用'
  return formatDateTime(Number(stat.last_used_at))
}

function tokensText(row: LlmRow): string {
  const stat = statOf(row)
  return stat ? stat.total_tokens : '—'
}

async function loadConfig() {
  loading.value = true
  try {
    const data = await fetchCrawlerLlmConfig()
    // 读取失败：保留当前表单，不清空（错误提示由请求层统一弹出）
    if (!data) return
    rows.value = toRows(data)
    stats.value = data.stats
    serverSignature.value = buildSignature()
  } finally {
    loading.value = false
  }
}

function handleAddRow() {
  rows.value.push({
    key: nextKey(),
    baseUrl: '',
    models: [],
    modelOptions: [],
    modelMessage: '',
    modelMessageOk: false,
    fetchingModels: false,
    token: '',
    tokenHint: '',
    rps: 0.5,
    isNew: true,
    testing: false,
    testResult: '',
    testOk: false,
  })
}

/** 地址 / 密钥变了：之前的候选来自别的上游，必须清掉，避免把旧厂商的模型留在下拉里 */
function handleEndpointChange(row: LlmRow) {
  row.modelOptions = [...rowModels(row)]
  row.modelMessage = ''
  row.modelMessageOk = false
}

/** 「获取模型」是否可点：地址合法 + 有密钥可回填（新增卡片必须已填明文） */
function canFetchModels(row: LlmRow): boolean {
  if (loading.value || saving.value || resetting.value || row.fetchingModels) return false
  if (!/^https?:\/\//.test(row.baseUrl.trim())) return false
  return !row.isNew || row.token.trim().length > 0
}

/**
 * 拉取该卡片对应的上游模型列表（只做候选，不提交任何配置）。
 * 老卡片 token 留空时由 crawler 按 index 沿用原密钥；新增卡片必须已填明文。
 */
async function handleFetchModels(index: number) {
  const row = rows.value[index]
  if (!row) return
  row.fetchingModels = true
  row.modelMessage = ''
  row.modelMessageOk = false
  try {
    const result = await fetchCrawlerLlmModels({
      index: row.isNew ? null : String(index),
      base_url: row.baseUrl.trim(),
      model_name: rowModels(row)[0] ?? '',
      token: row.token.trim(),
    })
    // 失败（crawler 不可达）时提示已由请求层弹出，这里保持「未拉取」态
    if (!result) return
    // SDK 把数组字段生成为可选（后端默认空数组），这里统一兜底成 []
    const models = result.models ?? []
    if (result.ok) {
      row.modelOptions = [...new Set([...models, ...rowModels(row)])]
      row.modelMessageOk = models.length > 0
      row.modelMessage =
        models.length > 0
          ? `已获取 ${models.length} 个模型，可直接勾选`
          : result.error || '上游未返回任何模型'
    } else {
      row.modelMessage = result.error || '获取模型列表失败'
    }
  } finally {
    row.fetchingModels = false
  }
}

function handleRemoveRow(index: number) {
  rows.value.splice(index, 1)
}

/** 测试结果 → 一行可读文案（成功显示耗时，失败显示状态码 + 原因） */
function describeTestResult(result: CrawlerLlmTestResp): string {
  const ms = `${result.latency_ms}ms`
  if (result.ok) return `可用（HTTP ${result.status_code ?? 200}，${ms}）`
  const code = result.status_code ? `HTTP ${result.status_code}` : '未发出请求'
  return `不可用（${code}，${ms}）：${result.error || '未知错误'}`
}

/**
 * 测试一张卡片：拿表单当前值去探测（不保存）。
 * 新卡片没有 index，必须填了密钥才能测；老卡片留空则沿用服务端原密钥。
 */
async function handleTest(index: number) {
  const row = rows.value[index]
  if (!row) return
  // 一张卡片可能勾了多个模型：连通性只与地址 / 密钥有关，测第一个模型即可
  const model = rowModels(row)[0] ?? ''
  if (!model) {
    biliMessage.warning('请先选择或输入模型名再测试')
    return
  }
  if (row.isNew && !row.token.trim()) {
    biliMessage.warning('新实例需要先填写密钥才能测试')
    return
  }
  row.testing = true
  row.testResult = ''
  row.testOk = false
  try {
    const result = await testCrawlerLlmConfig({
      index: row.isNew ? null : String(index),
      base_url: row.baseUrl.trim(),
      model_name: model,
      token: row.token.trim(),
    })
    // 失败（crawler 不可达）时提示已由请求层弹出，这里保持「未测试」态
    if (!result) return
    row.testOk = result.ok
    row.testResult = describeTestResult(result)
  } finally {
    row.testing = false
  }
}

/** 前端预校验（后端同样校验，此处提前拦截避免无谓请求） */
function validate(): string | null {
  if (rows.value.length === 0) return '至少需要保留一个 LLM 实例'
  for (let i = 0; i < rows.value.length; i += 1) {
    const row = rows.value[i]
    const no = i + 1
    // 卡片可能展开成多个实例，文案统一用「卡片」避免序号对不上
    if (rowModels(row).length === 0) return `第 ${no} 张卡片缺少模型名`
    if (!/^https?:\/\//.test(row.baseUrl.trim())) {
      return `第 ${no} 张卡片的接口地址必须以 http:// 或 https:// 开头`
    }
    if (!(row.rps > 0)) return `第 ${no} 张卡片的限流必须大于 0`
    if (row.isNew && !row.token.trim()) return `第 ${no} 张卡片是新实例，必须填写密钥`
  }
  return null
}

async function handleSave() {
  const invalid = validate()
  if (invalid) {
    biliMessage.warning(invalid)
    return
  }
  saving.value = true
  try {
    const ok = await saveCrawlerLlmConfig(toPayload())
    if (ok) await loadConfig()
  } finally {
    saving.value = false
  }
}

/**
 * 撤销人工保存：让 crawler 删掉 `runtime/llm_apis.json` 并热切回 `.env` 的 `llm_apis`。
 * 破坏性（丢弃本页保存过的全部人工修改），由 el-popconfirm 二次确认后调用。
 */
async function handleReset() {
  resetting.value = true
  try {
    const data = await resetCrawlerLlmConfig()
    if (!data) return // 失败提示已由请求层弹出，保留当前表单
    rows.value = toRows(data)
    stats.value = data.stats
    serverSignature.value = buildSignature()
  } finally {
    resetting.value = false
  }
}

onMounted(() => {
  loadConfig()
})
</script>
