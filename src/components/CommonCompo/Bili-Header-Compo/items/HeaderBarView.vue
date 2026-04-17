<script setup lang="ts">
import { onMounted, onUnmounted, computed, ref, provide, inject } from 'vue'
import { type GlobalVarsType, ScreenTypeEnum } from '@/models/global_var/global_var_model.ts'
import { useInject, KeysEnum } from '@/models/base/provide_model.ts'
import { useRoute } from 'vue-router'
import { routes } from '@/router'
import biliMessage from '@/utils/message'
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
  biliMessage.info(` ${title} 功能需要登录后才能使用`)
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
  <div id="bili-header" class="sticky top-0 z-50 border-b border-[var(--el-border-color-light)] bg-[var(--el-bg-color)]/90 backdrop-blur-md backdrop-saturate-150 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
    <div class="flex items-center justify-between w-full px-2 md:px-0 lg:px-4 relative">
      <el-menu :default-active="route.path" mode="horizontal" 
               class="flex-1 overflow-x-auto min-w-0 z-10 !border-b-0 !overflow-x-auto !overflow-y-hidden !whitespace-nowrap !flex-nowrap !bg-transparent"
               :collapse="false" :ellipsis="false">
        <template v-for="(item, index) in navigationData" :key="item.path">
          <MenuItem :item="item" />
        </template>
      </el-menu>
      <ul class="el-menu el-menu--horizontal flex items-center justify-center flex-shrink-0 px-2 sm:px-3 md:px-4 relative z-10 !bg-transparent !border-b-0">
        <AvatarDropdown />
      </ul>
    </div>
  </div>
</template>

<style scoped>
/* 保留必要的Element Plus覆盖样式 */
#bili-header .el-menu--horizontal {
    border-bottom: none !important;
    overflow-x: auto !important;
    overflow-y: hidden !important;
    white-space: nowrap !important;
    flex-wrap: nowrap !important;
}

#bili-header .el-menu--horizontal .el-menu-item,
#bili-header .el-menu--horizontal .el-sub-menu__title {
    border-bottom: none !important;
    white-space: nowrap !important;
    flex-shrink: 0 !important;
}

/* 小屏幕适配 */
@media (max-width: 768px) {
    #bili-header .el-menu--horizontal .el-sub-menu__title,
    #bili-header .el-menu--horizontal .el-menu-item {
        padding-left: 0.625rem !important;
        padding-right: 0.625rem !important;
        min-width: fit-content;
        font-size: var(--el-menu-font-size);
        height: var(--el-menu-item-height);
        line-height: var(--el-menu-item-height);
    }
}

/* 超小屏幕适配 */
@media (max-width: 480px) {
    #bili-header .el-menu--horizontal .el-sub-menu__title,
    #bili-header .el-menu--horizontal .el-menu-item {
        padding-left: 0.5rem !important;
        padding-right: 0.5rem !important;
        font-size: var(--el-menu-font-size);
        height: var(--el-menu-item-height);
        line-height: var(--el-menu-item-height);
    }

    #bili-header .el-menu--horizontal .el-sub-menu__title span,
    #bili-header .el-menu--horizontal .el-menu-item span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 60px;
    }
}

/* 滚动条样式 */
#bili-header .el-menu--horizontal::-webkit-scrollbar {
    height: 2px;
}

#bili-header .el-menu--horizontal::-webkit-scrollbar-track {
    background: transparent;
}

#bili-header .el-menu--horizontal::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 1px;
}

#bili-header .el-menu--horizontal::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.3);
}

/* 确保 dropdown 和 popover 能正常显示 */
#bili-header .el-dropdown {
    position: relative;
    z-index: 100;
}

#bili-header .el-dropdown__popper,
#bili-header .el-popover {
    z-index: 3000 !important;
}

/* 修复 dropdown 和 popover 在小屏幕下的显示问题 */
@media (max-width: 768px) {
    #bili-header .el-dropdown__popper,
    #bili-header .el-popover {
        z-index: 3000 !important;
    }
    
    #bili-header .el-menu.el-menu--horizontal {
        z-index: 100;
    }
}
</style>
