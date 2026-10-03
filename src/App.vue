<script setup lang="ts">
import { IMG_REFERRER_POLICY } from '@/utils/PageOpen/linkPolicy'
import { RouterView, useRoute, useRouter } from 'vue-router'
import SponsorNotification from '@/components/sponsor/sponsor-notification.vue'
import { onMounted, onUnmounted, provide, ref, computed } from 'vue'
import { useThemeStore } from '@/stores/theme'
import { useUserPrefStore } from '@/stores/user_pref.ts'
import emitter from '@/utils/mitt'
import { useRouteSeo } from '@/composables/useRouteSeo.ts'
import { useLocaleStore } from '@/stores/locale'
import { BiliImg } from '@/assets/img/BiliImg.ts'
import HeaderBarView from '@/components/CommonCompo/Bili-Header-Compo/items/HeaderBarView.vue'
import LoginModal from '@/components/login_page/compo/LoginModal.vue'
import { openGlobalLoginModalKey } from '@/models/inject/inject_type.ts'
import { KeysEnum, useInject } from '@/models/base/provide_model.ts'
import type { UserNavModel } from '@/models/user/user_model.ts'
import { isLogin } from '@/api/user/utils.ts'

import type { Ref } from 'vue'
import NetworkErrorView from '@/views/NetworkErrorView.vue'
import { useDebounceFn, useResizeObserver } from '@vueuse/core'
// 按当前路由动态维护 title / description / canonical / robots / OG（SEO）
useRouteSeo()

const route = useRoute()
/**
 * 顶层 RouterView / keep-alive 的缓存 key：
 * - 布局路由（带子路由，如 /app/moment、/app/message、/app/admin）：沿用父路由 path，
 *   子路由切换时布局实例复用，不会重建侧边栏/导航（避免每次切 tab 都重挂载）。
 * - 叶子路由（如 /app/space/:mid）：必须用完整 path。
 *   若沿用父路由 path，/app/space/1 与 /app/space/2 会命中同一个缓存实例，
 *   切换空间时组件不重新挂载、onMounted 不触发 → 数据不加载，页面停留在旧内容/空内容。
 */
const routeViewKey = computed(() => {
  const parent = route.matched[0]
  return parent && route.matched.length > 1 ? parent.path : route.path
})

/**
 * 是否渲染主布局骨架。
 *
 * 初值必须是 `true`：SSR / 预渲染阶段若不渲染，静态 HTML 就是空壳（SEO 与首屏都退化）。
 * 副作用（登录态检查、主题初始化）仍在 onMounted 里执行，客户端挂载后按真实状态更新，
 * 因此两端首屏结构一致，不存在水合不匹配。
 */
const isInit = ref(true)
/** 客户端是否已完成挂载（登录态检查 / 主题初始化等都在挂载后执行） */
const isMounted = ref(false)
const themeStore = useThemeStore()
const userPrefStore = useUserPrefStore()
const loginModalRef = ref<InstanceType<typeof LoginModal> | null>(null)
const router = useRouter()

// 计算背景图片URL（themeStore.isDark 已做水合安全处理：挂载前恒为浅色，与服务端一致）
const backgroundUrl = computed(() => {
  return themeStore.isDark ? BiliImg.background.home.dark : BiliImg.background.home.light
})

// 存储清理函数
let themeCleanup = () => { }

// 全局打开登录模态框的方法
const openGlobalLoginModal = () => {
  if (loginModalRef.value) {
    loginModalRef.value.openLoginModal()
  }
}

provide(openGlobalLoginModalKey, openGlobalLoginModal)
const biliUser = useInject(KeysEnum.BiliUser) as Ref<UserNavModel>

// 存储网络错误状态
const showNetworkDiagnosis = ref(false)
const networkErrorMessage = ref('')

// 检查登录状态
const checkLoginStatus = () => {
  isLogin().then(([isLoggedInStatus, message, user_nav, apiError]) => {
    // 只在有 apiError 时（网络请求失败）显示网络诊断页面
    if (apiError) {
      console.log('App.vue - 网络请求失败，显示网络诊断页面，错误信息:', apiError.msg)
      networkErrorMessage.value = apiError.msg
      showNetworkDiagnosis.value = true
    }
    user_nav ? (biliUser.value = user_nav) : null
  })
}
// 标记是否已完成首次登录状态检查，避免 App 挂载时 + Casdoor 回调后重复调用
let hasCheckedLogin = false

onMounted(() => {
  // 访问 Casdoor 回调页时，跳过首次登录检查：此时 URL 里的 token 还没被
  // CasdoorCallbackView 处理保存，提前发 nav 会拿到 -101 并误删已存 token，
  // 待回调页保存 token 并跳回首页后，由 router.afterEach 再触发一次检查。
  const isCasdoorCallback = router.currentRoute.value.name === 'CASDOOR_CALLBACK'
  if (!isCasdoorCallback) {
    checkLoginStatus()
  }
  hasCheckedLogin = true
  isInit.value = true
  isMounted.value = true

  // 初始化主题
  themeStore.initTheme()
  // 主题已应用到 DOM，放开对外 isDark / themeEffectString
  // （水合期间固定为「浅色」以保证与服务端首帧一致，见 stores/theme.ts）
  themeStore.markHydrated()

  // 应用用户偏好设置
  userPrefStore.applyThemes()

  // 设置系统主题监听
  themeCleanup = themeStore.setupSystemThemeListener()
  getWindowHeight()
  window.addEventListener("resize", getWindowHeight)

  // 加载不蒜子（busuanzi）PV/UV 统计脚本
  const busuanziScript = document.createElement('script')
  busuanziScript.async = true
  busuanziScript.src = '//busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js'
  document.head.appendChild(busuanziScript)
})

// 监听路由变化：当从 Casdoor 回调页跳回首页时，重新检查登录状态获取完整用户信息
router.afterEach((to, from) => {
  if (from.name === 'CASDOOR_CALLBACK' && to.name !== 'CASDOOR_CALLBACK' && hasCheckedLogin) {
    checkLoginStatus()
  }
})
const screen_size = {
  xxs: 690,
  xs: 1060,
  sm: 1140,
  md: 1300,
  lg: 1400,
  xl: 1680,
  xxl: 2060
}
/**
 * 滚动容器高度。
 *
 * 初值固定 `0`，**不**用 `window.innerHeight`：服务端没有 window、客户端首帧却有，
 * 两端渲染出的 style 不同会触发 hydration mismatch（Nuxt 会自动修正，但控制台报警告且首屏会闪）。
 * 统一从 0 起步，挂载后由 `getWindowHeight()`（onMounted 内）量出真实值。
 */
const window_height = ref(0)

// 记录 el-scrollbar 的滚动位置，传给 ScrollButtons 控制按钮显隐
const scrollTop = ref(0)
const onScrollbarScroll = (payload: { scrollTop: number; scrollLeft: number }) => {
  scrollTop.value = payload.scrollTop
}

// 参照媒体查询断点库：t=smaller(小于上限), n=between(介于区间), r=greater(大于等于下限)
type ScreenKey = keyof typeof screen_size
/** `window.outerWidth` 的 SSR 安全读取：预渲染时按 0 处理（断点判定退化为不命中） */
const outerWidthValue = () => (typeof window === 'undefined' ? 0 : window.outerWidth)
const smaller = (key: ScreenKey) =>
  computed(() => outerWidthValue() < screen_size[key])
const between = (min: ScreenKey, max: ScreenKey) =>
  computed(() => outerWidthValue() >= screen_size[min] && outerWidthValue() < screen_size[max])
const greater = (key: ScreenKey) =>
  computed(() => outerWidthValue() >= screen_size[key])

// 维持原有行为：smallest 用于 smallest-width，is_lg 用于 xs_sm-width
const smallest = smaller('xxs')
const is_lg = smaller('lg')
// 其余断点按 smaller / between / greater 语义构建，与参考库一致
const xs_sm = between('xs', 'sm')
const is_xs = smaller('sm')
const is_sm = between('sm', 'md')
const is_md = between('md', 'lg')
const is_xl = between('xl', 'xxl')
const is_xxl = greater('xxl')
const getWindowHeight = useDebounceFn(() => {
  document.body.classList[smallest.value ? "add" : "remove"]("smallest-width"),
    document.body.classList[is_lg.value ? "add" : "remove"]("xs_sm-width")
  window_height.value = window.innerHeight
}, 100)
onUnmounted(() => {
  themeCleanup()
  window.removeEventListener("resize", getWindowHeight)
  // 清理事件监听
  emitter.off('needLogin')
})

// 国际化：语言切换同步 Element Plus locale
const localeStore = useLocaleStore()
localeStore.init()
// 语言：首帧必须与服务端一致（zh-CN），挂载后再按浏览器语言切换，
// 否则英文浏览器会拿中文 SSR 文案做对比 → hydration mismatch（详见 stores/locale.ts）
onMounted(() => localeStore.applyBrowserLocale())
</script>

<template>
  <!-- 网络诊断页面 - 覆盖显示 -->
  <NetworkErrorView v-if="showNetworkDiagnosis" :error-message="networkErrorMessage"
    @close="showNetworkDiagnosis = false" />

  <!-- 主应用内容 -->
  <template v-else>
    <!-- 背景图片 -->
    <img class="bg-img pointer-events-none fixed inset-0 z-[-9999] h-full w-full object-cover" :src="backgroundUrl"
      :referrerpolicy="IMG_REFERRER_POLICY" alt="Background Image" />
    <el-config-provider :locale="localeStore.elLocale">
      <el-scrollbar class="smallest-width" view-class="min-h-full flex flex-col" v-model:height="window_height"
        @scroll="onScrollbarScroll">
        <!-- 安全区内边距直接落在元素上（preflight 已统一 box-sizing: border-box，无需重复声明） -->
        <div
          class="site-layout w-full flex-1 flex flex-col pt-[env(safe-area-inset-top,0px)] pr-[env(safe-area-inset-right,0px)] pb-[env(safe-area-inset-bottom,0px)] pl-[env(safe-area-inset-left,0px)]">
          <el-container v-if="isInit" id="i_cecream">
            <el-header class="bili-header p-0">
              <HeaderBarView />
            </el-header>
            <el-main class="flex! flex-col flex-1 mx-2 mt-3 p-0 text-text-primary" :style="{ overflow: 'visible' }">
              <RouterView v-slot="{ Component, route }">
                <!-- 注意：本 transition 的 mode="out-in" 依赖「子组件单根元素」。
                     顶层路由组件若为多根（fragment）组件，会把 keep-alive 缓存的布局 vnode
                     弄丢/残留（例如从 /app/rpa-browser 切回 /app/admin 时侧边栏整体消失）。
                     因此所有被本 RouterView 渲染的顶层路由组件必须是单根组件。 -->
                <transition name="slide-fade" mode="out-in">
                  <keep-alive :max="30" :exclude="['MomentDetailView']">
                    <component :is="Component" :key="routeViewKey"
                      class="main-inner flex flex-col flex-1 box-border rounded" />
                  </keep-alive>
                </transition>
              </RouterView>
            </el-main>
          </el-container>
          <SponsorNotification />
          <GlobalLoadingMask />
          <!--
            用 <ClientOnly> 而不是 v-if="isMounted"：
            el-dialog 等在 SSR 下会访问 window，两者都能规避；但 v-if 会在 hydrate 期间把状态
            从 false 翻到 true，客户端 DOM 立刻多出 el-overlay / el-overlay-dialog，触发
            「Hydration completed but contains mismatches」。ClientOnly 在服务端与客户端首次渲染
            都输出空，挂载后才切换，两端首帧结构完全一致。
          -->
          <ClientOnly>
            <LoginModal ref="loginModalRef" />
          </ClientOnly>
        </div>
        <!-- 自带内部滚动容器的侧边导航模块（消息/管理后台/RPA）隐藏全局快速滚动按钮，
             只保留各自布局内部的 ScrollButtons，避免两对按钮叠在右下角 -->
        <ScrollButtons
          v-if="!route.path.startsWith('/app/message') && !route.path.startsWith('/app/admin') && !route.path.startsWith('/app/rpa-browser')"
          :scroll-top="scrollTop" :top-threshold="100" :bottom-threshold="100" />
      </el-scrollbar>
    </el-config-provider>
  </template>
</template>
