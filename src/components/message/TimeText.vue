<template>
  <span class="message-time-text text-sm text-msg-muted">{{ display }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()
const props = defineProps<{ time?: string | null }>()

const localeMap: Record<string, string> = {
  'zh-CN': 'zh-CN',
  'zh-TW': 'zh-TW',
  'en': 'en-US',
  'ja': 'ja-JP',
  'ko': 'ko-KR'
}

function format(iso?: string | null): string {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString(localeMap[locale.value] ?? 'zh-CN', { hour12: false })
}

const display = computed(() => format(props.time))
</script>
