<template>
  <!-- 通用用户信息单元格：悬浮展示 UserCard，点击可跳用户空间（需 toSpace）。
       默认插槽可自定义触发文案（如动态正文里的 `@昵称`），未传时回落「昵称 / 用户{mid}」。 -->
  <el-popover
    placement="top"
    :width="320"
    trigger="hover"
    :show-after="showAfter"
    :disabled="!midNumber"
    popper-class="user-brief-popover"
  >
    <template #reference>
      <span
        class="user-brief-cell text-sm text-text-primary"
        :class="toSpace && midNumber ? 'cursor-pointer hover:text-primary' : 'cursor-default'"
        @mouseenter="ensureBrief"
        @click.stop="handleClick"
      >
        <slot>{{ label }}</slot>
      </span>
    </template>
    <UserCard
      :card="cardForPopover"
      :show-actions="showActions"
      @follow="handleFollow"
      @unfollow="handleUnfollow"
    />
  </el-popover>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import UserCard, { type UserCardData } from '@/components/message/UserCard.vue'
import { useUserBrief } from '@/composables/useUserBrief'
import { useUserCardCache } from '@/composables/useUserCardCache'
import { followUser, unfollowUser } from '@/api/notify/moment-api'

const { t } = useI18n()

/**
 * 用户信息展示单元格（审核页 / 动态正文 @ 节点共用）。
 *
 * 数据优先级：
 * 1. 调用方传入的内嵌 `brief`（审核列表已由后端装配用户信息，无需回查）；
 * 2. `useUserBrief` 跨页面共享缓存（审核端批量接口预热）；
 * 3. 以上都没有 → 悬浮时按 `mid` 走**公开接口**懒加载一次，写进
 *    `useUserCardCache` 常驻缓存（黑名单 403 / 用户不存在静默回落昵称兜底）。
 *
 * 2.32.0：缓存由组件内 `ref` 改为模块级共享缓存——已加载的卡片数据不再随组件
 * 卸载销毁；且单次 `/user/space/info` 即可拿全资料 + 统计（不再并发 3 个接口）。
 */
const props = withDefaults(
  defineProps<{
    mid?: number | string | null
    brief?: UserCardData | null
    /** 点击跳用户空间（动态正文 @ 节点用；审核列表默认不跳） */
    toSpace?: boolean
    /** 悬浮多久展示卡片（ms）：审核列表 0 立即展示，正文 @ 传 300 防抖 */
    showAfter?: number
    /** 是否显示关注/私信操作按钮（默认开启；不需要的场景可显式传 false） */
    showActions?: boolean
  }>(),
  {
    mid: null,
    brief: null,
    toSpace: false,
    showAfter: 0,
    showActions: true,
  }
)

const router = useRouter()
const { userCache } = useUserBrief()
const { cache: cardCache, loadUserCard, patchUserCard } = useUserCardCache()

/**
 * 本地关注态：审核列表的 `brief` 来自父组件 prop（只读引用），直接改缓存无法回写到
 * 展示层；故在单元格内维护一份关注态，并合并进传给 UserCard 的副本。
 * 初始为 null（未操作过），展示时回落 `brief.is_following`；关注/取关成功后以**后端
 * `FollowOpResp.followed` 回执**为权威来源覆盖本值（兜底回落操作意图），保证前端展示
 * 与后端实际关系一致，并同步写回共享缓存供其他视图（Feed 等）联动。
 */
const localFollowing = ref<boolean | null>(null)

/** 传给浮层 UserCard 的副本：叠加本地关注态，保证按钮文案实时翻转 */
const cardForPopover = computed<UserCardData | null>(() => {
  const b = brief.value
  if (!b) return null
  if (localFollowing.value === null) return b
  return { ...b, is_following: localFollowing.value }
})

/** mid 归一化：非法 / 0 / 空视为无（浮层 disabled，不请求） */
const midNumber = computed<number | null>(() => {
  const n = Number(props.mid)
  return Number.isFinite(n) && n > 0 ? n : null
})

const brief = computed<UserCardData | null>(() => {
  if (props.brief) return props.brief
  const mid = midNumber.value
  if (!mid) return null
  return userCache.get(mid) ?? cardCache.get(mid) ?? null
})

const label = computed(() => {
  const mid = midNumber.value
  return brief.value?.uname || (mid ? `${t('common.user')}${mid}` : '-')
})

/**
 * 悬浮触发：命中共享缓存则不发请求；未命中走一次 `/user/space/info` 并写入常驻缓存。
 * 失败（403 黑名单 / 1008 用户不存在 / 网络错误）静默回落昵称兜底，且不写缓存可重试。
 */
function ensureBrief(): void {
  const mid = midNumber.value
  if (!mid || props.brief || userCache.has(mid)) return
  void loadUserCard(mid)
}

/** 点击跳用户空间（仅 toSpace 开启时；mid 走字符串避免 19 位雪花 ID 精度丢失） */
function handleClick(): void {
  const mid = midNumber.value
  if (!props.toSpace || !mid) return
  router.push({ name: 'MOMENT_USER_SPACE', params: { mid: String(mid) } })
}

/**
 * 关注/取关：后端业务失败时 `request` 返回 `null`（不抛异常，businessHandler 已弹错），
 * 故以 `resp` 非空作为「成功」唯一判据——失败（如"不能关注自己"）保持原状态，绝不乐观翻转；
 * 成功则以**后端 `FollowOpResp.followed` 回执**为准更新展示态，并写回共享缓存。
 */
async function handleFollow(mid: number): Promise<void> {
  try {
    const resp = await followUser(mid, { showSuccessToast: true, successMessage: '已关注' })
    if (!resp) return // 业务失败：businessHandler 已弹错，状态保持不变
    const followed = resp.followed ?? true // 回执无 followed 字段时回落关注意图
    localFollowing.value = followed
    patchUserCard(mid, { is_following: followed })
  } catch {
    // 意外异常保持原状态
  }
}

async function handleUnfollow(mid: number): Promise<void> {
  try {
    const resp = await unfollowUser(mid, { showSuccessToast: true, successMessage: '已取消关注' })
    if (!resp) return // 业务失败：businessHandler 已弹错，状态保持不变
    const followed = resp.followed ?? false
    localFollowing.value = followed
    patchUserCard(mid, { is_following: followed })
  } catch {
    // 意外异常保持原状态
  }
}

</script>
