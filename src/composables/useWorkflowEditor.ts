/**
 * 工作流编辑器 composable - 管理工作流步骤的树状结构
 * 支持：添加/删除/移动步骤、嵌套子步骤、{{变量}} 模板
 */
import { ref, computed } from 'vue'
import type { WorkflowStepRequest, PredefinedActionDef, PredefinedActionId } from '@/types/browser-automation-api'

// 预定义动作配置表
export const PREDEFINED_ACTIONS: PredefinedActionDef[] = [
  { id: 'navigate', name: '导航', category: 'navigation', description: '访问网页', core_params: ['url'], has_children: false, parameters: [
    { name: 'url', type: 'url', required: true, description: '目标网址' },
    { name: 'wait_until', type: 'string', required: false, description: '等待条件 (load/domcontentloaded/networkidle)' }
  ]},
  { id: 'click', name: '点击', category: 'interaction', description: '点击元素', core_params: ['selector'], has_children: false, parameters: [
    { name: 'selector', type: 'selector', required: true, description: 'CSS 选择器' },
    { name: 'button', type: 'string', required: false, default: 'left', description: '鼠标按钮 (left/right/middle)' }
  ]},
  { id: 'input', name: '输入', category: 'interaction', description: '填写表单', core_params: ['selector', 'value'], has_children: false, parameters: [
    { name: 'selector', type: 'selector', required: true, description: 'CSS 选择器' },
    { name: 'text', type: 'text', required: true, description: '输入内容，支持 {{变量}}' },
    { name: 'clear', type: 'boolean', required: false, default: true, description: '是否先清空' }
  ]},
  { id: 'scroll', name: '滚动', category: 'interaction', description: '滚动页面', core_params: [], has_children: false, parameters: [
    { name: 'direction', type: 'string', required: false, default: 'down', description: '方向 (up/down/left/right)' },
    { name: 'amount', type: 'number', required: false, default: 300, description: '滚动距离(像素)' }
  ]},
  { id: 'hover', name: '悬停', category: 'interaction', description: '鼠标悬停元素', core_params: ['selector'], has_children: false, parameters: [
    { name: 'selector', type: 'selector', required: true, description: 'CSS 选择器' }
  ]},
  { id: 'select', name: '选择', category: 'interaction', description: '下拉框选择', core_params: ['selector', 'value'], has_children: false, parameters: [
    { name: 'selector', type: 'selector', required: true, description: 'CSS 选择器' },
    { name: 'value', type: 'string', required: true, description: '选项值' }
  ]},
  { id: 'keyboard', name: '键盘', category: 'interaction', description: '键盘按键操作', core_params: ['keys'], has_children: false, parameters: [
    { name: 'keys', type: 'string', required: true, description: '按键 (如 Enter, Tab, Ctrl+A)' }
  ]},
  { id: 'evaluate', name: '执行JS', category: 'data', description: '获取页面信息并存入 state', core_params: ['script'], has_children: false, parameters: [
    { name: 'script', type: 'code', required: true, description: 'JavaScript 表达式或代码' }
  ]},
  { id: 'screenshot', name: '截图', category: 'utility', description: '截取当前页面截图', core_params: [], has_children: false, parameters: [
    { name: 'path', type: 'string', required: false, description: '保存路径，支持 {{变量}}' }
  ]},
  { id: 'wait', name: '等待', category: 'utility', description: '固定等待或等待元素出现', core_params: ['time'], has_children: false, parameters: [
    { name: 'time', type: 'number', required: false, description: '等待时长(毫秒)' }
  ]},
  { id: 'loop', name: '循环', category: 'control_flow', description: '遍历列表或计数循环', core_params: [], has_children: true, parameters: [
    { name: 'loop_count', type: 'number', required: false, description: '固定循环次数' },
    { name: 'loop_while', type: 'string', required: false, description: 'while条件，满足时继续循环，支持 {{变量}}' },
    { name: 'loop_until', type: 'string', required: false, description: 'until条件，满足时退出循环，支持 {{变量}}' }
  ]},
  { id: 'if_else', name: '条件分支', category: 'control_flow', description: '条件判断，支持 True/False 分支', core_params: [], has_children: true, parameters: [
    { name: 'condition', type: 'string', required: true, description: '条件表达式，支持 {{变量}} 和 JS 运算符 (== != > < && || !)' }
  ]}
]

// 控制流字段配置（用于任意步骤的增强）
export const CONTROL_FLOW_FIELDS = {
  condition: {
    label: '条件执行',
    description: '仅当条件为 true 时执行此步骤',
    placeholder: '{{variable}} == true',
    type: 'string' as const
  },
  loop_count: {
    label: '固定循环',
    description: '重复执行 N 次',
    placeholder: '10',
    type: 'number' as const
  },
  loop_while: {
    label: 'While 循环',
    description: '当条件为 true 时持续循环',
    placeholder: '{{count}} < 100',
    type: 'string' as const
  },
  loop_until: {
    label: 'Until 循环',
    description: '当条件为 true 时退出循环',
    placeholder: '{{element_exists}} == true',
    type: 'string' as const
  },
  retry: {
    label: '重试次数',
    description: '失败后自动重试',
    placeholder: '3',
    type: 'number' as const
  },
  retry_delay: {
    label: '重试间隔(s)',
    description: '每次重试前的等待时间',
    placeholder: '1.0',
    type: 'number' as const
  }
}

// 类别显示配置
export const CATEGORY_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  navigation: { label: '导航', color: 'text-purple-500', icon: '🧭' },
  interaction: { label: '交互', color: 'text-blue-500', icon: '👆' },
  control_flow: { label: '流程', color: 'text-amber-500', icon: '🔄' },
  data: { label: '数据', color: 'text-green-500', icon: '📊' },
  utility: { label: '工具', color: 'text-slate-500', icon: '🔧' }
}

// 带有 UI 信息的步骤节点（扩展 WorkflowStepRequest）
export interface StepNode extends WorkflowStepRequest {
  _uid: string           // 唯一ID，用于拖拽和 diff
  _collapsed?: boolean   // 是否折叠子步骤
}

let uidCounter = 0
const genUid = () => `step_${++uidCounter}_${Date.now()}`

export function useWorkflowEditor(initialSteps?: WorkflowStepRequest[]) {
  const steps = ref<StepNode[]>([])

  // 初始化
  const initFromSteps = (raw: WorkflowStepRequest[]) => {
    steps.value = raw.map(s => toStepNode(s))
  }

  const toStepNode = (raw: WorkflowStepRequest): StepNode => ({
    ...raw,
    _uid: genUid(),
    _collapsed: false,
    children: raw.children?.map(c => toStepNode(c))
  })

  const toWorkflowStep = (node: StepNode): WorkflowStepRequest => {
    const result: WorkflowStepRequest = {
      action_id: node.action_id,
      params: { ...node.params }
    }
    if (node.output_var) result.output_var = node.output_var
    if (node.condition) result.condition = node.condition
    if (node.loop_count != null) result.loop_count = node.loop_count
    if (node.loop_while) result.loop_while = node.loop_while
    if (node.loop_until) result.loop_until = node.loop_until
    if (node.retry != null) result.retry = node.retry
    if (node.retry_delay != null) result.retry_delay = node.retry_delay
    if (node.description) result.description = node.description
    if (node.children?.length) {
      result.children = node.children.map(c => toWorkflowStep(c))
    }
    if (node.enabled_plugins?.length) {
      result.enabled_plugins = node.enabled_plugins.map(p => ({ ...p }))
    }
    return result
  }

  // 导出为 API 格式
  const exportSteps = computed<WorkflowStepRequest[]>(() =>
    steps.value.map(s => toWorkflowStep(s))
  )

  // 添加步骤
  const addStep = (actionId: PredefinedActionId | string, index?: number) => {
    const def = PREDEFINED_ACTIONS.find(a => a.id === actionId)
    const defaultParams: Record<string, any> = {}
    def?.parameters.forEach(p => {
      if (p.default !== undefined) defaultParams[p.name] = p.default
    })

    const node: StepNode = {
      _uid: genUid(),
      action_id: actionId,
      params: defaultParams,
      _collapsed: false
    }

    // if_else 默认生成两个 children 数组 (true 分支 / false 分支)
    if (actionId === 'if_else') {
      node.children = [[], []] as any
    }

    if (index !== undefined) {
      steps.value.splice(index, 0, node)
    } else {
      steps.value.push(node)
    }
  }

  // 删除步骤
  const removeStep = (uid: string) => {
    const idx = steps.value.findIndex(s => s._uid === uid)
    if (idx >= 0) steps.value.splice(idx, 1)
  }

  // 移动步骤
  const moveStep = (fromIndex: number, toIndex: number) => {
    const [moved] = steps.value.splice(fromIndex, 1)
    steps.value.splice(toIndex, 0, moved)
  }

  // 向子步骤列表中添加步骤
  const addChildStep = (parentUid: string, branchIndex: number, actionId: PredefinedActionId | string) => {
    const parent = findStepByUid(parentUid)
    if (!parent) return

    if (!parent.children) parent.children = []
    // if_else children 是二维数组 [[true分支], [false分支]]
    if (parent.action_id === 'if_else') {
      while ((parent.children as any[]).length <= branchIndex) {
        ;(parent.children as any[]).push([])
      }
      const def = PREDEFINED_ACTIONS.find(a => a.id === actionId)
      const defaultParams: Record<string, any> = {}
      def?.parameters.forEach(p => {
        if (p.default !== undefined) defaultParams[p.name] = p.default
      })
      ;(parent.children as any[])[branchIndex].push({
        _uid: genUid(),
        action_id: actionId,
        params: defaultParams,
        _collapsed: false
      })
    } else {
      const def = PREDEFINED_ACTIONS.find(a => a.id === actionId)
      const defaultParams: Record<string, any> = {}
      def?.parameters.forEach(p => {
        if (p.default !== undefined) defaultParams[p.name] = p.default
      })
      ;(parent.children as StepNode[]).push({
        _uid: genUid(),
        action_id: actionId,
        params: defaultParams,
        _collapsed: false
      })
    }
  }

  // 删除子步骤
  const removeChildStep = (parentUid: string, branchIndex: number, childUid: string) => {
    const parent = findStepByUid(parentUid)
    if (!parent?.children) return

    if (parent.action_id === 'if_else') {
      const branch = (parent.children as any[])[branchIndex] as StepNode[]
      if (branch) {
        const idx = branch.findIndex(c => c._uid === childUid)
        if (idx >= 0) branch.splice(idx, 1)
      }
    } else {
      const children = parent.children as StepNode[]
      const idx = children.findIndex(c => c._uid === childUid)
      if (idx >= 0) children.splice(idx, 1)
    }
  }

  const findStepByUid = (uid: string, nodes?: StepNode[]): StepNode | null => {
    const list = nodes || steps.value
    for (const s of list) {
      if (s._uid === uid) return s
      if (s.children) {
        if (s.action_id === 'if_else') {
          for (const branch of s.children as any[]) {
            const found = findStepByUid(uid, branch as StepNode[])
            if (found) return found
          }
        } else {
          const found = findStepByUid(uid, s.children as StepNode[])
          if (found) return found
        }
      }
    }
    return null
  }

  // 收集所有可用的 state 变量 (基于 output_var 和循环变量)
  const availableVariables = computed<string[]>(() => {
    const vars: string[] = []
    const collect = (nodes: StepNode[], prefix = '') => {
      for (const node of nodes) {
        if (node.output_var) {
          vars.push(`${prefix}${node.output_var}`)
        }
        if (node.action_id === 'loop') {
          vars.push(`${prefix}state.loop.current_item`)
          vars.push(`${prefix}state.loop.index`)
        }
        if (node.children) {
          if (node.action_id === 'if_else') {
            for (const branch of node.children as any[]) {
              collect(branch as StepNode[], prefix)
            }
          } else {
            collect(node.children as StepNode[], prefix)
          }
        }
      }
    }
    collect(steps.value)
    return vars
  })

  // 初始化
  if (initialSteps?.length) {
    initFromSteps(initialSteps)
  }

  return {
    steps,
    exportSteps,
    availableVariables,
    addStep,
    removeStep,
    moveStep,
    addChildStep,
    removeChildStep,
    initFromSteps,
    findStepByUid
  }
}
