<template>
  <el-popover placement="top" :width="320" trigger="hover" popper-class="user-brief-popover">
    <template #reference>
      <span class="user-brief-cell cursor-default text-sm text-text-primary">
        {{ brief?.uname || (mid ? `${t('common.user')}${mid}` : '-') }}
      </span>
    </template>
    <UserCard :card="brief" :show-actions="false" />
  </el-popover>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUserBrief } from '@/composables/useUserBrief'
import UserCard from '@/components/message/UserCard.vue'
import type { CommentUserBrief } from '@/api/notify/hey-api'

const { t } = useI18n()

/**
 * 用户信息展示单元格。
 *
 * 优先用调用方传入的内嵌 `brief`（后端审核列表已直连 pptr 把用户信息一并装配，
 * 无需前端再回查）；未传 `brief` 时回退到 `mid` 拉取全局缓存。
 */
const props = defineProps<{
  mid?: number | null
  brief?: CommentUserBrief | null
}>()

const { userCache } = useUserBrief()

const brief = computed<CommentUserBrief | null>(() => {
  if (props.brief) return props.brief
  return props.mid ? (userCache.get(props.mid) ?? null) : null
})
</script>
