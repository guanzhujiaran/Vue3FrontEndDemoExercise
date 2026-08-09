<template>
  <div class="dm-chat flex h-full flex-col">
    <div class="dm-chat__header flex items-center gap-3 border-b border-msg-divider p-3">
      <el-button text :icon="ArrowLeft" @click="goBack">返回</el-button>
      <span class="dm-chat__title text-base font-bold text-msg-text-active">
        {{ talkerName || `用户${talkerMid}` }}
      </span>
    </div>

    <LoadingWrap :loading="loading" class="dm-chat__body flex-1 min-h-0 overflow-y-auto p-4">
      <EmptyState v-if="messages.length === 0" text="还没有消息，打个招呼吧" />
      <ul v-else class="dm-chat__messages flex flex-col gap-3">
        <li
          v-for="msg in messages"
          :key="msg.msgkey"
          class="dm-chat__msg flex"
          :class="isSelf(msg) ? 'justify-end' : 'justify-start'"
        >
          <!-- 管理端驳回 / 下架：保留气泡位置，显示占位文案 -->
          <div
            v-if="msg.audit_state === 'rejected' || msg.audit_state === 'hidden'"
            class="dm-chat__bubble max-w-[70%] rounded-lg bg-msg-card p-3 text-sm text-msg-muted"
          >
            {{ msg.audit_state === 'hidden' ? '[该消息已被管理员下架]' : '[该消息已被管理员驳回]' }}
          </div>
          <!-- 撤回：双方均不可见 -->
          <div
            v-else-if="msg.msg_status === 'recalled'"
            class="dm-chat__bubble max-w-[70%] rounded-lg bg-msg-card p-3 text-sm text-msg-muted"
          >
            撤回了一条消息
          </div>
          <!-- 正常气泡 -->
          <div
            v-else
            class="dm-chat__bubble max-w-[70%] whitespace-pre-wrap wrap-break-word rounded-lg p-3 text-sm"
            :class="isSelf(msg) ? 'bg-msg-link text-white' : 'bg-msg-card text-msg-text'"
          >
            <span class="dm-chat__content">{{ msg.content }}</span>
            <span class="dm-chat__time mt-1 block text-right text-xs text-msg-muted">
              {{ formatTime(msg.msg_ts) }}
            </span>
          </div>
        </li>
      </ul>
    </LoadingWrap>

    <div class="dm-chat__footer flex items-end gap-2 border-t border-msg-divider p-3">
      <el-input
        v-model="draft"
        type="textarea"
        :rows="1"
        resize="none"
        class="dm-chat__input flex-1"
        placeholder="输入消息，Enter 发送"
        @keydown.enter.exact.prevent="onSend"
      />
      <el-button type="primary" :disabled="!draft.trim()" @click="onSend">发送</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import { fetchDmMessages, sendDm, type DmMessageItem } from '@/api/notify/message-api'
import LoadingWrap from '@/components/message/LoadingWrap.vue'
import EmptyState from '@/components/message/EmptyState.vue'

const route = useRoute()
const router = useRouter()

const talkerMid = computed(() => Number(route.params.talkerMid))
const talkerName = computed(() => String(route.query.name || ''))

const messages = ref<DmMessageItem[]>([])
const loading = ref(false)
const draft = ref('')

// 会话仅双方：sender_uid 等于对方 talker_mid 时为对方消息，否则为自己所发
function isSelf(msg: DmMessageItem): boolean {
  return msg.sender_uid !== talkerMid.value
}

function formatTime(ts?: number): string {
  if (!ts) return ''
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

async function load() {
  loading.value = true
  const res = await fetchDmMessages({ talker_mid: talkerMid.value, size: 50 })
  // 倒序：最早在上、最新在底部
  messages.value = [...res.items].reverse()
  loading.value = false
}

async function onSend() {
  const text = draft.value.trim()
  if (!text) return
  const ok = await sendDm({ receiver_mid: talkerMid.value, content: text })
  if (ok) {
    draft.value = ''
    await load()
  }
}

function goBack() {
  router.push({ name: 'MESSAGE_HOME' })
}

onMounted(load)
// 切换会话（talkerMid 变化）时重新拉取消息
watch(talkerMid, load)
</script>
