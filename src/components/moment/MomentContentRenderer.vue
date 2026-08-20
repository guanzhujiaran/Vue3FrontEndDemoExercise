<template>
  <div class="moment-content-renderer text-sm leading-relaxed text-text-primary">
    <template v-for="(node, idx) in nodes" :key="idx">
      <!-- 纯文本 -->
      <el-text v-if="node.type === 'WORDS'" class="moment-content-renderer__words">{{ node.text }}</el-text>

      <!-- @用户 -->
      <el-link
        v-else-if="node.type === 'AT'"
        class="moment-content-renderer__at text-primary"
        type="primary"
        underline="never"
        :href="node.jumpUrl || '#'"
        @click.stop
      >
        @{{ node.name }}
      </el-link>

      <!-- 话题 -->
      <el-link
        v-else-if="node.type === 'TOPIC'"
        class="moment-content-renderer__topic text-primary font-bold"
        type="primary"
        underline="never"
        :href="node.jumpUrl || '#'"
        @click.stop
      >
        #{{ node.name }}#
      </el-link>

      <!-- 链接 -->
      <el-link
        v-else-if="node.type === 'LINK'"
        class="moment-content-renderer__link text-primary"
        type="primary"
        underline="never"
        :href="node.jumpUrl || '#'"
        @click.stop
      >
        {{ node.text }}
      </el-link>

      <!-- 资源引用（RESOURCE，2.17.0）：抽奖卡片 / RPA 操作等，按 bizType 跳转 -->
      <button
        v-else-if="node.type === 'RESOURCE'"
        class="moment-content-renderer__resource inline-flex items-center gap-2 max-w-full my-1 px-2 py-1 border border-border rounded-lg bg-fill-lighter hover:bg-fill text-left cursor-pointer"
        :aria-label="'查看资源：' + (node.name || '')"
        @click.stop="handleResourceClick(node)"
      >
        <img
          v-if="node.cover"
          class="moment-content-renderer__resource-cover w-10 h-10 rounded object-cover shrink-0"
          :src="node.cover"
          :alt="node.name || 'resource'"
        />
        <span class="moment-content-renderer__resource-name text-primary font-medium truncate">
          {{ node.name || '查看详情' }}
        </span>
        <el-tag v-if="resourceTypeLabel(node.bizType)" size="default" type="info" effect="plain">
          {{ resourceTypeLabel(node.bizType) }}
        </el-tag>
      </button>

      <!-- 未知类型兜底 -->
      <el-text v-else class="moment-content-renderer__unknown">{{ node.text }}</el-text>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import type { MomentContentNode } from '@/api/notify/moment-api'
import type { InteractionBizTypeEnum } from '@/api/notify/moment-api'

defineProps<{
  nodes: MomentContentNode[]
}>()

const router = useRouter()

/** RESOURCE 节点按 bizType 跳转到对应详情页 */
function handleResourceClick(node: MomentContentNode): void {
  const bizType = node.bizType
  const bizId = node.bizId
  if (!bizType || !bizId) return
  switch (bizType as InteractionBizTypeEnum) {
    case 'lottery':
      router.push({ path: '/app/lot-data/card-detail', query: { id: bizId } })
      break
    case 'rpa_browser':
      router.push({ path: `/app/rpa-browser/stream/${bizId}` })
      break
    case 'rpa_action':
      router.push({ path: '/app/rpa-browser/actions' })
      break
    case 'rpa_workflow':
      router.push({ path: '/app/rpa-browser/workflows' })
      break
    case 'dynamic':
      router.push({ name: 'MOMENT_DETAIL', params: { momentId: bizId } })
      break
    default:
      if (node.jumpUrl) window.open(node.jumpUrl, '_blank')
  }
}

function resourceTypeLabel(bizType?: string | null): string {
  switch (bizType as InteractionBizTypeEnum | undefined) {
    case 'lottery':
      return '抽奖'
    case 'rpa_action':
      return 'RPA动作'
    case 'rpa_workflow':
      return 'RPA工作流'
    case 'rpa_browser':
      return 'RPA浏览器'
    case 'dynamic':
      return '动态'
    default:
      return ''
  }
}
</script>
