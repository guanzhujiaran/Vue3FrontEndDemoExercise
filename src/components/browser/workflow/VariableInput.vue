<!--
 * @FilePath: \Vue3FrontEndDemoExercise\src\components\browser\workflow\VariableInput.vue
 * @Description: 变量模板输入框 - 支持 {{...}} 智能补全
-->
<template>
  <div class="relative">
    <el-input
      ref="inputRef"
      v-model="localValue"
      :size="size"
      :placeholder="placeholder"
      :type="multiline ? 'textarea' : 'text'"
      :rows="multiline ? rows : undefined"
      clearable
      @input="handleInput"
      @change="handleChange"
      @keydown="handleKeydown"
    />
    <!-- 变量补全弹出层 -->
    <div
      v-if="showSuggestions && filteredSuggestions.length > 0"
      class="absolute z-50 left-0 top-full mt-1 w-64 max-h-48 overflow-y-auto rounded-lg border border-[var(--el-border-color-lighter)] bg-[var(--el-fill-color-blank)] shadow-lg"
    >
      <div
        v-for="(suggestion, idx) in filteredSuggestions"
        :key="suggestion"
        :class="[
          'px-3 py-1.5 text-xs cursor-pointer transition-colors',
          idx === selectedSuggestionIndex
            ? 'bg-[var(--el-color-primary-light-9)] text-[var(--el-color-primary)]'
            : 'text-[var(--el-text-color-regular)] hover:bg-[var(--el-fill-color-light)]'
        ]"
        @click="insertSuggestion(suggestion)"
        @mouseenter="selectedSuggestionIndex = idx"
      >
        <span class="font-mono">{{ suggestion }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import type { InputInstance } from 'element-plus'

const props = withDefaults(defineProps<{
  modelValue?: string
  variables?: string[]
  placeholder?: string
  size?: 'small' | 'default' | 'large'
  multiline?: boolean
  rows?: number
}>(), {
  modelValue: '',
  variables: () => [],
  placeholder: '',
  size: 'small',
  multiline: false,
  rows: 3
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  change: [value: string]
}>()

const inputRef = ref<InputInstance>()
const localValue = ref(props.modelValue)
const showSuggestions = ref(false)
const selectedSuggestionIndex = ref(0)
const cursorInTemplate = ref(false)
const templatePrefix = ref('')

watch(() => props.modelValue, (val) => {
  localValue.value = val
})

// 预置的 state 变量
const builtInVariables = [
  'state.loop.current_item',
  'state.loop.index',
  'state.has_liked',
  'state.reply',
  'state.delay_val'
]

const allVariables = computed(() => {
  const vars = new Set([...builtInVariables, ...props.variables])
  return Array.from(vars).sort()
})

const filteredSuggestions = computed(() => {
  if (!cursorInTemplate.value || !templatePrefix.value) return allVariables.value
  const prefix = templatePrefix.value.toLowerCase()
  return allVariables.value.filter(v => v.toLowerCase().includes(prefix))
})

const handleInput = (val: string | number) => {
  const strVal = String(val)
  localValue.value = strVal
  emit('update:modelValue', strVal)

  // 检测是否正在输入 {{...}}
  detectTemplate(strVal)
}

const handleChange = (val: string | number) => {
  emit('change', String(val))
}

const detectTemplate = (value: string) => {
  // 检查光标位置附近是否有未闭合的 {{
  const textarea = inputRef.value?.$el?.querySelector('input, textarea') as HTMLInputElement | null
  if (!textarea) {
    showSuggestions.value = false
    return
  }

  const cursorPos = textarea.selectionStart
  const textBeforeCursor = value.substring(0, cursorPos)

  // 找到最近未闭合的 {{
  const lastOpen = textBeforeCursor.lastIndexOf('{{')
  const lastClose = textBeforeCursor.lastIndexOf('}}')

  if (lastOpen > lastClose && lastOpen >= 0) {
    // 正在模板内
    cursorInTemplate.value = true
    templatePrefix.value = textBeforeCursor.substring(lastOpen + 2).trim()
    showSuggestions.value = true
    selectedSuggestionIndex.value = 0
  } else {
    cursorInTemplate.value = false
    showSuggestions.value = false
  }
}

const insertSuggestion = (suggestion: string) => {
  const textarea = inputRef.value?.$el?.querySelector('input, textarea') as HTMLInputElement | null
  if (!textarea) return

  const cursorPos = textarea.selectionStart
  const textBeforeCursor = localValue.value.substring(0, cursorPos)
  const textAfterCursor = localValue.value.substring(cursorPos)

  // 找到 {{ 的位置
  const lastOpen = textBeforeCursor.lastIndexOf('{{')
  const newText =
    localValue.value.substring(0, lastOpen) +
    '{{' + suggestion + '}}' +
    textAfterCursor

  localValue.value = newText
  emit('update:modelValue', newText)
  emit('change', newText)
  showSuggestions.value = false

  // 移动光标到 }} 后面
  nextTick(() => {
    const newCursorPos = lastOpen + suggestion.length + 4
    textarea.setSelectionRange(newCursorPos, newCursorPos)
    textarea.focus()
  })
}

const handleKeydown = (e: KeyboardEvent) => {
  if (!showSuggestions.value || filteredSuggestions.value.length === 0) return

  if (e.key === 'ArrowDown') {
    e.preventDefault()
    selectedSuggestionIndex.value = Math.min(
      selectedSuggestionIndex.value + 1,
      filteredSuggestions.value.length - 1
    )
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    selectedSuggestionIndex.value = Math.max(selectedSuggestionIndex.value - 1, 0)
  } else if (e.key === 'Enter' || e.key === 'Tab') {
    e.preventDefault()
    insertSuggestion(filteredSuggestions.value[selectedSuggestionIndex.value])
  } else if (e.key === 'Escape') {
    showSuggestions.value = false
  }
}

// 点击外部关闭
import { onMounted, onBeforeUnmount } from 'vue'
const onClickOutside = (e: MouseEvent) => {
  if (showSuggestions.value) {
    showSuggestions.value = false
  }
}
onMounted(() => document.addEventListener('click', onClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', onClickOutside))
</script>
