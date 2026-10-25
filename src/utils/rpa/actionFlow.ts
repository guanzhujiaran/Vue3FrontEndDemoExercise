import { MarkerType, type Edge, type Node } from '@vue-flow/core'
import type { DroppedItem } from '@/components/rpa-browser/debugbox-types'
import { stepsToDroppedItems } from './jsonImport'

/**
 * 动作「结构流程图」数据生成。
 *
 * 把一个动作的 `steps` 还原成前端可编辑的 `DroppedItem[]`（复用 `stepsToDroppedItems`），
 * 再**手写递归布局**成 VueFlow 的 `nodes / edges`，用于只读展示动作的控制流结构。
 *
 * 布局约定：
 * - 顺序步骤自上而下纵向排布；
 * - `if_else` 的真 / 假分支分别向左 / 向右展开成两列，分支尾部再汇回主干；
 * - `loop` 的循环体向右展开，末节点有一条回边指回循环节点。
 *
 * 只做纯展示，不做拖拽 / 连线 / 选中，无需引入 dagre 等额外布局依赖。
 */

/** 节点尺寸（与 ActionFlowView.vue 里的 .flow-node 视觉尺寸保持一致） */
const NODE_W = 220
const NODE_H = 64

/** 纵向 / 横向间距 */
const GAP_Y = 34
const GAP_X = 56

/** 节点数据类型（配合 ActionFlowView 的 `#node-actionNode` 插槽渲染） */
export interface ActionFlowNodeData {
  name: string
  actionType: string
  actionId: string
  iconSeries?: number
  iconId?: number
  /** 副标题：if_else 的条件摘要 / loop 的循环摘要，其余为空 */
  badge?: string
  kind: 'normal' | 'branch' | 'loop'
}

export interface ActionFlowGraph {
  nodes: Node<ActionFlowNodeData>[]
  edges: Edge[]
  /** 是否有任何节点（全部为空时前端展示空状态） */
  empty: boolean
}

/** 节点 id → 便于调试的稳定前缀 */
let nodeSeq = 0

function nextNodeId(item: DroppedItem): string {
  nodeSeq += 1
  return `n${nodeSeq}`
}

function isIfElse(item: DroppedItem): boolean {
  return item.action_type === 'if_else' || item.action_id === 'if_else'
}

function isLoop(item: DroppedItem): boolean {
  return item.action_type === 'loop' || item.action_id === 'loop'
}

/** 截断过长文案，避免节点被撑爆 */
function clip(text: string, max = 28): string {
  const t = text.trim()
  return t.length > max ? `${t.slice(0, max)}…` : t
}

/** 条件规则 → 一句话摘要（不可解析时回落为提示文案） */
function describeCondition(raw: unknown): string {
  if (raw == null || raw === '') return '未配置条件'
  if (typeof raw === 'string') return clip(raw)
  if (typeof raw !== 'object' || Array.isArray(raw)) return '自定义条件'
  const cond = raw as Record<string, unknown>
  if (typeof cond.description === 'string' && cond.description) return clip(cond.description)
  const single = cond.condition as Record<string, unknown> | undefined
  if (single && typeof single === 'object') {
    const field = String(single.field ?? '')
    const type = String(single.condition_value_type ?? '')
    if (type === 'BOOLEAN') return clip(`${field} ${single.condition_value ? '为真' : '为假'}`)
    if (type === 'NULL') return clip(`${field} 为空`)
    return clip(`${field} = ${String(single.condition_value ?? '')}`)
  }
  const rules = cond.rules as unknown[] | undefined
  if (Array.isArray(rules)) {
    const logic = String(cond.logic ?? 'AND')
    return clip(`${logic} 组合条件（${rules.length} 条）`)
  }
  return '自定义条件'
}

/** if_else 节点副标题：条件摘要 */
function ifElseBadge(item: DroppedItem): string {
  const sp = (item.formData || {}) as Record<string, unknown>
  return describeCondition(sp.condition)
}

/** loop 节点副标题：设置了名称优先展示名称（「在循环干什么」一眼可见），否则给来源摘要 */
function loopBadge(item: DroppedItem): string {
  const cfg = item.loopConfig
  if (!cfg) return '循环'
  const name = cfg.name?.trim()
  if (name) return clip(name)
  switch (cfg.loopSource) {
    case 'fixed_count':
      return clip(`循环 ${cfg.count} 次`)
    case 'variable':
      return clip(`遍历 ${cfg.loopItemsVar || '变量'}`)
    case 'expression':
      return clip(`循环 ${cfg.loopItemsExpr || '表达式'}`)
    case 'json_list':
      return '遍历 JSON 列表'
    default:
      return '循环'
  }
}

function toNodeData(item: DroppedItem): ActionFlowNodeData {
  const detail = item.action_detail as Record<string, unknown> | undefined
  const kind: ActionFlowNodeData['kind'] = isIfElse(item) ? 'branch' : isLoop(item) ? 'loop' : 'normal'
  let badge: string | undefined
  if (kind === 'branch') badge = ifElseBadge(item)
  else if (kind === 'loop') badge = loopBadge(item)
  return {
    name: item.name || item.action_id || '未命名步骤',
    actionType: item.action_type,
    actionId: item.action_id,
    // 内置操作的图标由后端直接下发在 step 上；复合动作回落到 action_detail
    iconSeries: item.icon_series ?? (detail?.icon_series as number | undefined),
    iconId: item.icon_id ?? (detail?.icon_id as number | undefined),
    badge,
    kind,
  }
}

interface LayoutResult {
  nodes: Node<ActionFlowNodeData>[]
  edges: Edge[]
  /** 序列入口节点 id（父节点连到它） */
  entries: string[]
  /** 序列出口节点 id（连向后续节点） */
  exits: string[]
  /** 该子树最低点（y 最大值，含节点高度） */
  bottomY: number
}

let edgeSeq = 0

function makeEdge(source: string, target: string, label?: string, kind: 'forward' | 'loop' = 'forward'): Edge {
  edgeSeq += 1
  return {
    id: `e${edgeSeq}`,
    source,
    target,
    type: 'smoothstep',
    label,
    animated: kind === 'loop',
    markerEnd: MarkerType.ArrowClosed,
    style: kind === 'loop' ? { strokeDasharray: '4 4' } : undefined,
  }
}

/**
 * 递归布局一个步骤序列。
 *
 * @param items  当前层级的步骤
 * @param x      本列中心 x（节点左上角 = x - NODE_W / 2）
 * @param startY 起始 y（节点顶部）
 */
function layoutSequence(items: DroppedItem[], x: number, startY: number): LayoutResult {
  const nodes: Node<ActionFlowNodeData>[] = []
  const edges: Edge[] = []
  let cursorY = startY
  let pending: string[] = []
  let entries: string[] = []
  let first = true

  for (const item of items) {
    const id = nextNodeId(item)
    nodes.push({
      id,
      type: 'actionNode',
      position: { x: x - NODE_W / 2, y: cursorY },
      data: toNodeData(item),
      draggable: false,
      connectable: false,
      selectable: false,
    })

    // 承接上一节点 / 分支尾部
    for (const pid of pending) edges.push(makeEdge(pid, id))
    if (first) {
      entries.push(id)
      first = false
    }
    pending = []

    const nodeBottom = cursorY + NODE_H

    if (isIfElse(item)) {
      const trueItems = item.trueBranch || []
      const falseItems = item.falseBranch || []
      const branchY = nodeBottom + GAP_Y
      const trueRes = trueItems.length
        ? layoutSequence(trueItems, x - (NODE_W + GAP_X), branchY)
        : null
      const falseRes = falseItems.length
        ? layoutSequence(falseItems, x + (NODE_W + GAP_X), branchY)
        : null

      if (trueRes) {
        nodes.push(...trueRes.nodes)
        edges.push(...trueRes.edges)
        edges.push(makeEdge(id, trueRes.entries[0], '是'))
      }
      if (falseRes) {
        nodes.push(...falseRes.nodes)
        edges.push(...falseRes.edges)
        edges.push(makeEdge(id, falseRes.entries[0], '否'))
      }

      // 出口：分支尾部；空分支直接由 if 节点承接
      const exits: string[] = []
      if (trueRes) exits.push(...trueRes.exits)
      else exits.push(id)
      if (falseRes) exits.push(...falseRes.exits)
      else exits.push(id)
      pending = [...new Set(exits)]
      cursorY = Math.max(trueRes?.bottomY ?? nodeBottom, falseRes?.bottomY ?? nodeBottom) + GAP_Y
    } else if (isLoop(item)) {
      const body = item.loopBody || []
      const bodyY = nodeBottom + GAP_Y
      const bodyRes = body.length
        ? layoutSequence(body, x + (NODE_W + GAP_X), bodyY)
        : null
      if (bodyRes) {
        nodes.push(...bodyRes.nodes)
        edges.push(...bodyRes.edges)
        edges.push(makeEdge(id, bodyRes.entries[0], '循环体'))
        for (const ex of bodyRes.exits) edges.push(makeEdge(ex, id, undefined, 'loop'))
      }
      pending = [id]
      cursorY = (bodyRes?.bottomY ?? nodeBottom) + GAP_Y
    } else {
      pending = [id]
      cursorY = nodeBottom + GAP_Y
    }
  }

  const bottomY = nodes.reduce((max, n) => Math.max(max, n.position.y + NODE_H), startY)
  return { nodes, edges, entries, exits: pending, bottomY }
}

/**
 * 后端 steps → VueFlow 图数据。
 *
 * @param steps 动作详情里的 `steps` 字段（原始 JSON）
 */
export function stepsToFlow(steps: Record<string, unknown>[] | null | undefined): ActionFlowGraph {
  if (!Array.isArray(steps) || steps.length === 0) {
    return { nodes: [], edges: [], empty: true }
  }
  nodeSeq = 0
  edgeSeq = 0
  const items = stepsToDroppedItems(steps)
  if (items.length === 0) {
    return { nodes: [], edges: [], empty: true }
  }
  const result = layoutSequence(items, 0, 0)
  return { nodes: result.nodes, edges: result.edges, empty: false }
}
