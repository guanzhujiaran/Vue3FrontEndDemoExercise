<template>
  <div class="bili-page-header flex min-w-0 flex-col gap-3">
    <!-- 标题行：hideTitle 时整行跳过（如 RPA 侧边导航布局头部已展示页标题，避免重复）；
         无标题时 extra 按钮靠左自然排列，不再向右推开在左侧留空 -->
    <div
      v-if="!hideTitle || $slots.extra"
      class="flex items-center"
      :class="hideTitle ? 'justify-start' : 'justify-between'"
    >
      <h2 v-if="!hideTitle" class="bili-page-header__title text-2xl text-text-primary sm:text-3xl">
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
  /** 隐藏大标题行：用于外层布局（如侧边导航头部）已展示页标题的场景，避免重复 */
  hideTitle?: boolean
}

withDefaults(defineProps<Props>(), {
  description: '',
  tagText: '',
  tagType: 'info',
  hideTitle: false
})
</script>
