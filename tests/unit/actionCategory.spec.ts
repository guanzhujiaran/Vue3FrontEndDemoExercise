/**
 * 内置动作「分类 + 检索」纯逻辑单测
 *
 * 规格见 RPA-Browser/docs/frontend_requirements/动作分类与检索.md
 * 覆盖：分类映射完备性、兜底规则、打分权重、分组树构建、常用分组、降级容错
 */
import { describe, expect, it } from 'vitest'
import {
  ACTION_CATEGORIES,
  ACTION_CATEGORY_MAP,
  ACTION_DISPLAY_NAME,
  RECENT_CATEGORY_ID,
  buildActionTree,
  clearActionUsage,
  compareActions,
  defaultExpandedGroupIds,
  normalizeQuery,
  readActionUsage,
  recentActionIds,
  recordActionUsage,
  resolveActionCategory,
  resolveActionDisplayName,
  scoreAction,
  type ActionMetaLike,
  type ActionUsageMap,
} from '@/utils/rpa/actionCategory'

const ALL_ACTION_IDS = Object.keys(ACTION_CATEGORY_MAP)

function meta(actionId: string, name?: string, description?: string): ActionMetaLike {
  return {
    action_id: actionId,
    name: name ?? ACTION_DISPLAY_NAME[actionId as keyof typeof ACTION_DISPLAY_NAME],
    description: description ?? null,
  }
}

describe('分类映射', () => {
  it('覆盖全部 31 个内置动作', () => {
    expect(ALL_ACTION_IDS).toHaveLength(31)
  })

  it('每个动作都有显示名', () => {
    for (const actionId of ALL_ACTION_IDS) {
      expect(
        ACTION_DISPLAY_NAME[actionId as keyof typeof ACTION_DISPLAY_NAME],
        `缺少显示名: ${actionId}`,
      ).toBeTruthy()
    }
  })

  it('只使用 7 个已声明的分类', () => {
    const declared = ACTION_CATEGORIES.map((c) => c.id)
    expect(declared).toHaveLength(7)
    for (const actionId of ALL_ACTION_IDS) {
      expect(declared).toContain(
        ACTION_CATEGORY_MAP[actionId as keyof typeof ACTION_CATEGORY_MAP],
      )
    }
  })

  it('分类数量与文档一致（6/5/5/6/4/3/2）', () => {
    const counts = ACTION_CATEGORIES.map((category) => ({
      id: category.id,
      count: ALL_ACTION_IDS.filter(
        (actionId) =>
          ACTION_CATEGORY_MAP[actionId as keyof typeof ACTION_CATEGORY_MAP] === category.id,
      ).length,
    }))
    expect(counts).toEqual([
      { id: 'interaction', count: 6 },
      { id: 'navigation', count: 5 },
      { id: 'probe', count: 5 },
      { id: 'data', count: 6 },
      { id: 'control', count: 4 },
      { id: 'business', count: 3 },
      { id: 'media', count: 2 },
    ])
  })

  it('表内未收录的新动作走前缀兜底', () => {
    expect(resolveActionCategory('wait_for_selector_v2')).toBe('probe')
    expect(resolveActionCategory('get_cookie')).toBe('probe')
    expect(resolveActionCategory('sort_table')).toBe('data')
    expect(resolveActionCategory('parallel_v2')).toBe('control')
    expect(resolveActionCategory('new_tab_page')).toBe('navigation')
    expect(resolveActionCategory('llm_chat')).toBe('media')
    expect(resolveActionCategory('bili_follow')).toBe('business')
  })

  it('完全不认识的动作回落 interaction（不出现空分类）', () => {
    expect(resolveActionCategory('whatever_xyz')).toBe('interaction')
    expect(resolveActionCategory('')).toBe('interaction')
  })
})

describe('scoreAction 打分权重', () => {
  const clickMeta = meta('click', '点击', '点击页面元素')

  it('空查询恒命中（返回 1）', () => {
    expect(scoreAction(clickMeta, '')).toBe(1)
    expect(scoreAction(clickMeta, '   ')).toBe(1)
  })

  it('名称精确 > 名称前缀 > 名称子串', () => {
    const exact = scoreAction(clickMeta, '点击')
    const prefix = scoreAction(meta('x', '点击按钮'), '点击')
    const substring = scoreAction(meta('y', '双击点击区'), '点击')
    expect(exact).toBeGreaterThan(prefix)
    expect(prefix).toBeGreaterThan(substring)
  })

  it('action_id 精确与名称精确同量级，且优先于子串', () => {
    expect(scoreAction(clickMeta, 'click')).toBe(90)
    expect(scoreAction(clickMeta, 'cli')).toBe(55)
    expect(scoreAction(clickMeta, 'ick')).toBe(30)
  })

  it('分类名可命中整个分类', () => {
    for (const actionId of ['navigate', 'new_page', 'open_page', 'close_page', 'wait_for_url']) {
      expect(scoreAction(meta(actionId), '导航与页面')).toBeGreaterThan(0)
    }
  })

  it('描述命中分值最低但仍可用', () => {
    const score = scoreAction(clickMeta, '页面元素')
    expect(score).toBe(10)
  })

  it('不命中返回 0', () => {
    expect(scoreAction(clickMeta, 'abcdef')).toBe(0)
  })

  it('最近使用有加成，且名次越靠前越高', () => {
    const waitMeta = meta('wait')
    // 同一动作，仅「最近使用名次」不同：near 里 wait 排第 1，far 里排第 2
    const near: ActionUsageMap = {
      wait: { count: 1, lastAt: 3000 },
      click: { count: 1, lastAt: 1000 },
    }
    const far: ActionUsageMap = {
      click: { count: 1, lastAt: 3000 },
      wait: { count: 1, lastAt: 1000 },
    }
    const base = scoreAction(waitMeta, 'wa')
    expect(scoreAction(waitMeta, 'wa', near)).toBeGreaterThan(base)
    expect(scoreAction(waitMeta, 'wa', near)).toBeGreaterThan(scoreAction(waitMeta, 'wa', far))
  })

  it('不命中时加成不生效（仍是 0）', () => {
    const usage: ActionUsageMap = { click: { count: 99, lastAt: 9999 } }
    expect(scoreAction(clickMeta, 'zzzz', usage)).toBe(0)
  })

  it('使用次数加成有上限', () => {
    const heavy: ActionUsageMap = { click: { count: 100000, lastAt: 1 } }
    const light: ActionUsageMap = { click: { count: 2, lastAt: 1 } }
    const diff = scoreAction(clickMeta, '点', heavy) - scoreAction(clickMeta, '点', light)
    expect(diff).toBeLessThanOrEqual(10)
    expect(diff).toBeGreaterThan(0)
  })
})

describe('compareActions 排序', () => {
  it('分数高者在前；同分按名称中文排序', () => {
    const scoreOf = (m: ActionMetaLike) => scoreAction(m, 'wa')
    const list = [meta('wait_for_url'), meta('wait'), meta('navigate')]
    list.sort((a, b) => compareActions(a, b, scoreOf))
    expect(list[0].action_id).toBe('wait')
    expect(list[list.length - 1].action_id).toBe('navigate')
  })

  it('同分时最近使用优先', () => {
    const usage: ActionUsageMap = { wait: { count: 1, lastAt: 9999 } }
    const scoreOf = () => 10
    const list = [meta('wait_for_url'), meta('wait')]
    list.sort((a, b) => compareActions(a, b, scoreOf, usage))
    expect(list[0].action_id).toBe('wait')
  })
})

describe('buildActionTree 分组树', () => {
  const allActions = ALL_ACTION_IDS.map((id) => ({ ...meta(id), extra: 'keep' }))

  it('无查询时按固定顺序输出 7 个分类，且透传原字段', () => {
    const groups = buildActionTree(allActions)
    expect(groups).toHaveLength(7)
    expect(groups.map((g) => g.category_id)).toEqual(ACTION_CATEGORIES.map((c) => c.id))
    expect(groups.reduce((sum, g) => sum + g.count, 0)).toBe(31)
    const clickLeaf = groups[0].children.find((leaf) => leaf.action_id === 'click')
    expect(clickLeaf?.extra).toBe('keep')
    expect(clickLeaf?.is_group).toBe(false)
  })

  it('分组节点带 is_group 与唯一 id', () => {
    const groups = buildActionTree(allActions)
    for (const group of groups) {
      expect(group.is_group).toBe(true)
      expect(group.id.startsWith('group-')).toBe(true)
    }
  })

  it('查询时过滤未命中动作，空分类不输出', () => {
    const groups = buildActionTree(allActions, 'wait')
    const ids = groups.flatMap((g) => g.children.map((leaf) => leaf.action_id))
    expect(ids).toContain('wait')
    expect(ids).toContain('wait_for_url')
    expect(ids).toContain('wait_for_response')
    expect(ids).not.toContain('click')
    // 没有命中的分类整个隐藏
    expect(groups.every((g) => g.count > 0)).toBe(true)
    const media = groups.find((g) => g.category_id === 'media')
    expect(media).toBeUndefined()
  })

  it('查询无结果时返回空数组（前端渲染空态）', () => {
    expect(buildActionTree(allActions, 'zzzzz')).toEqual([])
  })

  it('有查询时按命中数量降序', () => {
    const groups = buildActionTree(allActions, 'wait')
    const counts = groups.map((g) => g.count)
    expect([...counts].sort((a, b) => b - a)).toEqual(counts)
  })

  it('常用分组置顶且只含最近使用过的动作', () => {
    const usage: ActionUsageMap = {
      llm: { count: 3, lastAt: 3000 },
      click: { count: 1, lastAt: 2000 },
    }
    const groups = buildActionTree(allActions, '', usage)
    expect(groups[0].category_id).toBe(RECENT_CATEGORY_ID)
    expect(groups[0].label).toBe('常用')
    expect(groups[0].children.map((leaf) => leaf.action_id)).toEqual(['llm', 'click'])
    // 常用分组不吞掉原分类里的动作
    expect(groups.some((g) => g.category_id === 'media')).toBe(true)
  })

  it('常用分组同样受查询过滤', () => {
    const usage: ActionUsageMap = { llm: { count: 1, lastAt: 3000 } }
    const groups = buildActionTree(allActions, 'click', usage)
    expect(groups.some((g) => g.category_id === RECENT_CATEGORY_ID)).toBe(false)
  })

  it('无使用记录时不出现常用分组', () => {
    expect(buildActionTree(allActions, '', {}).some((g) => g.category_id === RECENT_CATEGORY_ID)).toBe(false)
  })

  it('默认只展开最常用的两类', () => {
    expect(defaultExpandedGroupIds()).toEqual(['group-interaction', 'group-navigation'])
  })
})

describe('工具函数', () => {
  it('normalizeQuery 去空白并小写', () => {
    expect(normalizeQuery('  CLICK ')).toBe('click')
    expect(normalizeQuery(null)).toBe('')
  })

  it('recentActionIds 按最近时间倒序并限量', () => {
    const usage: ActionUsageMap = {
      a: { count: 1, lastAt: 10 },
      b: { count: 1, lastAt: 30 },
      c: { count: 1, lastAt: 20 },
    }
    expect(recentActionIds(usage)).toEqual(['b', 'c', 'a'])
    expect(recentActionIds(usage, 2)).toEqual(['b', 'c'])
  })

  it('resolveActionDisplayName 优先级：后端名 > 常量表 > schema.title > id', () => {
    expect(resolveActionDisplayName('click', '后端名', 'title')).toBe('后端名')
    expect(resolveActionDisplayName('click', '', 'title')).toBe('点击')
    expect(resolveActionDisplayName('unknown_x', '', 'Title')).toBe('Title')
    expect(resolveActionDisplayName('unknown_x', '', '')).toBe('unknown_x')
  })

  it('localStorage 不可用时读写不抛错（node 环境即此场景）', () => {
    expect(() => readActionUsage()).not.toThrow()
    expect(() => clearActionUsage()).not.toThrow()
    const usage = recordActionUsage('click', 1000)
    expect(usage.click).toEqual({ count: 1, lastAt: 1000 })
  })
})
