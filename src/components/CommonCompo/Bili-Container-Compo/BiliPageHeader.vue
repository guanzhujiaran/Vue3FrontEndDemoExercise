<template>
  <div class="bili-page-header flex min-w-0 flex-col gap-3">
    <h2 class="bili-page-header__title text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl">
      {{ title }}
    </h2>
    <div class="bili-page-header__description flex flex-wrap items-center gap-2 text-sm text-text-secondary">
      <el-tag v-if="tagText" :type="tagType" effect="plain">{{ tagText }}</el-tag>
      <span class="bili-page-header__description-text leading-relaxed">{{ description }}</span>
    </div>
  </div>
</template>


<script setup lang="ts">
interface Props {

  title: string
  description?: string
  tagText?: string
  tagType?: 'success' | 'warning' | 'info' | 'danger'
}

withDefaults(defineProps<Props>(), {
  description: '',
  tagText: '',
  tagType: 'info'
})
</script>
