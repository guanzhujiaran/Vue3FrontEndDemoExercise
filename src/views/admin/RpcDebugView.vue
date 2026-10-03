<template>
  <div class="rpc-debug flex flex-col gap-4">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="flex flex-col gap-1">
        <el-text class="text-xl font-bold">RPC 调试</el-text>
        <el-text class="text-text-regular">
          选择契约方法并发起真实 RabbitMQ 往返，回显服务端原始信封（失败也原样展示，不吞错）。
        </el-text>
      </div>
      <el-button :loading="loadingMethods" @click="fetchMethods">
        <el-icon><Refresh /></el-icon>
        <span class="ml-1">刷新方法</span>
      </el-button>
    </div>

    <el-skeleton v-if="loadingMethods && !methods.length" :rows="4" animated />

    <el-card v-else shadow="never" class="rpc-debug__form-card">
      <div class="flex flex-col gap-4">
        <div class="flex flex-wrap items-end gap-3">
          <div class="rpc-debug__method flex min-w-70 flex-col gap-1">
            <span class="text-text-secondary text-xs">方法（按归属服务分组）</span>
            <el-select
              v-model="selectedMethod"
              filterable
              placeholder="选择要调试的 RPC 方法"
              @change="onMethodChange"
            >
              <el-option-group
                v-for="group in groupedMethods"
                :key="group.server"
                :label="group.server"
              >
                <el-option
                  v-for="item in group.items"
                  :key="item.method_name"
                  :label="item.method_name"
                  :value="item.method_name"
                />
              </el-option-group>
            </el-select>
          </div>

          <div class="rpc-debug__timeout flex w-40 flex-col gap-1">
            <span class="text-text-secondary text-xs">超时（秒）</span>
            <el-input-number v-model="timeout" :min="1" :max="30" controls-position="right" />
          </div>

          <el-button
            type="primary"
            class="rpc-debug__invoke"
            :loading="invoking"
            :disabled="!selectedMethod"
            @click="invoke"
          >
            发起调用
          </el-button>
        </div>

        <template v-if="selectedItem">
          <div class="rpc-debug__meta flex flex-col gap-1">
            <el-text class="text-text-secondary text-xs">
              routing_key：
              <span class="rpc-debug__routing-key font-mono">{{ selectedItem.routing_key }}</span>
            </el-text>
            <el-text class="text-text-secondary text-xs">
              参数模型：{{ selectedItem.params_model }}
            </el-text>
          </div>

          <div class="flex items-center gap-2">
            <span class="text-text-secondary text-xs">参数</span>
            <el-radio-group v-model="paramMode">
              <el-radio-button value="form">表单</el-radio-button>
              <el-radio-button value="json">JSON</el-radio-button>
            </el-radio-group>
          </div>

          <!-- 表单模式：由 paramsSchema.properties 渲染 -->
          <div
            v-if="paramMode === 'form'"
            class="rpc-debug__form grid grid-cols-1 gap-3 md:grid-cols-2"
          >
            <el-empty
              v-if="!schemaProps.length"
              description="该方法无参数（直接发起调用即可）"
              :image-size="60"
            />
            <div
              v-for="prop in schemaProps"
              :key="prop.name"
              class="rpc-debug__field flex flex-col gap-1"
            >
              <span class="text-text-secondary text-xs">
                {{ prop.name }}
                <span v-if="prop.required" class="text-text-secondary">*</span>
                <span v-if="prop.type" class="opacity-60">（{{ prop.type }}）</span>
              </span>

              <el-select
                v-if="prop.enumValues.length"
                v-model="formValues[prop.name]"
                :placeholder="prop.description || prop.name"
                clearable
              >
                <el-option
                  v-for="opt in prop.enumValues"
                  :key="String(opt)"
                  :label="String(opt)"
                  :value="opt"
                />
              </el-select>

              <el-switch v-else-if="prop.type === 'boolean'" v-model="formValues[prop.name]" />

              <el-input-number
                v-else-if="prop.type === 'integer' || prop.type === 'number'"
                v-model="formValues[prop.name]"
                controls-position="right"
                :placeholder="prop.description || prop.name"
                class="w-full"
              />

              <el-input
                v-else
                v-model="formValues[prop.name]"
                :placeholder="prop.description || prop.name"
                clearable
              />

              <span v-if="prop.description" class="text-text-secondary text-xs">
                {{ prop.description }}
              </span>
            </div>
          </div>

          <!-- JSON 模式：直接编辑原始 JSON 文本（复杂参数 / 快速复制粘贴） -->
          <div v-else class="rpc-debug__json flex flex-col gap-1">
            <el-input
              v-model="payloadText"
              type="textarea"
              :rows="8"
              spellcheck="false"
              placeholder='参数 JSON，例如 {"ip": "114.114.114.114"}'
            />
            <span v-if="jsonError" class="rpc-debug__json-error text-xs">{{ jsonError }}</span>
          </div>
        </template>

        <el-empty v-else description="先选择一个要调试的 RPC 方法" :image-size="60" />
      </div>
    </el-card>

    <el-card v-if="outerError" shadow="never" class="rpc-debug__result">
      <template #header>
        <span class="font-bold">调用失败</span>
      </template>
      <el-alert type="error" :closable="false" :title="outerError" show-icon />
    </el-card>

    <el-card v-if="result" shadow="never" class="rpc-debug__result">
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <span class="font-bold">调用结果</span>
            <el-tag :type="replyOk ? 'success' : 'danger'" size="small">
              reply.code = {{ replyCode }}
            </el-tag>
            <el-tag size="small" type="info">{{ result.duration_ms }}ms</el-tag>
          </div>
          <el-button size="small" @click="copyResult">复制</el-button>
        </div>
      </template>

      <div class="flex flex-col gap-2">
        <el-text class="text-text-secondary text-xs">
          method：{{ result.method_name }} · routing_key：{{ result.routing_key }}
        </el-text>
        <el-alert
          v-if="!replyOk"
          type="warning"
          :closable="false"
          :title="reply?.msg || 'RPC 服务端返回失败'"
          show-icon
        />
        <pre
          class="rpc-debug__reply bg-bg-secondary m-0 overflow-auto rounded p-3 text-xs leading-5"
          >{{ replyPretty }}</pre>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import rpcDebugApi from '@/api/community/rpc_debug_api'
import type { RpcDebugMethodItem, RpcInvokeResultItem } from '@/models/admin/rpc_debug_model'

const methods = ref<RpcDebugMethodItem[]>([])
const loadingMethods = ref(false)
const selectedMethod = ref('')
const paramMode = ref<'form' | 'json'>('form')
const formValues = ref<Record<string, unknown>>({})
const payloadText = ref('{}')
const timeout = ref(5)
const invoking = ref(false)
const result = ref<RpcInvokeResultItem | null>(null)
const outerError = ref('')

const selectedItem = computed(
  () => methods.value.find((m) => m.method_name === selectedMethod.value) ?? null
)

/** 按归属服务分组（el-option-group），组内按方法名排序 */
const groupedMethods = computed(() => {
  const byServer = new Map<string, RpcDebugMethodItem[]>()
  for (const item of [...methods.value].sort((a, b) =>
    a.method_name.localeCompare(b.method_name)
  )) {
    const list = byServer.get(item.server) ?? []
    list.push(item)
    byServer.set(item.server, list)
  }
  return [...byServer.entries()].map(([server, items]) => ({ server, items }))
})

interface SchemaProp {
  name: string
  type: string
  description: string
  required: boolean
  enumValues: unknown[]
}

/** 把 paramsSchema 的 properties 拍平成可渲染的字段列表 */
const schemaProps = computed<SchemaProp[]>(() => {
  const schema = parseSchema(selectedItem.value)
  const props = (schema?.properties ?? {}) as Record<
    string,
    { type?: string; description?: string; enum?: unknown[] }
  >
  const required = new Set(schema?.required ?? [])
  return Object.entries(props).map(([name, def]) => ({
    name,
    type: def?.type ?? '',
    description: def?.description ?? '',
    required: required.has(name),
    enumValues: def?.enum ?? []
  }))
})

const reply = computed(() => result.value?.reply ?? null)
const replyCode = computed(() => reply.value?.code ?? null)
const replyOk = computed(() => replyCode.value === 0)
const replyPretty = computed(() => JSON.stringify(reply.value, null, 2))

const jsonError = computed(() => {
  if (paramMode.value !== 'json') return ''
  try {
    const parsed = JSON.parse(payloadText.value || '{}')
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? ''
      : '参数必须是 JSON 对象（{...}），不能是数组或标量'
  } catch (e) {
    return `JSON 不合法：${(e as Error).message}`
  }
})

function parseSchema(
  item: RpcDebugMethodItem | null
): { properties?: Record<string, unknown>; required?: string[] } | null {
  if (!item) return null
  try {
    return JSON.parse(item.params_schema_json)
  } catch {
    return null
  }
}

/** 按字段类型给一个安全的初始值（缺省走 schema 里的 default） */
function defaultValue(type: string): unknown {
  if (type === 'boolean') return false
  if (type === 'integer' || type === 'number') return 0
  return ''
}

function applySchemaToForm(item: RpcDebugMethodItem) {
  const schema = parseSchema(item)
  const props = (schema?.properties ?? {}) as Record<string, { type?: string; default?: unknown }>
  const next: Record<string, unknown> = {}
  for (const [name, def] of Object.entries(props)) {
    next[name] = def?.default !== undefined ? def.default : defaultValue(def?.type ?? '')
  }
  formValues.value = next
}

function onMethodChange(name: string) {
  result.value = null
  outerError.value = ''
  const item = methods.value.find((m) => m.method_name === name)
  if (!item) return
  applySchemaToForm(item)
  payloadText.value = JSON.stringify(formValues.value, null, 2)
}

/** 表单 ⇄ JSON 双向同步：切模式时把另一侧的值带过去 */
watch(paramMode, (mode) => {
  if (mode === 'json') {
    payloadText.value = JSON.stringify(formValues.value, null, 2)
    return
  }
  try {
    const parsed = JSON.parse(payloadText.value || '{}')
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const current = { ...formValues.value }
      for (const key of Object.keys(current)) {
        if (parsed[key] !== undefined) current[key] = parsed[key]
      }
      formValues.value = current
    }
  } catch {
    /* JSON 不合法时保留原表单值，错误由 jsonError 提示 */
  }
})

async function fetchMethods() {
  loadingMethods.value = true
  const res = await rpcDebugApi.Methods()
  loadingMethods.value = false
  if (!res.success) {
    methods.value = []
    return
  }
  methods.value = res.data ?? []
}

async function invoke() {
  if (!selectedMethod.value) return

  let payloadJson: string
  if (paramMode.value === 'json') {
    if (jsonError.value) {
      result.value = null
      outerError.value = `参数 JSON 不合法：${jsonError.value}`
      return
    }
    payloadJson = payloadText.value || '{}'
  } else {
    payloadJson = JSON.stringify(formValues.value)
  }

  invoking.value = true
  result.value = null
  outerError.value = ''
  const res = await rpcDebugApi.Invoke({
    method_name: selectedMethod.value,
    payload_json: payloadJson,
    timeout: timeout.value
  })
  invoking.value = false

  if (!res.success) {
    // 外层失败（400 参数不合法 / 404 未登记 / 503、504 连接与超时 / 500 其它）
    outerError.value = res.msg || '调用失败'
    return
  }
  result.value = res.data ?? null
}

async function copyResult() {
  try {
    await navigator.clipboard.writeText(replyPretty.value)
  } catch {
    /* 剪贴板不可用时静默忽略（如非 https 环境） */
  }
}

onMounted(fetchMethods)
</script>
