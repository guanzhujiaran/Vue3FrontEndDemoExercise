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
        <div class="crawler-llm-config__field crawler-llm-config__field--models flex flex-col min-w-0 gap-1">
          <div class="crawler-llm-config__field-head flex items-center justify-between gap-2">
            <el-text class="crawler-llm-config__field-label text-xs text-text-secondary" tag="span">
              模型名（勾选，可多选）
            </el-text>
            <div class="crawler-llm-config__row-model-actions flex shrink-0 items-center gap-2">
              <el-button class="crawler-llm-config__row-restore-models" link type="primary"
                :disabled="!canRestoreModels(row)" title="放弃本次勾选改动，恢复为已保存的模型"
                @click="handleRestoreModels(row)">
                恢复
              </el-button>
              <el-button class="crawler-llm-config__row-fetch-models" link type="primary" :loading="row.fetchingModels"
                :disabled="!canFetchModels(row)" @click="handleFetchModels(index)">
                获取模型
              </el-button>
            </div>
          </div>

          <!-- 模型面板：搜索（固定） + 全选表头 + 列表（独立滚动） + 添加行 -->
          <!-- 局部小列表用细滚动条，不套 BiliScrollbar（见滚动条规范 §1） -->
          <div
            class="crawler-llm-config__row-model-panel flex min-w-0 flex-col overflow-hidden rounded-md border border-border-light bg-fill-light">
            <!-- 搜索 / 手输：输入即过滤；回车把「候选里没有的名字」加进列表并勾选 -->
            <div class="crawler-llm-config__row-model-search border-b border-border-light bg-fill-dark px-2 py-1">
              <el-input v-model="row.modelQuery" class="crawler-llm-config__row-model-search-input w-full"
                :placeholder="MODEL_PLACEHOLDER" clearable @keyup.enter="handleAddModel(row)">
                <template #prefix>
                  <el-icon class="crawler-llm-config__row-model-search-icon">
                    <Search />
                  </el-icon>
                </template>
              </el-input>
            </div>

            <!-- 表头：checkbox = 全选 / 清空（半选态表示只勾了一部分） -->
            <div
              class="crawler-llm-config__row-model-head flex items-center justify-between gap-2 border-b border-border-light px-2 py-1">
              <el-checkbox class="crawler-llm-config__row-model-all" :model-value="isAllModelsSelected(row)"
                :indeterminate="isModelsIndeterminate(row)" :disabled="modelChoices(row).length === 0"
                @change="handleToggleAllModels(row, $event)">
                模型名称
              </el-checkbox>
              <el-text class="crawler-llm-config__row-model-count shrink-0 text-xs text-text-secondary" tag="span">
                {{ rowModels(row).length }} / {{ modelChoices(row).length }}
              </el-text>
            </div>

            <div v-if="visibleModelChoices(row).length > 0"
              class="crawler-llm-config__row-model-list bili-thin-scroll max-h-40 overflow-y-auto px-2 py-1">
              <el-checkbox-group v-model="row.models" class="crawler-llm-config__row-model-group flex flex-col">
                <el-checkbox v-for="model in visibleModelChoices(row)" :key="model" :value="model"
                  class="crawler-llm-config__row-model-item h-7 min-w-0" :title="model">
                  <span class="crawler-llm-config__row-model-label block truncate text-xs">{{ model }}</span>
                </el-checkbox>
              </el-checkbox-group>
            </div>
            <el-text v-else class="crawler-llm-config__row-model-empty block px-2 py-2 text-xs text-text-secondary"
              tag="div">
              {{ row.modelQuery.trim() ? '没有匹配的模型' : '还没有候选模型：点「获取模型」，或直接输入模型名回车' }}
            </el-text>

            <!-- 添加行：输入的模型不在候选里时才出现（上游 /models 不可用时的兜底） -->
            <el-button v-if="canAddModelDraft(row)"
              class="crawler-llm-config__row-model-add w-full justify-start rounded-none border-t border-border-lighter px-2"
              text type="primary" @click="handleAddModel(row)">
              <el-icon class="crawler-llm-config__row-model-add-icon mr-1">
                <Plus />
              </el-icon>
              添加 “{{ row.modelQuery.trim() }}”
            </el-button>
          </div>

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

      <!-- 底部：测试入口（结果在弹窗里看，不占卡片高度） -->
      <div
        class="crawler-llm-config__item-footer flex min-w-0 items-center justify-between gap-2 flex-wrap border-t border-border pt-3">
        <el-button class="crawler-llm-config__item-test" plain
          :disabled="loading || saving || resetting || rowModels(row).length === 0"
          @click="handleOpenTest(index)">
          测试
        </el-button>
        <el-text class="crawler-llm-config__item-test-hint text-xs text-text-secondary" tag="span">
          测试只验连通性，不会保存
        </el-text>
      </div>
    </article>

    <el-empty v-if="!loading && rows.length === 0"
      class="crawler-llm-config__empty sm:col-span-2 xl:col-span-3 2xl:col-span-4"
      description="没有任何 LLM 实例，crawler 的云端判断会直接失败，请至少保留一个" />
  </div>

  <!-- ============ 测试弹窗：选一个模型发一次最小请求 ============ -->
  <el-dialog v-model="testDialogVisible" class="crawler-llm-config__test-dialog" width="520" title="测试连通性"
    append-to-body>
    <div class="crawler-llm-config__test-body flex flex-col gap-3">
      <div class="crawler-llm-config__test-field flex flex-col gap-1">
        <el-text class="crawler-llm-config__test-label text-xs text-text-secondary" tag="div">
          模型名（默认最近勾选的那个）
        </el-text>
        <el-select v-model="testForm.model" class="crawler-llm-config__test-model w-full" filterable allow-create
          default-first-option :placeholder="MODEL_PLACEHOLDER">
          <el-option v-for="model in testModelOptions" :key="model" :label="model" :value="model" />
        </el-select>
      </div>

      <div class="crawler-llm-config__test-field flex flex-col gap-1">
        <el-text class="crawler-llm-config__test-label text-xs text-text-secondary" tag="div">接口地址</el-text>
        <el-input v-model="testForm.baseUrl" class="crawler-llm-config__test-base-url w-full" clearable />
      </div>

      <div class="crawler-llm-config__test-field flex flex-col gap-1">
        <el-text class="crawler-llm-config__test-label text-xs text-text-secondary" tag="div">
          密钥（留空 = 用已保存的）
        </el-text>
        <el-input v-model="testForm.token" class="crawler-llm-config__test-token w-full" type="password" show-password
          clearable :placeholder="testForm.tokenHint || '已保存的密钥不可见，留空即可'" />
      </div>

      <div v-if="testResult"
        class="crawler-llm-config__test-result bili-thin-scroll flex max-h-48 items-start gap-2 overflow-y-auto rounded-md border border-border-light bg-fill-light px-2 py-2">
        <el-icon class="crawler-llm-config__test-result-icon mt-0.5 shrink-0"
          :class="testResult.ok ? 'text-success' : 'text-danger'">
          <CircleCheckFilled v-if="testResult.ok" />
          <CircleCloseFilled v-else />
        </el-icon>
        <!-- whitespace-pre-wrap + break-words：上游的 JSON / Python 异常串原样换行显示，
             不再被压成一行导致读不出是哪一句 -->
        <el-text class="crawler-llm-config__test-result-text min-w-0 whitespace-pre-wrap break-words text-xs"
          :class="testResult.ok ? 'text-success' : 'text-danger'" tag="div">
          {{ describeTestResult(testResult) }}
        </el-text>
      </div>
    </div>

    <template #footer>
      <el-button class="crawler-llm-config__test-close" @click="testDialogVisible = false">关闭</el-button>
      <el-button class="crawler-llm-config__test-run" type="primary" :loading="testRunning" @click="runTest">
        开始测试
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  CircleCheckFilled,
  CircleCloseFilled,
  Plus,
  Search,
  WarningFilled,
} from '@element-plus/icons-vue'
import biliMessage from '@/utils/message'
import { formatDateTime } from '@/utils/dateFormat'
import {
  buildLlmSaveItems,
  groupLlmConfigs,
  normalizeBaseUrl,
  normalizeCardModels,
} from '@/utils/llmConfigPayload'
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
  /** 服务端**已保存**的模型（「恢复」按钮的还原目标；保存成功后随 loadConfig 刷新） */
  savedModels: string[]
  /** 该卡片的 checkbox 候选（来自「获取模型」+ 手动添加，只做展示，不参与提交） */
  modelOptions: string[]
  /** 搜索 / 手动输入的草稿：有内容时过滤候选，回车把「候选里没有的名字」加进列表并勾选 */
  modelQuery: string
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
  /**
   * 模型名 → 该模型在 crawler `llm_apis` 里的下标。
   *
   * 一张卡片可能承载多个模型（多个下标），「测试」「获取模型」都必须用**真实下标**
   * 回填密钥，不能再用卡片序号 —— 分组后两者不再相等。
   */
  indexByModel: Record<string, string>
  /** 限流：每秒请求数（提交时转字符串） */
  rps: number
  /** 新增卡片（索引超出服务端原配置 → 必须填密钥） */
  isNew: boolean
}

/** 状态标签类型（Element Plus el-tag 的 type 取值） */
type TagType = 'success' | 'warning' | 'danger' | 'info'

/** Base URL 输入框占位文案（写成常量而不是静态属性，见模板里的注释） */
const BASE_URL_PLACEHOLDER = '如 https://api.example.com/v1'

/** 模型名输入框占位文案（同样走绑定常量，避免模板静态属性里的特殊字符问题） */
const MODEL_PLACEHOLDER = '搜索模型名；候选里没有时回车添加'

const rows = ref<LlmRow[]>([])
const stats = ref<CrawlerLlmStatsItem[]>([])
const loading = ref(false)
const saving = ref(false)
/** 正在执行「撤销人工保存」（破坏性，需二次确认） */
const resetting = ref(false)
/** 服务端快照签名：用于提示「有未保存的修改」 */
const serverSignature = ref('')

// ===== 测试弹窗 =====
/** 弹窗是否可见 */
const testDialogVisible = ref(false)
/** 正在等 crawler 返回探测结果 */
const testRunning = ref(false)
/** 最近一次探测结果（null = 还没测） */
const testResult = ref<CrawlerLlmTestResp | null>(null)
/** 当前被测卡片在 `rows` 里的下标（-1 = 未打开） */
const testRowIndex = ref(-1)
/** 弹窗表单：模型名默认取该卡片**最后勾选**的那个 */
const testForm = ref({
  model: '',
  baseUrl: '',
  token: '',
  tokenHint: '',
  /** crawler 侧的下标；token 留空时靠它回填原密钥，新卡片为 null */
  index: null as string | null,
})

/** 弹窗模型下拉的候选：跟随被测卡片的候选列表 */
const testModelOptions = computed(() => {
  const row = rows.value[testRowIndex.value]
  return row ? modelChoices(row) : []
})

let rowSeq = 0
function nextKey(): string {
  rowSeq += 1
  return `llm-row-${rowSeq}`
}

/** 统计按 `归一化 base_url + model_name` 与配置卡片对应（服务端已归一化，这里再兜一次） */
const statsMap = computed(() => {
  const map = new Map<string, CrawlerLlmStatsItem>()
  for (const item of stats.value) {
    map.set(`${normalizeBaseUrl(item.base_url)}||${item.model_name}`, item)
  }
  return map
})

/**
 * 该卡片下每个模型各自的统计。
 *
 * 可能少于模型数：刚加的模型还没进实例池（保存后才会建槽位），这类不参与聚合。
 */
function statsOf(row: LlmRow): CrawlerLlmStatsItem[] {
  const baseUrl = normalizeBaseUrl(row.baseUrl)
  return rowModels(row)
    .map((model) => statsMap.value.get(`${baseUrl}||${model}`))
    .filter((item): item is CrawlerLlmStatsItem => Boolean(item))
}

/** 状态严重程度：数值越大越差，一张卡片按**最差**的模型展示 */
const STATE_SEVERITY: Record<string, number> = {
  removed: 5,
  suspended: 4,
  quota_wait: 3,
  cooling: 2,
  healthy: 1,
}

/** 卡片内状态最差的模型（可能没有：整组都还没进池） */
function worstStat(row: LlmRow): CrawlerLlmStatsItem | undefined {
  return statsOf(row).reduce<CrawlerLlmStatsItem | undefined>((worst, item) => {
    if (!worst) return item
    return (STATE_SEVERITY[item.state] ?? 0) > (STATE_SEVERITY[worst.state] ?? 0)
      ? item
      : worst
  }, undefined)
}

/** 卡片级聚合指标：多模型求和 / 加权，最近调用取最大 */
interface RowAggregate {
  invoke: number
  successRate: number
  tokens: number
  lastUsedAt: number
}

function aggregateStats(row: LlmRow): RowAggregate | null {
  const list = statsOf(row)
  if (list.length === 0) return null
  let invoke = 0
  let success = 0
  let tokens = 0
  let lastUsedAt = 0
  for (const item of list) {
    invoke += Number(item.invoke_count) || 0
    success += Number(item.success_count) || 0
    tokens += Number(item.total_tokens) || 0
    lastUsedAt = Math.max(lastUsedAt, Number(item.last_used_at) || 0)
  }
  return {
    invoke,
    successRate: invoke > 0 ? success / invoke : 0,
    tokens,
    lastUsedAt,
  }
}

/** 卡片勾选的模型（去空白 + 去重，空值丢弃）；提交与校验都以它为准 */
function rowModels(row: LlmRow): string[] {
  return normalizeCardModels(row.models)
}

/**
 * 卡片对应的 crawler `llm_apis` 下标（「测试」「获取模型」用它回填原密钥）。
 *
 * 分组后一张卡片对应多个下标，优先取**当前勾选模型**的下标；
 * 都匹配不上（比如刚手输了新模型名）时退回组内第一个下标 —— 同组同源，密钥相同。
 */
function rowCrawlerIndex(row: LlmRow): string | null {
  for (const model of rowModels(row)) {
    const index = row.indexByModel[model]
    if (index !== undefined) return index
  }
  const fallback = Object.values(row.indexByModel)
  return fallback.length > 0 ? fallback[0] : null
}

/**
 * checkbox 候选：上游拉回来的模型 + 已勾选的模型。
 *
 * 已勾选但不在候选里的（手输的、或换地址后旧候选被清掉的）也要出现，
 * 否则用户会看到「已选 3 个」却只勾出 1 个。
 */
function modelChoices(row: LlmRow): string[] {
  const seen = new Set<string>()
  const choices: string[] = []
  for (const model of [...row.modelOptions, ...rowModels(row)]) {
    if (!model || seen.has(model)) continue
    seen.add(model)
    choices.push(model)
  }
  return choices
}

/**
 * 搜索过滤后的候选：大小写不敏感的包含匹配。
 *
 * 已勾选的模型**始终保留**——否则搜别的词时看不到自己选了什么，容易误以为没选上。
 */
function visibleModelChoices(row: LlmRow): string[] {
  const query = row.modelQuery.trim().toLowerCase()
  const choices = modelChoices(row)
  if (!query) return choices
  const selected = new Set(rowModels(row))
  return choices.filter(
    (model) => model.toLowerCase().includes(query) || selected.has(model)
  )
}

/** 输入的名字能否作为新模型添加（非空，且候选里没有同名） */
function canAddModelDraft(row: LlmRow): boolean {
  const draft = row.modelQuery.trim()
  if (!draft) return false
  const lowered = draft.toLowerCase()
  return !modelChoices(row).some((model) => model.toLowerCase() === lowered)
}

/** 候选是否已全部勾选（表头「模型名称」全选框的选中态） */
function isAllModelsSelected(row: LlmRow): boolean {
  const choices = modelChoices(row)
  if (choices.length === 0) return false
  const selected = new Set(rowModels(row))
  return choices.every((model) => selected.has(model))
}

/** 只勾了一部分（表头全选框的半选态） */
function isModelsIndeterminate(row: LlmRow): boolean {
  return !isAllModelsSelected(row) && rowModels(row).length > 0
}

/** 表头 checkbox：勾上 = 全选候选，取消 = 清空 */
function handleToggleAllModels(
  row: LlmRow,
  checked: string | number | boolean
) {
  row.models = checked ? modelChoices(row) : []
  row.modelMessage = ''
  row.modelMessageOk = false
}

/** 勾选是否已偏离已保存的选择（决定「恢复」按钮是否可点；顺序也算改动） */
function canRestoreModels(row: LlmRow): boolean {
  if (row.savedModels.length === 0) return false
  const current = rowModels(row)
  if (current.length !== row.savedModels.length) return true
  return current.some((model, index) => model !== row.savedModels[index])
}

/**
 * 恢复：放弃本次勾选改动，回到服务端已保存的模型集合。
 *
 * 只动勾选，不动地址 / 密钥 / 限流 —— 那几项有自己的「留空 = 不修改」语义，
 * 混在一起恢复会让用户分不清哪些改动被丢掉了。
 */
function handleRestoreModels(row: LlmRow) {
  row.models = [...row.savedModels]
  row.modelMessage = ''
  row.modelMessageOk = false
}

/**
 * 手动添加模型名：并入候选并自动勾选（上游 `/models` 不可用时的兜底）。
 *
 * 同一个输入框既是搜索框也是添加入口，所以**只有候选里没有同名模型时才添加**——
 * 否则用户搜「nvidia」按回车会凭空多出一个叫 nvidia 的模型。
 */
function handleAddModel(row: LlmRow) {
  if (!canAddModelDraft(row)) return
  const model = row.modelQuery.trim()
  row.modelOptions = [...row.modelOptions, model]
  if (!rowModels(row).includes(model)) {
    row.models = [...rowModels(row), model]
  }
  row.modelQuery = ''
  row.modelMessage = ''
  row.modelMessageOk = false
}

/** 卡片头的模型摘要（多选时只显示首个 + 数量，避免撑爆标题行） */
function modelSummary(row: LlmRow): string {
  const models = rowModels(row)
  if (models.length === 0) return '（未填模型名）'
  if (models.length === 1) return models[0]
  return `${models[0]} 等 ${models.length} 个模型`
}

function toRows(data: CrawlerLlmConfigResp): LlmRow[] {
  // 同一个 base_url + 同一个密钥下的多个模型合并成**一张卡片**；
  // 保存时仍按模型展开成多条（见 buildLlmSaveItems），crawler 的存储结构不变。
  return groupLlmConfigs(data.items).map((group) => {
    const indexByModel: Record<string, string> = {}
    for (const item of group.items) {
      if (item.model_name) indexByModel[item.model_name] = item.index
    }
    return {
      key: nextKey(),
      baseUrl: group.baseUrl,
      models: [...group.models],
      savedModels: [...group.models],
      modelOptions: [...group.models],
      modelQuery: '',
      modelMessage: '',
      modelMessageOk: false,
      fetchingModels: false,
      // 脱敏值只做提示，不作为表单值回填，避免把 **** 当成新密钥提交
      token: '',
      tokenHint: group.tokenHint,
      rps: group.rps,
      indexByModel,
      isNew: false,
    }
  })
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
  // 一张卡片可能承载多个模型：状态取**最差**的那个，避免「三个模型里一个挂了还显示健康」
  const stat = worstStat(row)
  if (!stat) {
    return { label: '无统计', type: 'info', reason: '该组合尚未在 crawler 实例池中出现（保存后才会建槽位）' }
  }
  const mapped = STATE_LABEL[stat.state] || { label: stat.state || '未知', type: 'info' as TagType }
  const reason = stat.disabled_reason || stat.last_error || ''
  return { label: mapped.label, type: mapped.type, reason }
}

function invokeText(row: LlmRow): string {
  const agg = aggregateStats(row)
  if (!agg) return '—'
  return `${agg.invoke} 次 / ${Math.round(agg.successRate * 100)}%`
}

function lastUsedText(row: LlmRow): string {
  const agg = aggregateStats(row)
  if (!agg?.lastUsedAt) return '尚未调用'
  return formatDateTime(agg.lastUsedAt)
}

function tokensText(row: LlmRow): string {
  const agg = aggregateStats(row)
  return agg ? String(agg.tokens) : '—'
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
    savedModels: [],
    modelOptions: [],
    modelQuery: '',
    modelMessage: '',
    modelMessageOk: false,
    fetchingModels: false,
    token: '',
    tokenHint: '',
    indexByModel: {},
    rps: 0.5,
    isNew: true,
  })
}

/** 地址 / 密钥变了：之前的候选来自别的上游，必须清掉，避免把旧厂商的模型留在勾选列表里 */
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
      index: row.isNew ? null : rowCrawlerIndex(row),
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
 * 打开测试弹窗：带上卡片的地址 / 密钥提示，模型名默认取**最后勾选**的那个。
 *
 * 为什么放弹窗：测试是**单模型**行为（一次最小 completion），而一张卡片可能承载
 * 多个模型 —— 放在卡片里既说不清测的是哪个，也会把结果挤在很窄的卡片底部。
 */
function handleOpenTest(index: number) {
  const row = rows.value[index]
  if (!row) return
  const models = rowModels(row)
  if (models.length === 0) {
    biliMessage.warning('请先勾选或添加模型再测试')
    return
  }
  testRowIndex.value = index
  testResult.value = null
  testRunning.value = false
  testForm.value = {
    // 最后一个勾选的模型作为默认值：管理页通常先选主模型、再补备用
    model: models[models.length - 1],
    baseUrl: row.baseUrl.trim(),
    token: '',
    tokenHint: row.tokenHint,
    index: row.isNew ? null : rowCrawlerIndex(row),
  }
  testDialogVisible.value = true
}

/** 发一次探测请求（不保存任何配置），结果显示在弹窗里 */
async function runTest() {
  const model = testForm.value.model.trim()
  if (!model) {
    biliMessage.warning('请填写模型名再测试')
    return
  }
  if (!/^https?:\/\//.test(testForm.value.baseUrl.trim())) {
    biliMessage.warning('接口地址必须以 http:// 或 https:// 开头')
    return
  }
  if (testForm.value.index === null && !testForm.value.token.trim()) {
    biliMessage.warning('新配置需要先填写密钥才能测试')
    return
  }
  testRunning.value = true
  testResult.value = null
  try {
    const result = await testCrawlerLlmConfig({
      index: testForm.value.index,
      base_url: testForm.value.baseUrl.trim(),
      model_name: model,
      token: testForm.value.token.trim(),
    })
    // crawler 不可达时提示由请求层弹出，这里保持「未测试」态
    if (!result) return
    testResult.value = result
  } finally {
    testRunning.value = false
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
