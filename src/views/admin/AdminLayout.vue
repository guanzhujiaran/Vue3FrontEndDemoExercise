<template>
  <div class="admin-layout flex-1 h-full flex flex-col overflow-hidden bg-bg-page text-text-primary">
    <div class="admin-layout__body flex-1 min-h-0 flex">
      <aside class="admin-layout__sidebar w-60 shrink-0 overflow-y-auto border-r border-border-lighter bg-primary-light-9 py-4">
        <div class="admin-layout__sidebar-head flex items-center gap-2 px-5 pb-4">
          <el-icon class="text-primary"><Setting /></el-icon>
          <span class="text-base font-bold">管理后台</span>
        </div>
        <nav class="admin-layout__nav">
          <div v-for="group in navGroups" :key="group.title" class="admin-layout__nav-group">
            <div class="admin-layout__nav-group-title px-5 py-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
              {{ group.title }}
            </div>
            <router-link
              v-for="item in group.items"
              :key="item.name"
              :to="{ name: item.name }"
              class="admin-layout__nav-item group relative flex items-center gap-2 px-5 py-3 text-sm text-text-regular transition-colors hover:bg-primary-light-8 hover:text-text-primary"
              :class="route.name === item.name ? 'bg-primary-light-8 text-primary before:absolute before:left-0 before:top-1/2 before:h-5 before:w-0.75 before:-translate-y-1/2 before:rounded-r-sm before:bg-primary' : ''"
            >
              <el-icon><component :is="item.icon" /></el-icon>
              <span>{{ item.title }}</span>
            </router-link>
          </div>
        </nav>
      </aside>

      <main class="admin-layout__main flex-1 min-h-0 flex flex-col overflow-hidden">
        <header class="admin-layout__header flex items-center justify-between border-b border-border-lighter px-6 py-4 shrink-0">
          <h1 class="admin-layout__title text-base font-bold">{{ pageTitle }}</h1>
        </header>
        <el-scrollbar class="admin-layout__content flex-1 min-h-0">
          <div class="admin-layout__content-inner px-6 pb-6 pt-4">
            <router-view />
          </div>
        </el-scrollbar>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue'
import { useRoute } from 'vue-router'
import { Setting, Bell, ChatDotRound, Comment, Key } from '@element-plus/icons-vue'
import { useRpaAdminStore } from '@/stores/rpa_admin'
import { useMessageAdminStore } from '@/stores/message_admin'

const route = useRoute()
const rpaAdminStore = useRpaAdminStore()
const messageAdminStore = useMessageAdminStore()

// 主动拉取管理端身份，确保侧边栏在直接进入 /app/admin 时也能正确填充
if (!rpaAdminStore.loaded) rpaAdminStore.fetchStatus()
if (!messageAdminStore.loaded) messageAdminStore.fetchStatus()

const isRpaAdmin = computed(() =>
  Boolean(rpaAdminStore.status?.is_admin || rpaAdminStore.status?.is_root)
)
const isMessageRoot = computed(() => Boolean(messageAdminStore.status?.is_root))

interface NavItem {
  name: string
  title: string
  icon: Component
}
interface NavGroup {
  title: string
  items: NavItem[]
}

const navGroups = computed<NavGroup[]>(() => {
  const groups: NavGroup[] = []
  if (isRpaAdmin.value) {
    groups.push({
      title: 'RPA 管理',
      items: [{ name: 'ADMIN_RPA', title: 'RPA 管理后台', icon: Setting }]
    })
  }
  const messageItems: NavItem[] = []
  if (isRpaAdmin.value) {
    messageItems.push({ name: 'ADMIN_MESSAGE_NOTIFY', title: '通知管理', icon: Bell })
    messageItems.push({ name: 'ADMIN_MESSAGE_DM', title: '私信审核', icon: ChatDotRound })
    messageItems.push({ name: 'ADMIN_MESSAGE_COMMENT', title: '评论审核', icon: Comment })
  }
  if (isMessageRoot.value) {
    messageItems.push({ name: 'ADMIN_MESSAGE_PERMISSION', title: '管理端权限', icon: Key })
  }
  if (messageItems.length) {
    groups.push({ title: '消息管理端', items: messageItems })
  }
  return groups
})

const pageTitle = computed(() => String(route.meta?.title ?? '管理后台'))
</script>
