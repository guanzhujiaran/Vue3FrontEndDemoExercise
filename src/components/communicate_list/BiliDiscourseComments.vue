<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import { useUserNavStore } from '@/stores/user_nav.ts'
import {
  buildDiscourseEmbedUrl,
  buildDiscourseTopicTitle,
  discourseConfig
} from '@/api/feedback/discourse_config.ts'
import biliMessage from '@/utils/message'

/**
 * Discourse 嵌入式评论框组件
 *
 * 用于在抽奖卡片下方挂载 Discourse 主题评论
 * 场景：卡片主要内容可能为空，但需要承载评论/打分评价
 *
 * 工作原理：
 * 1. 在容器内放置 `<div id="discourse-comments">`
 * 2. 设置全局 `window.DiscourseEmbed`
 * 3. 加载 Discourse 的 `embed.js`，由其填充 iframe
 * 4. 通过 postMessage 动态调整 iframe 高度
 *
 * 每张抽奖卡片对应一个唯一 embed_url，Discourse 自动按 URL 创建对应主题
 */
const props = defineProps<{
  /** 抽奖卡片业务 ID（用于生成唯一 embed_url） */
  lotteryId: string | number
  /** 抽奖卡片标题（用作 Discourse 主题标题） */
  lotteryTitle: string
  /**
   * 自定义主题标题（可选）
   * 不传则用 "抽奖评论 - {lotteryTitle}（#{lotteryId}）"
   */
  topicTitle?: string
  /** 是否显示标题栏（默认 true） */
  showHeader?: boolean
  /** 空内容时显示的副标题 */
  subtitle?: string
}>()

const embedContainer = useTemplateRef<HTMLElement>('embedContainer')

const isLoading = ref(true)
const hasError = ref(false)
const errorMessage = ref('')
const iframeHeight = ref<number>(discourseConfig.fallbackEmbedHeight)
const hasMountedEmbed = ref(false)

/**
 * 通过 JS 直接操作 DOM style 调整 iframe 容器高度
 *
 * 不使用 :style 绑定（项目规范禁止）
 * iframe 高度由 Discourse 通过 postMessage 动态通知
 * 容器默认有 min-h-[24rem] 作为初始兜底
 */
const applyIframeHeight = (height: number) => {
  iframeHeight.value = height
  if (embedContainer.value) {
    embedContainer.value.style.minHeight = `${height}px`
  }
}

watch(iframeHeight, async (newHeight) => {
  await nextTick()
  if (embedContainer.value) {
    embedContainer.value.style.minHeight = `${newHeight}px`
  }
})

const headerSubtitle = computed(() => {
  if (props.subtitle) return props.subtitle
  return '基于 Discourse 的社区评论，支持回复、点赞、引用、Markdown'
})

const showHeader = computed(() => props.showHeader !== false)

/**
 * 清空当前嵌入的 Discourse iframe 和全局状态
 * 防止多卡片共存时互相污染
 */
const clearEmbed = () => {
  if (embedContainer.value) {
    embedContainer.value.innerHTML = ''
  }
  // 清理全局状态（embed.js 依赖 window.DiscourseEmbed）
  if ((window as any).DiscourseEmbed) {
    delete (window as any).DiscourseEmbed
  }
  hasMountedEmbed.value = false
}

/**
 * 加载 Discourse embed.js 并初始化当前卡片的评论
 */
const loadEmbed = () => {
  if (!embedContainer.value) return

  clearEmbed()
  isLoading.value = true
  hasError.value = false
  errorMessage.value = ''
  applyIframeHeight(discourseConfig.fallbackEmbedHeight)

  const userNavStore = useUserNavStore()
  const userName = userNavStore.user_nav.user_name || ''

  try {
    // embed.js 读取全局 DiscourseEmbed 对象决定要加载哪个主题
    ;(window as any).DiscourseEmbed = {
      discourseUrl: discourseConfig.discourseUrl,
      discourseEmbedUrl: buildDiscourseEmbedUrl(props.lotteryId),
      topicTitle: props.topicTitle || buildDiscourseTopicTitle(props.lotteryTitle, props.lotteryId),
      // 传入当前已登录的 Bili 用户名，Discourse 会尝试匹配本地账号
      // 若未匹配到，会引导跳转 SSO（Casdoor）完成首次绑定
      discourseUserName: userName,
      fullApp: discourseConfig.fullApp,
      embedHeight: `${discourseConfig.fallbackEmbedHeight}px`
    }

    const script = document.createElement('script')
    script.src = `${discourseConfig.discourseUrl}javascripts/embed.js`
    script.async = true
    script.setAttribute('data-discourse-embed', String(props.lotteryId))

    script.addEventListener('load', () => {
      // embed.js 加载完毕后，会异步创建 iframe，等待 postMessage 通知高度
      // 兜底：2s 内未收到高度通知也撤掉 loading
      window.setTimeout(() => {
        if (isLoading.value && !hasError.value) {
          const iframe = embedContainer.value?.querySelector('iframe')
          if (iframe) {
            hasMountedEmbed.value = true
            isLoading.value = false
          } else {
            hasError.value = true
            errorMessage.value = 'Discourse 评论服务初始化失败：未创建评论容器'
            isLoading.value = false
          }
        }
      }, 2000)
    })

    script.addEventListener('error', () => {
      hasError.value = true
      errorMessage.value = 'Discourse 评论服务暂时不可用，请稍后重试'
      isLoading.value = false
      biliMessage.error('Discourse 评论服务加载失败')
    })

    embedContainer.value.appendChild(script)
  } catch (e) {
    hasError.value = true
    errorMessage.value = e instanceof Error ? e.message : '未知错误'
    isLoading.value = false
  }
}

/**
 * 处理 Discourse 通过 postMessage 发来的高度调整请求
 * 同源校验避免恶意页面伪造
 */
const handleMessage = (e: MessageEvent) => {
  let discourseOrigin: string
  try {
    discourseOrigin = new URL(discourseConfig.discourseUrl).origin
  } catch {
    return
  }
  if (e.origin !== discourseOrigin) return

  const data = e.data
  if (!data || typeof data !== 'object') return

  // Discourse embed.js 通过 message 通知父页面调整 iframe 高度
  if (data.type === 'discourse-resize' && typeof data.height === 'number') {
    applyIframeHeight(Math.max(data.height, 400))
    hasMountedEmbed.value = true
    isLoading.value = false
  }
}

const handleRetry = () => {
  loadEmbed()
}

watch(
  () => props.lotteryId,
  () => {
    loadEmbed()
  }
)

onMounted(() => {
  window.addEventListener('message', handleMessage)
  loadEmbed()
})

onBeforeUnmount(() => {
  window.removeEventListener('message', handleMessage)
  clearEmbed()
})
</script>

<template>
  <section class="discourse-comments flex flex-col gap-3 rounded-lg border border-border-light bg-bg-page p-4">
    <header v-if="showHeader" class="discourse-comments__header flex flex-wrap items-center justify-between gap-2">
      <div class="flex flex-col gap-1">
        <h3 class="m-0 text-base font-semibold text-text-primary">抽奖评论</h3>
        <p class="m-0 text-xs leading-relaxed text-text-secondary">{{ headerSubtitle }}</p>
      </div>
      <el-tag
        type="info"
        effect="plain"
        round
        class="discourse-comments__source-tag"
      >
        Powered by Discourse
      </el-tag>
    </header>

    <div class="discourse-comments__body relative w-full">
      <!-- 加载态骨架屏 -->
      <div
        v-if="isLoading"
        class="discourse-comments__skeleton flex flex-col gap-3 py-4"
      >
        <el-skeleton :rows="5" animated />
      </div>

      <!-- 错误占位 + 重试 -->
      <div
        v-else-if="hasError"
        class="discourse-comments__error flex flex-col items-center justify-center gap-3 py-12"
      >
        <el-empty
          :description="errorMessage || '评论加载失败'"
          :image-size="80"
        />
        <el-button
          type="primary"
          size="default"
          @click="handleRetry"
        >
          重试
        </el-button>
      </div>

      <!-- Discourse iframe 容器
        容器高度由 JS 通过 postMessage 接收后动态设置 style.minHeight
        Tailwind class 提供初始默认 min-h-[24rem] (384px) 作为加载兜底 -->
      <div
        ref="embedContainer"
        class="discourse-comments__embed-container w-full min-h-[24rem] overflow-hidden rounded-md border border-border-lighter bg-bg transition-opacity duration-300"
        :class="{
          'opacity-0': isLoading || hasError,
          'opacity-100': hasMountedEmbed && !isLoading && !hasError
        }"
        :data-discourse-embed-id="String(props.lotteryId)"
      ></div>
    </div>
  </section>
</template>
