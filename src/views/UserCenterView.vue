<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { ElIcon } from 'element-plus'
import { Avatar, Expand, Fold } from '@element-plus/icons-vue'
import { BiliErrorRouteToTxt } from '@/assets/text/BiliErrorTxt.ts'
import { KeysEnum, useInject } from '@/models/base/provide_model.ts'
import type { UserNavModel } from '@/models/user/user_model.ts'
import { user_center_routes } from '@/router'
import router from '@/router'
import { RouteName } from '@/models/router'

const userInfo = useInject(KeysEnum.BiliUser) as Ref<UserNavModel>
const use_route = useRoute()

const isLoggedIn = computed(() => userInfo.value.uid && userInfo.value.uid !== '0')

// 添加侧边栏展开/收起状态
const isSidebarCollapsed = ref(false)

// 切换侧边栏状态
const toggleSidebar = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value
}

// 菜单项点击处理函数
const handleMenuClick = (child: any) => {
  if (child.name) {
    router.push({ name: child.name })
  } else if (child.path) {
    router.push(child.path)
  }
}

const menuDefaultActive = computed(() => {
  return (use_route.name as string) ?? user_center_routes[0]?.name
})
</script>

<template>
  <FlexContainer>
    <el-container v-if="isLoggedIn" class="user-center-layout">
      <!-- 侧边栏 -->
      <el-aside class="sidebar" :class="{ 'sidebar-collapsed': isSidebarCollapsed }">
        <div class="sidebar-content">
          <el-menu
            :defaultActive="menuDefaultActive"
            class="sidebar-menu"
            :collapse="isSidebarCollapsed"
          >
            <div class="sidebar-toggle-wrapper">
              <el-button
                type="text"
                :icon="isSidebarCollapsed ? Expand : Fold"
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
              <div class="user-details" v-if="!isSidebarCollapsed">
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
              <el-menu-item :index="child.name" :title="child.meta.title">
                <el-icon v-if="child.meta.icon">
                  <component :is="child.meta.icon" />
                </el-icon>
                <span v-if="!isSidebarCollapsed">{{ child.meta.title }}</span>
              </el-menu-item>
            </div>
          </el-menu>
        </div>
      </el-aside>
      <!-- 主内容区 -->
      <el-container class="main-content">
        <el-header class="content-header">
          <h2>
            {{ use_route.name }}
          </h2>
        </el-header>
        <el-main class="content-body">
          <RouterView v-slot="{ Component, route }">
            <transition name="slide-fade" mode="out-in">
              <keep-alive>
                <component :is="Component" :key="route.path" />
              </keep-alive>
            </transition>
          </RouterView>
        </el-main>
      </el-container>
    </el-container>
    <BiliErrorRouteTo v-else :props="BiliErrorRouteToTxt.unauthorized" />
  </FlexContainer>
</template>

<style scoped>
@import '@/assets/components/user/user-center-tailwind.css';
</style>
