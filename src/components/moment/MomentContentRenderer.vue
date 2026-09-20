<template>
  <!-- 保留空白：WORDS 节点里的换行 / @ 前后的空格不再被 HTML 空白折叠吞掉 -->
  <div class="moment-content-renderer text-sm leading-relaxed whitespace-pre-wrap text-text-primary">
    <template v-for="(node, idx) in nodes" :key="idx">
      <!-- 纯文本 -->
      <el-text v-if="node.type === 'WORDS'" class="moment-content-renderer__words">{{ node.text }}</el-text>

      <!-- @用户：有 bizId 时复用通用用户单元格（悬浮卡片 + 点击跳空间）；无 bizId 降级纯文本 -->
      <UserBriefCell
        v-else-if="node.type === 'AT' && node.bizId"
        :mid="node.bizId"
        to-space
        :show-after="300"
      >
        <span class="moment-content-renderer__at text-primary">{{ atLabel(node) }}</span>
      </UserBriefCell>
      <el-text
        v-else-if="node.type === 'AT'"
        class="moment-content-renderer__at text-primary"
      >
        {{ atLabel(node) }}
      </el-text>

      <!-- 话题 -->
      <el-link
        v-else-if="node.type === 'TOPIC'"
        class="moment-content-renderer__topic text-primary font-bold"
        type="primary"
        underline="never"
        :href="node.jumpUrl || '#'"
        :rel="LINK_REL"
        :referrerpolicy="LINK_REFERRER_POLICY"
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
        :rel="LINK_REL"
        :referrerpolicy="LINK_REFERRER_POLICY"
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
import UserBriefCell from '@/components/message/UserBriefCell.vue'
import { LINK_REL, LINK_REFERRER_POLICY, openExternalLink } from '@/utils/PageOpen/linkPolicy'
import type { MomentContentNode } from '@/api/notify/moment-api'
import { InteractionBizTypeEnum } from '@/api/notify/moment-api'

defineProps<{
  nodes: MomentContentNode[]
}>()

const router = useRouter()

/**
 * @ 节点展示文本：优先用节点自带的 `@昵称` 文本（发布端写入），
 * 缺失时用 `@` + name 兜底（外部灌入的 AT 节点只有 name），
 * 两者皆无（历史脏数据）时回落 `@` + mid，避免出现孤立的「@」。
 */
function atLabel(node: MomentContentNode): string {
  const text = (node.text || '').trim()
  if (text) return text.startsWith('@') ? text : `@${text}`
  const name = (node.name || '').trim()
  if (name) return `@${name}`
  return node.bizId ? `@${node.bizId}` : '@'
}

/** RESOURCE 节点按 bizType 跳转到对应详情页 */
function handleResourceClick(node: MomentContentNode): void {
  const bizType = node.bizType
  const bizId = node.bizId
  if (!bizType || !bizId) return
  switch (bizType) {
    case InteractionBizTypeEnum.LOTTERY:
      router.push({ path: '/app/lot-data/card-detail', query: { id: bizId } })
      break
    case InteractionBizTypeEnum.OTHERS_LOT_DYN:
      // 第三方抽奖动态：按 dynId 走独立详情页（无 lottery_id）
      router.push({ path: '/app/lot-data/others-dyn-detail', query: { dynId: bizId } })
      break
    case InteractionBizTypeEnum.RPA_BROWSER:
      router.push({ path: `/app/rpa-browser/stream/${bizId}` })
      break
    case InteractionBizTypeEnum.RPA_ACTION:
      router.push({ path: '/app/rpa-browser/actions' })
      break
    case InteractionBizTypeEnum.RPA_WORKFLOW:
      router.push({ path: '/app/rpa-browser/workflows' })
      break
    case InteractionBizTypeEnum.DYNAMIC:
      router.push({ name: 'MOMENT_DETAIL', params: { momentId: bizId } })
      break
    default:
      if (node.jumpUrl) openExternalLink(node.jumpUrl)
  }
}

function resourceTypeLabel(bizType?: InteractionBizTypeEnum | null): string {
  switch (bizType) {
    case InteractionBizTypeEnum.LOTTERY:
      return '抽奖'
    case InteractionBizTypeEnum.OTHERS_LOT_DYN:
      return '第三方抽奖'
    case InteractionBizTypeEnum.RPA_ACTION:
      return 'RPA动作'
    case InteractionBizTypeEnum.RPA_WORKFLOW:
      return 'RPA工作流'
    case InteractionBizTypeEnum.RPA_BROWSER:
      return 'RPA浏览器'
    case InteractionBizTypeEnum.DYNAMIC:
      return '动态'
    default:
      return ''
  }
}
</script>
