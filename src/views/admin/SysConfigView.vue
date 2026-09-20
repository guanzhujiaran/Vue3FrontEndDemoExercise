<template>
  <div class="sys-config flex flex-col gap-4">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="flex flex-col gap-1">
        <el-text class="text-xl font-bold">系统配置</el-text>
        <el-text class="text-text-regular">
          运行时参数热更新：保存后本实例立即生效，其他实例最迟在缓存 TTL（默认 10s）内生效，无需重启服务。
        </el-text>
      </div>
      <el-button :loading="loading" @click="fetchConfigs">
        <el-icon><Refresh /></el-icon>
        <span class="ml-1">刷新</span>
      </el-button>
    </div>

    <el-alert
      v-if="hasDefaultItem"
      type="info"
      show-icon
      :closable="false"
      title="部分配置尚未写入数据库"
      description="标记为「服务端默认值」的项当前按代码内置默认生效；修改后保存即写入数据库并覆盖默认值。"
    />

    <el-skeleton v-if="loading && !configs.length" :rows="4" animated />

    <el-empty
      v-else-if="!configs.length"
      description="暂无已登记的运行时配置项（后端 CONFIG_SPECS 为空）"
    />

    <el-card v-for="item in configs" v-else :key="item.key" shadow="never">
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex flex-col">
            <div class="flex items-center gap-2">
              <span class="font-bold">{{ item.key }}</span>
              <el-tag v-if="item.isDefault" size="small" type="info">服务端默认值</el-tag>
              <el-tag v-else size="small" type="success">已覆盖</el-tag>
            </div>
            <span class="text-xs text-text-secondary">{{ item.remark || '—' }}</span>
          </div>
          <span class="text-xs text-text-secondary">
            最后修改：{{ item.updatedBy || '—' }} · {{ formatTime(item.updated_at) }}
          </span>
        </div>
      </template>

      <!-- 评论频率限制：结构化表单（两档阈值，避免直接改 JSON 出错） -->
      <div v-if="item.key === KEY_COMMENT_RATE_LIMIT" class="flex flex-col gap-5">
        <div
          v-for="scope in SCOPES"
          :key="scope.key"
          class="flex flex-col gap-2 rounded border border-border-lighter p-3"
        >
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex flex-col">
              <span class="font-bold">{{ scope.title }}</span>
              <span class="text-xs text-text-secondary">{{ scope.desc }}</span>
            </div>
            <el-button size="small" @click="addRule(scope.key)">+ 添加规则</el-button>
          </div>

          <el-table :data="rateForm[scope.key]" size="small" empty-text="未配置规则 = 该档不限制">
            <el-table-column label="窗口（秒）" width="150">
              <template #default="{ row }">
                <el-input-number
                  v-model="row.window_seconds"
                  :min="1"
                  :max="86400"
                  size="small"
                  controls-position="right"
                  class="w-full"
                />
              </template>
            </el-table-column>
            <el-table-column label="窗口内最多（条）" width="170">
              <template #default="{ row }">
                <el-input-number
                  v-model="row.max_count"
                  :min="1"
                  :max="10000"
                  size="small"
                  controls-position="right"
                  class="w-full"
                />
              </template>
            </el-table-column>
            <el-table-column label="仅统计相同内容" width="150">
              <template #default="{ row }">
                <el-switch v-model="row.same_content" />
              </template>
            </el-table-column>
            <el-table-column label="效果" min-width="180">
              <template #default="{ row }">
                <span class="text-xs text-text-secondary">{{ ruleText(row) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="90">
              <template #default="{ $index }">
                <el-button link type="danger" size="small" @click="removeRule(scope.key, $index)">
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div class="flex items-center gap-2">
          <el-button type="primary" :loading="savingKey === item.key" @click="saveRateLimit(item)">
            保存
          </el-button>
          <el-button @click="resetItem(item)">重置为当前生效值</el-button>
          <span class="text-xs text-text-secondary">
            被拒绝的评论不落库；阈值同时受每日创建上限约束（前者防秒级刷屏、后者防累计灌水）。
          </span>
        </div>
      </div>

      <!-- 其他 / 未来新增配置项：JSON 兜底编辑 -->
      <div v-else class="flex flex-col gap-2">
        <el-input
          v-model="jsonDrafts[item.key]"
          type="textarea"
          :rows="8"
          spellcheck="false"
          placeholder="配置值（JSON）"
        />
        <div class="flex items-center gap-2">
          <el-button type="primary" :loading="savingKey === item.key" @click="saveJson(item)">
            保存
          </el-button>
          <el-button @click="jsonDrafts[item.key] = stringify(item.value)">重置</el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import sysConfigApi from '@/api/community/sys_config_api'
import {
  SYS_CONFIG_KEY_COMMENT_RATE_LIMIT,
  type CommentRateRule,
  type SysConfigItem
} from '@/models/admin/sys_config_model'

const KEY_COMMENT_RATE_LIMIT = SYS_CONFIG_KEY_COMMENT_RATE_LIMIT

type ScopeKey = 'root' | 'reply'

/** 两档阈值的展示口径（与后端 CommentRateLimitConfig.root / .reply 对应） */
const SCOPES: Array<{ key: ScopeKey; title: string; desc: string }> = [
  { key: 'root', title: '一级评论', desc: '广场刷屏的主要目标，阈值应更严' },
  { key: 'reply', title: '楼中楼回复', desc: '连回多人属正常行为，阈值可放宽' }
]

const configs = ref<SysConfigItem[]>([])
const loading = ref(false)
const savingKey = ref('')

/** 评论限流的结构化编辑态（保存时整体替换该 key 的值） */
const rateForm = reactive<Record<ScopeKey, CommentRateRule[]>>({ root: [], reply: [] })
/** 未知 / 未来配置项的 JSON 草稿 */
const jsonDrafts = reactive<Record<string, string>>({})

const hasDefaultItem = computed(() => configs.value.some((c) => c.isDefault))

function stringify(value: unknown): string {
  return JSON.stringify(value ?? {}, null, 2)
}

function formatTime(value?: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString()
}

/**
 * 把一条规则翻译成人类可读描述（表单「效果」列）。
 *
 * 参数放宽为 `Partial<CommentRateRule>`：el-table 插槽给的 `row` 是宽松行类型，
 * 直接标注完整规则类型会报不兼容。
 */
function ruleText(rule: Partial<CommentRateRule>): string {
  const scopeText = rule.same_content ? '相同内容' : '全部内容'
  const windowText = `${rule.window_seconds ?? 0}s`
  return `${windowText} 内${scopeText}最多 ${rule.max_count ?? 0} 条`
}

/** 用接口返回的配置项填充编辑态 */
function applyItem(item: SysConfigItem) {
  if (item.key === KEY_COMMENT_RATE_LIMIT) {
    const value = (item.value ?? {}) as Partial<Record<ScopeKey, CommentRateRule[]>>
    for (const scope of SCOPES) {
      rateForm[scope.key] = (value[scope.key] ?? []).map((rule) => ({
        window_seconds: Number(rule?.window_seconds ?? 10),
        max_count: Number(rule?.max_count ?? 1),
        same_content: Boolean(rule?.same_content)
      }))
    }
    return
  }
  jsonDrafts[item.key] = stringify(item.value)
}

function replaceItem(item: SysConfigItem) {
  const idx = configs.value.findIndex((c) => c.key === item.key)
  if (idx >= 0) configs.value[idx] = item
}

async function fetchConfigs() {
  loading.value = true
  const res = await sysConfigApi.List()
  loading.value = false
  if (!res.success) {
    configs.value = []
    return
  }
  configs.value = res.data?.items ?? []
  configs.value.forEach(applyItem)
}

function addRule(key: ScopeKey) {
  rateForm[key].push({ window_seconds: 10, max_count: 1, same_content: false })
}

function removeRule(key: ScopeKey, index: number) {
  rateForm[key].splice(index, 1)
}

function resetItem(item: SysConfigItem) {
  applyItem(item)
}

async function saveRateLimit(item: SysConfigItem) {
  savingKey.value = item.key
  const res = await sysConfigApi.Update({
    key: item.key,
    value: {
      root: rateForm.root.map((r) => ({ ...r })),
      reply: rateForm.reply.map((r) => ({ ...r }))
    },
    remark: item.remark ?? null
  })
  savingKey.value = ''
  if (res.success && res.data) {
    replaceItem(res.data)
    applyItem(res.data)
  }
}

async function saveJson(item: SysConfigItem) {
  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(jsonDrafts[item.key] || '{}')
  } catch {
    ElMessage.error('JSON 格式不合法，请检查后再保存')
    return
  }
  savingKey.value = item.key
  const res = await sysConfigApi.Update({
    key: item.key,
    value: parsed,
    remark: item.remark ?? null
  })
  savingKey.value = ''
  if (res.success && res.data) {
    replaceItem(res.data)
    jsonDrafts[item.key] = stringify(res.data.value)
  }
}

onMounted(fetchConfigs)
</script>
