<template>
  <div class="universal-search-box relative w-full">
    <div :class="mode === 'numeric' ? 'relative' : ''">
      <el-input
        ref="autocompleteRef"
        v-model="query"
        :placeholder="placeholder"
        :disabled="mode === 'numeric' ? disabled : undefined"
        :maxlength="props.maxLength"
        clearable
        @keyup.enter="handleSearch"
        @input="handleInput"
        @focus="handleFocus"
        @blur="handleBlur"
      >
        <template #append>
          <el-button type="primary" size="default" @click="handleSearch" class="search-btn">
            <el-icon size="18">
              <Search />
            </el-icon>
          </el-button>
        </template>
      </el-input>

      <!-- 历史记录面板 -->
      <div
        v-if="
          isHistoryVisible && (mode === 'text' ? searchHistory.length > 0 : historyItems.length > 0)
        "
        class="absolute top-full left-0 right-0 mt-1 z-[1000] overflow-hidden rounded-sm border border-border bg-bg shadow-[0_4px_12px_rgba(0,0,0,0.3)]"
        @mousedown.prevent
      >
        <div class="flex justify-between items-center py-3 px-4 border-b border-border">
          <span class="text-sm font-medium text-text-primary">搜索历史</span>
          <span
            class="text-xs text-text-secondary cursor-pointer py-0.5 px-2 rounded-xs transition-all duration-200 hover:bg-fill hover:text-text-primary"
            @click="clearHistory"
          >
            清空
          </span>
        </div>
        <div class="p-3 flex flex-wrap gap-2">
          <div
            v-for="(item, index) in mode === 'text'
              ? searchHistory.filter((i) => i.type === 'history')
              : historyItems"
            :key="index"
            class="mb-0"
            @click="
              selectHistoryItem(mode === 'text' ? (item as HistoryItem).value : (item as string))
            "
          >
            <div
              class="inline-flex items-center relative bg-fill border border-border rounded-xl py-1 px-3 text-sm text-primary cursor-pointer transition-all duration-200 hover:bg-fill-dark hover:border-border-dark"
            >
              {{ mode === 'text' ? (item as HistoryItem).value : item }}
              <el-badge :style="{ width: 0 }" color="transparent" :offset="[5, -5]">
                <template #content>
                  <el-icon
                    class="text-text-secondary cursor-pointer ml-2 text-sm transition-colors duration-200 hover:text-text-primary"
                    @click.stop="
                      mode === 'text'
                        ? deleteHistory((item as HistoryItem).value)
                        : removeHistoryItem(index)
                    "
                  >
                    <Close />
                  </el-icon>
                </template>
              </el-badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import type { SearchBoxProps } from '@/models/compo/searchbox/SearchBox.ts'

const autocompleteRef = ref<any>(null)
const inputRef = ref<any>(null)

const props = withDefaults(
  defineProps<
    SearchBoxProps & {
      mode?: 'text' | 'numeric'
      disabled?: boolean
      showHistoryIcon?: boolean
    }
  >(),
  {
    placeholder: '请输入搜索内容',
    buttonText: '搜索',
    historyKey: 'searchHistory',
    maxHistoryCount: 30,
    maxLength: 50,
    clearAllText: '清除所有记录',
    mode: 'text',
    disabled: false,
    showHistoryIcon: true
  }
)

// 搜索历史记录
type HistoryItem = { type: 'history'; value: string }
type ClearAllItem = { type: 'clear'; value: string }
type SuggestionItem = HistoryItem | ClearAllItem

// 定义 Emits
const emit = defineEmits<{
  (e: 'search', query: string | number): void // 搜索事件
  (e: 'select', item: any): void // 选择建议事件
  (e: 'input', value: string): void // 输入事件
  (e: 'clear'): void // 清除事件
}>()

// 输入框绑定的值
const query = defineModel<string|number>()

// 文本模式相关
const searchHistory = ref<SuggestionItem[]>([])

// 数字模式相关
const historyItems = ref<string[]>([])
const isHistoryVisible = ref(false)

// 处理焦点事件
const handleFocus = () => {
  isHistoryVisible.value = true
}

// 处理失焦事件
const handleBlur = () => {
  // 使用 setTimeout 确保点击历史记录项时不会立即隐藏面板
  setTimeout(() => {
    isHistoryVisible.value = false
  }, 200)
}

// 加载搜索历史
onMounted(() => {
  loadHistory()
})

// 监听模式变化
watch(
  () => props.mode,
  () => {
    loadHistory()
  }
)

// 加载历史记录
const loadHistory = () => {
  const history = localStorage.getItem(props.historyKey)
  if (history) {
    try {
      const parsedHistory = JSON.parse(history)
      if (props.mode === 'text') {
        searchHistory.value = parsedHistory.map((item: any) => ({
          type: 'history',
          value: item.value || item
        }))
      } else {
        historyItems.value = parsedHistory.map((item: any) => item.value || item)
      }
    } catch (e) {
      console.error('Failed to parse search history:', e)
      if (props.mode === 'text') {
        searchHistory.value = []
      } else {
        historyItems.value = []
      }
    }
  } else {
    if (props.mode === 'text') {
      searchHistory.value = []
    } else {
      historyItems.value = []
    }
  }
}

// 保存历史记录
const saveHistory = () => {
  try {
    let historyToSave: any[]
    if (props.mode === 'text') {
      historyToSave = searchHistory.value.filter((item) => item.type === 'history')
    } else {
      historyToSave = historyItems.value.map((item) => ({ value: item }))
    }
    localStorage.setItem(props.historyKey, JSON.stringify(historyToSave))
  } catch (e) {
    console.error('Failed to save history:', e)
  }
}

// 添加到历史记录
const addToHistory = (value: string) => {
  if (!value) return

  if (props.mode === 'text') {
    // 文本模式处理
    const existingIndex = searchHistory.value.findIndex(
      (item) => item.type === 'history' && item.value === value
    )

    if (existingIndex !== -1) {
      searchHistory.value.splice(existingIndex, 1)
    }

    searchHistory.value.unshift({ type: 'history', value: value })

    const historyItems = searchHistory.value.filter((item) => item.type === 'history')
    if (historyItems.length > props.maxHistoryCount) {
      historyItems.splice(props.maxHistoryCount)
    }

    searchHistory.value = [...historyItems]
  } else {
    // 数字模式处理
    const index = historyItems.value.indexOf(value)
    if (index !== -1) {
      historyItems.value.splice(index, 1)
    }

    historyItems.value.unshift(value)

    if (historyItems.value.length > 10) {
      historyItems.value = historyItems.value.slice(0, 10)
    }
  }

  saveHistory()
}

// 处理搜索
const handleSearch = (): void => {
  if (!query.value || !(query.value + '').trim()) {
    emit('search', '')
    return
  }

  const trimmedQuery = (query.value + '').trim()

  // 添加到历史记录
  addToHistory(trimmedQuery)

  // 隐藏历史记录面板
  isHistoryVisible.value = false

  // 根据不同模式做不同处理
  if (props.mode === 'text') {
    emit('search', query.value)
  } else if (props.mode === 'numeric') {
    // 对于数字模式，确保输出的是数字类型
    const numericValue = parseInt(query.value as string, 10)
    if (!isNaN(numericValue)) {
      emit('search', numericValue)
    } else {
      emit('search', query.value)
    }
  } else {
    emit('search', query.value)
  }
}

// 清除历史记录
const clearHistory = (): void => {
  if (props.mode === 'text') {
    searchHistory.value = []
  } else {
    historyItems.value = []
  }
  localStorage.removeItem(props.historyKey)
  isHistoryVisible.value = false
}

// 选择历史记录项
const selectHistoryItem = (value: string) => {
  query.value = value
  // 依赖 v-model 双向绑定，不再手动触发 update:modelValue

  // 根据不同模式做不同处理
  if (props.mode === 'text') {
    emit('search', value)
  } else if (props.mode === 'numeric') {
    // 对于数字模式，确保输出的是数字类型
    const numericValue = parseInt(value, 10)
    if (!isNaN(numericValue)) {
      emit('search', numericValue)
    } else {
      emit('search', value)
    }
  } else {
    emit('search', value)
  }

  isHistoryVisible.value = false
  inputRef.value?.focus()
  autocompleteRef.value?.focus()
}

// 删除某一条历史记录
const deleteHistory = (value: string): void => {
  if (props.mode !== 'text') return

  searchHistory.value = searchHistory.value.filter(
    (item) => !(item.type === 'history' && item.value === value)
  )

  // 如果没有历史记录了，清除localStorage
  const historyItems = searchHistory.value.filter((item) => item.type === 'history')
  if (historyItems.length === 0) {
    localStorage.removeItem(props.historyKey)
  } else {
    // 否则更新localStorage
    localStorage.setItem(props.historyKey, JSON.stringify(historyItems))
  }
}

// 移除历史记录项（仅数字模式）
const removeHistoryItem = (index: number) => {
  if (props.mode !== 'numeric') return

  historyItems.value.splice(index, 1)
  saveHistory()
}

// 处理数字输入（仅数字模式）
const handleInput = (value: string): void => {
  if (props.mode !== 'numeric') return

  // 只允许数字输入
  const numericValue = value.replace(/[^\d]/g, '')
  query.value = numericValue
  emit('input', numericValue)
}

// 提供方法供外部调用
defineExpose({
  loadHistory,
  clearHistory,
  focus: () => {
    autocompleteRef.value?.focus()
  },
  blur: () => {
    autocompleteRef.value?.blur()
  }
})
</script>
