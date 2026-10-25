<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Minus, Monitor, Delete, Timer, Switch, Bell } from '@element-plus/icons-vue'
import { 工作流管理Service, 浏览器指纹管理Service, 自定义操作管理Service } from '@/api/browser/hey-api'
import type {
  WorkflowCreateRequest,
  WorkflowUpdateRequest,
  WorkflowDetailResponse,
} from '@/api/browser/hey-api'
import { useUserNavStore } from '@/stores/user_nav'
import { businessHandler } from '@/utils/businessHandler'
import { pickBackendMsg } from '@/utils/backendErrorMsg'
import biliMessage from '@/utils/message'
import ActionCard from './ActionCard.vue'
import ActionPickerDialog from './ActionPickerDialog.vue'
import MinimizeBar from './MinimizeBar.vue'
import { useThemeStore } from '@/stores/theme'
import { RouteName } from '@/models/router/index.ts'
import ObjectArrayEditor from '@/components/rpa-browser/ObjectArrayEditor.vue'
import {
  schemaProperties,
  schemaRequired,
  toJsonSchemaNode,
} from '@/utils/jsonSchema'
import type { JsonSchemaNode } from '@/components/rpa-browser/debugbox-types'
import {
  buildVariablesPatch as buildVariablesPatchOf,
  formatJsonText,
  isJsonVarType,
  parseVarInputText,
  isSensitiveVarName,
  shouldUseTextarea,
  toVarInputText,
  validateVarValue,
  varTypeLabel,
} from '@/utils/workflowVarFields'

/**
 * 工作流编辑弹窗（调度外壳配置面板）
 *
 * 工作流 = 「引用一个已有动作」+「触发配置」+「执行目标浏览器」+「可见性/启用」。
 * 不在此处编辑步骤：步骤的编辑与调试在动作侧（BrowserStream 调试页）完成。
 * 保存只写工作流（create/update），绝不创建或覆盖被引用的动作。
 */
const themeStore = useThemeStore()
const router = useRouter()

interface Props {
  modelValue: boolean
  /** 工作流详情，null 表示新建 */
  workflowDetail: WorkflowDetailResponse | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'saved': []
}>()

const userNavStore = useUserNavStore()

/**
 * 保存体类型：custom_action_id 按字符串透传——雪花 ID 是 19 位整数，
 * 超出 JS Number 安全整数范围（项目「_str 后缀」约定），由后端自行转 int；
 * 其余字段与 SDK 的 WorkflowCreateRequest 保持一致。
 */
type WorkflowSaveBody = Omit<WorkflowCreateRequest, 'custom_action_id'> & {
  custom_action_id?: string | null
}

// ── 表单状态 ─────────────────────────────────────────
const workflowName = ref('')
const workflowDescription = ref('')
const isPublic = ref(false)
const isEnabled = ref(true)
const triggerType = ref<'manual' | 'cron'>('manual')
const cronExpression = ref('')
// 运行通知开关：开始/结束各一条，站内系统通知始终发送、外部推送需在推送设置中配置
const notifyOnStart = ref(false)
const notifyOnEnd = ref(true)
// 执行日志开关：开启后按步骤记录入参/结果/耗时（仅保留最近 7 天），可在运行记录中下钻
const logEnabled = ref(false)
// 调试模式（用户级 debug，后端 UserWorkflow.log_debug）：全量采集——入参/结果/
// 变量池快照全记、成功的步骤也记、内容不截断；保留期与普通日志一致（仍 7 天）
const logDebug = ref(false)
// 调试耦合：打开调试自动带上「记录执行日志」（后端 debug 隐含开启）；
// 关闭调试不影响记录开关（用户可能只想关调试、保留常规记录）
watch(logDebug, (v) => {
  if (v) logEnabled.value = true
})
// 断点恢复：服务重启/异常退出后是否自动从检查点继续（默认关闭，避免非幂等步骤被重跑）
const resumeOnRestart = ref(false)
const saving = ref(false)

// ── 引用的动作 ───────────────────────────────────────
interface SelectedAction {
  action_id: string
  name?: string
  description?: string
  tags?: string[]
  steps_count?: number
  is_public?: boolean
}
const selectedAction = ref<SelectedAction | null>(null)
const pickerVisible = ref(false)

// ── 输入变量（工作流级变量值） ───────────────────────
/**
 * 变量定义**不落工作流**，读时从被引用动作取：
 * 1. `input_vars`（动作声明，含 type / required / description / default）优先；
 * 2. `input_variables`（按步骤模板计算的契约）补充未声明的变量。
 * 这样动作契约改了，工作流界面自动跟随，不会留下过期的定义副本。
 */
interface InputVarField {
  name: string
  type: string
  required: boolean
  description: string
  defaultValue: unknown
  /** 数组变量的元素结构（后端 items_schema）：有则用结构化编辑器，否则退化为 JSON 文本域 */
  itemsSchema?: JsonSchemaNode
}

const inputVarFields = ref<InputVarField[]>([])
/**
 * 变量值统一以字符串存放，保存时按类型解析：
 * string→原样、number→Number、boolean→'true'/'false'、array/object→JSON 文本。
 */
const inputVarValues = ref<Record<string, string>>({})
const inputVarLoading = ref(false)
/** 模板占位提示（放在 script 里避免模板中出现嵌套花括号导致解析错误） */
const VAR_TEMPLATE_HINT = '{{变量名}}'
const VAR_TEMPLATE_SHORT = '{{变量}}'


/** 动作详情 → 变量定义列表（声明优先，契约补充） */
function mapActionInputFields(data: Record<string, unknown>): InputVarField[] {
  const fields = new Map<string, InputVarField>()
  const readItems = (source: unknown, onlyMissing: boolean) => {
    if (!Array.isArray(source)) return
    for (const raw of source) {
      if (!raw || typeof raw !== 'object') continue
      const item = raw as Record<string, unknown>
      const name = typeof item.name === 'string' ? item.name : ''
      if (!name) continue
      if (onlyMissing && fields.has(name)) continue
      fields.set(name, {
        name,
        type: typeof item.type === 'string' && item.type ? item.type : 'string',
        required: item.required === true,
        description: typeof item.description === 'string' ? item.description : '',
        defaultValue: item.default,
        itemsSchema: toJsonSchemaNode(item.items_schema),
      })
    }
  }
  readItems(data.input_vars, false)
  readItems(data.input_variables, true)
  return [...fields.values()]
}

/** 打开弹窗时的值快照（用于「仅显示已修改」「撤销修改」） */
const initialVarValues = ref<Record<string, string>>({})
/** 是否只看改动过的变量 */
const onlyDirty = ref(false)

/** 初始化值：工作流已存的值 > 动作定义默认值 */
function resetInputVarValues(values: Record<string, unknown> = {}) {
  const next: Record<string, string> = {}
  for (const field of inputVarFields.value) {
    const fromWorkflow = values[field.name]
    const initial =
      fromWorkflow !== undefined && fromWorkflow !== null ? fromWorkflow : field.defaultValue
    next[field.name] = toVarInputText(initial, field.type)
  }
  inputVarValues.value = next
  initialVarValues.value = { ...next }
  touchedVarFields.value = {}
  onlyDirty.value = false
}

/** 该变量是否被改动过（与打开时快照比较） */
const isVarDirty = (name: string): boolean =>
  (inputVarValues.value[name] ?? '') !== (initialVarValues.value[name] ?? '')

const dirtyVarNames = computed(() => {
  const names = new Set<string>()
  for (const field of inputVarFields.value) {
    if (isVarDirty(field.name)) names.add(field.name)
  }
  return names
})

/** 撤销单个变量到打开时的值 */
const revertVar = (field: InputVarField) => {
  inputVarValues.value = {
    ...inputVarValues.value,
    [field.name]: initialVarValues.value[field.name] ?? '',
  }
  const nextTouched = { ...touchedVarFields.value }
  delete nextTouched[field.name]
  touchedVarFields.value = nextTouched
}

/** 变量搜索（字段多时便于定位；空 = 全部） */
const varKeyword = ref('')
const visibleInputVarFields = computed<InputVarField[]>(() => {
  const keyword = varKeyword.value.trim().toLowerCase()
  return inputVarFields.value.filter(field => {
    if (onlyDirty.value && !dirtyVarNames.value.has(field.name)) return false
    if (!keyword) return true
    return (
      field.name.toLowerCase().includes(keyword) ||
      field.description.toLowerCase().includes(keyword)
    )
  })
})

/** 失焦后才显示该字段错误，避免刚打开就满屏红 */
const touchedVarFields = ref<Record<string, boolean>>({})
const markVarTouched = (name: string) => {
  touchedVarFields.value = { ...touchedVarFields.value, [name]: true }
}

/** 逐字段校验结果（name → 错误文案） */
const inputVarFieldErrors = computed<Record<string, string>>(() => {
  const errors: Record<string, string> = {}
  for (const field of inputVarFields.value) {
    const raw = inputVarValues.value[field.name] ?? ''
    const error = validateVarValue(field, raw)
    if (error) errors[field.name] = error
  }
  return errors
})

/** 全局错误（用于表单整体可保存判定 + 区块底部汇总提示） */
const inputVarErrorCount = computed(
  () => Object.keys(inputVarFieldErrors.value).length,
)
const inputVarError = computed(() => {
  for (const field of inputVarFields.value) {
    const error = inputVarFieldErrors.value[field.name]
    if (error) return `输入变量「${field.name}」${error}`
  }
  return ''
})

/** 字段级错误：未触碰且不是必填未填时不提前报错 */
const fieldError = (field: InputVarField): string => {
  if (!touchedVarFields.value[field.name]) return ''
  return inputVarFieldErrors.value[field.name] || ''
}

/** 数组变量是否声明了元素结构（可渲染结构化编辑器，而不是让用户手写 JSON） */
const hasStructuredEditor = (field: InputVarField): boolean =>
  field.type === 'array' &&
  !!field.itemsSchema &&
  !!(field.itemsSchema.properties as Record<string, unknown> | undefined)

const structuredVarProperties = (field: InputVarField): Record<string, JsonSchemaNode> =>
  schemaProperties(field.itemsSchema)

const structuredVarRequired = (field: InputVarField): string[] =>
  schemaRequired(field.itemsSchema)

/** 编辑文本（JSON）→ 结构化编辑器的数组值；解析失败时给空数组 */
const structuredVarItems = (field: InputVarField): Record<string, unknown>[] => {
  try {
    const parsed = JSON.parse(inputVarValues.value[field.name] || '[]')
    return Array.isArray(parsed) ? (parsed as Record<string, unknown>[]) : []
  } catch {
    return []
  }
}

/** 结构化编辑器 → 编辑文本（格式化 JSON，保证保存时仍是 JSON 文本） */
const setStructuredVarItems = (
  field: InputVarField,
  items: Record<string, unknown>[],
) => {
  inputVarValues.value = {
    ...inputVarValues.value,
    [field.name]: toVarInputText(items, 'array'),
  }
  touchedVarFields.value = { ...touchedVarFields.value, [field.name]: true }
}

/** 值控件占位符（JSON 示例含引号，放脚本里避免模板转义） */
const varInputPlaceholder = (field: InputVarField): string => {
  if (isJsonVarType(field.type)) {
    return field.type === 'array'
      ? 'JSON 数组，例如 [{"model":"deepseek-chat","server_url":"https://api.example.com/v1","api_key":"sk-..."}]'
      : 'JSON 对象，例如 {"k": "v"}'
  }
  return hasVarDefault(field) ? `默认：${String(field.defaultValue)}` : '请输入'
}

/** 契约里有默认值才显示「恢复默认」 */
const hasVarDefault = (field: InputVarField): boolean =>
  field.defaultValue !== undefined && field.defaultValue !== null

/** 恢复为动作定义的默认值 */
const resetVarToDefault = (field: InputVarField) => {
  inputVarValues.value = {
    ...inputVarValues.value,
    [field.name]: toVarInputText(field.defaultValue, field.type),
  }
}

/** 格式化 JSON（失败给出字段级错误，不改原文） */
const formatVarJson = (field: InputVarField) => {
  const formatted = formatJsonText(inputVarValues.value[field.name] ?? '')
  if (formatted === null) {
    touchedVarFields.value = { ...touchedVarFields.value, [field.name]: true }
    return
  }
  inputVarValues.value = { ...inputVarValues.value, [field.name]: formatted }
}

/**
 * 当前编辑器里的全部变量值（用于「刷新变量契约」时回填，不代表要提交的内容）
 *
 * 未填的非必填项不写入，交给动作默认值兜底。
 */
function buildAllVarValues(): Record<string, unknown> {
  const values: Record<string, unknown> = {}
  for (const field of inputVarFields.value) {
    const raw = inputVarValues.value[field.name] ?? ''
    if (!raw.trim()) continue
    try {
      const parsed = parseVarInputText(raw, field.type)
      if (parsed !== undefined) values[field.name] = parsed
    } catch {
      continue
    }
  }
  return values
}

/**
 * 保存用的**增量补丁**（见 docs/工作流变量增量更新计划书.md）
 *
 * - 只包含与打开时快照不同的键；
 * - 打开时有值、现在清空 → 值为 `null`（后端据此删除该键）；
 * - 契约没加载出来（`inputVarFields` 为空：请求失败 / 尚未完成）时返回 `undefined`，
 *   保存时**不下发任何变量字段**——否则会被后端当作修改/清空写库；
 * - 没有差异时返回 `undefined`（不产生空写入）。
 */
function buildVariablesPatch(): Record<string, unknown> | undefined {
  return buildVariablesPatchOf({
    fields: inputVarFields.value,
    values: inputVarValues.value,
    initial: initialVarValues.value,
  })
}

// ── 浏览器选择 ───────────────────────────────────────
interface BrowserOption {
  browser_id: number
  browser_id_str: string
  custom_name: string
}
const browserList = ref<BrowserOption[]>([])
/** 目标浏览器（支持多选：一个工作流可绑定多个浏览器） */
const selectedBrowserIds = ref<number[]>([])
/** 主浏览器 = 列表第一个，用于调试跳转与单浏览器兼容 */
const selectedBrowserId = computed<number | null>(
  () => selectedBrowserIds.value[0] ?? null
)
/** 多浏览器时是否并发执行（false=按选择顺序串行） */
const concurrentExec = ref(false)
/** 是否处于多浏览器模式（用于展示并发开关） */
const multiBrowser = computed(() => selectedBrowserIds.value.length > 1)

// ── 最小化状态 ───────────────────────────────────────
const isMinimized = ref(false)
const dialogVisible = computed(() => props.modelValue && !isMinimized.value)

async function loadBrowserList() {
  const result = await businessHandler<{ items?: BrowserOption[] }>(
    浏览器指纹管理Service.listFingerprintRouterApiV1RpaBrowserListFingerprintPost({
      body: { page: 1, per_page: 100 },
      headers: userNavStore.user_header,
    }) as any,
    { successMessage: '', errorMessage: '获取浏览器列表失败', showSuccessToast: false }
  )
  if (result.success && result.data) {
    browserList.value = (result.data.items || []).map((b: any) => ({
      browser_id: b.browser_id,
      browser_id_str: b.browser_id_str || String(b.browser_id),
      custom_name: b.custom_name || `浏览器 ${b.browser_id}`,
    }))
  }
}

/**
 * 按 action_id 拉取动作摘要（编辑已有工作流时回显引用信息）+ 输入变量契约。
 *
 * @param presetValues 已有工作流的变量值（仅编辑态回显时传；切换动作时不传，
 *                     让它回落到动作默认值，避免把上一个动作的变量带到新动作）
 */
async function loadActionSummary(
  actionId: string,
  presetValues?: Record<string, unknown>
) {
  inputVarLoading.value = true
  const result = await businessHandler<Record<string, unknown>>(
    自定义操作管理Service.getCustomActionApiV1RpaBrowserControlCustomActionsGetPost({
      // 雪花 ID 以字符串透传：19 位整数超出 JS Number 安全范围，由后端自行转 int
      body: { action_id: actionId as unknown as number },
      headers: userNavStore.user_header,
    }) as any,
    { successMessage: '', errorMessage: '加载引用动作失败', showSuccessToast: false }
  )
  if (result.success && result.data) {
    const data = result.data
    const steps = Array.isArray(data.steps) ? (data.steps as unknown[]) : []
    // action_id 在 SDK 类型里是 number，运行期可能直接返回数字，必须统一转成字符串，
    // 否则超出安全范围的雪花 ID 会丢精度，且向 ActionPickerDialog 传参会触发 prop 类型告警
    const resolvedActionId =
      data.action_id != null && data.action_id !== '' ? String(data.action_id) : actionId
    selectedAction.value = {
      action_id: resolvedActionId,
      name: (data.name as string) || actionId,
      description: (data.description as string) || '',
      tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
      steps_count: steps.length,
      is_public: (data.is_public as boolean) ?? false,
    }
    inputVarFields.value = mapActionInputFields(data)
    resetInputVarValues(presetValues ?? {})
    inputVarLoading.value = false
    return
  }
  selectedAction.value = { action_id: actionId, name: actionId, steps_count: 0 }
  inputVarFields.value = []
  inputVarValues.value = {}
  inputVarLoading.value = false
}

// ── 校验 ─────────────────────────────────────────────
const nameError = computed(() => {
  if (!workflowName.value.trim()) return '工作流名称不能为空'
  if (workflowName.value.length > 50) return '名称不能超过50个字符'
  return ''
})

const actionError = computed(() => (selectedAction.value?.action_id ? '' : '必须选择一个要执行的动作'))

const cronError = computed(() => {
  if (triggerType.value !== 'cron') return ''
  const expr = cronExpression.value.trim()
  if (!expr) return 'Cron 表达式不能为空'
  if (expr.split(/\s+/).length !== 5) return 'Cron 表达式需为 5 段，例如 */5 * * * *'
  return ''
})

const browserError = computed(() => {
  if (triggerType.value !== 'cron') return ''
  return selectedBrowserId.value === null ? '定时触发必须指定执行目标浏览器' : ''
})

const formError = computed(
  () =>
    nameError.value ||
    actionError.value ||
    cronError.value ||
    browserError.value ||
    inputVarError.value
)
const canSave = computed(
  () => !formError.value && !saving.value && !inputVarLoading.value
)

/** 运行状态展示 */
const nextRunAt = computed(() => (props.workflowDetail?.next_run_at as string) || '')
const lastRunAt = computed(() => (props.workflowDetail?.last_run_at as string) || '')
const lastRunStatus = computed(() => (props.workflowDetail?.last_run_status as string) || '')

const runStatusLabel: Record<string, string> = {
  success: '成功',
  failed: '失败',
  running: '运行中',
  interrupted: '已中断',
}
const runStatusType: Record<string, 'success' | 'danger' | 'warning' | 'info'> = {
  success: 'success',
  failed: 'danger',
  running: 'warning',
  interrupted: 'info',
}

// ── 监听打开/关闭 ─────────────────────────────────────
watch(
  () => props.modelValue,
  async (visible) => {
    if (!visible) return
    isMinimized.value = false
    saving.value = false
    pickerVisible.value = false

    await loadBrowserList()

    if (props.workflowDetail) {
      // 编辑模式
      workflowName.value = props.workflowDetail.name || ''
      workflowDescription.value = props.workflowDetail.description || ''
      isPublic.value = props.workflowDetail.is_public ?? false
      isEnabled.value = props.workflowDetail.is_enabled ?? true
      const tt = props.workflowDetail.trigger_type || 'manual'
      triggerType.value = tt === 'cron' ? 'cron' : 'manual'
      const tc = props.workflowDetail.trigger_config
      cronExpression.value = (tc?.cron as string) || ''
      // 浏览器：优先 browser_ids（多浏览器），回落到 browser_id（单浏览器）
      const ids = props.workflowDetail.browser_ids
      selectedBrowserIds.value =
        ids && ids.length > 0
          ? ids.map(Number)
          : props.workflowDetail.browser_id
            ? [Number(props.workflowDetail.browser_id)]
            : []
      concurrentExec.value = props.workflowDetail.concurrent_exec ?? false
      notifyOnStart.value = props.workflowDetail.notify_on_start ?? false
      notifyOnEnd.value = props.workflowDetail.notify_on_end ?? true
      // log_enabled 为三态：true=显式开 / false=显式关 / null=未设置（跟随动作级/项目级开关），
      // 弹窗只有二元开关，未设置一律按「关」展示，保存后会固化为显式值
      logEnabled.value = props.workflowDetail.log_enabled ?? false
      // log_debug 同为三态；调试隐含开启，历史数据可能出现「记录关 + 调试开」，
      // 回显时统一带上记录开关，避免保存时把调试设置 silent 丢掉
      logDebug.value = props.workflowDetail.log_debug ?? false
      if (logDebug.value) logEnabled.value = true
      resumeOnRestart.value = props.workflowDetail.resume_on_restart ?? false
      const rawActionId = props.workflowDetail.custom_action_id
      const actionId = rawActionId != null ? String(rawActionId) : undefined
      selectedAction.value = actionId ? { action_id: actionId, name: actionId, steps_count: 0 } : null
      // 已有变量值（详情接口直出），用于回显；未配置时回落动作默认值
      const detailVariables = props.workflowDetail.variables ?? {}
      if (actionId) await loadActionSummary(actionId, detailVariables)
    } else {
      // 新建模式
      workflowName.value = ''
      workflowDescription.value = ''
      isPublic.value = false
      isEnabled.value = true
      triggerType.value = 'manual'
      cronExpression.value = ''
      selectedBrowserIds.value =
        browserList.value.length > 0 ? [browserList.value[0].browser_id] : []
      concurrentExec.value = false
      notifyOnStart.value = false
      notifyOnEnd.value = true
      logEnabled.value = false
      logDebug.value = false
      selectedAction.value = null
      inputVarFields.value = []
      inputVarValues.value = {}
    }
  },
  { immediate: true }
)

// ── 动作选择 ─────────────────────────────────────────
function openActionPicker() {
  pickerVisible.value = true
}

async function handleActionPicked(actionId: string) {
  const switched = !!selectedAction.value && selectedAction.value.action_id !== actionId
  await loadActionSummary(actionId)
  if (switched) {
    // 不同动作的变量契约不同：旧值已不可用，按新动作重置（避免把 A 的变量带到 B）
    biliMessage.info('已切换引用动作，输入变量已按新动作的契约重置')
  }
}

function clearAction() {
  selectedAction.value = null
  inputVarFields.value = []
  inputVarValues.value = {}
}

// ── 去调试页（动作的调试在动作侧完成） ───────────────
function goDebugPage() {
  if (selectedBrowserId.value === null) {
    biliMessage.warning('请先选择目标浏览器，再前往调试页')
    return
  }
  router.push({
    name: RouteName.RPA_BROWSER_STREAM,
    params: { browserId: String(selectedBrowserId.value) },
  })
}

// ── 最小化控制 ───────────────────────────────────────
function handleMinimize() {
  isMinimized.value = true
}
function handleRestore() {
  isMinimized.value = false
}
function handleClose() {
  isMinimized.value = false
  emit('update:modelValue', false)
}
function handleDialogUpdate(val: boolean) {
  if (!val) {
    if (isMinimized.value) return
    emit('update:modelValue', false)
  }
}

// ── 保存（只写工作流，不改动被引用的动作） ───────────
async function handleSave() {
  if (!canSave.value) return
  saving.value = true
  try {
    const triggerConfig = triggerType.value === 'cron' ? { cron: cronExpression.value.trim() } : {}
    const isEditing = !!props.workflowDetail

    const body: WorkflowSaveBody = {
      name: workflowName.value,
      description: workflowDescription.value,
      custom_action_id: selectedAction.value?.action_id ?? null,
      browser_id: selectedBrowserIds.value[0] ?? null,
      browser_ids: selectedBrowserIds.value,
      concurrent_exec: concurrentExec.value,
      trigger_type: triggerType.value,
      trigger_config: triggerConfig,
      is_public: isPublic.value,
      notify_on_start: notifyOnStart.value,
      notify_on_end: notifyOnEnd.value,
      log_enabled: logEnabled.value,
      log_debug: logDebug.value,
      resume_on_restart: resumeOnRestart.value,
    }
    // 输入变量：更新走增量补丁（只提交差异）；新建没有旧值可比，直接提交全量
    const variablesPatch = isEditing ? buildVariablesPatch() : undefined

    const result = isEditing
      ? await businessHandler(
          工作流管理Service.updateWorkflowApiV1RpaBrowserControlWorkflowsUpdatePost({
            body: {
              id: props.workflowDetail?.id as number,
              ...body,
              is_enabled: isEnabled.value,
              ...(variablesPatch ? { variables_patch: variablesPatch } : {}),
            } as unknown as WorkflowUpdateRequest,
            headers: userNavStore.user_header,
            // 失败走非 2xx 响应，开启 throwOnError 让 businessHandler 直接展示后端 msg
            throwOnError: true,
          }) as any,
          { successMessage: '工作流更新成功', errorMessage: '工作流更新失败' }
        )
      : await businessHandler(
          工作流管理Service.createWorkflowApiV1RpaBrowserControlWorkflowsCreatePost({
            body: { ...body, variables: buildAllVarValues() } as unknown as WorkflowCreateRequest,
            headers: userNavStore.user_header,
            // 失败走非 2xx 响应，开启 throwOnError 让 businessHandler 直接展示后端 msg
            throwOnError: true,
          }) as any,
          { successMessage: '工作流创建成功', errorMessage: '工作流创建失败' }
        )

    if (result.success) {
      emit('saved')
      emit('update:modelValue', false)
    }
  } catch (error: unknown) {
    // 优先直接展示后端 msg；无 msg 或默认 500 才用兜底文案
    const msg = pickBackendMsg(error) || (error instanceof Error ? error.message : '保存失败')
    console.error('[WorkflowEditDialog] 保存工作流异常:', error)
    biliMessage.error(msg)
  } finally {
    saving.value = false
  }
}

function formatTime(t: string | null) {
  if (!t) return '-'
  return new Date(t).toLocaleString('zh-CN')
}
</script>

<template>
  <el-dialog
    :model-value="dialogVisible"
    width="80%"
    :modal-penetrable="true"
    :modal="false"
    :lock-scroll="false"
    :draggable="true"
    :close-on-click-modal="false"
    @update:model-value="handleDialogUpdate"
  >
    <template #header>
      <div class="relative w-full flex items-center gap-3">
        <span class="font-medium text-sm">{{ workflowDetail ? '编辑工作流' : '新建工作流' }}</span>
        <button
          class="absolute top-1/2 -translate-y-1/2 right-8 w-5 h-5 flex items-center justify-center cursor-pointer hover:text-color-secondary"
          title="最小化"
          @click="handleMinimize"
        >
          <el-icon :size="14"><Minus /></el-icon>
        </button>
      </div>
    </template>

    <div class="workflow-config-panel flex flex-col gap-4">
      <!-- 元信息表单 -->
      <div class="workflow-meta-form grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs text-color-secondary">名称 <span class="text-danger">*</span></label>
          <el-input
            v-model="workflowName"
            placeholder="工作流名称"
            maxlength="50"
            show-word-limit
            :class="{ 'is-error': nameError }"
          />
          <div v-if="nameError" class="text-xs text-danger mt-1">{{ nameError }}</div>
        </div>
        <div>
          <label class="text-xs text-color-secondary">描述</label>
          <el-input
            v-model="workflowDescription"
            placeholder="工作流描述（可选）"
            maxlength="200"
            show-word-limit
          />
        </div>
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2">
            <label class="text-xs text-color-secondary">公开</label>
            <el-switch v-model="isPublic" inline-prompt active-text="是" inactive-text="否" />
          </div>
          <div v-if="workflowDetail" class="flex items-center gap-2">
            <label class="text-xs text-color-secondary">启用</label>
            <el-switch v-model="isEnabled" inline-prompt active-text="是" inactive-text="否" />
          </div>
        </div>
        <div class="workflow-run-state flex items-center gap-4 text-xs text-color-secondary flex-wrap">
          <span>上次运行：{{ formatTime(lastRunAt) }}</span>
          <el-tag v-if="lastRunStatus" :type="runStatusType[lastRunStatus] || 'info'" effect="plain">
            {{ runStatusLabel[lastRunStatus] || lastRunStatus }}
          </el-tag>
          <span v-if="triggerType === 'cron'">下次运行：{{ formatTime(nextRunAt) }}</span>
        </div>
      </div>

      <!-- 引用的动作 -->
      <div class="workflow-action-section border border-border rounded p-3 flex flex-col gap-2">
        <div class="workflow-action-section__header flex items-center justify-between">
          <div class="flex items-center gap-2">
            <el-icon class="text-primary"><Switch /></el-icon>
            <span class="text-sm font-medium">执行动作 <span class="text-danger">*</span></span>
            <span class="text-xs text-color-secondary">引用已有动作，多个工作流可共享同一动作</span>
          </div>
          <div class="flex items-center gap-2">
            <el-button :icon="Monitor" @click="goDebugPage">去调试页</el-button>
            <el-button type="primary" @click="openActionPicker">
              {{ selectedAction ? '更换动作' : '选择动作' }}
            </el-button>
          </div>
        </div>

        <div v-if="selectedAction" class="workflow-action-section__card flex items-start gap-3">
          <div class="flex-1 min-w-0">
            <ActionCard
              :action="{
                action_id: selectedAction.action_id,
                name: selectedAction.name,
                description: selectedAction.description,
              }"
              :action-detail="{ tags: selectedAction.tags, is_public: selectedAction.is_public } as any"
            />
          </div>
          <div class="flex flex-col items-end gap-2 shrink-0">
            <el-tag type="info" effect="plain">{{ selectedAction.steps_count ?? 0 }} 步</el-tag>
            <el-button type="danger" plain :icon="Delete" @click="clearAction">移除</el-button>
          </div>
        </div>
        <el-alert
          v-else
          class="workflow-action-section__empty"
          type="info"
          :effect="themeStore.themeEffectString"
          :closable="false"
          show-icon
          title="尚未选择动作，请点击右上角「选择动作」"
        />
        <div v-if="actionError" class="text-xs text-danger">{{ actionError }}</div>
      </div>

      <!-- 触发配置 -->
      <div class="workflow-trigger-section border border-border rounded p-3 flex flex-col gap-3">
        <div class="flex items-center gap-2">
          <el-icon class="text-primary"><Timer /></el-icon>
          <span class="text-sm font-medium">触发配置</span>
        </div>
        <div class="flex items-center gap-4 flex-wrap">
          <el-radio-group v-model="triggerType">
            <el-radio value="manual">手动运行</el-radio>
            <el-radio value="cron">定时运行</el-radio>
          </el-radio-group>
          <template v-if="triggerType === 'cron'">
            <el-input
              v-model="cronExpression"
              placeholder="Cron 表达式，例如 */5 * * * *"
              class="workflow-trigger-section__cron w-70"
            />
            <span class="text-xs text-color-secondary">5 段：分 时 日 月 周（保存后由服务端计算下次运行时间）</span>
          </template>
        </div>
        <div v-if="cronError" class="text-xs text-danger">{{ cronError }}</div>

        <div class="workflow-trigger-section__browser flex items-center gap-3 flex-wrap">
          <label class="text-xs text-color-secondary whitespace-nowrap">
            目标浏览器 <span v-if="triggerType === 'cron'" class="text-danger">*</span>
          </label>
          <el-select
            v-model="selectedBrowserIds"
            placeholder="选择执行目标浏览器（可多选）"
            class="workflow-trigger-section__browser-select w-80"
            :disabled="browserList.length === 0"
            multiple
            collapse-tags
            collapse-tags-tooltip
            clearable
          >
            <el-option
              v-for="b in browserList"
              :key="b.browser_id_str"
              :label="b.custom_name"
              :value="b.browser_id"
            />
          </el-select>
          <span class="text-xs text-color-secondary">
            可选择多个浏览器：每个浏览器各跑一次；定时运行时若浏览器未启动，服务端会自动拉起会话
          </span>
        </div>
        <div v-if="multiBrowser" class="workflow-trigger-section__concurrent flex items-center gap-2">
          <label class="text-xs text-color-secondary">多浏览器并发执行</label>
          <el-switch v-model="concurrentExec" inline-prompt active-text="是" inactive-text="否" />
          <span class="text-xs text-color-secondary">
            {{ concurrentExec ? '同时启动各浏览器的运行' : '按选择顺序依次执行（前一个跑完再跑下一个）' }}
          </span>
        </div>
        <div v-if="browserError" class="text-xs text-danger">{{ browserError }}</div>
      </div>

      <!-- 运行通知 -->
      <div class="workflow-notify-section border border-border rounded p-3 flex flex-col gap-3">
        <div class="flex items-center gap-2">
          <el-icon class="text-primary"><Bell /></el-icon>
          <span class="text-sm font-medium">运行通知</span>
          <span class="text-xs text-color-secondary">
            站内系统通知无需配置；外部推送（PushMe 等）需先在推送设置中配置渠道
          </span>
        </div>
        <div class="flex items-center gap-6 flex-wrap">
          <div class="flex items-center gap-2">
            <label class="text-xs text-color-secondary">开始执行时通知</label>
            <el-switch v-model="notifyOnStart" inline-prompt active-text="开" inactive-text="关" />
          </div>
          <div class="flex items-center gap-2">
            <label class="text-xs text-color-secondary">结束时通知（成功/失败）</label>
            <el-switch v-model="notifyOnEnd" inline-prompt active-text="开" inactive-text="关" />
          </div>
        </div>
      </div>

      <!-- 断点恢复 -->
      <div class="workflow-resume-section border border-border rounded p-3 flex flex-col gap-3">
        <div class="workflow-resume-section__header flex items-center gap-2 flex-wrap">
          <span class="text-sm font-medium">断点恢复</span>
          <span class="text-xs text-color-secondary">
            服务重启 / 异常退出导致运行被中断时，从检查点之后继续执行（至少一次语义）
          </span>
        </div>
        <div class="workflow-resume-section__switch flex items-center gap-3 flex-wrap">
          <label class="text-xs text-color-secondary whitespace-nowrap">重启后自动恢复</label>
          <el-switch v-model="resumeOnRestart" inline-prompt active-text="开" inactive-text="关" />
          <span class="text-xs text-color-secondary">
            {{
              resumeOnRestart
                ? '服务重启后自动继续被中断的运行；循环内已处理的资源会按处理记录自动跳过'
                : '关闭时不会自动恢复，可在「运行记录」中手动点击「继续」'
            }}
          </span>
        </div>
      </div>

      <!-- 输入变量：定义来自引用动作的变量契约（读时计算），工作流只存值 -->
      <div class="workflow-vars-section border border-border rounded p-3 flex flex-col gap-3">
        <div class="workflow-vars-section__header flex items-center gap-2 flex-wrap">
          <span class="text-sm font-medium">输入变量</span>
          <span class="text-xs text-color-secondary">
            动作内步骤用 <code class="workflow-vars-section__hint">{{ VAR_TEMPLATE_HINT }}</code> 消费变量；
            这里填的值会在运行时覆盖动作定义的默认值
          </span>
          <div
            v-if="inputVarFields.length > 3"
            class="workflow-vars-section__dirty-toggle flex items-center gap-1.5"
          >
            <el-switch v-model="onlyDirty" />
            <span class="text-xs text-color-secondary">
              仅显示已修改{{ dirtyVarNames.size ? `（${dirtyVarNames.size}）` : '' }}
            </span>
          </div>
          <el-input
            v-if="inputVarFields.length > 6"
            v-model="varKeyword"
            class="workflow-vars-section__search ml-auto w-48"
            placeholder="搜索变量名 / 描述"
            clearable
          />
          <el-button
            v-if="selectedAction"
            class="workflow-vars-section__reload ml-auto"
            link
            @click="loadActionSummary(selectedAction.action_id, buildAllVarValues())"
          >
            刷新变量契约
          </el-button>
        </div>

        <div v-if="inputVarLoading" class="workflow-vars-section__loading">
          <el-skeleton animated :rows="3" />
        </div>
        <div
          v-else-if="inputVarFields.length === 0"
          class="workflow-vars-section__empty text-xs text-color-secondary"
        >
          当前引用动作没有声明或使用任何输入变量（步骤里没有 <code>{{ VAR_TEMPLATE_SHORT }}</code> 引用）
        </div>
        <div v-else class="workflow-vars-section__list flex flex-col gap-3">
          <el-text
            v-if="visibleInputVarFields.length === 0"
            class="workflow-vars-section__no-match text-color-secondary"
          >
            没有匹配的输入变量
          </el-text>

          <div
            v-for="field in visibleInputVarFields"
            :key="field.name"
            class="workflow-vars-section__row workflow-vars-input-var-item flex flex-col gap-2 p-3 bg-fill-light rounded border border-border"
          >
            <!-- 头部：变量名 + 类型 + 必填 + 行内操作 -->
            <div class="workflow-vars-input-var-item__head flex flex-wrap items-center justify-between gap-2">
              <div class="flex min-w-0 flex-wrap items-center gap-1.5">
                <span
                  class="workflow-vars-section__name workflow-vars-input-var-item__name truncate font-mono text-text-primary"
                  :title="field.name"
                >
                  {{ field.name }}
                </span>
                <el-tag effect="plain" type="info">{{ varTypeLabel(field.type) }}</el-tag>
                <el-tag v-if="isJsonVarType(field.type)" effect="plain" type="warning">JSON</el-tag>
                <span v-if="field.required" class="text-xs text-danger" title="必填">*</span>
              </div>
              <div class="flex flex-wrap items-center gap-1">
                <el-button
                  v-if="isJsonVarType(field.type)"
                  class="workflow-vars-input-var-item__format"
                  text
                  @click="formatVarJson(field)"
                >
                  格式化 JSON
                </el-button>
                <el-button
                  v-if="isVarDirty(field.name)"
                  class="workflow-vars-input-var-item__revert"
                  text
                  @click="revertVar(field)"
                >
                  撤销修改
                </el-button>
                <el-button
                  v-if="hasVarDefault(field)"
                  class="workflow-vars-input-var-item__reset"
                  text
                  @click="resetVarToDefault(field)"
                >
                  恢复默认
                </el-button>
              </div>
            </div>

            <!-- 描述：两行截断，悬浮看全 -->
            <span
              v-if="field.description"
              class="workflow-vars-input-var-item__desc text-xs text-color-secondary whitespace-pre-wrap break-words line-clamp-2"
              :title="field.description"
            >
              {{ field.description }}
            </span>

            <!-- 值控件：全宽 -->
            <div class="workflow-vars-input-var-item__control w-full">
              <el-select
                v-if="field.type === 'boolean'"
                v-model="inputVarValues[field.name]"
                class="workflow-vars-section__value w-40"
                placeholder="请选择"
                @change="markVarTouched(field.name)"
              >
                <el-option label="是（true）" value="true" />
                <el-option label="否（false）" value="false" />
              </el-select>

              <ObjectArrayEditor
                v-else-if="hasStructuredEditor(field)"
                class="workflow-vars-input-var-item__structured"
                :model-value="structuredVarItems(field)"
                :properties="structuredVarProperties(field)"
                :required="structuredVarRequired(field)"
                @update:model-value="items => setStructuredVarItems(field, items)"
              />

              <el-input
                v-else-if="shouldUseTextarea(field, inputVarValues[field.name])"
                v-model="inputVarValues[field.name]"
                type="textarea"
                :rows="isJsonVarType(field.type) ? 4 : 3"
                :class="[
                  'workflow-vars-section__value',
                  isJsonVarType(field.type) ? 'font-mono' : '',
                ]"
                :placeholder="varInputPlaceholder(field)"
                @blur="markVarTouched(field.name)"
              />

              <!-- form 包裹：敏感变量为密码输入框，Chromium 要求位于 form 内（同 ObjectArrayEditor 处理）；
                   注意不能包住上方 v-else-if 的 ObjectArrayEditor（其根节点已是 form，禁止嵌套） -->
              <form
                v-else
                class="workflow-vars-input-var-item__control-form w-full"
                @submit.prevent
              >
                <el-input
                  v-model="inputVarValues[field.name]"
                  :type="isSensitiveVarName(field.name) ? 'password' : 'text'"
                  :show-password="isSensitiveVarName(field.name)"
                  :title="inputVarValues[field.name]"
                  class="workflow-vars-section__value w-full"
                  :placeholder="varInputPlaceholder(field)"
                  @blur="markVarTouched(field.name)"
                />
              </form>
            </div>

            <!-- 字段级错误 -->
            <el-text
              v-if="fieldError(field)"
              class="workflow-vars-input-var-item__error text-danger"
            >
              {{ fieldError(field) }}
            </el-text>
          </div>

          <div
            v-if="inputVarErrorCount > 0"
            class="workflow-vars-section__error text-xs text-danger"
          >
            共 {{ inputVarErrorCount }} 个输入变量未通过校验（红色提示已标注在对应字段下方）
          </div>
        </div>
      </div>

      <!-- 执行日志 -->
      <div class="workflow-log-section border border-border rounded p-3 flex flex-col gap-3">
        <div class="workflow-log-section__header flex items-center gap-2 flex-wrap">
          <span class="text-sm font-medium">执行日志</span>
          <span class="text-xs text-color-secondary">
            开启后按步骤记录入参 / 返回结果 / 耗时，可在「运行记录」中按执行批次下钻查看
          </span>
        </div>
        <div class="workflow-log-section__switch flex items-center gap-3 flex-wrap">
          <label class="text-xs text-color-secondary whitespace-nowrap">记录执行日志</label>
          <el-switch v-model="logEnabled" inline-prompt active-text="开" inactive-text="关" />
          <span class="text-xs text-color-secondary">
            {{ logEnabled ? '日志仅保留最近 7 天，超期自动清理' : '关闭后本次运行不记录任何步骤日志' }}
          </span>
        </div>
        <div
          class="workflow-log-section__debug flex items-center gap-3 flex-wrap"
          :title="!logEnabled ? '需先开启「记录执行日志」' : undefined"
        >
          <label class="text-xs text-color-secondary whitespace-nowrap">调试模式</label>
          <el-switch
            v-model="logDebug"
            inline-prompt
            active-text="开"
            inactive-text="关"
            :disabled="!logEnabled"
          />
          <span class="text-xs text-color-secondary">
            {{ logDebug
              ? '全量记录：入参 / 返回结果 / 变量池快照全部记录，成功的步骤也记录、内容不截断；日志量更大（仍只保留 7 天）'
              : (logEnabled ? '关闭后按常规强度记录' : '需先开启「记录执行日志」') }}
          </span>
        </div>
      </div>

      <el-alert
        class="workflow-debug-tip"
        type="info"
        :effect="themeStore.themeEffectString"
        :closable="false"
        show-icon
        title="工作流不提供步骤编辑器：步骤的编辑与调试请在动作侧完成，工作流只负责「何时、用哪个浏览器跑哪个动作」。"
      />
    </div>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :loading="saving" :disabled="!canSave" @click="handleSave">
        {{ workflowDetail ? '保存' : '创建' }}
      </el-button>
    </template>
  </el-dialog>

  <!-- 动作选择器 -->
  <ActionPickerDialog
    v-model="pickerVisible"
    :selected-action-id="selectedAction?.action_id"
    @select="handleActionPicked"
  />

  <!-- 最小化浮动标签 -->
  <MinimizeBar
    v-if="isMinimized"
    :title="workflowName || '编辑工作流'"
    @restore="handleRestore"
    @close="handleClose"
  />
</template>
