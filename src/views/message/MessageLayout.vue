<template>
  <div class="message-layout">
    <BiliErrorRouteTo v-if="!isLoggedIn" :detail="BiliErrorRouteToTxt.message_login_required" />
    <BiliSideNavLayout v-else :nav-groups="navGroups">
      <template #default>
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
      </template>
    </BiliSideNavLayout>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, type Ref } from 'vue'
import { ChatDotRound, ChatLineRound, Promotion, Pointer, Bell, Setting } from '@element-plus/icons-vue'
import { useMessageUnreadStore } from '@/stores/message_unread'
import { useHeartbeat } from '@/composables/useHeartbeat'
import { fetchUnreadSummary, type UnreadSummary } from '@/api/notify/message-api'
import { useInject, KeysEnum } from '@/models/base/provide_model.ts'
import type { UserNavModel } from '@/models/user/user_model.ts'
import BiliErrorRouteTo from '@/components/CommonCompo/Bili-Feedback-Compo/BiliErrorRouteTo.vue'
import BiliSideNavLayout from '@/components/CommonCompo/Bili-Container-Compo/BiliSideNavLayout.vue'
import { BiliErrorRouteToTxt } from '@/assets/text/BiliErrorTxt.ts'
import { useI18n } from 'vue-i18n'

defineOptions({ name: 'MessageLayout' })

const { t } = useI18n()
const unreadStore = useMessageUnreadStore()

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

// 通用布局菜单：单分组，未读角标随各模块未读数实时联动
const navGroups = computed(() => [
  {
    items: [
      { name: 'MESSAGE_HOME', title: t('message.navMyMessages'), shortTitle: '消息', icon: ChatDotRound, badge: true, badgeValue: unread.dm ?? 0 },
      { name: 'MESSAGE_REPLIES', title: t('message.navReplies'), shortTitle: '回复', icon: ChatLineRound, badge: true, badgeValue: unread.reply ?? 0 },
      { name: 'MESSAGE_ATS', title: t('message.navAts'), shortTitle: '@我', icon: Promotion, badge: true, badgeValue: unread.at ?? 0 },
      { name: 'MESSAGE_LIKES', title: t('message.navLikes'), shortTitle: '赞', icon: Pointer, badge: true, badgeValue: unread.like ?? 0 },
      { name: 'MESSAGE_NOTIFY', title: t('message.navNotify'), shortTitle: '通知', icon: Bell, badge: true, badgeValue: unread.notify ?? 0 },
      { name: 'MESSAGE_SETTINGS', title: t('message.navSettings'), shortTitle: '设置', icon: Setting, badge: false, badgeValue: 0 }
    ]
  }
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
</script>
