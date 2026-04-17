<script setup lang="ts">
import { RouterView } from 'vue-router'
import SponsorNotification from '@/components/sponsor/sponsor-notification.vue'
import { onMounted, onUnmounted, provide, ref, computed } from 'vue'
import { useThemeStore } from '@/stores/theme'
import { useUserPrefStore } from '@/stores/user_pref.ts'
import { useHead } from '@vueuse/head'
import emitter from '@/utils/mitt'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import { UseScreenSafeArea } from '@vueuse/components'
import { BiliImg } from '@/assets/img/BiliImg.ts'
import HeaderBarView from '@/components/CommonCompo/Bili-Header-Compo/items/HeaderBarView.vue'
import LoginModal from '@/components/login_page/compo/LoginModal.vue'
import { openGlobalLoginModalKey } from '@/models/inject/inject_type.ts'
import { KeysEnum, useInject } from '@/models/base/provide_model.ts'
import type { UserNavModel } from '@/models/user/user_model.ts'
import { isLogin } from '@/api/user/utils.ts'

import type { Ref } from 'vue'
import NetworkErrorView from '@/views/NetworkErrorView.vue'
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
let autoScaleCleanup = () => { }

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


})


onUnmounted(() => {
  themeCleanup()
  autoScaleCleanup() // 清理自动缩放相关的事件监听器

  // 清理事件监听
  emitter.off('needLogin')
})
// 只有在需要重新加载元素的时候才启用route view的key参数
</script>

<template>
  <!-- 网络诊断页面 - 覆盖显示 -->
  <NetworkErrorView
    v-if="showNetworkDiagnosis"
    :error-message="networkErrorMessage"
    @close="showNetworkDiagnosis = false"
  />

  <!-- 主应用内容 -->
  <template v-else>
    <!-- 背景图片 -->
    <img class="pointer-events-none fixed inset-0 z-[-9999] h-full w-full object-cover" :src="backgroundUrl"
      referrerpolicy="no-referrer" alt="Background Image"/>

    <el-config-provider :locale="zhCn">
      <UseScreenSafeArea class="use-screen-safe-area">
        <div class="app-wrapper">
          <el-container v-if="isInit" id="i_cecream">
            <el-header>
              <HeaderBarView/>
            </el-header>
            <el-main class="flex! flex-col">
              <RouterView v-slot="{ Component, route }">
                <transition name="slide-fade" mode="out-in">
                  <keep-alive :max="10">
                    <component :is="Component" />
                  </keep-alive>
                </transition>
              </RouterView>
            </el-main>
          </el-container>
          <SponsorNotification/>
          <GlobalLoadingMask />
          <LoginModal ref="loginModalRef" />
        </div>
      </UseScreenSafeArea>
    </el-config-provider>
  </template>
</template>
