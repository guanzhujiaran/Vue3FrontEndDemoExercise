<template>
  <div class="message-empty h-full flex flex-col items-center justify-center">
    <div class="message-empty__art mb-6 text-7xl text-text-placeholder">
      <el-icon><Message /></el-icon>
    </div>
    <h2 class="message-empty__title mb-2 text-lg font-bold text-text-primary">{{ title }}</h2>
    <p class="message-empty__subtitle text-sm text-text-placeholder">{{ subtitle }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Message } from '@element-plus/icons-vue'

const { t } = useI18n()
const route = useRoute()
const title = computed(() => String(route.meta?.title ?? t('message.titleFallback')))
const subtitle = computed(() => String(route.meta?.subtitle ?? t('message.emptySubtitle')))
</script>
