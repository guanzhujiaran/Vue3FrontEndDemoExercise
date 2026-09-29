import { ref, type Ref } from 'vue'
import { 执行引擎Service } from '@/api/browser/hey-api'
import type { ActionPreviewResponse, WorkflowStepRequest } from '@/api/browser/hey-api'
import { useUserNavStore } from '@/stores/user_nav'
import biliMessage from '@/utils/message'
import type { DroppedItem, OperationFeedback, OperationKind, ActionResultResponse, StepResultItem, NestedPreviewNode, BranchPathStep } from './debugbox-types'

export function useDebugboxExecution(
  droppedItems: Ref<DroppedItem[]>,
  browserId: string,
  isSessionConnected: Ref<boolean>,
  // 需要外部传入的工具函数
  getActionParams: (item: DroppedItem) => Record<string, unknown>,
  getInputVars: (item: DroppedItem) => Record<string, unknown>,
  getOutputVars: (item: DroppedItem) => string[],
  getStepChildren: (item: DroppedItem) => Record<string, unknown>[] | null,
  serializeBranchSteps: (items: DroppedItem[]) => Record<string, unknown>[],
  // selection：以 item.id 为 key
  selectedIds?: Ref<Set<string>>,
) {
  const userNavStore = useUserNavStore()

  // ── 状态 ─────────────────────────────────────────────
  /** 当前操作中的 item.id（以 id 为 key，重排序后依然准确） */
  const operatingId = ref<string | null>(null)
  const operatingKind = ref<OperationKind | null>(null)
  const operationFeedback = ref<Record<string, OperationFeedback>>({})
  const executingSelected = ref(false)
  const branchOperating = ref<Record<string, boolean>>({})

  // ── 业务码引导（对齐后端 bili_common.models.response_code，见计划书 §5.17）──
  /** 浏览器未启动 / 已被闲置回收：调试入口不自动拉起，需引导用户手动启动 */
  const CODE_BROWSER_NOT_STARTED = 1007
  /** 浏览器正在执行工作流：执行期互斥（直播为只读拉流，不受影响） */
  const CODE_BROWSER_WORKFLOW_RUNNING = 2016

  /**
   * 会话类业务码 → 可操作的引导文案
   *
   * 后端 msg 偏「状态描述」（如「浏览器未启动或已停止」），前端补一层「下一步做什么」，
   * 否则用户只知道失败了、不知道点哪里。
   */
  const SESSION_CODE_HINTS: Record<number, string> = {
    [CODE_BROWSER_NOT_STARTED]: '浏览器未启动或已停止，请先点击「启动浏览器」后再执行',
    [CODE_BROWSER_WORKFLOW_RUNNING]: '浏览器正在执行工作流（直播不受影响），请等待执行结束后重试',
  }

  function formatApiError(
    response: { code?: number; msg?: string } | undefined | null,
    fallback: string,
  ) {
    const code = response?.code
    const hint = code == null ? undefined : SESSION_CODE_HINTS[code]
    return hint ?? response?.msg ?? fallback
  }

  /**
   * 把复合操作的子步骤并入 params.steps
   *
   * 后端只认 `params.steps`：CompositeAction 从 params 提取步骤，
   * DB 里保存的版本仅在 `params.steps` 为空时兜底（见 engine.py 的 db_steps 分支）。
   * 原先顶层传 `step_children` 会被 pydantic 直接忽略，导致「调试面板改动的子步骤
   * 不生效、实际执行的是已保存版本」——必须在执行前先保存才看得到效果。
   */
  function withStepChildren(item: DroppedItem): Record<string, unknown> {
    const params = getActionParams(item)
    const children = getStepChildren(item)
    if (children?.length && !params.steps) {
      params.steps = children
    }
    return params
  }

  // ── 反馈 ─────────────────────────────────────────────
  function setOperationFeedback(index: string | number, kind: OperationKind, success: boolean, summary: string, detail: OperationFeedback['detail']) {
    operationFeedback.value[String(index)] = { kind, success, summary, detail, at: Date.now() }
  }

  function closeOperationFeedback(index: string | number) {
    delete operationFeedback.value[String(index)]
  }

  // ── 单动作执行 ──────────────────────────────────────
  async function executeAction(index: number) {
    const item = droppedItems.value[index]
    if (!item) return

    operatingId.value = item.id
    operatingKind.value = 'execute'

    const body = {
      action_id: item.action_id,
      params: withStepChildren(item),
      input_vars: getInputVars(item),
      output_vars: getOutputVars(item),
    }

    try {
      const response = await 执行引擎Service.executeActionApiV1RpaBrowserControlActionsExecutePost({
        query: { browser_id: browserId }, body, headers: userNavStore.user_header,
      })
      if (response?.code !== 0) {
        const msg = formatApiError(response, '执行失败')
        biliMessage.error(msg)
        setOperationFeedback(item.id, 'execute', false, msg, { error: msg })
        return
      }
      const result = response.data as ActionResultResponse | undefined
      if (result?.success) {
        const summary = `执行成功${result.execution_time != null ? `（${result.execution_time.toFixed(2)}s）` : ''}`
        biliMessage.success(summary)
        setOperationFeedback(item.id, 'execute', true, summary, result)
      } else {
        const msg = result?.error || '执行失败'
        biliMessage.error(msg)
        setOperationFeedback(item.id, 'execute', false, msg, result ?? { error: msg })
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '网络异常，执行失败'
      biliMessage.error(msg)
      setOperationFeedback(item.id, 'execute', false, msg, { error: msg })
    } finally {
      operatingId.value = null
      operatingKind.value = null
    }
  }

  // ── 预览 ─────────────────────────────────────────────
  async function previewAction(index: number) {
    const item = droppedItems.value[index]
    if (!item) return
    operatingId.value = item.id
    operatingKind.value = 'preview'

    try {
      const response = await 执行引擎Service.previewActionParamsApiV1RpaBrowserControlActionsPreviewPost({
        query: { browser_id: browserId }, body: { action_id: item.action_id, params: getActionParams(item), input_vars: getInputVars(item) }, headers: userNavStore.user_header,
      })
      if (response?.code !== 0) {
        const msg = formatApiError(response, '预览失败')
        biliMessage.error(msg)
        setOperationFeedback(item.id, 'preview', false, msg, { error: msg })
        return
      }
      const result = response.data
      const found = result?.found_params?.length ? `已解析变量: ${result.found_params.join(', ')}` : '预览完成'
      biliMessage.success('预览成功')
      setOperationFeedback(item.id, 'preview', true, found, result ?? {})
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '网络异常，预览失败'
      biliMessage.error(msg)
      setOperationFeedback(item.id, 'preview', false, msg, { error: msg })
    } finally {
      operatingId.value = null
      operatingKind.value = null
    }
  }

  // ── 验证 ─────────────────────────────────────────────
  async function validateAction(index: number) {
    const item = droppedItems.value[index]
    if (!item) return
    operatingId.value = item.id
    operatingKind.value = 'validate'

    try {
      const response = await 执行引擎Service.validateActionParamsApiV1RpaBrowserControlActionsValidatePost({
        query: { browser_id: browserId }, body: { action_id: item.action_id, params: getActionParams(item), input_vars: getInputVars(item) }, headers: userNavStore.user_header,
      })
      if (response?.code !== 0) {
        const msg = formatApiError(response, '参数验证失败')
        biliMessage.error(msg)
        setOperationFeedback(item.id, 'validate', false, msg, { error: msg })
        return
      }
      const result = response.data
      if (result?.valid) {
        biliMessage.success('参数验证通过')
        setOperationFeedback(item.id, 'validate', true, '参数验证通过', result)
      } else {
        const parts: string[] = []
        if (result?.missing_params?.length) parts.push(`缺少必填: ${result.missing_params.join(', ')}`)
        if (result?.invalid_params?.length) parts.push(`无效字段: ${result.invalid_params.join(', ')}`)
        if (result?.errors?.length) parts.push(...result.errors)
        const msg = parts.length > 0 ? parts.join('；') : '参数验证失败'
        biliMessage.error('参数验证失败')
        setOperationFeedback(item.id, 'validate', false, msg, result ?? { error: msg })
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '网络异常，验证失败'
      biliMessage.error(msg)
      setOperationFeedback(item.id, 'validate', false, msg, { error: msg })
    } finally {
      operatingId.value = null
      operatingKind.value = null
    }
  }

  // ── 工作流批量执行 ──────────────────────────────────
  async function handleExecuteSelected() {
    // 以 item.id 为准：按 droppedItems 中的当前顺序解析选中项
    const selectedSet = selectedIds?.value
    const selectedItems = selectedSet && selectedSet.size > 0
      ? droppedItems.value.filter(i => selectedSet.has(i.id))
      : [...droppedItems.value]
    if (selectedItems.length === 0) { biliMessage.warning('请至少选择一个动作'); return }

    executingSelected.value = true
    try {
      const steps: WorkflowStepRequest[] = selectedItems.map(item => {
        const step: WorkflowStepRequest = {
          action_id: item.action_id, action_type: item.action_type || item.action_id,
          params: withStepChildren(item), input_vars: getInputVars(item), output_vars: getOutputVars(item),
        }
        if (item.trueBranch?.length) (step.params as Record<string, unknown>).TrueBranch = serializeBranchSteps(item.trueBranch)
        if (item.falseBranch?.length) (step.params as Record<string, unknown>).FalseBranch = serializeBranchSteps(item.falseBranch)
        if (item.loopBody?.length) (step.params as Record<string, unknown>).loopBranch = serializeBranchSteps(item.loopBody)
        return step
      })

      const response = await 执行引擎Service.executeWorkflowApiV1RpaBrowserControlWorkflowsExecutePost({
        query: { browser_id: browserId }, body: { steps, variables: {}, input_data: {}, output_vars: [] }, headers: userNavStore.user_header,
      })

      if (response?.code === 0) {
        const result = response.data as { results?: Array<{ success: boolean; data?: unknown; action_id: string; action_name?: string; error?: string | null; execution_time?: number; variables?: Record<string, unknown>; replaced_params?: Record<string, unknown> }>; summary?: { total: number; success: number; failed: number } } | undefined
        const stepResults = result?.results ?? []
        const summary = result?.summary

        for (let i = 0; i < selectedItems.length && i < stepResults.length; i++) {
          const item = selectedItems[i]
          const sr = stepResults[i]
          if (sr?.success) {
            setOperationFeedback(item.id, 'execute', true,
              `执行成功${sr.execution_time != null ? `（${sr.execution_time.toFixed(2)}s）` : ''}`,
              { action_id: sr.action_id, action_name: sr.action_name, success: true, data: sr.data, variables: sr.variables ?? {}, replaced_params: sr.replaced_params ?? {} })
          } else {
            const errMsg = sr?.error || '步骤执行失败'
            setOperationFeedback(item.id, 'execute', false, errMsg,
              { action_id: sr?.action_id ?? '', action_name: sr?.action_name, success: false, error: errMsg, data: sr.data, variables: sr.variables ?? {}, replaced_params: sr.replaced_params ?? {} })
          }
        }

        if (summary) {
          if (summary.failed === 0) biliMessage.success(`工作流全部执行成功（${summary.success} 个动作）`)
          else biliMessage.warning(`工作流执行完成：成功 ${summary.success}，失败 ${summary.failed}`)
          setOperationFeedback('__batch__', 'execute', summary.failed === 0,
            `成功 ${summary.success} / 失败 ${summary.failed}（共 ${summary.total} 个）`, { summary })
        }
      } else {
        const msg = formatApiError(response, '工作流执行失败')
        biliMessage.error(msg)
        for (const item of selectedItems) setOperationFeedback(item.id, 'execute', false, msg, { error: msg })
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : '网络异常'
      biliMessage.error(msg)
      for (const item of selectedItems) setOperationFeedback(item.id, 'execute', false, msg, { error: msg })
    } finally {
      executingSelected.value = false
    }
  }

  // ── 分支批量执行 ────────────────────────────────────
  async function handleExecuteBranchAll(parentIndex: number, branch: 'true' | 'false' | 'loop') {
    const item = droppedItems.value[parentIndex]
    if (!item) return
    const items = branch === 'true' ? item.trueBranch : branch === 'false' ? item.falseBranch : item.loopBody
    if (!items || items.length === 0) { biliMessage.warning('该分支没有要执行的动作'); return }

    const branchKey = `${parentIndex}-${branch}`; branchOperating.value[branchKey] = true
    try {
      const steps: WorkflowStepRequest[] = items.map(child => ({
        action_id: child.action_id, action_type: child.action_type || child.action_id,
        params: withStepChildren(child), input_vars: getInputVars(child), output_vars: getOutputVars(child),
      }))
      const response = await 执行引擎Service.executeWorkflowApiV1RpaBrowserControlWorkflowsExecutePost({
        query: { browser_id: browserId }, body: { steps, variables: {}, input_data: {}, output_vars: [] }, headers: userNavStore.user_header,
      })
      if (response?.code === 0) {
        const result = response.data as { results?: Array<{ success: boolean; data?: unknown; action_id: string; action_name?: string; error?: string | null; execution_time?: number; variables?: Record<string, unknown>; replaced_params?: Record<string, unknown> }>; summary?: { total: number; success: number; failed: number } } | undefined
        const stepResults = result?.results ?? []
        for (let i = 0; i < items.length && i < stepResults.length; i++) {
          const child = items[i]
          const sr = stepResults[i]
          if (sr?.success) {
            setOperationFeedback(child.id, 'execute', true,
              `执行成功${sr.execution_time != null ? `（${sr.execution_time.toFixed(2)}s）` : ''}`,
              { action_id: sr.action_id, action_name: sr.action_name, success: true, data: sr.data, variables: sr.variables ?? {}, replaced_params: sr.replaced_params ?? {} })
          } else {
            const errMsg = sr?.error || '步骤执行失败'
            setOperationFeedback(child.id, 'execute', false, errMsg,
              { action_id: sr?.action_id ?? '', action_name: sr?.action_name, success: false, error: errMsg, data: sr.data, variables: sr.variables ?? {}, replaced_params: sr.replaced_params ?? {} })
          }
        }
        const summary = result?.summary
        if (summary) {
          if (summary.failed === 0) biliMessage.success(`分支全部执行成功（${summary.success} 个动作）`)
          else biliMessage.warning(`分支执行完成：成功 ${summary.success}，失败 ${summary.failed}`)
        }
      } else {
        biliMessage.error(formatApiError(response, '分支执行失败'))
      }
    } catch (e) {
      biliMessage.error(e instanceof Error ? e.message : '网络异常')
    } finally {
      branchOperating.value[branchKey] = false
    }
  }

  // ── 分支单动作执行 ──────────────────────────────────
  /** 按嵌套路径定位条目（支持任意深度）；key 直接使用 child.id，重排序后状态依然准确 */
  function resolveNestedItem(dropped: DroppedItem[], parentIndex: number, branch: 'true' | 'false' | 'loop', childIndex: number, path?: BranchPathStep[]): { item: DroppedItem; key: string } | null {
    const parent = dropped[parentIndex]
    if (!parent) return null
    // 显式标注类型：否则 items 会被推断为依赖自身（赋值发生在循环内），
    // TS 会把 nestedParent 判为隐式 any
    let items: DroppedItem[] | undefined =
      branch === 'true' ? parent.trueBranch : branch === 'false' ? parent.falseBranch : parent.loopBody
    if (!items) return null
    if (path) {
      for (const step of path) {
        const nestedParent: DroppedItem | undefined = items[step.parentIndex]
        if (!nestedParent) return null
        items = step.branch === 'true' ? nestedParent.trueBranch : step.branch === 'false' ? nestedParent.falseBranch : nestedParent.loopBody
        if (!items) return null
      }
    }
    if (!items[childIndex]) return null
    return { item: items[childIndex], key: items[childIndex].id }
  }

  async function executeBranchItem(parentIndex: number, branch: 'true' | 'false' | 'loop', childIndex: number, path?: BranchPathStep[]) {
    const resolved = resolveNestedItem(droppedItems.value, parentIndex, branch, childIndex, path)
    if (!resolved) return
    const { item: child, key: childKey } = resolved

    branchOperating.value[childKey] = true
    try {
      const response = await 执行引擎Service.executeActionApiV1RpaBrowserControlActionsExecutePost({
        query: { browser_id: browserId }, body: { action_id: child.action_id, params: withStepChildren(child), input_vars: getInputVars(child), output_vars: getOutputVars(child) }, headers: userNavStore.user_header,
      })
      if (response?.code !== 0) {
        const msg = formatApiError(response, '执行失败')
        biliMessage.error(msg)
        setOperationFeedback(childKey, 'execute', false, msg, { error: msg })
        return
      }
      const result = response.data as ActionResultResponse | undefined
      if (result?.success) {
        const summary = `执行成功${result.execution_time != null ? `（${result.execution_time.toFixed(2)}s）` : ''}`
        biliMessage.success(summary)
        setOperationFeedback(childKey, 'execute', true, summary, result)
      } else {
        const msg = result?.error || '执行失败'
        biliMessage.error(msg)
        setOperationFeedback(childKey, 'execute', false, msg, result ?? { error: msg })
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '网络异常'
      biliMessage.error(msg)
      setOperationFeedback(childKey, 'execute', false, msg, { error: msg })
    } finally {
      branchOperating.value[childKey] = false
    }
  }

  async function previewBranchItem(parentIndex: number, branch: 'true' | 'false' | 'loop', childIndex: number, path?: BranchPathStep[]) {
    const resolved = resolveNestedItem(droppedItems.value, parentIndex, branch, childIndex, path)
    if (!resolved) return
    const { item: child, key: childKey } = resolved

    branchOperating.value[childKey] = true
    try {
      const response = await 执行引擎Service.previewActionParamsApiV1RpaBrowserControlActionsPreviewPost({
        query: { browser_id: browserId }, body: { action_id: child.action_id, params: getActionParams(child), input_vars: getInputVars(child) }, headers: userNavStore.user_header,
      })
      if (response?.code !== 0) {
        const msg = formatApiError(response, '预览失败')
        setOperationFeedback(childKey, 'preview', false, msg, { error: msg })
        return
      }
      const result = response.data
      const found = result?.found_params?.length ? `已解析变量: ${result.found_params.join(', ')}` : '预览完成'
      setOperationFeedback(childKey, 'preview', true, found, result ?? {})
    } catch (e) {
      setOperationFeedback(childKey, 'preview', false, '网络异常', { error: '网络异常' })
    } finally {
      branchOperating.value[childKey] = false
    }
  }

  async function validateBranchItem(parentIndex: number, branch: 'true' | 'false' | 'loop', childIndex: number, path?: BranchPathStep[]) {
    const resolved = resolveNestedItem(droppedItems.value, parentIndex, branch, childIndex, path)
    if (!resolved) return
    const { item: child, key: childKey } = resolved

    branchOperating.value[childKey] = true
    try {
      const response = await 执行引擎Service.validateActionParamsApiV1RpaBrowserControlActionsValidatePost({
        query: { browser_id: browserId }, body: { action_id: child.action_id, params: getActionParams(child), input_vars: getInputVars(child) }, headers: userNavStore.user_header,
      })
      if (response?.code !== 0) {
        setOperationFeedback(childKey, 'validate', false, '验证失败', { error: '验证失败' })
        return
      }
      const result = response.data
      if (result?.valid) {
        setOperationFeedback(childKey, 'validate', true, '参数验证通过', result)
      } else {
        const parts: string[] = []
        if (result?.missing_params?.length) parts.push(`缺少必填: ${result.missing_params.join(', ')}`)
        if (result?.invalid_params?.length) parts.push(`无效字段: ${result.invalid_params.join(', ')}`)
        if (result?.errors?.length) parts.push(...result.errors)
        setOperationFeedback(childKey, 'validate', false, parts.join('；') || '参数验证失败', result ?? { error: '参数验证失败' })
      }
    } catch (e) {
      setOperationFeedback(childKey, 'validate', false, '网络异常', { error: '网络异常' })
    } finally {
      branchOperating.value[childKey] = false
    }
  }

  // ── 反馈数据提取 ─────────────────────────────────────
  /** 所有提取函数以 item.id 为 key */
  function getExecuteDetail(id: string): ActionResultResponse | null {
    const fb = operationFeedback.value[id]
    if (!fb || fb.kind !== 'execute') return null
    return fb.detail as ActionResultResponse
  }

  /**
   * 复合操作的子步骤结果
   *
   * 后端把子步骤结果放在 `ActionResultResponse.data`（CompositeResult）的 `results` 里，
   * 是**数组**而非 map。此前读顶层 `step_results` 是错误路径（该字段后端不存在），
   * 导致分步结果面板恒为空。
   */
  function execResultSteps(id: string): StepResultItem[] {
    const detail = getExecuteDetail(id) as unknown as
      | { data?: { results?: unknown } }
      | null
    const results = detail?.data?.results
    if (!Array.isArray(results)) return []
    return results.map((step, index) => {
      const record = step as Record<string, unknown>
      return {
        key: String(index),
        success: record?.success === true,
        action_name: record?.action_name as string | undefined,
        execution_time: record?.execution_time as number | undefined,
      }
    })
  }

  function getPreviewDetail(id: string): ActionPreviewResponse | null {
    const fb = operationFeedback.value[id]
    if (!fb || fb.kind !== 'preview') return null
    return fb.detail as ActionPreviewResponse
  }

  function previewReplacedParams(id: string): { key: string; value: unknown }[] {
    const params = getPreviewDetail(id)?.replaced_params
    if (!params) return []
    return Object.entries(params).map(([key, value]) => ({ key, value }))
  }

  function previewFoundParams(id: string): string[] {
    const detail = getPreviewDetail(id)
    if (!detail?.found_params) return []
    if (Array.isArray(detail.found_params)) return detail.found_params as string[]
    return Object.keys(detail.found_params as Record<string, unknown>)
  }

  function previewVariables(id: string): { key: string; value: unknown }[] {
    const detail = getPreviewDetail(id)
    if (!detail?.preview_variables) return []
    return Object.entries(detail.preview_variables as Record<string, unknown>).map(([key, value]) => ({ key, value }))
  }

  function nestedPreviewTree(id: string): NestedPreviewNode[] {
    const detail = getPreviewDetail(id)
    if (!detail?.steps_preview) return []
    const nodes: NestedPreviewNode[] = []
    const walkStep = (step: Record<string, unknown>, level: number) => {
      const vars = step.preview_variables as Record<string, unknown> | undefined
      const varEntries = vars ? Object.entries(vars).map(([key, value]) => ({ key, value })) : []
      nodes.push({ type: 'step', level, action_id: (step.action_id as string) || '', variables: varEntries })
      const branches = step.branches as Record<string, unknown[]> | undefined
      if (branches) {
        for (const [label, bSteps] of [['True 分支', branches.true], ['False 分支', branches.false]] as const) {
          if (bSteps?.length) { nodes.push({ type: 'label', level: level + 1, variables: [], branchLabel: label }); for (const bs of bSteps) walkStep(bs as Record<string, unknown>, level + 1) }
        }
      }
      const loopPreview = step.loop_preview as Record<string, unknown>[] | undefined
      if (loopPreview?.length) { nodes.push({ type: 'label', level: level + 1, variables: [], branchLabel: '循环体' }); for (const ls of loopPreview) walkStep(ls as Record<string, unknown>, level + 1) }
      const children = step.children as Record<string, unknown>[] | undefined
      if (children) for (const ch of children) walkStep(ch as Record<string, unknown>, level + 1)
    }
    for (const step of (detail.steps_preview as unknown) as Record<string, unknown>[]) walkStep(step, 1)
    return nodes
  }

  function validateMissingParams(id: string): string[] {
    const fb = operationFeedback.value[id]
    if (!fb || fb.kind !== 'validate') return []
    const missing = (fb.detail as Record<string, unknown> | undefined)?.missing_params
    return Array.isArray(missing) ? (missing as string[]) : []
  }

  function validateInvalidParams(id: string): string[] {
    const fb = operationFeedback.value[id]
    if (!fb || fb.kind !== 'validate') return []
    const invalid = (fb.detail as Record<string, unknown> | undefined)?.invalid_params
    return Array.isArray(invalid) ? (invalid as string[]) : []
  }

  function validateErrors(id: string): string[] {
    const fb = operationFeedback.value[id]
    if (!fb || fb.kind !== 'validate') return []
    const errors = (fb.detail as Record<string, unknown> | undefined)?.errors
    return Array.isArray(errors) ? (errors as string[]) : []
  }

  // ── 导出 ─────────────────────────────────────────────
  return {
    operatingId, operatingKind, operationFeedback, executingSelected, branchOperating,
    executeAction, previewAction, validateAction,
    handleExecuteSelected, handleExecuteBranchAll,
    executeBranchItem, previewBranchItem, validateBranchItem,
    setOperationFeedback, closeOperationFeedback,
    execResultSteps, previewReplacedParams, previewFoundParams, previewVariables, nestedPreviewTree,
    validateMissingParams, validateInvalidParams, validateErrors,
  }
}
