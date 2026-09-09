<template>
  <BiliSideNavLayout :nav-groups="navGroups">
    <!-- 右侧主区缓存：切换左侧菜单 / 返回已访问页面时不重新挂载、不重新拉数据 -->
    <router-view v-slot="{ Component, route }">
      <keep-alive :max="12">
        <component :is="Component" :key="String(route.name)" />
      </keep-alive>
    </router-view>
  </BiliSideNavLayout>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue'
import { Bell, ChatDotRound, Comment, Key, Checked, Collection, Avatar, Flag, Stamp, Document, Medal, CollectionTag } from '@element-plus/icons-vue'
import icShoucang from '@/assets/svgs/audit/shoucang.svg?component'
import { useMessageAdminStore } from '@/stores/message_admin'
import BiliSideNavLayout from '@/components/CommonCompo/Bili-Container-Compo/BiliSideNavLayout.vue'

const messageAdminStore = useMessageAdminStore()

// 主动拉取管理端身份，确保侧边栏在直接进入 /app/admin 时也能正确填充
if (!messageAdminStore.loaded) messageAdminStore.fetchStatus()

const isRpaAdmin = computed(() =>
  Boolean(messageAdminStore.status?.is_admin || messageAdminStore.status?.is_root)
)
const isMessageRoot = computed(() => Boolean(messageAdminStore.status?.is_root))

interface NavItem {
  name: string
  title: string
  icon: Component
}
interface NavGroup {
  title: string
  shortTitle?: string
  items: NavItem[]
}

const navGroups = computed<NavGroup[]>(() => {
  const groups: NavGroup[] = []
  if (isRpaAdmin.value) {
    const rpaItems: NavItem[] = [
      { name: 'ADMIN_RPA_APPROVAL', title: '操作审批', icon: Stamp },
      { name: 'ADMIN_RPA_AUDIT', title: '操作审计', icon: Document },
      { name: 'ADMIN_RPA_CERT', title: '官方认证', icon: Medal },
      { name: 'ADMIN_RPA_TAG', title: '标签管理', icon: CollectionTag }
    ]
    groups.push({ title: 'RPA 管理', items: rpaItems })
  }
  const messageItems: NavItem[] = []
  if (isRpaAdmin.value) {
    messageItems.push({ name: 'ADMIN_MESSAGE_NOTIFY', title: '通知管理', icon: Bell })
    messageItems.push({ name: 'ADMIN_MESSAGE_DM', title: '私信审核', icon: ChatDotRound })
    messageItems.push({ name: 'ADMIN_MESSAGE_COMMENT', title: '评论审核', icon: Comment })
  }
  if (messageItems.length) {
    groups.push({ title: '消息管理端', shortTitle: '消息', items: messageItems })
  }
  if (isMessageRoot.value) {
    groups.push({
      title: '权限设置',
      items: [{ name: 'ADMIN_PERMISSION', title: '管理端权限', icon: Key }]
    })
  }
  if (isRpaAdmin.value) {
    groups.push({
      title: '举报审核',
      items: [{ name: 'ADMIN_REPORT', title: '举报审核', icon: Flag }]
    })
    groups.push({
      title: '动态管理端',
      shortTitle: '动态',
      items: [
        { name: 'ADMIN_MOMENT_AUDIT', title: '动态审核', icon: Checked },
        { name: 'ADMIN_MOMENT_TOPIC_AUDIT', title: '话题审核', icon: Collection }
      ]
    })
    groups.push({
      title: '用户管理端',
      shortTitle: '用户',
      items: [
        { name: 'ADMIN_USER_AVATAR_AUDIT', title: '头像审核', icon: Avatar },
        { name: 'ADMIN_USER_FOLDER_COVER_AUDIT', title: '封面审核', icon: icShoucang }
      ]
    })
  }
  return groups
})
</script>
