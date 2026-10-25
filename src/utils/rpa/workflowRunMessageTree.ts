import type { WorkflowRunLogEvent } from '@/api/browser/workflow_run_api'

/**
 * 运行消息树构建（按循环分组）。
 *
 * 后端打印是**全量扁平**的事件流（循环体内每层都发、带 `depth`），前端把它还原成
 * 「循环里套循环」的树：
 * - `loop_iteration` 开一个分组节点，同层的后续消息成为它的子节点；
 * - 更深的 `loop_iteration` 挂到当前分组节点下，形成嵌套分组；
 * - `loop_finished` 收口所属分组（不再单列一行，文案收进分组状态）。
 *
 * 渲染策略是「焦点轮次」：任意时刻只完整渲染当前轮次（activeKey）及其祖先链，
 * 同层/外层的其余轮次由 `buildBodyRows` 折叠成一条占位行，不产生 DOM——
 * 消息上千条时面板也不会卡（详见 `WorkflowRunMessageDock`）。
 */

export interface LoopNode {
  type: 'loop'
  /** 行唯一 key：`${run_id}-${seq}` */
  key: string
  seq: number
  /** 循环嵌套深度（与后端 `depth` 一致：1=最外层循环体，2=再内一层……） */
  depth: number
  head: WorkflowRunLogEvent
  roundIndex: number
  roundTotal: number
  loopName: string
  children: MessageNode[]
  /** 直接子项条数（不含更深分组） */
  itemCount: number
  /** 含全部后代的累计条数 */
  totalCount: number
  /** 含全部后代的失败条数 */
  failedCount: number
  /** `loop_finished` 的文案（未收口时为空串） */
  tailText: string
  closed: boolean
  firstTs: number
  lastTs: number
  /** 祖先分组 key（由外到内），跳转时用于一次性展开整条链 */
  chain: string[]
  /** 父分组 key（顶层分组为空串），供「上一轮/下一轮」取同层兄弟 */
  parentKey: string
}

export interface ItemNode {
  type: 'item'
  key: string
  event: WorkflowRunLogEvent
}

export type MessageNode = LoopNode | ItemNode

/** 「快速定位轮次」下拉选项 */
export interface RoundOption {
  key: string
  label: string
}

const LOOP_FALLBACK_NAME = '循环'

export function rowKeyOf(event: WorkflowRunLogEvent): string {
  return `${event.run_id}-${event.seq}`
}

export function depthOf(event: WorkflowRunLogEvent): number {
  return typeof event.depth === 'number' ? event.depth : 0
}

/** 轮次徽标文案：可预知总数时 `3/40`，条件循环时只显示 `3` */
export function roundText(index: number, total: number): string {
  if (index <= 0) return '第 ? 轮'
  return total > 0 ? `第 ${index}/${total} 轮` : `第 ${index} 轮`
}

export function buildMessageTree(events: WorkflowRunLogEvent[]): MessageNode[] {
  const roots: MessageNode[] = []
  const stack: LoopNode[] = []

  for (const event of events) {
    const depth = depthOf(event)

    if (event.kind === 'loop_iteration') {
      // 同层或更浅的新轮次到来：先把更深的旧分组出栈。
      // 没有收到 `loop_finished` 也视为已结束——新一轮开始即证明上一轮跑完了，
      // 否则上一次循环会永远停在「未收口」。
      while (stack.length > 0 && stack[stack.length - 1]!.depth >= depth) {
        stack.pop()!.closed = true
      }
      const node: LoopNode = {
        type: 'loop',
        key: rowKeyOf(event),
        seq: event.seq,
        depth,
        head: event,
        roundIndex: event.loop_index ?? 0,
        roundTotal: event.loop_total ?? 0,
        loopName: event.action_name || LOOP_FALLBACK_NAME,
        children: [],
        itemCount: 0,
        totalCount: 0,
        failedCount: 0,
        tailText: '',
        closed: false,
        firstTs: event.ts,
        lastTs: event.ts,
        chain: stack.map(item => item.key),
        parentKey: stack[stack.length - 1]?.key ?? '',
      }
      const parent = stack[stack.length - 1]
      if (parent) parent.children.push(node)
      else roots.push(node)
      stack.push(node)
      continue
    }

    if (event.kind === 'loop_finished') {
      while (stack.length > 0 && stack[stack.length - 1]!.depth >= depth) {
        const closed = stack.pop()!
        closed.closed = true
        closed.tailText = event.text
        closed.lastTs = Math.max(closed.lastTs, event.ts)
      }
      continue
    }

    const item: ItemNode = { type: 'item', key: rowKeyOf(event), event }
    const parent = stack[stack.length - 1]
    if (parent) {
      parent.itemCount += 1
      parent.lastTs = Math.max(parent.lastTs, event.ts)
    }
    if (parent) parent.children.push(item)
    else roots.push(item)
  }

  aggregate(roots)
  return roots
}

/** 自底向上汇总每个分组的条数与失败数（折叠时也要能看出内部有多少内容/失败） */
function aggregate(nodes: MessageNode[]): { count: number; failed: number } {
  let count = 0
  let failed = 0
  for (const node of nodes) {
    if (node.type === 'item') {
      count += 1
      if (node.event.success === false) failed += 1
      continue
    }
    const inner = aggregate(node.children)
    node.totalCount = inner.count
    node.failedCount = inner.failed
    count += inner.count
    failed += inner.failed
  }
  return { count, failed }
}

/** 先序收集全部分组节点（执行顺序 = 展开后的显示顺序） */
export function collectLoopNodes(nodes: MessageNode[], result: LoopNode[] = []): LoopNode[] {
  for (const node of nodes) {
    if (node.type !== 'loop') continue
    result.push(node)
    collectLoopNodes(node.children, result)
  }
  return result
}

/** 定位用的扁平轮次列表；嵌套层级用 `›` 前缀表达 */
export function flattenRoundOptions(nodes: MessageNode[]): RoundOption[] {
  return collectLoopNodes(nodes).map(node => {
    const indent = '› '.repeat(Math.max(node.depth - 1, 0))
    return {
      key: node.key,
      label: `${indent}${roundText(node.roundIndex, node.roundTotal)} · ${node.loopName}`,
    }
  })
}

/**
 * 分组「复制本轮」的文本导出：该轮**及其所有嵌套子轮**的消息按时间顺序展平成纯文本。
 *
 * 结构上与界面一致（分组头 → 组内消息 → 更深的分组），失败行额外带 `detail` 与
 * `error`，方便直接贴出去定位问题。
 */
export function groupText(node: LoopNode, indent = ''): string {
  const body = indent + '  '
  const lines: string[] = []
  const status = node.closed
    ? node.failedCount > 0
      ? `${node.failedCount} 失败`
      : '已完成'
    : '运行中'
  lines.push(
    `${indent}● ${roundText(node.roundIndex, node.roundTotal)} · ${node.loopName}` +
      `｜${node.totalCount} 条｜${status}`
  )

  for (const child of node.children) {
    if (child.type === 'loop') {
      lines.push(groupText(child, body))
      continue
    }
    const event = child.event
    const level = String(event.level || 'info').toUpperCase()
    lines.push(`${body}${formatTs(event.ts)} [${level}] ${event.text}`)
    if (event.detail) lines.push(`${body}  detail: ${event.detail}`)
    if (event.error) lines.push(`${body}  error: ${event.error}`)
  }

  if (node.tailText) lines.push(`${body}${node.tailText}`)
  return lines.join('\n')
}

/** 事件时间戳（秒 → `HH:MM:SS`），与消息行展示格式一致 */
export function formatTs(ts: number): string {
  if (!ts) return '--:--:--'
  return new Date(ts * 1000).toLocaleTimeString('zh-CN', { hour12: false })
}

/** ── 焦点轮次（「一次只显示一个 loop」的渲染窗口） ── */

/** 先序查找分组节点 */
export function findLoopNode(nodes: MessageNode[], key: string): LoopNode | null {
  if (!key) return null
  for (const node of nodes) {
    if (node.type !== 'loop') continue
    if (node.key === key) return node
    const inner = findLoopNode(node.children, key)
    if (inner) return inner
  }
  return null
}

/**
 * 焦点分组到根的 key 链（含自身）：只有链上的分组会被完整渲染，
 * 其余分组折叠成占位行（见 `buildBodyRows`）。
 */
export function pathKeysOf(nodes: MessageNode[], key: string): Set<string> {
  const node = findLoopNode(nodes, key)
  if (!node) return new Set()
  return new Set([...node.chain, node.key])
}

/** 焦点分组定位结果：节点本身 + 同父分组下的循环分组（执行顺序） */
export interface LoopLocation {
  node: LoopNode
  siblings: LoopNode[]
}

/** 定位焦点分组，并给出同层兄弟轮次（供「上一轮 / 下一轮」使用） */
export function locateLoopNode(nodes: MessageNode[], key: string): LoopLocation | null {
  const node = findLoopNode(nodes, key)
  if (!node) return null
  const pool = node.parentKey
    ? findLoopNode(nodes, node.parentKey)?.children ?? []
    : nodes
  return { node, siblings: pool.filter((child): child is LoopNode => child.type === 'loop') }
}

/** 分组体内的一行渲染内容：消息 / 路径上的子分组 / 被折叠轮次的占位行 */
export type BodyRow =
  | { kind: 'item'; key: string; event: WorkflowRunLogEvent }
  | { kind: 'loop'; key: string; node: LoopNode }
  | { kind: 'hidden'; key: string; count: number; focusKey: string }

/**
 * 把分组子节点压成渲染行：路径上的子分组原样渲染，**不在路径上的循环分组
 * 连续折叠成一条占位行**（`· N 轮已折叠`，点击跳到离路径最近的那一轮）。
 *
 * 这就是「类虚拟滚动」的核心：一轮跑几百个轮次时，DOM 里只有当前轮次
 * （及其祖先链）的内容，其余轮次不产生任何元素。
 */
export function buildBodyRows(children: MessageNode[], pathKeys: Set<string>): BodyRow[] {
  const rows: BodyRow[] = []
  /** 连续的一段被折叠轮次（位置相邻才合并成一条占位行） */
  let hiddenRun: LoopNode[] = []
  /** 是否已经渲染过路径上的子分组（决定占位行点击时跳「前一段的最后一轮」还是「后一段的第一轮」） */
  let passedPath = false

  function flushHidden() {
    if (hiddenRun.length === 0) return
    const nearest = passedPath ? hiddenRun[0]! : hiddenRun[hiddenRun.length - 1]!
    rows.push({
      kind: 'hidden',
      key: `hidden-${nearest.key}`,
      count: hiddenRun.length,
      focusKey: nearest.key,
    })
    hiddenRun = []
  }

  for (const child of children) {
    if (child.type === 'loop' && !pathKeys.has(child.key)) {
      hiddenRun.push(child)
      continue
    }
    flushHidden()
    if (child.type === 'loop') {
      passedPath = true
      rows.push({ kind: 'loop', key: child.key, node: child })
    } else {
      rows.push({ kind: 'item', key: child.key, event: child.event })
    }
  }
  flushHidden()
  return rows
}
