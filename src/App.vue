<script setup lang="ts">
import { RouterView } from 'vue-router'
import SponsorNotification from '@/components/sponsor/sponsor-notification.vue'
import { onMounted, onUnmounted, provide, ref, computed } from 'vue'
import { useThemeStore } from '@/stores/theme'
import { useUserPrefStore } from '@/stores/user_pref.ts'
import { useHead } from '@vueuse/head'
import emitter from '@/utils/mitt'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import { BiliImg } from '@/assets/img/BiliImg.ts'
import HeaderBarView from '@/components/CommonCompo/Bili-Header-Compo/items/HeaderBarView.vue'
import LoginModal from '@/components/login_page/compo/LoginModal.vue'
import { openGlobalLoginModalKey, windowHeightKey } from '@/models/inject/inject_type.ts'
import { KeysEnum, useInject } from '@/models/base/provide_model.ts'
import type { UserNavModel } from '@/models/user/user_model.ts'
import { isLogin } from '@/api/user/utils.ts'

import type { Ref } from 'vue'
import NetworkErrorView from '@/views/NetworkErrorView.vue'
import { useDebounceFn, useResizeObserver } from '@vueuse/core'
import FlexContainer from './components/CommonCompo/Bili-Container-Compo/FlexContainer.vue'
useHead({
  title: '爆破哔哩哔哩弹幕视频网 - ( ゜- ゜)つロ 乾杯~ - bilibili',
  meta: [
    {
      name: 'description',
      content:
        'B站官方抽奖信息集合，转发抽奖，预约抽奖，充电抽奖。山姆会员店（上海）商品数据统计展示。'
    },
    {
      property: 'og:title',
      content: 'B站官方抽奖信息集合 | 山姆会员店（上海）商品数据统计展示'
    }
  ]
})

const isInit = ref(false)
const themeStore = useThemeStore()
const userPrefStore = useUserPrefStore()
const loginModalRef = ref<InstanceType<typeof LoginModal> | null>(null)

// 计算背景图片URL
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
onMounted(() => {
  checkLoginStatus()
  isInit.value = true

  // 初始化主题
  themeStore.initTheme()

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
const screen_size = {
  xxs: 690,
  xs: 1060,
  sm: 1140,
  md: 1300,
  lg: 1400,
  xl: 1680,
  xxl: 2060
}
const window_height = ref(window.innerHeight)
provide(windowHeightKey, window_height)

// 记录 el-scrollbar 的滚动位置，传给 ScrollButtons 控制按钮显隐
const scrollTop = ref(0)
const onScrollbarScroll = (payload: { scrollTop: number; scrollLeft: number }) => {
  scrollTop.value = payload.scrollTop
}

// 参照媒体查询断点库：t=smaller(小于上限), n=between(介于区间), r=greater(大于等于下限)
type ScreenKey = keyof typeof screen_size
const smaller = (key: ScreenKey) =>
  computed(() => outerWidth < screen_size[key])
const between = (min: ScreenKey, max: ScreenKey) =>
  computed(() => outerWidth >= screen_size[min] && outerWidth < screen_size[max])
const greater = (key: ScreenKey) =>
  computed(() => outerWidth >= screen_size[key])

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
</script>

<template>
  <!-- 网络诊断页面 - 覆盖显示 -->
  <NetworkErrorView v-if="showNetworkDiagnosis" :error-message="networkErrorMessage"
    @close="showNetworkDiagnosis = false" />

  <!-- 主应用内容 -->
  <template v-else>
    <!-- 背景图片 -->
    <img class="bg-img pointer-events-none fixed inset-0 z-[-9999] h-full w-full object-cover" :src="backgroundUrl"
      referrerpolicy="no-referrer" alt="Background Image" />
    <el-config-provider :locale="zhCn">
      <el-scrollbar class="smallest-width" view-class="min-h-full flex flex-col" v-model:height="window_height"
        @scroll="onScrollbarScroll">
        <div class="site-layout safe-area-padding w-full flex-1 flex flex-col">
          <el-container v-if="isInit" id="i_cecream">
            <el-header class="bili-header">
              <HeaderBarView />
            </el-header>
            <el-main
              class="flex! flex-col flex-1 px-0 pb-4 pt-0 mt-3 mx-6 text-text-primary"
              :style="{ overflow: 'visible' }"
            >
              <RouterView v-slot="{ Component, route }">
                <transition name="slide-fade" mode="out-in">
                  <keep-alive :max="30">
                    <FlexContainer class="main-inner">
                      <component :is="Component" />
                    </FlexContainer>
                  </keep-alive>
                </transition>
              </RouterView>
            </el-main>
          </el-container>
          <SponsorNotification />
          <GlobalLoadingMask />
          <LoginModal ref="loginModalRef" />
        </div>
        <ScrollButtons :scroll-top="scrollTop" :top-threshold="100" :bottom-threshold="100" />
      </el-scrollbar>
    </el-config-provider>
  </template>
</template>
