import { ref, watch, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { 自动化控制Service } from '@/api/browser/hey-api'
import { useUserNavStore } from '@/stores/user_nav'
import biliMessage from '@/utils/message'
import type { LivePageTab } from '@/models/rpa_browser/live_stream'

/**
 * 浏览器标签页（直播工具栏的页签）
 *
 * 注意作用域：**切页 / 新建页 / 关闭页都是会话级操作**（改的是浏览器本身，
 * 物理上无法按观看者隔离）—— 一端切页，其余观看者跟随；因此切页成功后
 * 需要由调用方决定是否重建自己的流。
 */

/** 切页后重建流的间隔（给后端留出切页落地时间） */
const RECONNECT_DELAY_MS = 500

interface PageInfo {
  pages?: Array<{ index?: number; title?: string; url?: string }>
  [key: string]: unknown
}

/** 1007 BROWSER_NOT_STARTED：会话不存在 / 浏览器尚未启动，属正常态，不提示 */
const CODE_BROWSER_NOT_STARTED = 1007

export interface UseLivePagesOptions {
  browserId: () => string
  /** 当前观看的页面索引（外部持有：建流时要把它上报给后端） */
  pageIndex: Ref<number>
  /** 监管只读模式：标签页由监管接口下发，绝不调用 owner 校验的 /operation/get_page_info */
  readonly: () => boolean
  /** 只读模式下的标签页数据 */
  readonlyPages: () => Array<{ index: number; title?: string; url?: string }> | undefined
  /** 是否正在直播（决定切页后是否要重建流） */
  isStreaming: Ref<boolean>
  /** 会话是否已连接（连接后才拉得到页面列表） */
  isSessionConnected: Ref<boolean>
  /** 切页成功后重建本观看者的流 */
  restartStream: () => Promise<void>
  /** 切页前静默关闭本观看者的流 */
  stopStream: (silent: boolean) => Promise<void>
}

export function useLivePages(options: UseLivePagesOptions) {
  const { t } = useI18n()
  const userNavStore = useUserNavStore()

  const currentPageIndex = options.pageIndex
  const pageTabs = ref<LivePageTab[]>([])
  const isLoadingPages = ref(false)

  /** 拉取页面列表（后台刷新；失败只记日志，具体操作的提示由各操作自己给） */
  const loadPagesList = async () => {
    if (options.readonly()) {
      pageTabs.value = (options.readonlyPages() ?? []).map((page) => ({
        index: page.index,
        title: page.title || `页面 ${page.index + 1}`,
        url: page.url
      }))
      if (currentPageIndex.value >= pageTabs.value.length) {
        currentPageIndex.value = 0
      }
      return
    }

    if (!userNavStore.user_nav.uid) {
      console.warn('[useLivePages] 未登录，跳过拉取页面列表')
      return
    }

    isLoadingPages.value = true
    try {
      const response = await 自动化控制Service.getPageInfoApiV1RpaBrowserControlOperationGetPageInfoPost({
        query: { browser_id: options.browserId() },
        body: {}
      })

      if (response?.code !== 0) {
        if (response?.code !== CODE_BROWSER_NOT_STARTED) {
          console.warn('[useLivePages] 获取页面信息失败:', response?.msg)
        }
        return
      }

      const pages = (response?.data as PageInfo | null)?.pages ?? []
      pageTabs.value = pages.map((page, idx) => ({
        index: idx,
        title: typeof page.title === 'string' ? page.title : `页面 ${idx + 1}`,
        url: typeof page.url === 'string' ? page.url : undefined
      }))
      if (currentPageIndex.value >= pageTabs.value.length) {
        currentPageIndex.value = 0
      }
    } catch (error) {
      console.error('[useLivePages] 获取页面信息异常:', error)
    } finally {
      isLoadingPages.value = false
    }
  }

  const handleAddPage = async () => {
    if (options.readonly()) return // 监管只读：禁止代替用户新建页面

    if (!userNavStore.user_nav.uid) {
      biliMessage.warning(t('rpa.pleaseLogin'))
      return
    }

    try {
      const response = await 自动化控制Service.openPageApiV1RpaBrowserControlOperationOpenPagePost({
        query: { browser_id: options.browserId() },
        body: { url: 'about:blank', page_index: -1 }
      })

      if (response?.code === 0) {
        biliMessage.success(t('rpa.newPageSuccess'))
        await loadPagesList()
      } else {
        biliMessage.error(response?.msg || t('rpa.newPageFailed'))
      }
    } catch (error) {
      console.error('[useLivePages] 新建页面失败:', error)
      biliMessage.error(t('rpa.networkError'))
    }
  }

  const handleClosePage = async (index: number) => {
    if (options.readonly()) return // 监管只读：禁止代替用户关闭页面

    if (pageTabs.value.length <= 1) {
      biliMessage.warning(t('rpa.atLeastOnePage'))
      return
    }

    if (!userNavStore.user_nav.uid) {
      biliMessage.warning(t('rpa.pleaseLogin'))
      return
    }

    try {
      const response = await 自动化控制Service.closePageApiV1RpaBrowserControlOperationClosePagePost({
        query: { browser_id: options.browserId() },
        body: { page_index: index }
      })

      if (response?.code === 0) {
        biliMessage.success(t('rpa.closePageSuccess'))
        await loadPagesList()
      } else {
        biliMessage.error(response?.msg || t('rpa.closePageFailed'))
      }
    } catch (error) {
      console.error('[useLivePages] 关闭页面失败:', error)
      biliMessage.error(t('rpa.networkError'))
    }
  }

  const handleSwitchPage = async (index: number) => {
    if (options.readonly()) return // 监管只读：禁止代替用户切换页面
    if (currentPageIndex.value === index) return

    if (!userNavStore.user_nav.uid) {
      biliMessage.warning(t('rpa.pleaseLogin'))
      return
    }

    const wasStreaming = options.isStreaming.value

    try {
      const response = await 自动化控制Service.switchPageApiV1RpaBrowserControlOperationSwitchPagePost({
        query: { browser_id: options.browserId() },
        body: { page_index: index }
      })

      if (response?.code !== 0) {
        biliMessage.error(response?.msg || t('rpa.switchPageFailed'))
        return
      }

      currentPageIndex.value = index
      await loadPagesList()

      // 正在直播：切页的连带动作 —— 不弹确认框、关旧流静默，只有重连失败才提示
      if (wasStreaming) {
        await options.stopStream(true)
        window.setTimeout(() => {
          void options.restartStream()
        }, RECONNECT_DELAY_MS)
      }
    } catch (error) {
      console.error('[useLivePages] 切换页面失败:', error)
      biliMessage.error(t('rpa.networkError'))
    }
  }

  /**
   * el-tabs 的 tab-click 回调参数是 TabsPaneContext，用其 paneName（即 :name）还原页面索引。
   * 直接声明成 { index: string } 会和 TabsPaneContext（index?: string）类型不兼容。
   */
  const handleTabClick = (pane: { paneName?: string | number }) => {
    const index = Number(pane?.paneName)
    if (!Number.isFinite(index)) return
    void handleSwitchPage(index)
  }

  // 页面挂载时会话尚未启动，页面列表拿不到；会话变为「已连接」后重新拉取
  watch(options.isSessionConnected, (connected) => {
    if (connected) void loadPagesList()
  })

  // 只读模式的标签页由监管接口下发，随 props 变化同步
  watch(
    () => options.readonlyPages(),
    () => {
      if (options.readonly()) void loadPagesList()
    }
  )

  return {
    pageTabs,
    currentPageIndex,
    isLoadingPages,
    loadPagesList,
    handleAddPage,
    handleClosePage,
    handleSwitchPage,
    handleTabClick
  }
}
