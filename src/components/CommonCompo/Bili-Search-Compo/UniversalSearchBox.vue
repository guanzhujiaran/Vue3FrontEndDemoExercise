<template>
  <div class="search-box">
    <div :class="mode === 'numeric' ? 'numeric-input-wrapper' : ''">
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
        class="history-dropdown"
        @mousedown.prevent
      >
        <div class="history-header">
          <span class="history-title">搜索历史</span>
          <span class="clear-history-btn" @click="clearHistory">清空</span>
        </div>
        <div class="history-content">
          <div
            v-for="(item, index) in mode === 'text'
              ? searchHistory.filter((i) => i.type === 'history')
              : historyItems"
            :key="index"
            class="history-item"
            @click="
              selectHistoryItem(mode === 'text' ? (item as HistoryItem).value : (item as string))
            "
          >
            <div class="history-tag">
              {{ mode === 'text' ? (item as HistoryItem).value : item }}
              <el-badge :style="{ width: 0 }" color="transparent" :offset="[5, -5]">
                <template #content>
                  <el-icon
                    class="remove-icon"
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

<style scoped>
.search-box {
  position: relative;
  width: 100%;
}

.history-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background: #181818;
  border: 1px solid #303030;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  overflow: hidden;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #303030;
}

.history-title {
  font-size: 14px;
  font-weight: 500;
  color: #f0f0f0;
}

.clear-history-btn {
  font-size: 12px;
  color: #999;
  cursor: pointer;
  padding: 2px 8px;
  border-radius: 4px;
  transition: all 0.2s;
}

.clear-history-btn:hover {
  background: #303030;
  color: #f0f0f0;
}

.history-content {
  padding: 12px 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.history-item {
  margin-bottom: 0;
}

.history-tag {
  display: inline-flex;
  align-items: center;
  background: #252525;
  border: 1px solid #303030;
  border-radius: 12px;
  padding: 4px 12px;
  font-size: 13px;
  color: #00a1d6;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.history-tag:hover {
  background: #303030;
  border-color: #404040;
}

.remove-icon {
  color: #999;
  cursor: pointer;
  margin-left: 8px;
  font-size: 14px;
  transition: color 0.2s;
}

.remove-icon:hover {
  color: #f0f0f0;
}

.numeric-input-wrapper {
  position: relative;
}

:deep(.el-input__wrapper) {
  background: #181818;
  border: 1px solid #303030;
  border-radius: 8px;
  transition: all 0.3s;
}

:deep(.el-input__wrapper:hover) {
  border-color: #404040;
  box-shadow: 0 0 0 1px rgba(0, 161, 214, 0.1);
}

:deep(.el-input__wrapper.is-focus) {
  border-color: #00a1d6;
  box-shadow: 0 0 0 1px #00a1d6 inset;
}

:deep(.el-input__inner) {
  color: #f0f0f0;
}

:deep(.el-input__placeholder) {
  color: #666;
}

:deep(.el-input__clear) {
  color: #666;
}

:deep(.el-input__clear:hover) {
  color: #999;
}

.search-btn {
  background: #00a1d6;
  border-color: #00a1d6;
  border-radius: 0 8px 8px 0;
  transition: all 0.3s;
}

.search-btn:hover {
  background: #00b5e6;
  border-color: #00b5e6;
}

:deep(.el-badge) {
  position: static;
  margin-left: 8px;
}
</style>
