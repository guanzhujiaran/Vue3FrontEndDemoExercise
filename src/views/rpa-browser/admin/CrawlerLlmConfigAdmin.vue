<template>
  <div
    class="crawler-llm-config flex flex-col flex-1 min-h-0 min-w-0 gap-4 p-4 overflow-y-auto overflow-x-hidden"
  >
    <!-- ============ 说明 ============ -->
    <!-- 不用 el-alert：其 .el-alert__content 是 max-content 弹性项，长文本不换行会被 overflow:hidden 裁掉 -->
    <div class="crawler-llm-config__notice flex min-w-0 items-start gap-2 rounded-lg border border-warning-light-7 bg-warning-light-9 p-3">
      <el-icon class="crawler-llm-config__notice-icon mt-0.5 shrink-0 text-warning">
        <WarningFilled />
      </el-icon>
      <div class="crawler-llm-config__notice-body flex min-w-0 flex-1 flex-col gap-1">
        <span class="crawler-llm-config__notice-title text-sm font-semibold text-warning">
          这里是 be-bilibili-crawler 的云端 LLM 实例池（按顺序轮询，失败自动冷却/切换）
        </span>
        <el-text class="crawler-llm-config__notice-line block w-full whitespace-normal break-words text-text-secondary" tag="div">
          · 保存后立即热更新，无需重启 crawler；
          <span class="crawler-llm-config__notice-emphasis font-semibold">
            但 crawler 重启后会回退为 .env 里的 llm_apis
          </span>
          ，要长期生效请同步改部署环境变量。
        </el-text>
        <el-text class="crawler-llm-config__notice-line block w-full whitespace-normal break-words text-text-secondary" tag="div">
          · 密钥读取时为脱敏值（前4****后4）；编辑时留空表示不修改，只有新增实例必须填明文。
        </el-text>
        <el-text class="crawler-llm-config__notice-line block w-full whitespace-normal break-words text-text-secondary" tag="div">
          · 采样参数（temperature / top_p / top_k / num_predict）由 crawler 的 presets.py 固定，管理端不可调。
        </el-text>
      </div>
    </div>

    <!-- ============ 实例表格 ============ -->
    <div class="crawler-llm-config__card flex flex-col min-w-0 gap-3 rounded-xl border border-border-light p-4">
      <div class="crawler-llm-config__card-header flex items-center justify-between gap-2 flex-wrap">
        <span class="crawler-llm-config__card-title text-base font-semibold text-text-primary">
          LLM 实例列表
        </span>
        <el-text class="crawler-llm-config__card-count text-xs text-text-secondary" tag="span">
          共 {{ rows.length }} 个实例（表格顺序 = 调用轮询顺序）
        </el-text>
      </div>

      <el-table
        v-loading="loading"
        :data="rows"
        row-key="key"
        class="crawler-llm-config__table w-full min-w-0"
        border
      >
        <el-table-column label="运行状态（服务端只读）" width="160">
          <template #default="{ row }">
            <el-tooltip
              v-if="rowState(row).reason"
              class="crawler-llm-config__row-state-tip"
              :content="rowState(row).reason"
              placement="top"
            >
              <el-tag class="crawler-llm-config__row-state" :type="rowState(row).type">
                {{ rowState(row).label }}
              </el-tag>
            </el-tooltip>
            <el-tag
              v-else
              class="crawler-llm-config__row-state"
              :type="rowState(row).type"
            >
              {{ rowState(row).label }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="模型名" min-width="220">
          <template #default="{ row }">
            <el-input
              v-model="row.modelName"
              class="crawler-llm-config__row-model"
              placeholder="如 deepseek-chat"
              clearable
            />
          </template>
        </el-table-column>

        <el-table-column label="接口地址（OpenAI 兼容 Base URL）" min-width="260">
          <template #default="{ row }">
            <el-input
              v-model="row.baseUrl"
              class="crawler-llm-config__row-base-url"
              placeholder="如 https://api.example.com/v1"
              clearable
            />
          </template>
        </el-table-column>

        <el-table-column label="密钥（留空 = 不修改）" min-width="220">
          <template #default="{ row }">
            <el-input
              v-model="row.token"
              class="crawler-llm-config__row-token"
              type="password"
              show-password
              clearable
              :placeholder="tokenPlaceholder(row)"
            />
          </template>
        </el-table-column>

        <el-table-column label="限流（次/秒）" width="160">
          <template #default="{ row }">
            <el-input-number
              v-model="row.rps"
              class="crawler-llm-config__row-rps"
              :min="0.1"
              :max="100"
              :step="0.1"
              :precision="2"
              controls-position="right"
            />
          </template>
        </el-table-column>

        <el-table-column label="调用次数 / 成功率" width="150">
          <template #default="{ row }">
            <el-text class="crawler-llm-config__row-calls text-sm text-text-secondary" tag="span">
              {{ invokeText(row) }}
            </el-text>
          </template>
        </el-table-column>

        <el-table-column label="最近一次调用" width="180">
          <template #default="{ row }">
            <el-text class="crawler-llm-config__row-last-used text-sm text-text-secondary" tag="span">
              {{ lastUsedText(row) }}
            </el-text>
          </template>
        </el-table-column>

        <el-table-column label="累计 token" width="120">
          <template #default="{ row }">
            <el-text class="crawler-llm-config__row-tokens text-sm text-text-secondary" tag="span">
              {{ tokensText(row) }}
            </el-text>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="100" fixed="right">
          <template #default="scope">
            <el-popconfirm
              class="crawler-llm-config__row-remove-confirm"
              title="确定删除该实例？（保存后才会写入 crawler）"
              confirm-button-text="删除"
              cancel-button-text="取消"
              @confirm="handleRemoveRow(scope.$index)"
            >
              <template #reference>
                <el-button
                  class="crawler-llm-config__row-remove"
                  type="danger"
                  plain
                >
                  删除
                </el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>

        <template #empty>
          <el-empty
            class="crawler-llm-config__empty"
            description="没有任何 LLM 实例，crawler 的云端判断会直接失败，请至少保留一个"
          />
        </template>
      </el-table>

      <div class="crawler-llm-config__actions flex items-center gap-3 flex-wrap">
        <el-button
          class="crawler-llm-config__add"
          size="large"
          :disabled="loading || saving"
          @click="handleAddRow"
        >
          新增实例
        </el-button>
        <el-button
          type="primary"
          class="crawler-llm-config__save"
          size="large"
          :loading="saving"
          :disabled="loading"
          @click="handleSave"
        >
          保存配置
        </el-button>
        <el-button
          class="crawler-llm-config__reload"
          size="large"
          :loading="loading"
          :disabled="saving"
          @click="loadConfig"
        >
          重新读取
        </el-button>
        <el-text class="crawler-llm-config__dirty text-xs text-text-secondary" tag="span">
          {{ dirty ? '有未保存的修改' : '当前为 crawler 正在生效的配置' }}
        </el-text>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { WarningFilled } from '@element-plus/icons-vue'
import biliMessage from '@/utils/message'
import { formatDateTime } from '@/utils/dateFormat'
import {
  fetchCrawlerLlmConfig,
  saveCrawlerLlmConfig,
} from '@/api/notify/crawler_llm_api'
import type {
  CrawlerLlmConfigResp,
  CrawlerLlmSaveItem,
  CrawlerLlmStatsItem,
} from '@/api/notify/crawler_llm_api'

/** 表格行（可编辑部分 + 服务端回显提示） */
interface LlmRow {
  /** 行唯一 key（仅前端用，避免用 index 做 key 导致输入错位） */
  key: string
  baseUrl: string
  modelName: string
  /** 用户新输入的明文密钥；留空 = 沿用原密钥 */
  token: string
  /** 服务端回显的脱敏密钥（仅用于 placeholder，绝不写回表单值） */
  tokenHint: string
  /** 限流：每秒请求数（提交时转字符串） */
  rps: number
  /** 新增行（索引超出服务端原配置 → 必须填密钥） */
  isNew: boolean
}

/** 状态标签类型（Element Plus el-tag 的 type 取值） */
type TagType = 'success' | 'warning' | 'danger' | 'info'

const rows = ref<LlmRow[]>([])
const stats = ref<CrawlerLlmStatsItem[]>([])
const loading = ref(false)
const saving = ref(false)
/** 服务端快照签名：用于提示「有未保存的修改」 */
const serverSignature = ref('')

let rowSeq = 0
function nextKey(): string {
  rowSeq += 1
  return `llm-row-${rowSeq}`
}

/** 统计按 `base_url + model_name` 与配置行对应 */
const statsMap = computed(() => {
  const map = new Map<string, CrawlerLlmStatsItem>()
  for (const item of stats.value) {
    map.set(`${item.base_url}||${item.model_name}`, item)
  }
  return map
})

function statOf(row: LlmRow): CrawlerLlmStatsItem | undefined {
  return statsMap.value.get(`${row.baseUrl}||${row.modelName}`)
}

function toRows(data: CrawlerLlmConfigResp): LlmRow[] {
  return data.items.map((item) => ({
    key: nextKey(),
    baseUrl: item.base_url,
    modelName: item.model_name,
    // 脱敏值只做提示，不作为表单值回填，避免把 **** 当成新密钥提交
    token: '',
    tokenHint: item.token,
    rps: Number(item.requests_per_second) || 0.5,
    isNew: false,
  }))
}

function toPayload(): CrawlerLlmSaveItem[] {
  return rows.value.map((row) => ({
    base_url: row.baseUrl.trim(),
    model_name: row.modelName.trim(),
    token: row.token.trim(),
    requests_per_second: String(row.rps),
  }))
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
    modelName: '',
    token: '',
    tokenHint: '',
    rps: 0.5,
    isNew: true,
  })
}

function handleRemoveRow(index: number) {
  rows.value.splice(index, 1)
}

/** 前端预校验（后端同样校验，此处提前拦截避免无谓请求） */
function validate(): string | null {
  if (rows.value.length === 0) return '至少需要保留一个 LLM 实例'
  for (let i = 0; i < rows.value.length; i += 1) {
    const row = rows.value[i]
    const no = i + 1
    if (!row.modelName.trim()) return `第 ${no} 个实例缺少模型名`
    if (!/^https?:\/\//.test(row.baseUrl.trim())) {
      return `第 ${no} 个实例的接口地址必须以 http:// 或 https:// 开头`
    }
    if (!(row.rps > 0)) return `第 ${no} 个实例的限流必须大于 0`
    if (row.isNew && !row.token.trim()) return `第 ${no} 个实例是新实例，必须填写密钥`
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

onMounted(() => {
  loadConfig()
})
</script>
