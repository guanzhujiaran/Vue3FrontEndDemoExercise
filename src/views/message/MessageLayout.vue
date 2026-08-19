<template>
  <div class="message-layout flex-1 h-full flex flex-col overflow-hidden bg-msg-main text-msg-text-active">
    <BiliErrorRouteTo v-if="!isLoggedIn" :detail="BiliErrorRouteToTxt.message_login_required" />
    <template v-else>
    <div class="message-layout__body flex-1 min-h-0 flex">
      <el-menu
        :default-active="activeIndex"
        :collapse="collapsed"
        :collapse-transition="true"
        class="message-layout__nav shrink-0 overflow-y-auto border-r-0! bg-msg-sidebar! py-4"
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
        <header class="message-layout__header flex items-center justify-between border-b border-msg-divider px-6 py-4 shrink-0">
          <h1 class="message-layout__title text-base font-bold">{{ pageTitle }}</h1>
        </header>
        <div class="message-layout__content flex-1 min-h-0 overflow-hidden">
          <div class="message-layout__content-inner px-6 pb-6 pt-4">
            <!-- keep-alive 缓存各子页面：切子路由/切走再切回时保留内容与滚动位置，避免重复挂载请求 -->
            <router-view v-slot="{ Component }">
              <keep-alive :include="messagePageCacheNames">
                <component
                  :is="Component"
                  v-model:dm-unread="unread.dm"
                  v-model:reply-unread="unread.reply"
                  v-model:at-unread="unread.at"
                  v-model:like-unread="unread.like"
                  v-model:notify-unread="unread.notify"
                  @refresh-unread="refreshUnread"
                />
              </keep-alive>
            </router-view>
          </div>
        </div>
      </main>
    </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, type Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChatDotRound, ChatLineRound, Promotion, Pointer, Bell, Setting, Fold, Expand } from '@element-plus/icons-vue'
import { useMessageUnreadStore } from '@/stores/message_unread'
import { useHeartbeat } from '@/composables/useHeartbeat'
import { fetchUnreadSummary, type UnreadSummary } from '@/api/notify/message-api'
import { useInject, KeysEnum } from '@/models/base/provide_model.ts'
import type { UserNavModel } from '@/models/user/user_model.ts'
import BiliErrorRouteTo from '@/components/CommonCompo/Bili-Feedback-Compo/BiliErrorRouteTo.vue'
import { BiliErrorRouteToTxt } from '@/assets/text/BiliErrorTxt.ts'
import { useI18n } from 'vue-i18n'

defineOptions({ name: 'MessageLayout' })

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const unreadStore = useMessageUnreadStore()
const collapsed = ref(false)

const biliUser = useInject(KeysEnum.BiliUser) as Ref<UserNavModel>
const isLoggedIn = computed(() => !!biliUser.value.uid)

// keep-alive 缓存的子页面组件名（会话/回复/@/赞/通知/设置）。
// 聊天页 DmListView 按 talkerMid 动态切换、管理后台页各有独立状态，均不缓存。
const messagePageCacheNames = [
  'DmSessionListView',
  'ReplyListView',
  'AtListView',
  'LikeListView',
  'NotifyListView',
  'MessageSettingsView'
]

// 各模块未读数统一在此持有，仅通过 msg_feed/unread 拉取一次，再经 v-model 下发
const unread = reactive<UnreadSummary>({
  like: 0, reply: 0, at: 0, notify: 0, dm: 0, total: 0
})

const navItems = computed(() => [
  { name: 'MESSAGE_HOME', title: t('message.navMyMessages'), icon: ChatDotRound, badge: true, badgeValue: unread.dm ?? 0 },
  { name: 'MESSAGE_REPLIES', title: t('message.navReplies'), icon: ChatLineRound, badge: true, badgeValue: unread.reply ?? 0 },
  { name: 'MESSAGE_ATS', title: t('message.navAts'), icon: Promotion, badge: true, badgeValue: unread.at ?? 0 },
  { name: 'MESSAGE_LIKES', title: t('message.navLikes'), icon: Pointer, badge: true, badgeValue: unread.like ?? 0 },
  { name: 'MESSAGE_NOTIFY', title: t('message.navNotify'), icon: Bell, badge: true, badgeValue: unread.notify ?? 0 },
  { name: 'MESSAGE_SETTINGS', title: t('message.navSettings'), icon: Setting, badge: false, badgeValue: 0 },
])

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

// 心跳周期刷新复用同一个 refreshUnread；未登录时跳过心跳与未读请求
useHeartbeat(undefined, refreshUnread, () => isLoggedIn.value)

const activeIndex = computed(() => (route.name ? String(route.name) : ''))
const pageTitle = computed(() => String(route.meta?.title ?? t('message.titleFallback')))

function handleSelect(index: string) {
  router.push({ name: index })
}
</script>
