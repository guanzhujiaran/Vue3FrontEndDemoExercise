<script setup lang="ts">
import { RouterView } from 'vue-router'
import HeaderView from '@/components/header-bar/HeaderBarView.vue'
import { onMounted, onUnmounted, ref } from 'vue'
import { useDeviceSystemStore } from '@/stores/device_system.ts'
import { Theme } from '@/models/store/device_system.ts'
import { setFontSize, setThemeClassWithSystem } from '@/utils/Browser/systemSetting.ts'
import zhCn from 'element-plus/es/locale/lang/zh-cn'

const isInit = ref(false)
const deviceSystemStore = useDeviceSystemStore()
onMounted(() => {
  isInit.value = true
  setFontSize()
  setThemeClassWithSystem()
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const themeChangeListener = () => setThemeClassWithSystem()
  mediaQuery.addEventListener('change', themeChangeListener)
  window.addEventListener('resize', setFontSize)
  onUnmounted(() => {
    mediaQuery.removeEventListener('change', themeChangeListener)
    window.removeEventListener('resize', setFontSize)
  })
})
</script>

<template>
  <el-config-provider :locale="zhCn">
    <el-container
      style="min-height: 98.8vh"
      v-if="isInit"
      :class="{
        dark: deviceSystemStore.systemTheme === Theme.dark,
        light: deviceSystemStore.systemTheme === Theme.light
      }"
      id="i_cecream"
    >
      <el-header>
        <HeaderView />
      </el-header>
      <el-main>
        <RouterView v-slot="{ Component, route }">
          <transition name="slide-fade" mode="out-in">
            <component :is="Component" :key="route.path"></component>
          </transition>
        </RouterView>
      </el-main>
    </el-container>
    <SponsorNotification></SponsorNotification>
  </el-config-provider>
</template>

<style>
#app {
  margin: 0 auto;
  max-width: 2560px;
  line-height: 1.5;
}

.el-header,
.el-main {
  padding: 0;
}

.el-main {
  flex: 1;
  padding: 10px;
  display: flex;
  margin: 0 auto;
  width: 100%;
}

/* 全局样式 */
body {
  margin: 0 auto;
  overflow-anchor: none;
  font-family:
    PingFang SC,
    HarmonyOS_Regular,
    Helvetica Neue,
    Microsoft YaHei,
    sans-serif !important;
  font-weight: 400;
  background-color: #f4f4f4; /* 给 body 也加个背景色可能更好 */
  min-width: 500px;
  overflow-x: auto;
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
