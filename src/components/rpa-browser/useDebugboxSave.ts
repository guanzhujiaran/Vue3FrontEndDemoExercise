import { ref, type Ref } from 'vue'
import { createCustomActionApiV1RpaBrowserControlCustomActionsCreatePost } from '@/api/browser/hey-api'
import type { BuiltinActionType } from '@/api/browser/hey-api'
import { useUserNavStore } from '@/stores/user_nav'
import biliMessage from '@/utils/message'
import type { BranchPathStep, DroppedItem } from './debugbox-types'

export function useDebugboxSave(
  droppedItems: Ref<DroppedItem[]>,
  selectedIndices: Ref<Set<number>>,
  serializeBranchSteps: (items: DroppedItem[]) => Record<string, unknown>[],
) {
  const userNavStore = useUserNavStore()

  // ── 保存对话框状态 ───────────────────────────────────
  const saveDialogVisible = ref(false)
  const saveDialogLoading = ref(false)
  const saveDialogForm = ref({ name: '', description: '', isPublic: false })
  const saveDialogItem = ref<DroppedItem | null>(null)
  const saveDialogIndex = ref(-1)
  const saveMultiItems = ref<DroppedItem[]>([])

  function apiHeaders() {
    return {
      'x-bili-mid': userNavStore.user_nav.uid,
      'x-bili-level': String(userNavStore.user_nav.level_info.current_level),
    }
  }

  function makeTimestamp() {
    const now = new Date()
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
  }

  /** 递归扫描对象/数组等值中形如 {{xxx}} 的模板变量名 */
  function extractTemplateVars(value: unknown, out: Set<string>): void {
    if (typeof value === 'string') {
      for (const m of value.matchAll(/\{\{(\w+)\}\}/g)) {
        if (m[1]) out.add(m[1])
      }
    } else if (Array.isArray(value)) {
      for (const item of value) extractTemplateVars(item, out)
    } else if (value && typeof value === 'object') {
      for (const v of Object.values(value as Record<string, unknown>)) extractTemplateVars(v, out)
    }
  }

  /** 递归收集单个 item 及其所有嵌套分支中的模板变量、输入、输出 */
  function collectItemInfo(item: DroppedItem, templateSet: Set<string>, inputSet: Set<string>, outputSet: Set<string>): void {
    extractTemplateVars(item.formData, templateSet)
    extractTemplateVars(item.config_params, templateSet)
    if (item.input_vars) Object.keys(item.input_vars).filter(k => k).forEach(k => inputSet.add(k))
    if (item.output_vars) item.output_vars.filter(k => k).forEach(k => outputSet.add(k))
    // 递归遍历嵌套分支体/循环体
    if (item.trueBranch) item.trueBranch.forEach(child => collectItemInfo(child, templateSet, inputSet, outputSet))
    if (item.falseBranch) item.falseBranch.forEach(child => collectItemInfo(child, templateSet, inputSet, outputSet))
    if (item.loopBody) item.loopBody.forEach(child => collectItemInfo(child, templateSet, inputSet, outputSet))
  }

  /** 根据输入/输出参数自动生成默认描述（含嵌套分支/循环体） */
  function generateDefaultDescription(item: DroppedItem): string {
    const parts: string[] = []
    const templateVars = new Set<string>()
    const inputSet = new Set<string>()
    const outputSet = new Set<string>()
    collectItemInfo(item, templateVars, inputSet, outputSet)
    if (templateVars.size > 0) parts.push(`需要输入：${[...templateVars].join('、')}`)
    if (inputSet.size > 0) parts.push(`输入：${[...inputSet].join('、')}`)
    if (outputSet.size > 0) parts.push(`输出：${[...outputSet].join('、')}`)
    return parts.join('\n')
  }

  // ── 打开保存对话框 ───────────────────────────────────
  function openSaveDialog(index: number) {
    const item = droppedItems.value[index]
    if (!item) return
    saveMultiItems.value = []
    saveDialogItem.value = item
    saveDialogIndex.value = index
    saveDialogForm.value = {
      name: `${item.action_type || item.action_id}_${makeTimestamp()}`,
      description: generateDefaultDescription(item) || item.description || item.json_schema?.description || '',
      isPublic: false,
    }
    saveDialogVisible.value = true
  }

  function openSaveBranchDialog(parentIndex: number, branch: 'true' | 'false' | 'loop', childIndex: number, path?: BranchPathStep[]) {
    const item = droppedItems.value[parentIndex]
    if (!item) return
    let items = branch === 'true' ? item.trueBranch : branch === 'false' ? item.falseBranch : item.loopBody
    if (!items) return
    if (path) {
      for (const step of path) {
        const nestedParent = items[step.parentIndex]
        if (!nestedParent) return
        items = step.branch === 'true' ? nestedParent.trueBranch : step.branch === 'false' ? nestedParent.falseBranch : nestedParent.loopBody
        if (!items) return
      }
    }
    if (!items[childIndex]) return
    const branchItem = items[childIndex]
    saveMultiItems.value = []
    saveDialogItem.value = branchItem
    saveDialogIndex.value = -1
    saveDialogForm.value = {
      name: `${branchItem.action_type || branchItem.action_id}_${makeTimestamp()}`,
      description: generateDefaultDescription(branchItem) || branchItem.description || branchItem.json_schema?.description || '',
      isPublic: false,
    }
    saveDialogVisible.value = true
  }

  /** 为多个 items 汇总生成默认描述（递归遍历所有嵌套分支体/循环体） */
  function generateMultiDescription(items: DroppedItem[]): string {
    const templateSet = new Set<string>()
    const inputSet = new Set<string>()
    const outputSet = new Set<string>()
    for (const item of items) {
      collectItemInfo(item, templateSet, inputSet, outputSet)
    }
    const parts: string[] = []
    if (templateSet.size > 0) parts.push(`需要输入：${[...templateSet].join('、')}`)
    if (inputSet.size > 0) parts.push(`输入：${[...inputSet].join('、')}`)
    if (outputSet.size > 0) parts.push(`输出：${[...outputSet].join('、')}`)
    return parts.join('\n')
  }

  function handleSaveMulti() {
    saveMultiItems.value = selectedIndices.value.size > 0
      ? [...selectedIndices.value].sort((a, b) => a - b).map(i => droppedItems.value[i])
      : [...droppedItems.value]
    if (saveMultiItems.value.length === 0) { biliMessage.warning('没有可保存的动作'); return }
    saveDialogItem.value = saveMultiItems.value[0]
    saveDialogForm.value = { name: `composite_${makeTimestamp()}`, description: generateMultiDescription(saveMultiItems.value), isPublic: false }
    saveDialogVisible.value = true
  }

  function handleSaveBranchMulti(parentIndex: number, branch: 'true' | 'false' | 'loop') {
    const item = droppedItems.value[parentIndex]
    if (!item) return
    const items = branch === 'true' ? item.trueBranch : branch === 'false' ? item.falseBranch : item.loopBody
    if (!items || items.length === 0) { biliMessage.warning('该分支没有可保存的动作'); return }
    saveMultiItems.value = [...items]
    saveDialogItem.value = items[0]
    saveDialogForm.value = { name: `${branch}_composite_${makeTimestamp()}`, description: generateMultiDescription(items), isPublic: false }
    saveDialogVisible.value = true
  }

  // ── 确认保存 ─────────────────────────────────────────
  async function handleSaveDialogConfirm() {
    // 多 items → 复合动作
    if (saveMultiItems.value.length > 1) {
      if (!saveDialogForm.value.name?.trim()) { biliMessage.warning('请输入自定义操作名称'); return }
      saveDialogLoading.value = true
      try {
        const steps = saveMultiItems.value.map(item => {
          const step: Record<string, unknown> = {
            action_type: (item.action_type || item.action_id) as BuiltinActionType,
            action_id: item.action_id, params: { ...(item.formData || {}), ...(item.config_params || {}) },
            input_vars: item.input_vars || {}, output_vars: item.output_vars || [],
          }
          if (item.trueBranch?.length) (step.params as Record<string, unknown>).TrueBranch = serializeBranchSteps(item.trueBranch)
          if (item.falseBranch?.length) (step.params as Record<string, unknown>).FalseBranch = serializeBranchSteps(item.falseBranch)
          if (item.loopBody?.length) (step.params as Record<string, unknown>).loopBranch = serializeBranchSteps(item.loopBody)
          return step
        })
        const response = await createCustomActionApiV1RpaBrowserControlCustomActionsCreatePost({
          body: { name: saveDialogForm.value.name, action_type: 'composite' as BuiltinActionType, description: saveDialogForm.value.description,
            parameters_schema: [], steps, is_public: saveDialogForm.value.isPublic, tags: [],
            input_vars: [], output_vars: [], timeout: 30000, retry_on_error: false, retry_times: 0, retry_delay: 1.0 },
          headers: apiHeaders(),
        })
        if (response?.code === 0) { biliMessage.success('自定义操作保存成功'); saveDialogVisible.value = false; saveMultiItems.value = [] }
        else {
          const msg = response?.msg || `保存失败 (code: ${response?.code})`
          console.error('[DebugboxSave] 复合动作保存失败:', response.data)
          biliMessage.error(msg)
        }
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error)
        console.error('[DebugboxSave] 复合动作保存异常:', error)
        biliMessage.error(msg ? `保存失败: ${msg}` : '网络异常，保存失败')
      }
      finally { saveDialogLoading.value = false }
      return
    }

    // 单 item
    if (!saveDialogItem.value) return
    if (!saveDialogForm.value.name?.trim()) { biliMessage.warning('请输入自定义操作名称'); return }
    saveDialogLoading.value = true
    try {
      const item = saveDialogItem.value
      const stepData: Record<string, unknown> = {
        action_type: (item.action_type || item.action_id) as BuiltinActionType,
        action_id: item.action_id, params: { ...item.formData, ...item.config_params },
        input_vars: item.input_vars || {}, output_vars: item.output_vars || [],
      }
      if (item.trueBranch?.length) (stepData.params as Record<string, unknown>).TrueBranch = serializeBranchSteps(item.trueBranch)
      if (item.falseBranch?.length) (stepData.params as Record<string, unknown>).FalseBranch = serializeBranchSteps(item.falseBranch)
      if (item.loopBody?.length) (stepData.params as Record<string, unknown>).loopBranch = serializeBranchSteps(item.loopBody)
      if (item.step_children?.length) stepData.children = item.step_children

      const response = await createCustomActionApiV1RpaBrowserControlCustomActionsCreatePost({
        body: {
          name: saveDialogForm.value.name, action_type: (item.action_type || item.action_id) as BuiltinActionType,
          description: saveDialogForm.value.description,
          parameters_schema: item.json_schema?.properties ? Object.entries(item.json_schema.properties).map(([key, prop]: [string, Record<string, unknown>]) => ({ name: key, json_schema: prop })) : [],
          steps: [stepData], is_public: saveDialogForm.value.isPublic, tags: [],
          input_vars: [], output_vars: [], timeout: 30000, retry_on_error: false, retry_times: 0, retry_delay: 1.0,
        },
        headers: apiHeaders(),
      })
      if (response?.code === 0) { biliMessage.success('自定义操作保存成功'); saveDialogVisible.value = false }
      else {
        const msg = response?.msg || `保存失败 (code: ${response?.code})`
        console.error('[DebugboxSave] 单项动作保存失败:', response.data)
        biliMessage.error(msg)
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error('[DebugboxSave] 单项动作保存异常:', error)
      biliMessage.error(msg ? `保存失败: ${msg}` : '网络异常，保存失败')
    }
    finally { saveDialogLoading.value = false }
  }

  // ── 导出 ─────────────────────────────────────────────
  return {
    saveDialogVisible, saveDialogLoading, saveDialogForm, saveDialogItem, saveDialogIndex, saveMultiItems,
    openSaveDialog, openSaveBranchDialog, handleSaveMulti, handleSaveBranchMulti, handleSaveDialogConfirm,
  }
}
