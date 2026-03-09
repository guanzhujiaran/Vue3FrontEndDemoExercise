<script setup lang="ts">
import { onMounted, onUnmounted, computed, ref, provide, inject } from 'vue'
import { type GlobalVarsType, ScreenTypeEnum } from '@/models/global_var/global_var_model.ts'
import { useInject, KeysEnum } from '@/models/base/provide_model.ts'
import { useRoute } from 'vue-router'
import { routes } from '@/router'
import { ElMessage } from 'element-plus'
import { processRoutesForHeader } from '@/utils/routeUtils.ts'
import { openGlobalLoginModalKey } from '@/models/inject/inject_type.ts'
import type { UserNavModel } from '@/models/user/user_model.ts'

const globalVars = useInject(KeysEnum.GlobalVars) as Ref<GlobalVarsType>
const biliUser = useInject(KeysEnum.BiliUser) as Ref<UserNavModel>

const route = useRoute()
let resizeTimer: number | null = null

const checkScreenSize = () => {
  const width = window.innerWidth
  if (width < 480) {
    globalVars.value.screen_size = ScreenTypeEnum.small // 小屏
  } else if (width < 620) {
    globalVars.value.screen_size = ScreenTypeEnum.medium // 中屏
  } else {
    globalVars.value.screen_size = ScreenTypeEnum.large // 大屏
  }
}
// 根据路由配置生成导航数据
const navigationData = computed(() => {
  return processRoutesForHeader(routes, '', true) // 传入true表示显示所有路由
})
const openGlobalLoginModal = inject(openGlobalLoginModalKey, () => {})
// 处理需要登录但未登录的情况
const handleProtectedRouteClick = (title: string) => {
  ElMessage.info(` ${title} 功能需要登录后才能使用`)
  openGlobalLoginModal()
}

// 防抖处理窗口大小变化
const debouncedCheckScreenSize = () => {
  if (resizeTimer) {
    window.clearTimeout(resizeTimer)
  }
  resizeTimer = window.setTimeout(() => {
    checkScreenSize()
    resizeTimer = null
  }, 100)
}

// 监听窗口大小变化
onMounted(() => {
  window.addEventListener('resize', debouncedCheckScreenSize)
  // 初始化检查一次屏幕尺寸
  checkScreenSize()
  // 检查登录状态
})

// 组件销毁时移除监听器
onUnmounted(() => {
  window.removeEventListener('resize', debouncedCheckScreenSize)
  if (resizeTimer) {
    window.clearTimeout(resizeTimer)
  }
})

// 提供方法给 MenuItem 组件使用
provide('headerBarView', {
  handleProtectedRouteClick
})
</script>

<template>
  <div id="bili-header">
    <div class="header-container">
      <el-menu :default-active="route.path" mode="horizontal" class="header-menu" :collapse="false" :ellipsis="false">
        <template v-for="(item, index) in navigationData" :key="item.path">
          <MenuItem :item="item" />
        </template>
      </el-menu>
      <ul class="el-menu el-menu--horizontal avatar-container">
        <AvatarDropdown />
      </ul>
    </div>
  </div>
</template>

<style scoped>
@import '@/assets/components/navigation/header-bar-view-tailwind.css';
</style>
