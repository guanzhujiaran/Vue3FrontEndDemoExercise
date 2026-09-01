<template>
  <DmChatPanel
    :talker-mid="talkerMid"
    :talker-name="talkerName"
    :talker-avatar="talkerAvatar"
    @refresh-unread="emit('refreshUnread')"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import DmChatPanel from '@/components/message/DmChatPanel.vue'

// 嵌套于 /app/message/whisper 下的具体聊天页（/app/message/whisper/:talkerId）。
// 由 DmChatPanel 承担全部渲染与交互，本视图仅把路由参数透传下去。
// 昵称/头像优先取布局透传的会话信息，回退到 query（如外部新标签打开时带入）。
defineOptions({ name: 'DmListView' })

const emit = defineEmits<{ refreshUnread: [] }>()

const props = withDefaults(
  defineProps<{
    talkerName?: string | null
    talkerAvatar?: string | null
  }>(),
  {
    talkerName: null,
    talkerAvatar: null
  }
)

const route = useRoute()

const talkerMid = computed(() => String(route.params.talkerId))
const talkerName = computed(
  () => props.talkerName || (route.query.name ? String(route.query.name) : null)
)
const talkerAvatar = computed(() => props.talkerAvatar || null)
</script>
