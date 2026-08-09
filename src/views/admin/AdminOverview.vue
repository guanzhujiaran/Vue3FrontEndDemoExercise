<template>
  <div class="admin-overview flex flex-col gap-6">
    <div class="flex flex-col gap-1">
      <el-text class="text-xl font-bold">管理后台</el-text>
      <el-text class="text-text-regular">这里集中管理 RPA 浏览器与消息中心的管理员功能，已与服务类界面分离。</el-text>
    </div>
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
import { Setting, Bell, ChatDotRound, Comment, Key } from '@element-plus/icons-vue'
import { useRpaAdminStore } from '@/stores/rpa_admin'
import { useMessageAdminStore } from '@/stores/message_admin'

const rpaAdminStore = useRpaAdminStore()
const messageAdminStore = useMessageAdminStore()

const isRpaAdmin = computed(() =>
  Boolean(rpaAdminStore.status?.is_admin || rpaAdminStore.status?.is_root)
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
    list.push({ name: 'ADMIN_RPA', title: 'RPA 管理后台', desc: '审批、官方认证、标签与管理员权限', icon: Setting })
    list.push({ name: 'ADMIN_MESSAGE_NOTIFY', title: '通知管理', desc: '系统通知的发布与管理', icon: Bell })
    list.push({ name: 'ADMIN_MESSAGE_DM', title: '私信审核', desc: '审核用户私信内容', icon: ChatDotRound })
    list.push({ name: 'ADMIN_MESSAGE_COMMENT', title: '评论审核', desc: '审核用户评论内容', icon: Comment })
  }
  if (isMessageRoot.value) {
    list.push({ name: 'ADMIN_MESSAGE_PERMISSION', title: '管理端权限', desc: '授予 / 撤销消息管理端细粒度权限', icon: Key })
  }
  return list
})
</script>
