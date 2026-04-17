<template>
  <UniversalSearchBox
    ref="searchBoxRef"
    :placeholder="placeholder"
    :button-text="buttonText"
    :history-key="historyKey"
    :max-history-count="maxHistoryCount"
    :max-length="maxLength"
    @search="handleSearch"
    @select="handleSelect"
  >
    <template #append>
      <slot name="append"></slot>
    </template>
  </UniversalSearchBox>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { SearchBoxProps } from '@/models/compo/searchbox/SearchBox.ts'
import UniversalSearchBox from './UniversalSearchBox.vue'

const searchBoxRef = ref<InstanceType<typeof UniversalSearchBox> | null>(null)

const props = withDefaults(defineProps<SearchBoxProps>(), {
  placeholder: '请输入搜索内容',
  buttonText: '搜索',
  historyKey: 'searchHistory',
  maxHistoryCount: 30,
  maxLength: 50
})

const emit = defineEmits<{
  (e: 'search', query: string | number): void
  (e: 'select', item: any): void
}>()

const handleSearch = (query: string | number) => {
  emit('search', query)
}

const handleSelect = (item: any) => {
  emit('select', item)
}

// 暴露方法给父组件
defineExpose({
  loadHistory: () => searchBoxRef.value?.loadHistory(),
  clearHistory: () => searchBoxRef.value?.clearHistory()
})
</script>