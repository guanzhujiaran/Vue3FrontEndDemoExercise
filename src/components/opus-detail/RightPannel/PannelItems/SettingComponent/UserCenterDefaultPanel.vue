<template>
  <div class="user-center-default-panel">
    <el-card class="welcome-card">
      <template #header>
        <div class="card-header">
          <el-icon><Avatar /></el-icon>
          <span>欢迎来到用户中心</span>
        </div>
      </template>
      <div class="welcome-content">
        <p>您好，{{ userInfo.user_name }}！欢迎回到用户中心。</p>
        <p>在这里您可以管理您的个人信息、浏览器配置以及其他相关内容。</p>

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

<style scoped>

.welcome-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.welcome-content p {
  margin: 10px 0;
  line-height: 1.6;
}

.quick-actions {
  margin-top: 20px;
}

.quick-actions h3 {
  margin-bottom: 15px;
}

.action-card {
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.action-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.action-card .el-icon {
  font-size: 24px;
  margin-bottom: 10px;
  color: var(--el-color-primary);
}

.action-card p {
  margin: 5px 0;
  font-weight: 500;
  font-size: 14px;
}

.route-description {
  font-size: 12px;
  color: var(--el-color-info);
  margin-top: 5px;
  line-height: 1.4;
  max-height: 40px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.info-card {
  margin-top: 20px;
}

.info-content p {
  margin: 8px 0;
}

.sso-tip-card {
  margin-top: 20px;
}

.sso-tip-content p {
  margin: 8px 0;
}

.sso-tip-content .bind-link {
  margin-top: 10px;
}
</style>