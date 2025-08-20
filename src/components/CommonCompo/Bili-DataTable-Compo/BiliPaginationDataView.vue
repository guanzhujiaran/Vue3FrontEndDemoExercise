<template>
  <div class="pagination-container-wrapper" v-loading="loading">
    <slot name="toolbar">
      <BiliDataTableToolbar :refresh_data="refresh_data"></BiliDataTableToolbar>
    </slot>
    <FlexContainer class="pagination-data-container-wrapper">
      <slot name="contents">
        <BiliLotteryCardContainer :data="data4show.data"></BiliLotteryCardContainer>
      </slot>
      <el-pagination
        v-if="!(empty || error)"
        size="small"
        background
        :layout="paginationLayout"
        :total="data4show.total"
        v-model:current-page="current_page"
        style="padding-top: 0.5rem; padding-bottom: 1rem; margin: 0 auto"
        :pager-count="5"
      />
      <bili-empty :txt="empty_msg" v-if="empty && !error"></bili-empty>
      <bili-error v-if="error" @click-retry="emits('retryOnError')"></bili-error>
    </FlexContainer>
  </div>
</template>
<style scoped>
.pagination-container-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  padding: 1rem;
  border: 1px solid var(--el-border-color-lighter);
}

.pagination-data-container-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0.5rem;
}

:deep(.el-pagination) {
  margin-top: 1rem;
  padding: 0.5rem;
  border-radius: 8px;
  justify-content: center;
  border: 1px solid var(--el-border-color-lighter);
}

:deep(.el-pagination .el-pagination__total) {
  font-size: 0.9rem;
  color: #606266;
}

:deep(.el-pagination .btn-prev),
:deep(.el-pagination .btn-next) {
  border-radius: 4px;
  border: 1px solid var(--el-border-color);
}

:deep(.el-pagination .el-pager li) {
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  margin: 0 2px;
  font-weight: normal;
}

:deep(.el-pagination .el-pager li.is-active) {
  color: var(--el-color-white);
  border-color: var(--el-color-primary);
}

@media (max-width: 768px) {
  .pagination-container-wrapper {
    padding: 0.5rem;
  }

  :deep(.el-pagination) {
    padding: 0.25rem;
  }
}
</style>
<script setup lang="ts">
import emitter from '@/utils/mitt.ts'
import { computed, onMounted, ref } from 'vue'
import { type GlobalVarsType, ScreenTypeEnum } from '@/models/global_var/global_var_model.ts'
import { KeysEnum, useInject } from '@/models/base/provide_model.ts'
import BiliDataTableToolbar from '@/components/CommonCompo/Bili-DataTable-Compo/BiliDataTableToolbar.vue'
import BiliLotteryCardContainer from '@/components/lottery_data_statistic/bili_data/BiliLotteryCardContainer.vue'
import FlexContainer from '@/components/CommonCompo/Bili-Container-Compo/FlexContainer.vue'
const empty = computed(() => data4show.data.length === 0)
const globalVars = useInject(KeysEnum.globalVars) as Ref<GlobalVarsType>
const isSmallScreen = computed(() => {
  return globalVars.value.screen_size !== ScreenTypeEnum.large
})

const paginationLayout = computed(() => {
  return isSmallScreen.value
    ? 'prev, pager, next, total, jumper'
    : 'prev, pager, next, jumper, total'
})
const data4show = withDefaults(
  defineProps<{
    data: any[]
    total: number
    page_size: number
  }>(),
  {
    data: () => [],
    total: 0,
    page_size: 10
  }
)
const empty_msg = defineModel<string>('EmptyMsg', { default: '暂无数据' })
const current_page = defineModel<number>('CurrentPage', { default: 0 })
const loading = defineModel<boolean>('Loading', { default: true })
const error = defineModel<boolean>('Error', { default: false })
const emits = defineEmits(['onMounted', 'retryOnError'])
onMounted(() => {
  emitter.emit('toast', { t: '加载数据中！', e: 'info' })
  emits('onMounted')
})
const refresh_data = () => {
  current_page.value = current_page.value === 1 ? 0 : 1
}
</script>
