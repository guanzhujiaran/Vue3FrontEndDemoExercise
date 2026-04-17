<template>
  <div class="user-center-default-panel">
    <el-card class="welcome-card">
      <template #header>
        <div class="card-header">
          <el-icon><Avatar /></el-icon>
          <span>欢迎来到浏览器管理</span>
        </div>
      </template>
      <div class="welcome-content">
        <p>您好，{{ userInfo.user_name }}！欢迎回到浏览器管理。</p>
        <p>在这里您可以管理您的浏览器指纹、插件配置以及其他相关内容。</p>

        <div class="quick-actions">
          <h3>快速操作</h3>
          <el-row :gutter="20">
            <el-col
              v-for="route in userCenterRoutes"
              :key="route.name"
              :span="12"
            >
              <el-card class="action-card" @click="navigateToRoute(route)">
                <el-icon v-if="route.meta?.icon">
                  <component :is="route.meta.icon" />
                </el-icon>
                <p>{{ route.meta?.title || route.name }}</p>
                <div class="route-description" v-if="route.meta?.description">
                  {{ route.meta.description }}
                </div>
              </el-card>
            </el-col>
          </el-row>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { KeysEnum, useInject } from '@/models/base/provide_model'
import type { UserNavModel } from '@/models/user/user_model'
import type { Ref } from 'vue'
import { user_center_routes } from '@/router/index'
import type { CustomRouteRecordRaw } from '@/models/router/index'
import { Link } from '@element-plus/icons-vue'

const router = useRouter()
const userInfo = useInject(KeysEnum.BiliUser) as Ref<UserNavModel>

// 过滤出用户中心的路由（排除当前首页）
const userCenterRoutes = user_center_routes.filter(route =>
  route.name !== 'USER_CENTER_DASHBOARD'
)

const navigateToRoute = (route: CustomRouteRecordRaw) => {
  router.push({ name: route.name })
}
</script>


