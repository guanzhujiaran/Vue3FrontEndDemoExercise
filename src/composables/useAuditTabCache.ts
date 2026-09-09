import { computed, ref, watch } from 'vue'

/**
 * 管理端审核页通用的「状态 Tab 缓存懒加载」组合式函数（Phase 10）。
 *
 * - 每个状态 Tab 独立缓存（items / total / page / loaded）；
 * - 首次激活才请求，切回复用已有数据；
 * - 翻页 / 刷新（force）按 Tab 维度执行；
 * - removeRow 供审核动作后从当前 Tab 移除该行（total 同步 -1）；
 * - invalidateOthers 供状态互转后使相邻 Tab 缓存失效。
 */
export interface AuditTabState<T> {
  items: T[]
  total: number
  page: number
  loaded: boolean
}

export function useAuditTabCache<T>(
  fetcher: (tab: string, page: number, pageSize: number) => Promise<{ items: T[]; total: number }>,
  options: {
    tabs: Array<{ name: string; label: string }>
    defaultTab?: string
    pageSize?: number
  }
) {
  const pageSize = ref(options.pageSize ?? 20)
  const activeTab = ref(options.defaultTab ?? options.tabs[0]?.name ?? '')

  const tabCache = ref<Record<string, AuditTabState<T>>>({})
  const loading = ref(false)

  const EMPTY_TAB: AuditTabState<T> = { items: [], total: 0, page: 1, loaded: false }

  function ensureTab(name: string): AuditTabState<T> {
    if (!tabCache.value[name]) {
      tabCache.value[name] = { items: [], total: 0, page: 1, loaded: false }
    }
    return tabCache.value[name]
  }

  const currentTab = computed<AuditTabState<T>>(() => tabCache.value[activeTab.value] ?? EMPTY_TAB)
  const items = computed(() => currentTab.value.items)
  const total = computed(() => currentTab.value.total)
  const page = computed(() => currentTab.value.page)

  /** 拉取当前 Tab 数据；force=true（刷新按钮）时忽略已加载标记重新请求 */
  async function load(force = false) {
    const st = ensureTab(activeTab.value)
    if (st.loaded && !force) return
    loading.value = true
    try {
      const res = await fetcher(activeTab.value, st.page, pageSize.value)
      st.items = res.items
      st.total = res.total
      st.loaded = true
    } finally {
      loading.value = false
    }
  }

  /** Tab 切换：已加载过的直接复用缓存，未加载的才请求 */
  function onTabChange(name: string | number) {
    activeTab.value = String(name)
  }

  function onPageChange(p: number) {
    const st = ensureTab(activeTab.value)
    st.page = p
    st.loaded = false
    load()
  }

  /** 调整每页条数：全部 Tab 缓存重置（页码回到 1）后重载当前 Tab */
  function onPageSizeChange(size: number) {
    pageSize.value = size
    for (const st of Object.values(tabCache.value)) {
      st.page = 1
      st.loaded = false
    }
    load()
  }

  /** 审核动作后从当前 Tab 移除该行 */
  function removeRow(predicate: (item: T) => boolean) {
    const st = ensureTab(activeTab.value)
    st.items = st.items.filter((i) => !predicate(i))
    st.total = Math.max(0, st.total - 1)
  }

  /** 使其它 Tab 缓存失效（状态互转会影响相邻 Tab 数据） */
  function invalidateOthers() {
    for (const name of Object.keys(tabCache.value)) {
      if (name !== activeTab.value) tabCache.value[name].loaded = false
    }
  }

  // Tab 切换自动补载
  watch(activeTab, (name) => {
    const st = ensureTab(name)
    if (!st.loaded) load()
  })

  return {
    activeTab,
    items,
    total,
    page,
    pageSize,
    loading,
    ensureTab,
    load,
    onTabChange,
    onPageChange,
    onPageSizeChange,
    removeRow,
    invalidateOthers,
  }
}
