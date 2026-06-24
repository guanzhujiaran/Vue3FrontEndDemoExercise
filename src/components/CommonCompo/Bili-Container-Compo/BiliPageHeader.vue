<template>
  <div class="bili-page-header flex min-w-0 flex-col gap-3">
    <div class="flex items-center justify-between">
      <h2 class="bili-page-header__title text-2xl text-text-primary sm:text-3xl">
        {{ title }}
      </h2>
      <slot name="extra"></slot>
    </div>
    <div class="bili-page-header__description flex flex-wrap items-center gap-2 text-sm text-text-secondary">
      <el-tag v-if="tagText" :type="tagType || undefined" :effect="isDark ? 'dark' : 'light'">{{ tagText }}</el-tag>
      <span class="bili-page-header__description-text leading-relaxed">{{ description }}</span>
    </div>
  </div>
</template>


<script setup lang="ts">
import { useThemeStore } from '@/stores/theme'
const themeStore = useThemeStore()
const isDark = computed(()=> themeStore.isDark)
interface Props {

  title: string
  description?: string
  tagText?: string
  tagType?: '' | 'success' | 'warning' | 'info' | 'danger'
}

withDefaults(defineProps<Props>(), {
  description: '',
  tagText: '',
  tagType: 'info'
})
</script>
