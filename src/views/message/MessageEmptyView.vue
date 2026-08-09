<template>
  <div class="message-empty h-full flex flex-col items-center justify-center">
    <div class="message-empty__art mb-6 text-7xl text-msg-muted">
      <el-icon><Message /></el-icon>
    </div>
    <h2 class="message-empty__title mb-2 text-lg font-bold text-msg-text-active">{{ title }}</h2>
    <p class="message-empty__subtitle text-sm text-msg-muted">{{ subtitle }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Message } from '@element-plus/icons-vue'

const route = useRoute()
const title = computed(() => String(route.meta?.title ?? '我的消息'))
const subtitle = computed(() => String(route.meta?.subtitle ?? '快找小伙伴聊天吧 (´･ω･`)ﾉ'))
</script>
