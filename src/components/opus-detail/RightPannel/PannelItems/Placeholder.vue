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
      <p class="placeholder-text">{{ displayText }}</p>
    </div>
  </div>
</template>

<style scoped>
.placeholder-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  width: 100%;
}

.placeholder-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  color: var(--el-text-color-placeholder);
  text-align: center;
}

.placeholder-icon {
  font-size: 48px;
  opacity: 0.6;
}

.placeholder-text {
  font-size: 14px;
  margin: 0;
  opacity: 0.8;
}
</style>