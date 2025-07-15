<template>
  <div class="search-box">
    <el-autocomplete
      ref="autocompleteRef"
      v-model="query"
      :fetch-suggestions="querySearch"
      :placeholder="placeholder"
      clearable
      @select="handleSelect"
      @keyup.enter="handleSearch"
      :maxlength="props.maxLength"
    >
      <template #append :style="{ margin: '0 30px' }">
        <el-button type="primary" size="large" @click="handleSearch" class="search-btn" text>
          <el-icon size="17" :color="'#18191c'">
            <Search />
          </el-icon>
        </el-button>
      </template>
      <template #default="{ item }">
        <div class="autocomplete-item" v-if="item.type === 'history'">
          <span>{{ item.value }}</span>

          <el-button type="primary" size="small" @click.stop="deleteHistory(item.value)" text>
            <el-icon>
              <Delete />
            </el-icon>
          </el-button>
        </div>
        <div v-else-if="item.type === 'clear'" class="clear-all">
          <el-button
            type="danger"
            style="font-size: 12px; width: 100%; text-align: center"
            @click.stop="clearHistory"
          >
            清除所有记录
          </el-button>
        </div>
      </template>
    </el-autocomplete>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Delete, Search } from '@element-plus/icons-vue'
import type { SearchBoxProps } from '@/models/compo/searchbox/SearchBox.ts'

const autocompleteRef = ref<any>(null)

const props = withDefaults(defineProps<SearchBoxProps>(), {
  placeholder: '请输入搜索内容',
  buttonText: '搜索',
  historyKey: 'searchHistory',
  maxHistoryCount: 30,
  maxLength: 50
})
// 搜索历史记录
type HistoryItem = { type: 'history'; value: string }
type ClearAllItem = { type: 'clear'; value: string }
type SuggestionItem = HistoryItem | ClearAllItem
// 定义 Emits
const emit = defineEmits<{
  (e: 'search', query: string): void // 搜索事件
}>()

// 输入框绑定的值
const query = ref<string>('')

// 搜索历史记录
const searchHistory = ref<SuggestionItem[]>([])

// 加载搜索历史
onMounted(() => {
  const history = localStorage.getItem(props.historyKey)
  if (history) {
    searchHistory.value = JSON.parse(history)
  }
})

// 获取自动补全建议
const querySearch = (queryString: string, cb: (results: SuggestionItem[]) => void) => {
  let results = queryString
    ? searchHistory.value.filter(
        (item) =>
          item.type === 'history' && item.value.toLowerCase().includes(queryString.toLowerCase())
      )
    : searchHistory.value.filter((item) => item.type === 'history')

  // 如果有历史记录，添加“清除所有记录”按钮
  if (results.length > 0) {
    results.push({ type: 'clear', value: '清除所有记录' })
  }

  cb(results)
}

// 处理选择建议
const handleSelect = (item: Record<string, any>): void => {
  if (!item || typeof item.value !== 'string') return

  if (item.type === 'history') {
    query.value = item.value
    handleSearch()
  } else if (item.type === 'clear') {
    clearHistory()
  }
}
const handleSearch = (): void => {
  if (!query.value.trim()) return
  // 将当前搜索关键字添加到历史记录中
  if (!searchHistory.value.some((item) => item.type === 'history' && item.value === query.value)) {
    searchHistory.value.unshift({ type: 'history', value: query.value }) // 添加到最前面

    // 限制最大历史记录数量
    if (
      searchHistory.value.filter((item) => item.type === 'history').length > props.maxHistoryCount
    ) {
      searchHistory.value.pop() // 移除最后一条记录
    }

    // 保存到 localStorage
    localStorage.setItem(
      props.historyKey,
      JSON.stringify(searchHistory.value.filter((item) => item.type === 'history'))
    )
  }

  emit('search', query.value) // 触发父组件传递的搜索事件，并将输入值传递出去
}

// 清除历史记录
const clearHistory = (): void => {
  searchHistory.value = []
  localStorage.removeItem(props.historyKey)
}

// 删除某一条历史记录
const deleteHistory = (value: string): void => {
  searchHistory.value = searchHistory.value.filter(
    (item) => !(item.type === 'history' && item.value === value)
  )
  localStorage.setItem(
    props.historyKey,
    JSON.stringify(searchHistory.value.filter((item) => item.type === 'history'))
  )
}
</script>

<style scoped>
.autocomplete-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

:deep(.el-autocomplete.el-tooltip__trigger.el-tooltip__trigger) {
  display: inline-flex;
  align-items: center;
  width: 100%;
  height: 100%;
  transition: background-color 0.3s;
  background-color: #f1f2f3;
  border: 2px solid transparent;
  opacity: 0.9;
  border-radius: 8px;

  :hover {
    background-color: rgb(251, 252, 252);
    opacity: 1;
  }

  .el-input__wrapper {
    color: transparent;
    background-color: transparent;
    border-radius: 8px 0 0 8px;
  }

  .el-input-group__append {
    padding: 0;
    border-radius: 0 8px 8px 0;

    .search-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0;
      border: none;
      border-radius: 0 8px 8px 0;
      color: #18191c;
      line-height: 32px;
      cursor: pointer;
      transition: background-color 0.3s;
      width: 0.75rem;
      height: 0.75rem;
      background-color: rgba(227, 229, 231, 0.196);
    }
  }
}

.search-btn:hover {
  background-color: rgba(227, 229, 231, 0.74);
}
</style>
