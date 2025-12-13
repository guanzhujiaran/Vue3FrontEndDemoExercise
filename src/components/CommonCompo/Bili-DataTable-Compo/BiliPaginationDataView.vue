<template>
  <div class="pagination-container-wrapper" ref="paginationContainer" v-loading="loading">
    <slot name="toolbar">
      <BiliDataTableToolbar :refresh_data="refresh_data"></BiliDataTableToolbar>
    </slot>
    <FlexContainer>
      <slot name="contents">
        <BiliLotteryCardContainer :data="data4show.data"></BiliLotteryCardContainer>
      </slot>
      <el-pagination
        class="pagination"
        v-if="!(empty || error)"
        size="small"
        background
        :layout="paginationLayout"
        :total="data4show.total"
        v-model:current-page="current_page"
        :pager-count="5"
      />
      <bili-empty :txt="empty_msg" v-if="empty && !error"></bili-empty>
      <bili-error v-if="error" @click-retry="emits('retryOnError')"></bili-error>
    </FlexContainer>
    <ScrollButtons :top-threshold="300" :bottom-threshold="100" />
  </div>
</template>
<style scoped>
@import '@/assets/components/data-table/bili-pagination-data-view-tailwind.css';
</style>
<script setup lang="ts">
import emitter from '@/utils/mitt.ts'
import { computed, onMounted } from 'vue'
import { type GlobalVarsType, ScreenTypeEnum } from '@/models/global_var/global_var_model.ts'
import { KeysEnum, useInject } from '@/models/base/provide_model.ts'
import BiliDataTableToolbar from '@/components/CommonCompo/Bili-DataTable-Compo/BiliDataTableToolbar.vue'
import BiliLotteryCardContainer from '@/components/lottery_data/bili_data/BiliLotteryCardContainer.vue'
import FlexContainer from '@/components/CommonCompo/Bili-Container-Compo/FlexContainer.vue'
import { useScroll } from '@vueuse/core'
const empty = computed(() => data4show.data.length === 0)
const globalVars = useInject(KeysEnum.GlobalVars) as Ref<GlobalVarsType>
const isSmallScreen = computed(() => {
  return globalVars.value.screen_size !== ScreenTypeEnum.large
})
const paginationContainer = useTemplateRef<HTMLElement>('paginationContainer')
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
const { x, y } = useScroll(paginationContainer, { behavior: 'smooth' })
watch(loading, (newVal) => {
  if (newVal === false) {
    y.value = 0
  }
})
</script>
