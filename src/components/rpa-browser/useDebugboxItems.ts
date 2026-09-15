import { ref, watch, onMounted } from 'vue'
import type { DroppedItem, BranchPathStep } from './debugbox-types'
import { genItemId } from './debugbox-types'
import { 自定义操作管理Service } from '@/api/browser/hey-api'
import { useUserNavStore } from '@/stores/user_nav'

/** 内部拖拽来源位置（已有的卡片被拖拽时） */
export interface DragSourceMain { container: 'main'; index: number }
export interface DragSourceBranch { container: 'branch'; parentIndex: number; branch: 'true' | 'false' | 'loop'; index: number; path?: BranchPathStep[] }
export type DragSource = DragSourceMain | DragSourceBranch

export function useDebugboxItems(browserId: string, editMode: boolean, initialSteps?: DroppedItem[]) {
  // ── 状态 ─────────────────────────────────────────────
  const droppedItems = ref<DroppedItem[]>([])
  const dragOverIndex = ref<number | null>(null)
  /** 正在拖拽的已有卡片来源（用于跨容器移动） */
  const dragSource = ref<DragSource | null>(null)
  /** 展开状态以 item.id 为 key，避免重排序后状态错位 */
  const expandedItems = ref<Set<string>>(new Set())
  const branchCollapseState = ref<Record<string, string[]>>({})
  /** if_else 激活 tab 以 item.id 为 key */
  const ifElseActiveTab = ref<Record<string, 'true' | 'false'>>({})

  /**
   * 规范化条目树：保证每个条目（含分支内嵌条目）都有全局唯一的 id。
   *
   * 历史 localStorage 暂存 / 外部传入的 initialSteps 可能缺 id 或 id 重复，
   * 而 v-for 的 :key 重复会让 Vue 在 patch 时拿不到正确的 DOM 锚点，
   * 典型报错：`Cannot read properties of null (reading 'nextSibling')`。
   */
  function normalizeItems(items: DroppedItem[], seen: Set<string> = new Set()): DroppedItem[] {
    for (const item of items) {
      if (!item) continue
      if (typeof item.id !== 'string' || !item.id || seen.has(item.id)) {
        item.id = genItemId(String(item.action_id || item.action_type || 'item'))
      }
      seen.add(item.id)
      initBranchForItem(item)
      if (item.trueBranch) normalizeItems(item.trueBranch, seen)
      if (item.falseBranch) normalizeItems(item.falseBranch, seen)
      if (item.loopBody) normalizeItems(item.loopBody, seen)
    }
    return items
  }

  // ── 初始化分支 ───────────────────────────────────────
  function initBranchForItem(item: DroppedItem) {
    if (item.action_type === 'if_else' || item.action_id === 'if_else') {
      if (!item.trueBranch) item.trueBranch = []
      if (!item.falseBranch) item.falseBranch = []
    } else if (item.action_type === 'loop' || item.action_id === 'loop') {
      if (!item.loopBody) item.loopBody = []
    }
  }

  // ── 拖拽：主区域 ─────────────────────────────────────
  // dragover 仅用 Vue .prevent 修饰符阻止默认行为（允许 drop），无需自定义函数
  // 插入位置由 handleItemDragEnter 在进入条目时计算（dragenter 只触发一次，不会高频触发）

  /** 从来源位置移除条目并返回（支持嵌套分支路径） */
  function removeFromSource(source: DragSource): DroppedItem | null {
    if (source.container === 'main') {
      if (source.index < 0 || source.index >= droppedItems.value.length) return null
      return droppedItems.value.splice(source.index, 1)[0] ?? null
    }
    // 遍历嵌套 path 找到源条目所在的容器数组
    let current: DroppedItem[] = droppedItems.value
    if (source.path) {
      for (const step of source.path) {
        const parent = current[step.parentIndex]
        if (!parent) return null
        current = step.branch === 'true' ? (parent.trueBranch || []) :
                  step.branch === 'false' ? (parent.falseBranch || []) :
                  (parent.loopBody || [])
      }
    }
    const parent = current[source.parentIndex]
    if (!parent) return null
    const arr = source.branch === 'true' ? parent.trueBranch : source.branch === 'false' ? parent.falseBranch : parent.loopBody
    if (!arr || source.index < 0 || source.index >= arr.length) return null
    return arr.splice(source.index, 1)[0] ?? null
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault()

    // 优先使用 dragSource ref（主列表内部拖拽到容器空白区）
    if (dragSource.value) {
      const src = dragSource.value
      const item = removeFromSource(src)
      if (!item) { dragOverIndex.value = null; dragSource.value = null; return }
      let insertAt = dragOverIndex.value ?? droppedItems.value.length
      if (src.container === 'main' && src.index < insertAt) insertAt--
      droppedItems.value.splice(insertAt, 0, item)
      dragOverIndex.value = null
      dragSource.value = null
      return
    }

    // dataTransfer 路径：工具箱 或 分支 → 主列表
    if (!event.dataTransfer) return
    try {
      const rawData = getDragJSON(event)
      if (!rawData) return
      const parsed = JSON.parse(rawData)

      if (parsed.__dragType === 'card') {
        const src = parsed.source as DragSource
        const item = removeFromSource(src)
        if (!item) return
        let insertAt = dragOverIndex.value ?? droppedItems.value.length
        droppedItems.value.splice(insertAt, 0, item)
        dragOverIndex.value = null
        dragSource.value = null
        return
      }

      // 工具箱新条目
      const item = parsed as DroppedItem
      const newItem: DroppedItem = {
        ...item,
        id: genItemId(String(item.action_id || item.action_type || 'item')),
        name: item.name || item.label || item.json_schema?.title || item.action_id || item.action_type || '未命名',
        action_id: item.action_id || item.action_type || 'custom',
        action_type: item.action_type || item.action_id || 'custom',
        description: item.description || item.json_schema?.description,
        type: item.type || 'action',
        json_schema: item.json_schema,
        config_params: item.config_params,
        input_vars: item.input_vars,
        output_vars: item.output_vars,
        step_children: item.step_children,
        // 展示图标（内置操作由后端分配；不参与步骤序列化，仅供渲染）
        icon_series: item.icon_series,
        icon_id: item.icon_id,
        formData: { ...(item.formData || {}) },
      }
      initBranchForItem(newItem)
      if (newItem.action_type === 'if_else' || newItem.action_id === 'if_else') {
        delete (newItem.formData as Record<string, unknown>).condition
        delete (newItem.formData as Record<string, unknown>).TrueBranch
        delete (newItem.formData as Record<string, unknown>).FalseBranch
      }
      const insertAt = dragOverIndex.value ?? droppedItems.value.length
      droppedItems.value.splice(insertAt, 0, newItem)
    } catch (error) {
      console.error('Failed to parse dropped data:', error)
    }
    dragOverIndex.value = null
    dragSource.value = null
  }

  // ── 拖拽：条目间排序 ─────────────────────────────────
  /** 统一提取 drop 数据（text/plain 在 drop 阶段普遍可用） */
  function getDragJSON(event: DragEvent): string {
    return event.dataTransfer?.getData('text/plain') || event.dataTransfer?.getData('application/json') || ''
  }

  function handleItemDragStart(event: DragEvent, index: number) {
    const item = droppedItems.value[index]
    if (!item || !event.dataTransfer) return
    dragSource.value = { container: 'main', index }
    dragOverIndex.value = index
    event.dataTransfer.effectAllowed = 'move'
    const json = JSON.stringify({ __dragType: 'card', source: dragSource.value })
    event.dataTransfer.setData('text/plain', json)
    event.dataTransfer.setData('application/json', json)
  }

  /** 条目 dragenter：仅在鼠标进入条目时触发一次（不会像 dragover 那样高频触发），
   *  计算插入位置并更新指示线 */
  function handleItemDragEnter(event: DragEvent, index: number) {
    const dt = event.dataTransfer
    if (!dt) return
    if (!dt.types.includes('text/plain') && !dt.types.includes('application/json') && !dragSource.value) return
    dt.dropEffect = dragSource.value ? 'move' : 'copy'
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    const newInsertAt = event.clientY < rect.top + rect.height / 2 ? index : index + 1
    if (dragOverIndex.value !== newInsertAt) {
      dragOverIndex.value = newInsertAt
    }
  }
  function handleItemDragEnd() { dragOverIndex.value = null; dragSource.value = null }

  /** 根据鼠标 Y 坐标在所有 data-drag-item 中确定插入索引 */
  function computeInsertAt(clientY: number, container: HTMLElement): number {
    const items = Array.from(container.querySelectorAll('[data-drag-item]')) as HTMLElement[]
    for (let i = 0; i < items.length; i++) {
      const rect = items[i].getBoundingClientRect()
      if (clientY < rect.top + rect.height / 2) return i
    }
    return droppedItems.value.length
  }

  function handleItemDrop(event: DragEvent, targetIndex: number) {
    event.preventDefault()

    if (dragSource.value) {
      const src = dragSource.value
      const item = removeFromSource(src)
      if (!item) { dragOverIndex.value = null; dragSource.value = null; return }

      // 在列表容器中扫描所有卡片位置来确定插入索引（而非依赖 template 的 targetIndex）
      const listEl = (event.currentTarget as HTMLElement).closest('.space-y-3') as HTMLElement | null
      let insertAt = listEl ? computeInsertAt(event.clientY, listEl) : targetIndex

      if (src.container === 'main' && src.index < insertAt) insertAt--
      droppedItems.value.splice(insertAt, 0, item)
      dragOverIndex.value = null
      dragSource.value = null
      return
    }

    // dataTransfer 路径：分支 → 主列表 或 工具箱
    if (event.dataTransfer) {
      try {
        const rawData = getDragJSON(event)
        if (rawData) {
          const parsed = JSON.parse(rawData)
          if (parsed.__dragType === 'card') {
            const src = parsed.source as DragSource
            const item = removeFromSource(src)
            if (!item) { dragOverIndex.value = null; dragSource.value = null; return }
            const listEl = (event.currentTarget as HTMLElement).closest('.space-y-3') as HTMLElement | null
            const insertAt = listEl ? computeInsertAt(event.clientY, listEl) : targetIndex
            droppedItems.value.splice(insertAt, 0, item)
            dragOverIndex.value = null
            dragSource.value = null
            return
          }
          return
        }
      } catch { /* 格式异常，忽略 */ }
    }

    dragOverIndex.value = null
    dragSource.value = null
  }

  // ── 拖拽：分支区域 ───────────────────────────────────
  /** 处理拖入分支（工具箱或跨容器卡片） */
  function handleBranchDrop(event: DragEvent, parentIndex: number, branch: 'true' | 'false' | 'loop', insertIndex?: number) {
    event.preventDefault()
    event.stopPropagation()
    const item = droppedItems.value[parentIndex]
    if (!item) return
    initBranchForItem(item)

    const targetBranch = branch === 'true' ? item.trueBranch! : branch === 'false' ? item.falseBranch! : item.loopBody!
    if (!event.dataTransfer) return

    try {
      const rawData = getDragJSON(event)
      if (!rawData) return
      const parsed = JSON.parse(rawData)

      // 跨容器 / 同分支卡片拖拽
      if (parsed.__dragType === 'card') {
        const src = parsed.source as DragSource
        const moved = removeFromSource(src)
        if (!moved) { dragOverIndex.value = null; dragSource.value = null; return }
        let at = insertIndex ?? targetBranch.length
        // 同分支（非嵌套）拖拽时源移除后目标索引偏移修正
        if (src.container === 'branch' && (!src.path || src.path.length === 0) && src.parentIndex === parentIndex && src.branch === branch && src.index < at) {
          at--
        }
        targetBranch.splice(at, 0, moved)
        dragOverIndex.value = null
        dragSource.value = null
        return
      }

      // 工具箱新条目
      const draggedItem = parsed as DroppedItem
      const at = insertIndex ?? targetBranch.length
      targetBranch.splice(at, 0, {
        ...draggedItem,
        id: genItemId(String(draggedItem.action_id || draggedItem.action_type || 'item')),
        name: draggedItem.name || draggedItem.label || draggedItem.json_schema?.title || draggedItem.action_id || draggedItem.action_type || '未命名',
        action_id: draggedItem.action_id || draggedItem.action_type || 'custom',
        action_type: draggedItem.action_type || draggedItem.action_id || 'custom',
        description: draggedItem.description || draggedItem.json_schema?.description,
        type: draggedItem.type || 'action',
        json_schema: draggedItem.json_schema,
        config_params: draggedItem.config_params,
        input_vars: draggedItem.input_vars,
        output_vars: draggedItem.output_vars,
        icon_series: draggedItem.icon_series,
        icon_id: draggedItem.icon_id,
        formData: { ...(draggedItem.formData || {}) },
      })
    } catch (error) {
      console.error('Failed to parse branch drop data:', error)
    }
    dragOverIndex.value = null
    dragSource.value = null
  }

  // ── 分支 CRUD ────────────────────────────────────────
  function removeBranchItem(parentIndex: number, branch: 'true' | 'false' | 'loop', childIndex: number) {
    const item = droppedItems.value[parentIndex]
    if (!item) return
    const targetBranch = branch === 'true' ? item.trueBranch : branch === 'false' ? item.falseBranch : item.loopBody
    if (targetBranch) targetBranch.splice(childIndex, 1)
  }

  function reorderBranchItem(parentIndex: number, branch: 'true' | 'false' | 'loop', from: number, to: number) {
    const item = droppedItems.value[parentIndex]
    if (!item) return
    const targetBranch = branch === 'true' ? item.trueBranch : branch === 'false' ? item.falseBranch : item.loopBody
    if (!targetBranch || from >= targetBranch.length || to >= targetBranch.length) return
    const [moved] = targetBranch.splice(from, 1)
    targetBranch.splice(to, 0, moved)
  }

  // ── 主列表 CRUD ──────────────────────────────────────
  function toggleExpand(index: number) {
    const item = droppedItems.value[index]
    if (!item) return
    if (expandedItems.value.has(item.id)) {
      expandedItems.value.delete(item.id)
    } else {
      expandedItems.value.add(item.id)
      if (!item.formData) item.formData = {}
    }
  }

  function toggleExpandAll() {
    expandedItems.value = expandedItems.value.size === 0
      ? new Set(droppedItems.value.map(i => i.id))
      : new Set()
  }

  // 分支内卡片展开/收起
  function toggleBranchExpand(parentIndex: number, branch: string, childIndex: number) {
    const parent = droppedItems.value[parentIndex]
    const targetBranch = branch === 'true' ? parent?.trueBranch : branch === 'false' ? parent?.falseBranch : parent?.loopBody
    const child = targetBranch?.[childIndex]
    if (!child) return
    if (expandedItems.value.has(child.id)) {
      expandedItems.value.delete(child.id)
    } else {
      expandedItems.value.add(child.id)
      // 确保 formData 存在
      if (!child.formData) child.formData = {}
    }
  }

  function removeItem(index: number) {
    const item = droppedItems.value[index]
    if (item) expandedItems.value.delete(item.id)
    droppedItems.value.splice(index, 1)
  }

  // ── 序列化 ───────────────────────────────────────────

  /** 将 LoopConfig 转换为后端 params 字段 */
  function serializeLoopConfig(item: DroppedItem): Record<string, unknown> {
    const lc = item.loopConfig
    if (!lc) return {}
    const mapping: Record<string, string> = {}
    if (lc.paramMapping?.length) {
      for (const m of lc.paramMapping) {
        if (m.targetParam && m.sourcePath) {
          mapping[m.targetParam] = m.sourcePath
        }
      }
    }
    const result: Record<string, unknown> = {
      loop_source: lc.loopSource,
      count: lc.count,
      loop_items_var: lc.loopItemsVar || undefined,
      loop_item_var: lc.loopItemVar || 'loop_item',
      loop_index_var: lc.loopIndexVar || 'loop_index',
      param_mapping: Object.keys(mapping).length > 0 ? mapping : undefined,
      break_condition: lc.breakCondition ?? undefined,
      continue_condition: lc.continueCondition ?? undefined,
    }
    // json_list 模式：解析 JSON 字符串为列表传给后端
    if (lc.loopSource === 'json_list' && lc.loopItemsJson?.trim()) {
      try {
        const parsed = JSON.parse(lc.loopItemsJson)
        if (Array.isArray(parsed)) {
          result.loop_items_json = parsed
        }
      } catch { /* JSON 解析失败则忽略，后端会报错 */ }
    }
    return result
  }

  function serializeBranchSteps(items: DroppedItem[]): Record<string, unknown>[] {
    return items.map(item => {
      const step: Record<string, unknown> = {
        action_id: item.action_id,
        action_type: item.action_type || item.action_id,
        params: { ...(item.formData || {}), ...(item.config_params || {}) },
        input_vars: item.input_vars || {},
        output_vars: item.output_vars || [],
      }
      if (item.trueBranch?.length) (step.params as Record<string, unknown>).TrueBranch = serializeBranchSteps(item.trueBranch)
      if (item.falseBranch?.length) (step.params as Record<string, unknown>).FalseBranch = serializeBranchSteps(item.falseBranch)
      if (item.loopBody?.length) (step.params as Record<string, unknown>).loopBranch = serializeBranchSteps(item.loopBody)
      // 序列化循环配置
      if (item.action_type === 'loop' || item.action_id === 'loop') {
        Object.assign(step.params as Record<string, unknown>, serializeLoopConfig(item))
      }
      return step
    })
  }

  function getActionParams(item: DroppedItem): Record<string, unknown> {
    const params: Record<string, unknown> = { ...(item.formData || {}) }
    for (const [key, value] of Object.entries(params)) {
      if (value === '') { delete params[key]; continue }
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        if (key === 'condition' && (item.action_type === 'if_else' || item.action_id === 'if_else')) continue
        const allNull = Object.values(value).every(v => v === null || v === undefined || v === '')
        if (allNull) { delete params[key]; continue }
        for (const [sk, sv] of Object.entries(value)) {
          if (sv === '' || sv === null || sv === undefined) delete (value as Record<string, unknown>)[sk]
        }
      }
    }
    if (item.config_params) Object.assign(params, item.config_params)
    if (item.trueBranch?.length) params.TrueBranch = serializeBranchSteps(item.trueBranch)
    if (item.falseBranch?.length) params.FalseBranch = serializeBranchSteps(item.falseBranch)
    if (item.loopBody?.length) params.loopBranch = serializeBranchSteps(item.loopBody)
    // 序列化循环配置
    if (item.action_type === 'loop' || item.action_id === 'loop') {
      Object.assign(params, serializeLoopConfig(item))
    }
    return params
  }

  function getInputVars(item: DroppedItem): Record<string, unknown> { return item.input_vars || {} }
  function getOutputVars(item: DroppedItem): string[] { return item.output_vars || [] }
  function getStepChildren(item: DroppedItem): Record<string, unknown>[] | null { return item.step_children || null }

  function getSteps() {
    return droppedItems.value.map(item => {
      const step: Record<string, unknown> = {
        action_id: item.action_id,
        action_type: item.action_type || item.action_id,
        params: { ...item.formData, ...item.config_params },
        input_vars: item.input_vars || {},
        output_vars: item.output_vars || [],
      }
      if (item.trueBranch?.length) (step.params as Record<string, unknown>).TrueBranch = serializeBranchSteps(item.trueBranch)
      if (item.falseBranch?.length) (step.params as Record<string, unknown>).FalseBranch = serializeBranchSteps(item.falseBranch)
      if (item.loopBody?.length) (step.params as Record<string, unknown>).loopBranch = serializeBranchSteps(item.loopBody)
      // 序列化循环配置
      if (item.action_type === 'loop' || item.action_id === 'loop') {
        Object.assign(step.params as Record<string, unknown>, serializeLoopConfig(item))
      }
      if (item.step_children?.length) step.step_children = item.step_children
      return step
    })
  }

  // ── 暂存 ─────────────────────────────────────────────
  const DRAFT_KEY = `stream_draft_${browserId}`

  function loadDraft(): DroppedItem[] | null {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed as DroppedItem[]
      }
    } catch (e) { console.error('加载暂存数据失败:', e) }
    return null
  }

  function saveDraft(items: DroppedItem[]) {
    try {
      items.length > 0 ? localStorage.setItem(DRAFT_KEY, JSON.stringify(items)) : localStorage.removeItem(DRAFT_KEY)
    } catch (e) { console.error('保存暂存数据失败:', e) }
  }

  function clearDraft() {
    try { localStorage.removeItem(DRAFT_KEY) } catch (e) { console.error('清空暂存数据失败:', e) }
  }

  // ── 刷新 registered action 定义 ─────────────────────
  const userNavStore = useUserNavStore()

  /** 拉取服务器端 registered action 定义，用最新 json_schema 刷新缓存 items（递归处理分支） */
  async function refreshRegisteredSchemas(items: DroppedItem[]) {
    try {
      const res = await 自定义操作管理Service.listRegisteredActionsApiV1RpaBrowserControlActionsRegisteredPost({ headers: userNavStore.user_header })
      if (res?.code !== 0 || !res?.data) return
      const schemaMap = new Map<string, DroppedItem['json_schema']>()
      for (const a of (res.data as unknown[]) || []) {
        const meta = a as Record<string, unknown>
        const id = meta.action_id
        if (typeof id === 'string' && meta.json_schema) {
          schemaMap.set(id, meta.json_schema as DroppedItem['json_schema'])
        }
      }
      if (schemaMap.size === 0) return
      const apply = (list: DroppedItem[]) => {
        for (const item of list) {
          const schema = schemaMap.get(item.action_id) || schemaMap.get(item.action_type)
          if (schema) item.json_schema = schema
          if (item.trueBranch?.length) apply(item.trueBranch)
          if (item.falseBranch?.length) apply(item.falseBranch)
          if (item.loopBody?.length) apply(item.loopBody)
        }
      }
      apply(items)
    } catch (e) {
      console.error('刷新 registered action 定义失败:', e)
    }
  }

  // ── 生命周期 ─────────────────────────────────────────
  onMounted(() => {
    if (initialSteps && initialSteps.length > 0) {
      droppedItems.value = normalizeItems(initialSteps.map(item => ({ ...item })))
      return
    }
    const draft = loadDraft()
    if (draft) {
      // 规范化：修复历史暂存里缺失 / 重复的 id，避免 v-for key 冲突
      droppedItems.value = normalizeItems(draft)
      void refreshRegisteredSchemas(droppedItems.value)
    }
  })

  watch(droppedItems, (items) => {
    if (!editMode) saveDraft(items)
  }, { deep: true })

  // ── 导出 ─────────────────────────────────────────────
  return {
    droppedItems, dragOverIndex, dragSource, expandedItems,
    branchCollapseState, ifElseActiveTab,
    initBranchForItem,
    handleDrop,
    handleItemDragStart, handleItemDragEnter, handleItemDragEnd, handleItemDrop,
    handleBranchDrop,
    removeBranchItem, reorderBranchItem,
    toggleExpand, toggleExpandAll, toggleBranchExpand, removeItem,
    serializeBranchSteps, getActionParams, getInputVars, getOutputVars, getStepChildren, getSteps,
    loadDraft, saveDraft, clearDraft,
  }
}
