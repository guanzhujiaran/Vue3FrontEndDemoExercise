<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElIcon } from 'element-plus'
import { BiliErrorRouteToTxt } from '@/assets/text/BiliErrorTxt.ts'
import { KeysEnum, useInject } from '@/models/base/provide_model.ts'
import type { UserNavModel } from '@/models/user/user_model.ts'
import { user_center_routes } from '@/router'
import router from '@/router'
import { RouteName } from '@/models/router'
import { Fold, Expand, Avatar } from '@element-plus/icons-vue'

const userInfo = useInject(KeysEnum.BiliUser) as Ref<UserNavModel>
const use_route = useRoute()

const isLoggedIn = computed(() => userInfo.value.uid && userInfo.value.uid !== '0')

// 添加侧边栏展开/收起状态
const isSidebarCollapsed = ref(false)

// 屏幕宽度检测
const screenWidth = ref(window.innerWidth)
const isSmallScreen = computed(() => screenWidth.value <= 768)

// 响应式侧边栏状态
const responsiveSidebarCollapsed = computed(() => {
  // 在小屏幕下，使用手动控制的状态
  // 在大屏幕下，如果手动收起，则使用收起状态
  return isSmallScreen.value ? isSidebarCollapsed.value : isSidebarCollapsed.value
})

// 切换侧边栏状态
const toggleSidebar = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value
}

// 监听窗口大小变化
const handleResize = () => {
  screenWidth.value = window.innerWidth
  
  // 在小屏幕时自动收起侧边栏
  if (isSmallScreen.value) {
    isSidebarCollapsed.value = true
  } else {
    // 大屏幕时恢复默认展开状态
    isSidebarCollapsed.value = false
  }
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  // 初始化时检查屏幕大小
  handleResize()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

// 菜单项点击处理函数
const handleMenuClick = (child: any) => {
  if (child.name) {
    router.push({ name: child.name })
  } else if (child.path) {
    router.push(child.path)
  }
}

const menuDefaultActive = computed(() => {
  // 如果有路由名称，直接使用
  if (use_route.name) {
    const matchedRoute = user_center_routes.find((route) => route.name === use_route.name)
    if (matchedRoute) {
      return matchedRoute.name as string
    }
  }

  // 如果是根路径，返回默认首页路由名
  if (use_route.path === '/app/user-center/') {
    const defaultRoute = user_center_routes.find((route) => route.path === '')
    return (defaultRoute?.name as string) || user_center_routes[0]?.name
  }

  return user_center_routes[0]?.name
})

const getCurrentRouteTitle = computed(() => {
  if (!use_route.name) return '浏览器管理'

  // 首先尝试直接匹配路由名称
  const currentRoute = user_center_routes.find((route) => route.name === use_route.name)
  if (currentRoute?.meta?.title) {
    return currentRoute.meta.title
  }

  // 如果直接匹配失败，尝试匹配RouteName枚举值
  const matchedRoute = user_center_routes.find(
    (route) =>
      route.name === RouteName.USER_CENTER_DASHBOARD && use_route.path === '/app/user-center/'
  )
  if (matchedRoute?.meta?.title) {
    return matchedRoute.meta.title
  }

  // 最后检查是否是根路径，返回默认首页标题
  if (use_route.path === '/app/user-center/') {
    const defaultRoute = user_center_routes.find((route) => route.path === '')
    return defaultRoute?.meta?.title || '浏览器管理首页'
  }

  return use_route.name as string
})
const env = import.meta.env
const mainContentRef = ref<HTMLElement | null>(null)
const headerRef = ref<HTMLElement | null>(null)

const scrollbarHeight = computed(() => {
  if (!mainContentRef.value || !headerRef.value) return 0
  return mainContentRef.value.clientHeight - headerRef.value.clientHeight
})
</script>

<template>
  <FlexContainer>
    <el-container v-if="isLoggedIn">
      <div class="user-center-layout">
        <!-- 侧边栏 -->
        <el-aside class="sidebar" :class="{ 'sidebar-collapsed': responsiveSidebarCollapsed, 'sidebar-small': isSmallScreen }">
          <div class="sidebar-content">
            <el-menu
              :defaultActive="menuDefaultActive"
              class="sidebar-menu"
              :collapse="responsiveSidebarCollapsed"
            >
              <div class="sidebar-toggle-wrapper">
                <el-button
                  link
                  :icon="responsiveSidebarCollapsed ? Expand : Fold"
                  @click="toggleSidebar"
                  class="sidebar-toggle-button"
                  size="large"
                ></el-button>
              </div>

              <div
                class="user-info hover:cursor-pointer"
                @click="router.push({ name: RouteName.USER_CENTER })"
              >
                <el-avatar :icon="Avatar" />
                <div class="user-details">
                  <div class="user-name">{{ userInfo.user_name }}</div>
                  <div class="user-role">
                    {{ userInfo.role === 'root' ? '管理员' : '普通用户' }}
                  </div>
                </div>
              </div>

              <div
                v-for="(child, index) in user_center_routes"
                :key="index"
                @click="handleMenuClick(child)"
                class="menu-item-wrapper"
              >
                <el-menu-item
                  :index="child.name"
                  :title="child.meta.description || child.meta.title"
                >
                  <el-icon v-if="child.meta.icon">
                    <component :is="child.meta.icon" />
                  </el-icon>
                  <span>{{ child.meta.title }}</span>
                </el-menu-item>
              </div>
            </el-menu>
          </div>
        </el-aside>
        <!-- 主内容区 -->
        <el-main class="main-content" ref="mainContentRef">
          <el-header class="content-header" ref="headerRef">
            <h2>
              {{ getCurrentRouteTitle }}
            </h2>
          </el-header>
          <el-scrollbar
            :height="scrollbarHeight"
            wrap-style="display:flex;"
            view-style="flex-grow:1;"
          >
            <div class="content-body">
              <RouterView v-slot="{ Component, route }">
                <div v-if="Component">
                  <transition name="slide-fade" mode="out-in">
                    <keep-alive>
                      <component :is="Component" :key="route.path" />
                    </keep-alive>
                  </transition>
                </div>
                <div v-else class="empty-state">
                  <p>未找到组件 - 路由: {{ route.path }}, 名称: {{ route.name }}</p>
                </div>
              </RouterView>
            </div>
          </el-scrollbar>
        </el-main>
      </div>
    </el-container>
    <BiliErrorRouteTo v-else :props="BiliErrorRouteToTxt.unauthorized" />
  </FlexContainer>
</template>

<style scoped>
@import '@/assets/components/user/user-center-tailwind.css';
</style>
