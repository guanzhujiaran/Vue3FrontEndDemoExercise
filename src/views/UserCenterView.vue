<template>
  <div class="user-center h-full">
    <BiliSideNavLayout :nav-groups="navGroups">
      <template #default>
        <router-view v-slot="{ Component }">
          <component :is="Component" />
        </router-view>
      </template>
    </BiliSideNavLayout>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { User, HomeFilled, Tickets, CircleClose, Warning } from '@element-plus/icons-vue'
import { RouteName } from '@/models/router/index.ts'
import type { BiliSideNavGroup } from '@/components/CommonCompo/Bili-Container-Compo/BiliSideNavLayout.vue'
import BiliSideNavLayout from '@/components/CommonCompo/Bili-Container-Compo/BiliSideNavLayout.vue'

defineOptions({ name: 'UserCenterView' })

// 复用通用侧边导航布局：菜单项 name 必须对应已注册子路由的 name（RouteName 枚举值），
// 由布局内部负责跳转与高亮。
const navGroups = computed<BiliSideNavGroup[]>(() => [
  {
    title: '个人中心',
    items: [
      { name: RouteName.USER_CENTER_DASHBOARD, title: '仪表盘', icon: HomeFilled },
      { name: RouteName.USER_INFO_CONFIG, title: '个人资料', icon: User },
      { name: RouteName.USER_CENTER_RECORDS, title: '我的记录', icon: Tickets },
      { name: RouteName.USER_CENTER_BLOCKLIST, title: '黑名单', icon: CircleClose },
      { name: RouteName.USER_CENTER_DEACTIVATE, title: '账号注销', icon: Warning }
    ]
  }
])
</script>
