<template>
  <article
    class="space-summary-card bg-bg-overlay border border-border-light rounded-lg px-4 py-3 cursor-pointer transition-colors hover:border-primary/40 hover:bg-bg-overlay/80"
    @click="emit('click', item)"
  >
    <!-- 头部：时间 + 置顶角标 + 互动计数 -->
    <header class="space-summary-card__head mb-1.5 flex items-center gap-2 text-xs text-text-placeholder">
      <span class="space-summary-card__time">{{ timeLabel }}</span>
      <el-tag v-if="item.isTop" class="space-summary-card__top" size="default" type="primary" effect="plain">置顶</el-tag>
      <span v-if="stats?.likeCount" class="space-summary-card__stat ml-auto">{{ compactNum(stats.likeCount) }} 赞</span>
      <span v-if="stats?.commentCount" class="space-summary-card__stat">{{ compactNum(stats.commentCount) }} 评</span>
    </header>

    <!-- 正文摘要（纯文本截断，富文本节点不展开） -->
    <p class="space-summary-card__text text-sm text-text-primary leading-relaxed break-words">
      {{ brief }}
    </p>

    <!-- 底部：图片/字数统计 + 话题 -->
    <footer
      v-if="imageCount > 0 || wordCount > 0 || topics.length > 0"
      class="space-summary-card__foot mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-placeholder"
    >
      <span v-if="imageCount > 0" class="space-summary-card__meta">图片 {{ imageCount }} 张</span>
      <span v-if="wordCount > 0" class="space-summary-card__meta">正文 {{ wordCount }} 字</span>
      <el-tag
        v-for="topic in topics"
        :key="topic.topicId"
        class="space-summary-card__topic"
        size="default"
        type="info"
        effect="plain"
      >
        #{{ topic.topicName || '话题' }}
      </el-tag>
    </footer>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { MomentFeedItem, InteractionStatusItem } from '@/api/notify/moment-api'
import type { MomentContentNode, MomentModule, MomentTopicRefOutput } from '@/api/community/hey-api'
import { formatRelativeTime } from '@/utils/dateFormat'

/**
 * 个人空间主页的「一行式动态摘要」卡片（2.58.0）。
 *
 * 为什么单独写一个轻量组件、而不是给 `MomentCard` 加摘要模式：
 * `MomentCard` 内置点赞/点踩/收藏/转发/评论/举报全交互（31KB），被综合页与详情页共用，
 * 改它会牵连一大片；主页摘要只需要「时间 + 截断正文 + 图片/字数/话题 + 计数」这些只读信息。
 *
 * 摘要口径：
 * - 正文取 `desc` 模块的 `text`（后端已算好的纯文本）并截断，富文本节点不展开；
 * - 图片数 = `dynamic`/`desc` 模块里 `renderAsImage` 的 LINK 节点数（与 MomentCard 取图逻辑一致）；
 * - 话题取 `extend` 模块的 `topics[]`（2.22.0 多话题优先，缺省回退单话题字段）；
 * - 互动计数由父级批量 `fetchInteractionStatus` 注入（详情/Feed 接口 2.41.0 起不返回统计）。
 */
const props = defineProps<{
  item: MomentFeedItem
  /** 互动计数（父级批量拉取后按 dynId 注入） */
  stats?: InteractionStatusItem | null
  /** 摘要截断长度 */
  maxLength?: number
}>()

const emit = defineEmits<{ click: [item: MomentFeedItem] }>()

const MAX_LENGTH = computed(() => props.maxLength ?? 60)

/** 按 moduleType 取模块（与 MomentCard 的 moduleOf 同口径：取第一个匹配项） */
function moduleOf(type: string): MomentModule | undefined {
  return (props.item.modules ?? []).find((m) => m.moduleType === type)
}

const descModule = computed(() => moduleOf('desc'))

/** 摘要正文：desc.text 优先，退化到 WORDS 节点拼接（仅纯文本节点，不含 @ / 话题展示名） */
const brief = computed(() => {
  const words = (descModule.value?.nodes ?? [])
    .filter((n: MomentContentNode) => n.type === 'WORDS')
    .map((n: MomentContentNode) => n.text ?? '')
  const raw = descModule.value?.text?.trim() || words.join('')
  if (!raw) return '（无正文）'
  const limit = MAX_LENGTH.value
  return raw.length > limit ? `${raw.slice(0, limit)}…` : raw
})

/** 图片数：LINK 节点里 renderAsImage 的那些（与 MomentCard.images 取法一致） */
const imageCount = computed(() => {
  const nodes = (moduleOf('dynamic')?.nodes ?? descModule.value?.nodes ?? []) as MomentContentNode[]
  return nodes.filter((n) => n.type === 'LINK' && n.picMeta?.renderAsImage).length
})

/** 正文字数：只统计 WORDS 节点（@ / 话题 / 链接的展示名不算正文） */
const wordCount = computed(() =>
  (descModule.value?.nodes ?? [])
    .filter((n: MomentContentNode) => n.type === 'WORDS')
    .reduce((sum: number, n: MomentContentNode) => sum + (n.text?.length ?? 0), 0)
)

/** 话题：extend.topics[] 优先，缺省回退单话题字段（兼容存量数据，同 MomentCard） */
const topics = computed<{ topicId: number; topicName?: string | null }[]>(() => {
  const m = moduleOf('extend')
  const list = (m?.topics ?? []) as MomentTopicRefOutput[]
  if (list.length) return list
  if (m?.topicId != null) return [{ topicId: m.topicId, topicName: m.topicName ?? null }]
  return []
})

const timeLabel = computed(() => {
  const t = props.item.pubTime || props.item.createdTime
  return t ? formatRelativeTime(t) : '-'
})

/** 计数紧凑化（过万转 w），与空间头部统计栏口径一致 */
function compactNum(n?: number | null): string {
  if (n == null || n === 0) return '0'
  if (n >= 10000) return `${(n / 10000).toFixed(1)}w`
  return String(n)
}
</script>
