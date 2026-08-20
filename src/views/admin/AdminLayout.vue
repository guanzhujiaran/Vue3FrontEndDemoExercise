<template>
  <BiliSideNavLayout :nav-groups="navGroups">
    <router-view />
  </BiliSideNavLayout>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue'
import { Setting, Bell, ChatDotRound, Comment, Key, Checked, Collection, Avatar } from '@element-plus/icons-vue'
import { useRpaAdminStore } from '@/stores/rpa_admin'
import { useMessageAdminStore } from '@/stores/message_admin'
import BiliSideNavLayout from '@/components/CommonCompo/Bili-Container-Compo/BiliSideNavLayout.vue'

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
      items: [{ name: 'ADMIN_RPA', title: 'RPA 管理后台', shortTitle: 'RPA', icon: Setting }]
    })
  }
  const messageItems: NavItem[] = []
  if (isRpaAdmin.value) {
    messageItems.push({ name: 'ADMIN_MESSAGE_NOTIFY', title: '通知管理', shortTitle: '通知', icon: Bell })
    messageItems.push({ name: 'ADMIN_MESSAGE_DM', title: '私信审核', shortTitle: '私信', icon: ChatDotRound })
    messageItems.push({ name: 'ADMIN_MESSAGE_COMMENT', title: '评论审核', shortTitle: '评论', icon: Comment })
  }
  if (isMessageRoot.value) {
    messageItems.push({ name: 'ADMIN_MESSAGE_PERMISSION', title: '管理端权限', shortTitle: '权限', icon: Key })
  }
  if (messageItems.length) {
    groups.push({ title: '消息管理端', items: messageItems })
  }
  if (isRpaAdmin.value) {
    groups.push({
      title: '动态管理端',
      items: [
        { name: 'ADMIN_MOMENT_AUDIT', title: '动态审核', shortTitle: '动态', icon: Checked },
        { name: 'ADMIN_MOMENT_TOPIC_AUDIT', title: '话题审核', shortTitle: '话题', icon: Collection }
      ]
    })
    groups.push({
      title: '用户管理端',
      items: [{ name: 'ADMIN_USER_AVATAR_AUDIT', title: '头像审核', shortTitle: '头像', icon: Avatar }]
    })
  }
  return groups
})
</script>
