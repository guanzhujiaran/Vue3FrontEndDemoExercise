<script setup lang="ts">
import { onMounted, onUnmounted, computed, ref, watch } from 'vue'
import { type GlobalVarsType, ScreenTypeEnum } from '@/models/global_var/global_var_model.ts'
import { useInject, KeysEnum } from '@/models/base/provide_model.ts'
import { useRoute } from 'vue-router'
import { routes } from '@/router'
import { processRoutesForHeader } from '@/utils/routeUtils.ts'
import { useRpaAdminStore } from '@/stores/rpa_admin.ts'
import { useMessageAdminStore } from '@/stores/message_admin.ts'

const globalVars = useInject(KeysEnum.GlobalVars) as Ref<GlobalVarsType>
const rpaAdminStore = useRpaAdminStore()
const messageAdminStore = useMessageAdminStore()

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
// 管理员专属入口仅在当前用户为管理员/root 时展示（后端仍强制校验，防越权）
// 管理端入口严格按权限显隐：未登录或非管理员一律不展示，与管理后台访问守卫一致
// 管理端入口：RPA 管理员 或 消息管理端 root 均可见
const isAdminForNav = computed(
  () =>
    rpaAdminStore.status.is_admin ||
    rpaAdminStore.status.is_root ||
    messageAdminStore.status.is_root,
)
const navigationData = computed(() => {
  // /app/admin 已通过 meta.isHeaderShow + meta.adminOnly 接入 processRoutesForHeader，
  // 与管理端身份联动显隐，无需手动追加导航项
  return processRoutesForHeader(routes, '', true, isAdminForNav.value)
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
  // 拉取 RPA 管理员角色状态（用于管理员专属导航显隐）
  rpaAdminStore.fetchStatus()
  // 拉取消息管理端身份（消息端 root 同样可见「管理后台」入口）
  messageAdminStore.fetchStatus()
})

// 路由切换且尚未拉取过状态时，补拉管理员状态
watch(
  () => route.path,
  () => {
    if (!rpaAdminStore.loaded) {
      rpaAdminStore.fetchStatus()
    }
    if (!messageAdminStore.loaded) {
      messageAdminStore.fetchStatus()
    }
  }
)

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
