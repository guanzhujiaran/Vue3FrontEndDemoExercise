<template>
  <div class="bili-page-header">
    <h2 class="bili-page-header__title">{{ title }}</h2>
    <div class="bili-page-header__description">
      <el-tag v-if="tagText" :type="tagType" effect="plain">{{ tagText }}</el-tag>
      <span class="bili-page-header__description-text">{{ description }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'

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
