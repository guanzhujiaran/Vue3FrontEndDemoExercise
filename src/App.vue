<script setup lang="ts">
import { RouterView } from 'vue-router'
import SponsorNotification from '@/components/sponsor/sponsor-notification.vue'
import { onMounted, onUnmounted, provide, ref } from 'vue'
import { useThemeStore } from '@/stores/theme'
import { setupAutoScale } from '@/utils/Browser/systemSetting.ts'
import { useHead } from '@vueuse/head'
import emitter from '@/utils/mitt'
useHead({
  title: '爆破哔哩哔哩弹幕视频网 - ( ゜- ゜)つロ 乾杯~ - bilibili',
  meta: [
    {
      name: 'description',
      content:
        'B站官方抽奖信息集合，转发抽奖，预约抽奖，充电抽奖。山姆会员店（上海）商品数据统计展示。'
    },
    { property: 'og:title', content: 'B站官方抽奖信息集合 | 山姆会员店（上海）商品数据统计展示' }
  ]
})

import zhCn from 'element-plus/es/locale/lang/zh-cn'
import Clarity from '@microsoft/clarity'
import { BiliImg } from '@/assets/img/BiliImg.ts'
import HeaderBarView from '@/components/CommonCompo/Bili-Header-Compo/HeaderBarView.vue'
import LoginModal from '@/components/login_page/compo/LoginModal.vue'
import { openGlobalLoginModalKey } from '@/models/inject/inject_type.ts'
import.meta.env.VITE_API_BASE_URL && Clarity.init(import.meta.env.VITE_CLARITY_ID ?? '')
const isInit = ref(false)
const themeStore = useThemeStore()
const loginModalRef = ref<InstanceType<typeof LoginModal> | null>(null)

// 存储清理函数
let themeCleanup = () => {}
let autoScaleCleanup = () => {}

// 全局打开登录模态框的方法
const openGlobalLoginModal = () => {
  if (loginModalRef.value) {
    loginModalRef.value.openLoginModal()
  }
}
provide(openGlobalLoginModalKey, openGlobalLoginModal)

onMounted(() => {
  isInit.value = true

  // 初始化主题
  themeStore.initTheme()

  // 设置系统主题监听
  themeCleanup = themeStore.setupSystemThemeListener()

  // 设置自动缩放功能
  autoScaleCleanup = setupAutoScale()
})

onUnmounted(() => {
  themeCleanup()
  autoScaleCleanup() // 清理自动缩放相关的事件监听器

  // 清理事件监听
  emitter.off('needLogin')
})
</script>

<template>
  <el-image
    v-if="themeStore.isDark"
    :src="BiliImg.background.home.dark"
    referrerpolicy="no-referrer"
    style="
      z-index: -9999;
      position: fixed;
      object-fit: cover;
      pointer-events: none;
      height: 100%;
      width: -webkit-fill-available;
    "
  ></el-image>
  <el-image
    v-else
    :src="BiliImg.background.home.light"
    referrerpolicy="no-referrer"
    style="
      z-index: -9999;
      position: fixed;
      object-fit: cover;
      pointer-events: none;
      height: 100%;
      width: -webkit-fill-available;
    "
  ></el-image>
  <el-config-provider :locale="zhCn">
    <el-container
      style="min-height: 98.8vh; height: auto; position: relative"
      v-if="isInit"
      id="i_cecream"
    >
      <el-header style="padding: 0">
        <HeaderBarView />
      </el-header>
      <el-main style="display: flex">
        <RouterView v-slot="{ Component, route }">
          <transition name="slide-fade" mode="out-in">
            <component :is="Component" :key="route.path"></component>
          </transition>
        </RouterView>
      </el-main>
    </el-container>
    <SponsorNotification></SponsorNotification>
    <GlobalLoadingMask />
    <GlobalToast />
    <LoginModal ref="loginModalRef" />
  </el-config-provider>
</template>

<style>
#app {
  margin: 0 auto;
  max-width: 2560px;
  line-height: 1.5;
  width: -webkit-fill-available;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.el-header,
.el-main {
  padding: 0;
  width: -webkit-fill-available;
}

.el-main {
  flex: 1;
  padding: 20px;
  display: flex;
  margin: 0 auto;
  overflow: visible; /* 允许内容溢出显示 */
}

.el-container {
  width: -webkit-fill-available;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
}

/* 全局样式 */
html,
body {
  min-height: 100%;
  margin: 0;
  padding: 0;
  overflow-x: hidden; /* 防止水平滚动 */
}

body {
  margin: 0 auto;
  font-family:
    PingFang SC,
    HarmonyOS_Regular,
    Helvetica Neue,
    Microsoft YaHei,
    sans-serif !important;
  font-weight: 400;
  min-width: 550px;
  transition: background-color 0.3s ease;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
  display: flex;
  flex-direction: column;
}

/* 响应式样式 */
@media (max-width: 768px) {
  .el-main {
    padding: 10px;
  }
}

/* 缩放视图样式 */
html.scaled-view,
html.scaled-view body {
  width: -webkit-fill-available;
}

html.scaled-view #app {
  height: auto;
  min-height: 100vh;
}

html.scaled-view .el-container {
  min-height: 100vh;
}

/* 过渡动画 (保持不变) */
.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.1s cubic-bezier(1, 0.5, 0.8, 1);
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  opacity: 0;
}
</style>
