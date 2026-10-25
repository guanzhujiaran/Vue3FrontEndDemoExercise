<template>
  <div class="admin-overview flex flex-col gap-6">
    <div class="flex flex-col gap-1">
      <el-text class="text-xl font-bold">管理后台</el-text>
      <el-text class="text-text-regular">这里集中管理 RPA 浏览器与消息中心的管理员功能，已与服务类界面分离。</el-text>
    </div>

    <!-- 数据概览：审核待办多维统计（与首页共用组件；抽奖数据维度由「即将开奖」区块一并展示） -->
    <StatsOverviewCards />

    <div class="admin-overview__grid grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <router-link
        v-for="item in items"
        :key="item.name"
        :to="{ name: item.name }"
        class="admin-overview__card flex items-center gap-3 rounded-lg border border-border-lighter bg-primary-light-9 p-4 transition-colors hover:border-primary hover:bg-primary-light-8"
      >
        <el-icon class="text-2xl text-primary"><component :is="item.icon" /></el-icon>
        <div class="flex flex-col">
          <span class="font-bold text-text-primary">{{ item.title }}</span>
          <span class="text-sm text-text-secondary">{{ item.desc }}</span>
        </div>
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue'
import { Setting, Bell, ChatDotRound, Comment, Key, DataAnalysis } from '@element-plus/icons-vue'
import { useMessageAdminStore } from '@/stores/message_admin'
import StatsOverviewCards from '@/components/admin/StatsOverviewCards.vue'

const messageAdminStore = useMessageAdminStore()

// 主动拉取管理端身份，确保侧边栏在直接进入 /app/admin 时也能正确填充
if (!messageAdminStore.loaded) messageAdminStore.fetchStatus()

const isRpaAdmin = computed(() =>
  Boolean(messageAdminStore.status?.is_admin || messageAdminStore.status?.is_root)
)
const isMessageRoot = computed(() => Boolean(messageAdminStore.status?.is_root))

interface OverviewItem {
  name: string
  title: string
  desc: string
  icon: Component
}

const items = computed<OverviewItem[]>(() => {
  const list: OverviewItem[] = []
  if (isRpaAdmin.value) {
    list.push({ name: 'ADMIN_BILI_CRAWLER_SUMMARY', title: '抽奖数据', desc: '按抽奖类型统计未开奖、昨日/本周/本月新增等', icon: DataAnalysis })
    list.push({ name: 'ADMIN_RPA', title: 'RPA 管理后台', desc: '操作审批、官方认证、标签与操作审计', icon: Setting })
    list.push({ name: 'ADMIN_MESSAGE_NOTIFY', title: '通知管理', desc: '系统通知的发布与管理', icon: Bell })
    list.push({ name: 'ADMIN_MESSAGE_DM', title: '私信审核', desc: '审核用户私信内容', icon: ChatDotRound })
    list.push({ name: 'ADMIN_MESSAGE_COMMENT', title: '评论审核', desc: '审核用户评论内容', icon: Comment })
  }
  if (isMessageRoot.value) {
    list.push({ name: 'ADMIN_PERMISSION', title: '管理端权限', desc: '授予 / 撤销各资源域的管理端权限（rwx 位掩码）', icon: Key })
    list.push({ name: 'ADMIN_SYS_CONFIG', title: '系统配置', desc: '运行时参数热更新（评论频率限制等），改完无需重启', icon: Setting })
  }
  return list
})
</script>
