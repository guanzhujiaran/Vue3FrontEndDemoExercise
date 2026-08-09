<template>
  <div class="message-layout flex-1 h-full flex flex-col overflow-hidden bg-msg-main text-msg-text-active">
    <div class="message-layout__body flex-1 min-h-0 flex">
      <el-menu
        :default-active="activeIndex"
        :collapse="collapsed"
        :collapse-transition="true"
        class="message-layout__nav shrink-0 overflow-y-auto border-r-0! bg-msg-sidebar! py-4"
        style="--el-menu-text-color: var(--color-msg-text); --el-menu-hover-bg-color: var(--color-msg-sidebar-hover); --el-menu-active-color: var(--color-msg-link);"
        @select="handleSelect"
      >
        <div v-if="collapsed" class="message-layout__expand-row flex justify-center pb-3">
          <el-button
            class="message-layout__collapse-btn"
            text
            :icon="Expand"
            title="展开菜单"
            @click="collapsed = false"
          />
        </div>
        <el-menu-item
          v-for="item in navItems"
          :key="item.name"
          :index="item.name"
          class="message-layout__nav-item h-7 mb-3 text-lg last:mb-0"
        >
          <el-icon><component :is="item.icon" /></el-icon>
          <template #title>
            <div class="flex w-full items-center">
              <span class="message-layout__nav-text flex-1 truncate text-lg">{{ item.title }}</span>
              <el-badge
                v-if="item.badge && item.badgeValue > 0"
                :value="item.badgeValue"
                :max="99"
                type="danger"
                class="mr-8"
              />
              <el-button
                v-if="item.name === 'MESSAGE_HOME'"
                class="message-layout__collapse-btn ml-2"
                text
                :icon="Fold"
                title="收起菜单"
                @click.stop="collapsed = true"
              />
            </div>
          </template>
        </el-menu-item>
      </el-menu>

      <main class="message-layout__main flex-1 min-h-0 flex flex-col overflow-hidden">
        <header class="message-layout__header flex items-center border-b border-msg-divider px-6 py-4 shrink-0">
          <h1 class="message-layout__title text-base font-bold">{{ pageTitle }}</h1>
        </header>
        <el-scrollbar class="message-layout__content flex-1 min-h-0">
          <div class="message-layout__content-inner px-6 pb-6 pt-4">
            <router-view v-slot="{ Component }">
              <component
                :is="Component"
                v-model:dm-unread="unread.dm"
                v-model:reply-unread="unread.reply"
                v-model:at-unread="unread.at"
                v-model:like-unread="unread.like"
                v-model:notify-unread="unread.notify"
                @refresh-unread="refreshUnread"
              />
            </router-view>
          </div>
        </el-scrollbar>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ChatDotRound,
  ChatLineRound,
  Promotion,
  Pointer,
  Bell,
  Setting,
  Fold,
  Expand,
} from '@element-plus/icons-vue'
import { useMessageUnreadStore } from '@/stores/message_unread'
import { useHeartbeat } from '@/composables/useHeartbeat'
import { fetchUnreadSummary, type UnreadSummary } from '@/api/notify/message-api'

const route = useRoute()
const router = useRouter()
const unreadStore = useMessageUnreadStore()
const collapsed = ref(false)

// 各模块未读数统一在此持有，仅通过 msg_feed/unread 拉取一次（周期刷新也走这里），
// 再经 v-model 下发给各子路由组件，子组件不再各自调用该接口。
const unread = reactive<UnreadSummary>({
  like: 0,
  reply: 0,
  at: 0,
  notify: 0,
  dm: 0,
  total: 0
})

// 唯一调用 msg_feed/unread 的入口：刷新 store + 本地 unread，供 v-model 下发
async function refreshUnread() {
  const s = await fetchUnreadSummary()
  if (!s) return
  unreadStore.applySummary(s)
  unread.like = s.like ?? 0
  unread.reply = s.reply ?? 0
  unread.at = s.at ?? 0
  unread.notify = s.notify ?? 0
  unread.dm = s.dm ?? 0
  unread.total = s.total ?? 0
}

// 心跳周期刷新复用同一个 refreshUnread：进入消息中心立即拉一次，之后按周期刷新。
// useHeartbeat 在激活时自动 start（首屏立即 tick 一次），无需再单独 onMounted 调用，
// 否则会与心跳里的首次 tick 重复触发一次刷新。
useHeartbeat(undefined, refreshUnread)

const navItems = computed(() => [
  { name: 'MESSAGE_HOME', title: '我的消息', icon: ChatDotRound, badge: true, badgeValue: unread.dm },
  { name: 'MESSAGE_REPLIES', title: '回复我的', icon: ChatLineRound, badge: true, badgeValue: unread.reply },
  { name: 'MESSAGE_ATS', title: '@我的', icon: Promotion, badge: true, badgeValue: unread.at },
  { name: 'MESSAGE_LIKES', title: '收到的赞', icon: Pointer, badge: true, badgeValue: unread.like },
  { name: 'MESSAGE_NOTIFY', title: '系统通知', icon: Bell, badge: true, badgeValue: unread.notify },
  { name: 'MESSAGE_SETTINGS', title: '消息设置', icon: Setting, badge: false, badgeValue: 0 },
])

const activeIndex = computed(() => (route.name ? String(route.name) : ''))

function handleSelect(index: string) {
  router.push({ name: index })
}

const pageTitle = computed(() => String(route.meta?.title ?? '我的消息'))
</script>
