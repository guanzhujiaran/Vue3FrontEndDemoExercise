<script setup lang="ts">
import { onMounted, onUnmounted, computed, ref } from 'vue'
import { type GlobalVarsType, ScreenTypeEnum } from '@/models/global_var/global_var_model.ts'
import { useInject, KeysEnum } from '@/models/base/provide_model.ts'
import { useRoute } from 'vue-router'
import { routes } from '@/router'
import { processRoutesForHeader } from '@/utils/routeUtils.ts'

const globalVars = useInject(KeysEnum.GlobalVars) as Ref<GlobalVarsType>

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
// 根据路由配置生成导航数据（未登录时也展示全部入口，登录校验交由对应页面处理）
const navigationData = computed(() => {
  return processRoutesForHeader(routes, '', true)
})

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
</script>

<template>
  <div id="bili-header"
    class="sticky top-0 z-50 border-b border-[var(--el-border-color-light)] bg-bg/90 backdrop-blur-md backdrop-saturate-150 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
    <div class="flex items-center justify-between w-full px-2 md:px-0 lg:px-4 relative">
      <el-scrollbar class="headerbar-scroller z-10">
        <el-menu :default-active="route.path" mode="horizontal" class="flex w-fit" :collapse="false" :ellipsis="false">
          <template v-for="(item, index) in navigationData" :key="item.path">
            <MenuItem :item="item" :is-top-level="true" />
          </template>
        </el-menu>
      </el-scrollbar>
      <ul
        class="el-menu el-menu--horizontal flex items-center justify-center flex-shrink-0 px-2 sm:px-3 md:px-4 relative z-10 bg-transparent! border-b-0!">
        <AvatarDropdown />
      </ul>
    </div>
  </div>
</template>
