<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  inner_text?: string
  is_show?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: Props): void
}

const props = withDefaults(defineProps<Props>(), {
  inner_text: '暂无数据',
  is_show: true
})

const emit = defineEmits<Emits>()

const modelValue = defineModel<Props>()

const displayText = computed(() => {
  return modelValue.value?.inner_text || props.inner_text
})

const isVisible = computed(() => {
  return modelValue.value?.is_show !== false && props.is_show
})
</script>

<template>
  <div v-if="isVisible" class="placeholder-container">
    <div class="placeholder-content">
      <el-icon class="placeholder-icon">
        <el-icon-box />
      </el-icon>
      <el-text class="placeholder-text" tag="p">{{ displayText }}</el-text>
    </div>
  </div>
</template>


