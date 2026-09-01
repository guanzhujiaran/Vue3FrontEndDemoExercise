<template>
  <span class="message-time-text text-sm text-text-primary">{{ display }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()
const props = defineProps<{ time?: string | number | null }>()

const localeMap: Record<string, string> = {
  'zh-CN': 'zh-CN',
  'zh-TW': 'zh-TW',
  'en': 'en-US',
  'ja': 'ja-JP',
  'ko': 'ko-KR'
}

/**
 * 将多种时间表示归一为 Date。
 * - number：毫秒级时间戳（13 位），并兼容秒级时间戳（10 位，自动 ×1000）。
 * - string：ISO 字符串；若为纯数字字符串也按时间戳处理。
 */
function toDate(value?: string | number | null): Date | null {
  if (value === null || value === undefined || value === '') return null
  let ms: number
  if (typeof value === 'number') {
    if (Number.isNaN(value)) return null
    ms = value < 1e12 ? value * 1000 : value
  } else {
    const trimmed = value.trim()
    if (/^\d+$/.test(trimmed)) {
      const n = Number(trimmed)
      ms = n < 1e12 ? n * 1000 : n
    } else {
      const d = new Date(trimmed)
      return Number.isNaN(d.getTime()) ? null : d
    }
  }
  const d = new Date(ms)
  return Number.isNaN(d.getTime()) ? null : d
}

function format(value?: string | number | null): string {
  const d = toDate(value)
  if (!d) return '-'
  return d.toLocaleString(localeMap[locale.value] ?? 'zh-CN', { hour12: false })
}

const display = computed(() => format(props.time))
</script>
