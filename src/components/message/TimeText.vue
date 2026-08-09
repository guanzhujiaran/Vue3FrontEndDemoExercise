<template>
  <span class="message-time-text text-sm text-msg-muted">{{ display }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ time?: string | null }>()

function format(iso?: string | null): string {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString('zh-CN', { hour12: false })
}

const display = computed(() => format(props.time))
</script>
