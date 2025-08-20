<script setup lang="ts">
import BiliSearchBox from '@/components/CommonCompo/Bili-Search-Compo/BiliSearchBox.vue'
import { ref } from 'vue'
import type { SearchBoxProps } from '@/models/compo/searchbox/SearchBox.ts'
import lotteryDataBaseApi from '@/api/lottery_data/bili/lottery_database_bili_api.ts'
import emitter from '@/utils/mitt.ts'
import { storeToRefs } from 'pinia'

const search_box_prop = ref<SearchBoxProps>({
  placeholder: '转发、预约、充电',
  historyKey: 'BiliLotDataSearch',
  maxHistoryCount: 30
})
const data = ref<any[]>([])
const prev_query_str = ref('')
const cur_query_str = ref('')
const handleSearch = (query_string: string) => {
  isOpenDrawer.value = true
  cur_query_str.value = query_string
  if (prev_query_str.value === query_string) return
  lotteryDataBaseApi.handle_search_lottery_data({ keyword: query_string }).then((res) => {
    res.code
      ? emitter.emit('toast', {
          t: res.msg,
          e: 'error'
        })
      : ((data.value = res.data), (prev_query_str.value = query_string))
  })
}
const isOpenDrawer = ref(false)
</script>

<template>
  <div class="search-box-wrapper">
    <BiliSearchBox
      @search="handleSearch"
      :placeholder="search_box_prop.placeholder"
      :history-key="search_box_prop.historyKey"
      :max-history-count="search_box_prop.maxHistoryCount"
    ></BiliSearchBox>
    <el-drawer
      style="overflow-x: scroll"
      :close-on-click-modal="true"
      v-model="isOpenDrawer"
      direction="btt"
      size="80%"
      :modal="true"
      :title="`\&quot;${cur_query_str}\&quot; 的搜索结果`"
    >
      <BiliLotteryCardContainer :data="data"></BiliLotteryCardContainer>
      <el-divider></el-divider>
    </el-drawer>
  </div>
</template>

<style scoped>
:deep(.el-drawer__body) {
  padding: 0;
  min-width: 100%;
}

.search-box-wrapper {
  width: 100%;
  margin-bottom: 1rem;
  position: relative;
}

:deep(.el-input__wrapper) {
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
}

:deep(.el-input__wrapper:hover) {
  box-shadow: 0 4px 12px rgba(0, 161, 214, 0.15);
}

:deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #00a1d6 inset;
}

:deep(.el-drawer__header) {
  margin-bottom: 0;
  padding: 16px 20px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  color: var(--el-color-primary);
  font-weight: bold;
}

:deep(.el-drawer) {
  border-radius: 16px 16px 0 0;
}
</style>
