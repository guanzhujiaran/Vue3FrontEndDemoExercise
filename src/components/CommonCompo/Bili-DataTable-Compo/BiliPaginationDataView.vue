<template>
  <FlexContainer class="pagination-container-wrapper min-w-0">
    <slot name="toolbar">
    </slot>
    <FlexContainer class="min-w-0 gap-5">
      <div v-if="loading" class="w-full">
        <div class="grid gap-4" :style="{ gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }">
          <div v-for="i in 6" :key="i" class="rounded-xl bg-bg/50 backdrop-blur-sm p-5 border border-border-light/30">
            <el-skeleton :rows="4" animated></el-skeleton>
          </div>
        </div>
      </div>
      <div v-else-if="props.data.length > 0" ref="contentStartRef" class="min-w-0 scroll-mt-(--spacing-20)">
        <slot name="contents">
          <BiliLotteryCardContainer :data="props.data"></BiliLotteryCardContainer>
        </slot>
      </div>
        <el-pagination v-if="!error && !loading && props.data.length > 0" class="pagination flex-wrap justify-center gap-y-2" size="large" background
          :layout="paginationLayout" :total="props.total" v-model:current-page="current_page" :pager-count="5" />
        <bili-empty v-if="props.data.length === 0 && !error && !loading" :txt="empty_msg"></bili-empty>
        <bili-error v-if="error && !loading" @click-retry="handleRetry"></bili-error>
    </FlexContainer>
    <ScrollButtons :top-threshold="300" :bottom-threshold="100" />
  </FlexContainer>
</template>

<script setup lang="ts">
import biliMessage from '@/utils/message'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { type GlobalVarsType, ScreenTypeEnum } from '@/models/global_var/global_var_model.ts'
import { KeysEnum, useInject } from '@/models/base/provide_model.ts'

import BiliLotteryCardContainer from '@/components/lottery_data/bili_data/BiliLotteryCardContainer.vue'
import FlexContainer from '@/components/CommonCompo/Bili-Container-Compo/FlexContainer.vue'

const globalVars = useInject(KeysEnum.GlobalVars) as Ref<GlobalVarsType>
const contentStartRef = ref<HTMLElement | null>(null)
const shouldScrollToContentStart = ref(false)

const paginationLayout = computed(() => {
  if (globalVars.value.screen_size === ScreenTypeEnum.small) {
    return 'prev, pager, next'
  }

  if (globalVars.value.screen_size === ScreenTypeEnum.medium) {
    return 'prev, pager, next, total'
  }

  return 'prev, pager, next, jumper, total'
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
    shouldScrollToContentStart.value = false
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

watch(current_page, (newPage, oldPage) => {
  if (!newPage || !oldPage || newPage === oldPage) {
    return
  }

  shouldScrollToContentStart.value = true
})

watch(loading, async (newVal, oldVal) => {
  if (newVal || !oldVal || !shouldScrollToContentStart.value || error.value) {
    return
  }

  await nextTick()
  contentStartRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  shouldScrollToContentStart.value = false
})

onMounted(() => {
  biliMessage.info('加载数据中！')
  emits('onMounted')
})

const refresh_data = () => {
  current_page.value = current_page.value === 1 ? 0 : 1
}
</script>
