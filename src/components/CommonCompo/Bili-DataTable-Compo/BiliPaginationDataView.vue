<template>
  <div class="pagination-container-wrapper" ref="paginationContainer" v-loading="loading">
    <slot name="toolbar">
      <BiliDataTableToolbar :refresh_data="refresh_data"></BiliDataTableToolbar>
    </slot>
    <FlexContainer>
      <slot name="contents">
        <BiliLotteryCardContainer :data="props.data"></BiliLotteryCardContainer>
      </slot>
      <el-pagination
        class="pagination"
        v-if="!error && props.data.length > 0"
        size="small"
        background
        :layout="paginationLayout"
        :total="props.total"
        v-model:current-page="current_page"
        :pager-count="5"
      />
      <bili-empty :txt="empty_msg" v-if="props.data.length === 0 && !error"></bili-empty>
      <bili-error :txt="error_msg" v-if="error"></bili-error>
    </FlexContainer>
    <ScrollButtons :top-threshold="300" :bottom-threshold="100" />
  </div>
</template>
<style scoped>
@import '@/assets/components/data-table/bili-pagination-data-view-tailwind.css';
</style>
<script setup lang="ts">
import emitter from '@/utils/mitt.ts'
import { computed, onMounted, watch } from 'vue'
import { type GlobalVarsType, ScreenTypeEnum } from '@/models/global_var/global_var_model.ts'
import { KeysEnum, useInject } from '@/models/base/provide_model.ts'
import BiliDataTableToolbar from '@/components/CommonCompo/Bili-DataTable-Compo/BiliDataTableToolbar.vue'
import BiliLotteryCardContainer from '@/components/lottery_data/bili_data/BiliLotteryCardContainer.vue'
import FlexContainer from '@/components/CommonCompo/Bili-Container-Compo/FlexContainer.vue'
import { useScroll } from '@vueuse/core'

const empty = computed(() => props.data.length === 0)
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

interface Props {
  data: any[]
  total: number
  page_size: number
  // 是否自动处理错误状态，启用后会在错误时自动清空数据
  autoHandleError?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  data: () => [],
  total: 0,
  page_size: 10,
  autoHandleError: true
})

const empty_msg = defineModel<string>('EmptyMsg', { default: '暂无数据' })
const error_msg = defineModel<string>('ErrorMsg', { default: '网络异常' })
const current_page = defineModel<number>('CurrentPage', { default: 0 })
const loading = defineModel<boolean>('Loading', { default: true })
const error = defineModel<boolean>('Error', { default: false })

interface Emits {
  (e: 'onMounted'): void
  (e: 'retryOnError'): void
  (e: 'update:data', value: any[]): void
  (e: 'update:total', value: number): void
}

const emits = defineEmits<Emits>()

// 处理重试逻辑
const handleRetry = () => {
  // 如果启用了自动错误处理，重试前清空错误状态和数据
  if (props.autoHandleError) {
    error.value = false
  }
  emits('retryOnError')
}

// 监听错误状态，自动清空数据
watch(error, (newError, oldError) => {
  // 当错误状态从 false 变为 true 时，如果启用了自动错误处理，清空数据
  if (newError && !oldError && props.autoHandleError) {
    // 使用 nextTick 确保在下一个 tick 中数据已经被清空
    Promise.resolve().then(() => {
      emits('update:data', [])
      emits('update:total', 0)
    })
  }
}, { immediate: true })

// 监听 data 变化，如果当前是错误状态且数据不为空，强制清空
watch(() => props.data, (newData) => {
  if (error.value && newData.length > 0 && props.autoHandleError) {
    // 如果是错误状态但数据还有值，立即清空
    emits('update:data', [])
    emits('update:total', 0)
  }
}, { immediate: true })

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
