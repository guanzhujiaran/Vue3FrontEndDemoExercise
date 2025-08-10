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
        :pager-count="3"
      />
      <bili-empty :txt="empty_msg" v-if="empty && !error"></bili-empty>
      <bili-error v-if="error" @click-retry="emits('retryOnError')"></bili-error>
    </FlexContainer>
  </div>
</template>
<style scoped></style>
<script setup lang="ts">
import emitter from '@/utils/mitt.ts'
import { computed, onMounted, ref } from 'vue'
import { ScreenTypeEnum } from '@/models/global_var/global_var_model.ts'
import { KeysEnum, useInject } from '@/models/base/provide_model.ts'
import BiliDataTableToolbar from '@/components/CommonCompo/Bili-DataTable-Compo/BiliDataTableToolbar.vue'
import BiliLotteryCardContainer from '@/components/lottery_data_statistic/bili_data/BiliLotteryCardContainer.vue'
import FlexContainer from '@/components/CommonCompo/Bili-Container-Compo/FlexContainer.vue'
const empty = computed(() => data4show.data.length === 0)
const globalVars = useInject(KeysEnum.globalVars)
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
