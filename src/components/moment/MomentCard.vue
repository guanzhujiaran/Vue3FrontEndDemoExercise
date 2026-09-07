<template>
  <div
    class="moment-card bg-bg-overlay hover:bg-fill-light rounded-lg border border-border-light p-4 transition-colors"
  >
    <!-- 作者信息 -->
    <div class="moment-card__header flex items-center gap-3 mb-3">
      <!-- 头像：悬浮显示用户卡片（含关注/发消息），点击跳用户空间 -->
      <el-popover
        placement="bottom-start"
        :width="320"
        trigger="hover"
        :show-after="300"
        popper-class="moment-card__user-popover"
      >
        <template #reference>
          <el-avatar
            class="moment-card__avatar shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
            :size="40"
            :src="authorInfo?.face || BiliImg.face.noface"
            @mouseenter="loadHoverCard(authorInfo?.mid)"
            @click.stop="handleAvatarClick"
          />
        </template>
        <UserCard
          :card="hoverUserCard"
          @follow="handleUserFollow"
          @unfollow="handleUserUnfollow"
        />
      </el-popover>
      <div class="moment-card__author flex-1 min-w-0" @click.stop>
        <div class="flex items-center gap-2">
          <!-- 用户名：点击跳用户空间（无悬浮卡片） -->
          <span
            class="moment-card__username text-sm font-bold text-text-primary truncate cursor-pointer hover:text-primary"
            @click.stop="handleAvatarClick"
          >
            {{ authorInfo?.uname || '未知用户' }}
          </span>
          <el-tag v-if="item.isTop" size="default" type="warning" class="moment-card__top-tag">置顶</el-tag>
          <el-tag
            v-if="auditBadge"
            size="default"
            :type="auditBadge.type"
            class="moment-card__audit-tag"
          >
            {{ auditBadge.text }}
          </el-tag>
        </div>
        <!-- 发布时间：仅点击时间标签跳详情页；日期旁展示 IP 属地 + 运营商（不可跳转） -->
        <div class="moment-card__time text-xs text-text-placeholder mt-1">
          <span
            class="moment-card__time-label cursor-pointer hover:text-primary"
            @click.stop="handleClick"
          >{{ timeLabel }}</span>
          <span
            v-if="ipLocationLabel"
            class="moment-card__ip-location ml-1.5 text-text-placeholder/80"
          >
            · ip属地: {{ ipLocationLabel }}
          </span>
        </div>
      </div>
      <el-dropdown v-if="effectiveShowMore" trigger="click" @click.stop>
        <el-button class="moment-card__more-btn" text :icon="MoreFilled" />
        <template #dropdown>
          <el-dropdown-menu class="moment-card__actions-menu">
            <el-dropdown-item v-if="effectiveCanRemove || isAdmin" class="moment-card__action-remove" @click="handleRemove">
              <el-icon><Delete /></el-icon> 删除
            </el-dropdown-item>
            <el-dropdown-item
              class="moment-card__action-report"
              @click="handleReport"
            >
              <el-icon><WarningFilled /></el-icon> 举报
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>

    <!-- 话题卡（作者信息下方 / 正文上方，对齐 B 站 module_extend；2.22.0 支持多话题逐卡渲染） -->
    <div
      v-if="topicModules.length"
      class="moment-card__topic-list mb-3 flex flex-wrap gap-2"
    >
      <div
        v-for="t in topicModules"
        :key="t.topicId"
        class="moment-card__topic-card flex items-center gap-2 rounded-md border border-border-light bg-bg-page/50 px-3 py-2 cursor-pointer transition-colors hover:border-primary/50"
        @click.stop="openTopic(t)"
      >
        <el-icon class="moment-card__topic-icon text-primary shrink-0"><Collection /></el-icon>
        <span class="moment-card__topic-name text-sm font-medium text-primary truncate">
          #{{ t.topicName || `话题 ${t.topicId}` }}#
        </span>
      </div>
    </div>

    <!-- 正文内容：点击文字不跳详情；内部 @/话题/链接/资源节点自带跳转，不触详情 -->
    <div class="moment-card__body mb-3">
      <div
        v-if="descModule?.nodes?.length"
        class="moment-card__body-renderer"
      >
        <MomentContentRenderer :nodes="descModule.nodes" />
      </div>
      <el-text v-else class="text-sm text-text-placeholder">暂无内容</el-text>
    </div>

    <!-- 图片：对齐 B 站相册预览（单图等比限高 / grid2=2张268px / grid3=≥3张404px），
         超过 9 张折叠为「更多 N 张」，点击展开全部预览 -->
    <div
      v-if="images.length > 0"
      class="moment-card__images mb-3"
      :class="imageGridClass"
      @click.stop
    >
      <template v-if="images.length === 1">
        <!-- 单图：等比显示，限宽 404px 限高 300px -->
        <div class="moment-card__image-single overflow-hidden rounded-md cursor-pointer max-w-101 max-h-75">
          <el-image
            :ref="(el: any) => (imageRefs[0] = el)"
            :src="images[0]"
            class="moment-card__image-single-img w-full h-auto"
            :fit="'contain'"
            referrerpolicy="no-referrer"
            loading="lazy"
            :preview-src-list="images"
            :initial-index="0"
            preview-teleported
            :alt="`动态图片 1`"
          />
        </div>
      </template>
      <template v-else>
        <div
          v-for="(img, idx) in images.slice(0, 9)"
          :key="idx"
          class="moment-card__image-picture overflow-hidden rounded-md cursor-pointer"
          :class="imageCellClass"
        >
          <!-- 超过 9 张时，最后一张格子上盖「更多 N 张」蒙层，点击打开预览 -->
          <div class="moment-card__image-item relative w-full h-full">
            <el-image
              :ref="(el: any) => (imageRefs[idx] = el)"
              :src="img"
              class="moment-card__image w-full h-full"
              :fit="'cover'"
              referrerpolicy="no-referrer"
              loading="lazy"
              :preview-src-list="images"
              :initial-index="idx"
              preview-teleported
              :alt="`动态图片 ${idx + 1}`"
            />
            <div
              v-if="isLastGridSlot(idx)"
              class="moment-card__image-more absolute inset-0 flex items-center justify-center bg-black/50 text-white text-base font-bold cursor-pointer"
              @click="openImagePreview"
            >
              +{{ images.length - 9 }}
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- 附加卡（module_additional，2.21.0）：渲染于正文下方，只存 bizType+bizId，name/cover/jumpUrl 由后端 RPC 实时返回 -->
    <div
      v-if="additionalModule"
      class="moment-card__attach mb-3"
      @click.stop
    >
      <MomentAttachCard
        :biz-type="additionalModule.bizType"
        :biz-id="additionalModule.bizId"
        :name="additionalModule.name"
        :cover="additionalModule.cover"
        :jump-url="additionalModule.jumpUrl"
      />
    </div>

    <!-- 转发源（平铺展示原动态内容）：点击跳原动态详情 -->
    <div
      v-if="forwardModule"
      class="moment-card__forward bg-bg-page rounded-md border border-border-lighter p-3 mb-3 cursor-pointer hover:bg-fill-light transition-colors"
      @click.stop="handleSrcClick"
    >
      <!-- 方式一：嵌套原动态完整卡片（srcMoment） -->
      <template v-if="srcMoment">
        <div class="moment-card__forward-author flex items-center gap-2 mb-2">
          <el-avatar
            class="moment-card__forward-avatar shrink-0"
            :size="24"
            :src="srcMomentAuthor?.face || BiliImg.face.noface"
          />
          <span class="moment-card__forward-username text-sm font-bold text-text-primary truncate">
            {{ srcMomentAuthor?.uname || '未知用户' }}
          </span>
          <span class="moment-card__forward-time text-xs text-text-placeholder">
            {{ srcMomentTime }}
          </span>
        </div>
        <MomentContentRenderer
          v-if="srcMomentDescNodes?.length"
          :nodes="srcMomentDescNodes"
        />
        <el-text v-else class="text-sm text-text-placeholder">暂无内容</el-text>
        <!-- 原动态图片：B 站相册预览布局（单图等比 / grid2 / grid3），超出 9 张折叠「更多」 -->
        <div
          v-if="srcMomentImages.length > 0"
          class="moment-card__forward-images mt-2"
          :class="srcMomentImageGridClass"
        >
          <template v-if="srcMomentImages.length === 1">
            <div class="moment-card__forward-image-single overflow-hidden rounded-md cursor-pointer max-w-67 max-h-50">
              <el-image
                :ref="(el: any) => (srcImageRefs[0] = el)"
                :src="srcMomentImages[0]"
                class="moment-card__forward-image-single-img w-full h-auto"
                :fit="'contain'"
                referrerpolicy="no-referrer"
                loading="lazy"
                :preview-src-list="srcMomentImages"
                :initial-index="0"
                preview-teleported
                :alt="`转发图片 1`"
              />
            </div>
          </template>
          <template v-else>
            <div
              v-for="(img, idx) in srcMomentImages.slice(0, 9)"
              :key="idx"
              class="moment-card__forward-image-wrap overflow-hidden rounded-md cursor-pointer"
              :class="srcImageCellClass"
            >
              <div class="moment-card__forward-image-item relative w-full h-full">
                <el-image
                  :ref="(el: any) => (srcImageRefs[idx] = el)"
                  :src="img"
                  class="moment-card__forward-image w-full h-full"
                  :fit="'cover'"
                  referrerpolicy="no-referrer"
                  loading="lazy"
                  :preview-src-list="srcMomentImages"
                  :initial-index="idx"
                  preview-teleported
                  :alt="`转发图片 ${idx + 1}`"
                />
              <div
                v-if="isSrcLastGridSlot(idx)"
                class="moment-card__forward-image-more absolute inset-0 flex items-center justify-center bg-black/50 text-white text-sm font-bold cursor-pointer"
                @click="openSrcImagePreview"
              >
                +{{ srcMomentImages.length - 9 }}
              </div>
            </div>
          </div>
          </template>
        </div>
        <!-- 原动态若是转发，递归平铺（最多两层） -->
        <div
          v-if="srcMomentForwardModule"
          class="moment-card__forward-nested bg-bg-overlay rounded-md border border-border-lighter p-2 mt-2"
          @click.stop="handleNestedSrcClick"
        >
          <div class="flex items-center gap-2 mb-1">
            <span class="text-xs text-text-placeholder">转发自</span>
            <span class="text-xs font-bold text-text-primary truncate">
              {{ nestedAuthor?.uname || '未知用户' }}
            </span>
          </div>
          <MomentContentRenderer
            v-if="nestedDescNodes?.length"
            :nodes="nestedDescNodes"
          />
        </div>
      </template>
      <!-- 方式二：旧结构（仅 uname + nodes，兼容历史数据） -->
      <template v-else>
        <div class="text-xs text-text-placeholder mb-1">
          <el-text size="small">{{ forwardAuthor }}:</el-text>
        </div>
        <MomentContentRenderer v-if="forwardDescNodes?.length" :nodes="forwardDescNodes" />
        <el-text v-else class="text-sm text-text-placeholder">转发内容不可见</el-text>
      </template>
    </div>

    <!-- 互动统计 -->
    <div @click.stop>
      <MomentStatBar
        :stat="props.status ?? null"
        :is-liked="interactionModule?.isLike ?? false"
        :loading="thumbLoading"
        :is-disliked="isDisliked"
        :dislike-loading="dislikeLoading"
        @thumb="handleThumb"
        @comment="handleComment"
        @repost="showRepostDialog = true"
        @dislike="handleDislike"
      />
    </div>

    <!-- 评论区（inlineComment 模式：卡片内下拉展开，首次点击懒加载） -->
    <div
      v-if="inlineComment && showComments"
      class="moment-card__comments mt-3 border-t border-border-lighter pt-3"
      @click.stop
    >
      <LotteryCommentSection
        :oid="props.item.dynIdStr"
        :type="InteractionBizTypeEnum.DYNAMIC"
        :up-mid="props.item.mid"
        @count-change="handleCommentCountChange"
      />
    </div>

    <!-- 转发弹窗：复用统一动态编辑器（转发模式） -->
    <MomentPublishForm
      v-model:visible="showRepostDialog"
      is-repost
      :src-dyn-id="props.item.dynIdStr"
      :src-author-name="authorInfo?.uname ?? undefined"
      :src-author-face="authorInfo?.face ?? undefined"
      :src-summary="repostSrcSummary"
      @success="handleRepostSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { MoreFilled, Delete, WarningFilled, Collection } from '@element-plus/icons-vue'
import MomentContentRenderer from './MomentContentRenderer.vue'
import MomentPublishForm from './MomentPublishForm.vue'
import MomentStatBar from './MomentStatBar.vue'
import MomentAttachCard from './MomentAttachCard.vue'
import UserCard from '@/components/message/UserCard.vue'
import { useUserCardCache } from '@/composables/useUserCardCache'
import {
  followUser,
  unfollowUser,
  adminRemoveMoment,
  removeMoment,
  dislikeMoment,
} from '@/api/notify/moment-api'
import { isMomentDisliked, setMomentDisliked } from '@/composables/useMomentDislike'
import type {
  MomentFeedItem,
  MomentModule,
  MomentContentNode,
  InteractionStatusItem,
} from '@/api/notify/moment-api'
import { InteractionBizTypeEnum } from '@/api/lottery_comment'
import LotteryCommentSection from '@/components/lottery_data/LotteryCommentSection.vue'
import { BiliImg } from '@/assets/img/BiliImg'
import { useUserNavStore } from '@/stores/user_nav'
import { useRpaAdminStore } from '@/stores/rpa_admin'
import biliMessage from '@/utils/message'

const props = withDefaults(
  defineProps<{
    item: MomentFeedItem
    showMoreActions?: boolean
    canRemove?: boolean
    /** 评论交互模式：true=卡片内下拉展开评论区（信息流，对标 B 站）；false=emit comment（详情页切 tab） */
    inlineComment?: boolean
    /** 2.41.0：互动统计（来自统一 /interaction/status 批量接口），卡片不再内置 stat 模块 */
    status?: InteractionStatusItem | null
  }>(),
  {
    inlineComment: true,
    status: null,
  }
)

const emit = defineEmits<{
  click: [item: MomentFeedItem]
  srcClick: [item: MomentFeedItem]
  thumb: [dynIdStr: string]
  remove: [dynIdStr: string]
  report: [dynIdStr: string]
  avatarClick: [item: MomentFeedItem]
  /** 点击评论（inlineComment=false 时）：父组件切换到评论 tab（详情页） */
  comment: [item: MomentFeedItem]
  /** 2.62.0：点踩 / 取消点踩（API 已由卡片内调用，父组件仅收通知） */
  dislike: [dynIdStr: string, isDislike: boolean]
}>()

const router = useRouter()
const thumbLoading = ref(false)
/** 2.62.0：点踩请求中（防连点） */
const dislikeLoading = ref(false)

/** 2.62.0：是否已点踩（本地乐观态优先，回落互动态 `status.isDislike`） */
const isDisliked = computed(() => isMomentDisliked(props.item.dynIdStr, props.status))

const userNavStore = useUserNavStore()
const currentMid = computed(() => Number(userNavStore.user_nav?.uid) || 0)

const adminStore = useRpaAdminStore()
/** 管理员（root）可删除任意动态（2.22.1）：入口对所有动态可见，走 adminRemoveMoment */
const isAdmin = computed(() => adminStore.status.is_root)

onMounted(() => {
  // 防御性加载：社区 Feed 场景（非管理端路由）首次挂载卡片时补齐管理员身份，无重复请求
  if (!adminStore.loaded) {
    adminStore.fetchStatus()
  }
})

/**
 * 是否展示「删除」入口：
 * - 外部显式传 `canRemove=true`（如个人空间 `isOwnSpace`）时以外部值为准；
 * - 未传入 / 传入 false 时，动态作者 `item.mid` 等于当前登录用户则视为本人动态，可删除。
 *
 * 注意：Vue 3 中 `canRemove?: boolean` 未传入时默认解析为 `false`（而非 `undefined`），
 * 因此**不能**用 `props.canRemove !== undefined` 判断是否显式传入，否则综合 Feed /
 * 话题 Feed / 详情页等未传 `can-remove` 的场景会恒返回 false，作者删除入口永不显示。
 * 由此保证首页 Feed / 话题 Feed / 详情页等社区各场景，用户都能删除自己的动态。
 */
const effectiveCanRemove = computed(() => {
  if (props.canRemove) return true
  return props.item.mid === currentMid.value
})

/** 2.22.1：More 菜单显示条件——外部显式开启，或当前用户为管理员（root，任意场景可见删除入口） */
const effectiveShowMore = computed(() => props.showMoreActions || isAdmin.value)

/** 转发弹窗显隐 */
const showRepostDialog = ref(false)

/** 内联评论区展开状态 */
const showComments = ref(false)

/**
 * 悬浮用户卡片：数据取自 `useUserCardCache` 常驻共享缓存（2.32.0）。
 *
 * - 缓存挂在模块作用域，组件卸载（列表重渲染 / 路由切换 / popover 销毁）**不销毁**，
 *   同一用户再次悬浮零请求；
 * - 一次 `/user/space/info` 拿全资料 + `follow_stat` + `upstat` + `is_followed`，
 *   不再并发 `/message/follow/stat` + `/community/upstat` + `/message/follow/relation`；
 * - 请求失败不写缓存，下次悬浮可重试。
 */
const { cache: cardCache, loadUserCard, patchUserCard } = useUserCardCache()
const hoverUserCard = computed(() => {
  const mid = authorInfo.value?.mid
  if (!mid) return null
  // 未命中缓存时先给出作者模块自带的昵称/头像，卡片不会空白
  return (
    cardCache.get(mid) ?? {
      mid,
      uname: authorInfo.value?.uname ?? null,
      avatar: authorInfo.value?.face ?? null,
    }
  )
})

function loadHoverCard(mid?: number | null) {
  if (!mid) return
  void loadUserCard(mid, {
    mid,
    uname: authorInfo.value?.uname ?? null,
    avatar: authorInfo.value?.face ?? null,
  })
}

/**
 * 关注 / 取关（用户卡片按钮）。
 *
 * 成功后直接改共享缓存里的 `is_following`（2.32.0：不再回查
 * `/message/follow/relation`，接口成功即代表状态已翻转）；失败保持原状态。
 */
async function handleUserFollow(mid: number) {
  try {
    const resp = await followUser(mid, {
      showSuccessToast: true,
      successMessage: '已关注',
    })
    // 业务失败 request 返回 null（不抛异常），保持原状态；成功以回执 followed 为准
    if (!resp) return
    const followed = resp.followed ?? true
    patchUserCard(mid, { is_following: followed })
  } catch {
    // 意外异常保持原状态
  }
}
async function handleUserUnfollow(mid: number) {
  try {
    const resp = await unfollowUser(mid, {
      showSuccessToast: true,
      successMessage: '已取消关注',
    })
    if (!resp) return
    const followed = resp.followed ?? false
    patchUserCard(mid, { is_following: followed })
  } catch {
    // 意外异常保持原状态
  }
}

/** 按 moduleType 查找模块 */
function moduleOf(type: string): MomentModule | undefined {
  return props.item.modules?.find((m) => m.moduleType === type)
}

const authorInfo = computed(() => moduleOf('author'))
const descModule = computed(() => moduleOf('desc'))
const forwardModule = computed(() => moduleOf('forward'))
const interactionModule = computed(() => moduleOf('interaction'))
const topicModule = computed(() => moduleOf('extend'))
const additionalModule = computed(() => moduleOf('additional'))

/** 2.22.0 多话题：优先取 extend.topics[]；无则单话题 topicId 兜底（兼容存量数据） */
const topicModules = computed<{ topicId: number; topicName?: string | null }[]>(() => {
  const m = topicModule.value
  if (!m) return []
  if (m.topics?.length) return m.topics
  if (m.topicId != null) return [{ topicId: m.topicId, topicName: m.topicName ?? null }]
  return []
})

const forwardAuthor = computed(() => forwardModule.value?.uname || '未知')
const forwardDescNodes = computed<MomentContentNode[]>(
  () => (forwardModule.value?.nodes as MomentContentNode[]) || []
)

/** 嵌套的原动态完整卡片（平铺渲染主数据源） */
const srcMoment = computed<MomentFeedItem | undefined>(() => forwardModule.value?.srcMoment ?? undefined)

/** 原动态的 author / desc / dynamic / forward 模块 */
const srcMomentAuthor = computed<MomentModule | undefined>(() =>
  srcMoment.value?.modules?.find((m) => m.moduleType === 'author')
)
const srcMomentDescModule = computed<MomentModule | undefined>(() =>
  srcMoment.value?.modules?.find((m) => m.moduleType === 'desc')
)
const srcMomentForwardModule = computed<MomentModule | undefined>(() =>
  srcMoment.value?.modules?.find((m) => m.moduleType === 'forward')
)

const srcMomentDescNodes = computed<MomentContentNode[]>(
  () => (srcMomentDescModule.value?.nodes as MomentContentNode[]) || []
)

/** 原动态正文图片（desc 模块里 renderAsImage 的 LINK 节点，取 jumpUrl） */
const srcMomentImages = computed<string[]>(() => {
  const nodes = (srcMomentDescModule.value?.nodes || []) as MomentContentNode[]
  return nodes
    .filter((n) => n.type === 'LINK' && n.picMeta && n.picMeta.renderAsImage)
    .map((n) => n.jumpUrl)
    .filter((u): u is string => Boolean(u))
})

const srcMomentImageGridClass = computed(() => {
  const len = srcMomentImages.value.length
  if (len === 1) return 'moment-card__forward-images-single grid grid-cols-1'
  if (len === 2) return 'moment-card__forward-images-grid2 grid grid-cols-2 gap-1 w-67 max-w-full'
  return 'moment-card__forward-images-grid3 grid grid-cols-3 gap-1 w-101 max-w-full'
})

/** 转发多图格子固定 132×132 */
const srcImageCellClass = computed(() => 'w-33 h-33')

const srcMomentTime = computed(() => {
  const t = srcMoment.value?.pubTime || srcMoment.value?.createdTime
  if (!t) return ''
  const d = new Date(t)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('zh-CN', { hour12: false })
})

/** 原动态若本身是转发，再往上一层 */
const nestedSrcMoment = computed<MomentFeedItem | undefined>(
  () => srcMomentForwardModule.value?.srcMoment ?? undefined
)
const nestedAuthor = computed<MomentModule | undefined>(() =>
  nestedSrcMoment.value?.modules?.find((m) => m.moduleType === 'author')
)
const nestedDescNodes = computed<MomentContentNode[]>(
  () =>
    (nestedSrcMoment.value?.modules?.find((m) => m.moduleType === 'desc')?.nodes as
      | MomentContentNode[]
      | undefined) || []
)

/** 从 dynamic/desc 模块提取图片地址（renderAsImage 的 LINK 节点，取 jumpUrl） */
const images = computed<string[]>(() => {
  const dynMod = moduleOf('dynamic')
  const nodes = (dynMod?.nodes || descModule.value?.nodes || []) as MomentContentNode[]
  return nodes
    .filter((n) => n.type === 'LINK' && n.picMeta && n.picMeta.renderAsImage)
    .map((n) => n.jumpUrl)
    .filter((u): u is string => Boolean(u))
})

// 对齐 B 站相册预览尺寸规范：
//  - 单张：等比限高（max-w-101 max-h-75）
//  - 2 张：grid2，2 列 × 132px，容器宽 268px
//  - ≥3 张：grid3，3 列 × 132px，容器宽 404px
const imageGridClass = computed(() => {
  const len = images.value.length
  if (len === 1) {
    return 'moment-card__images-single grid grid-cols-1'
  }
  if (len === 2) {
    return 'moment-card__images-grid2 grid grid-cols-2 gap-1 w-67 max-w-full'
  }
  return 'moment-card__images-grid3 grid grid-cols-3 gap-1 w-101 max-w-full'
})

/** 多图网格中单个格子固定 132×132 */
const imageCellClass = computed(() => 'w-33 h-33')

const timeLabel = computed(() => {
  const t = props.item.pubTime || props.item.createdTime
  if (!t) return '-'
  const d = new Date(t)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString('zh-CN', { hour12: false })
})

/** IP 属地 + ISP 组合文案（如「浙江 杭州 · 电信」）；无属地则不显示 */
const ipLocationLabel = computed(() => {
  const loc = props.item.ipLocation
  if (!loc) return ''
  const isp = props.item.ipIsp
  return isp ? `${loc} · ${isp}` : loc
})

/**
 * 审核状态标记（2.23.0 修复：后端 MomentAuditStatusEnum 为 StrEnum，
 * Feed/详情返回的 auditStatus 恒为字符串，原 case -1/0/1 数字匹配永不命中，
 * 导致作者本人视角的「待审核/审核驳回」标签从未显示）。
 * 仅非 normal 状态返回标签；normal 无标记。
 */
const auditBadge = computed(() => {
  switch (props.item.auditStatus) {
    case 'rejected':
      return { text: '审核驳回', type: 'danger' as const }
    case 'auditing':
      return { text: '待审核', type: 'warning' as const }
    case 'hidden':
      return { text: '已下架', type: 'info' as const }
    default:
      return null
  }
})

function handleClick() {
  emit('click', props.item)
}

/** 点击话题卡片：跳话题详情页（2.22.0 支持多话题，逐卡跳转） */
function openTopic(t: { topicId: number; topicName?: string | null }) {
  if (t.topicId != null) {
    router.push({
      name: 'MOMENT_TOPIC_FEED',
      params: { topicId: String(t.topicId) },
      query: { topicName: t.topicName || '' }
    })
  }
}

/** 九宫格：图片超过 9 张时，最后一个格子叠「更多 N 张」蒙层 */
function isLastGridSlot(idx: number) {
  return images.value.length > 9 && idx === 8
}

/** 点击「更多 N 张」：触发第 9 张 el-image 的预览（preview-src-list 全量），从折叠处继续浏览 */
function openImagePreview() {
  const ninth = imageRefs.value[8]
  ninth?.preview()
}

/** 九宫格第 9 张 el-image 的引用（「更多 N 张」蒙层用它打开预览） */
const imageRefs = ref<Array<{ preview: () => void }>>([])

/** 转发原动态：超过 9 张时最后格叠「更多 N 张」蒙层 */
function isSrcLastGridSlot(idx: number) {
  return srcMomentImages.value.length > 9 && idx === 8
}

/** 转发图「更多 N 张」：触发第 9 张预览 */
function openSrcImagePreview() {
  const ninth = srcImageRefs.value[8]
  ninth?.preview()
}

/** 转发九宫格第 9 张 el-image 引用 */
const srcImageRefs = ref<Array<{ preview: () => void }>>([])

/** 点击转发卡 → 跳原动态详情 */
function handleSrcClick() {
  if (srcMoment.value) {
    emit('srcClick', srcMoment.value)
  } else if (forwardModule.value?.srcDynId) {
    emit('srcClick', {
      ...props.item,
      dynId: forwardModule.value.srcDynId,
      dynIdStr: String(forwardModule.value.srcDynId),
    })
  }
}

/** 点击嵌套转发 → 跳更上层的原动态详情 */
function handleNestedSrcClick() {
  if (nestedSrcMoment.value) {
    emit('srcClick', nestedSrcMoment.value)
  }
}

function handleAvatarClick() {
  emit('avatarClick', props.item)
}

async function handleThumb() {
  thumbLoading.value = true
  emit('thumb', props.item.dynIdStr)
  // 父组件负责调用 API 并更新状态
  thumbLoading.value = false
}

/**
 * 点踩 / 取消点踩（2.62.0，计划书 §5.20）：与删除一致**下沉卡片内**（调 API + 提示），
 * 父组件只收通知（需要时可从列表移除 / 打点），不在各页面重复实现。
 *
 * 后端语义：幂等（明细表唯一约束，一人一踩）；点踩后该资源**对所有人略降**
 * （`dislike_ratio`）、**对点踩者本人大幅降权**（精排后处理）；
 * **不改变内容可见性**（不下架）——与举报审核的隐藏处置语义分离。
 * 点踩数不对外展示，这里只维护「我已踩」的状态。
 */
async function handleDislike() {
  if (dislikeLoading.value) return
  dislikeLoading.value = true
  try {
    const next = !isDisliked.value
    const res = await dislikeMoment(props.item.dynIdStr, next ? 1 : 2)
    // 业务失败 request 返回 null（不抛异常），保持原状态
    if (!res) return
    setMomentDisliked(props.item.dynIdStr, next)
    biliMessage.success(next ? '已点踩，将减少此类内容' : '已取消点踩')
    emit('dislike', props.item.dynIdStr, next)
  } finally {
    dislikeLoading.value = false
  }
}

/**
 * 删除动态（2.22.1 起统一在卡片内托管确认 + 删除 API）：
 * - 管理员（root）：任意动态可见删除入口，确认文案「管理员删除动态？」→ `adminRemoveMoment`（软删，可审计）；
 * - 作者本人：确认文案「确定删除这条动态吗？」→ `removeMoment`；
 * 成功后 emit `remove`，父组件仅负责移除列表项 / 详情返回（避免各页面重复确认+调用）。
 */
async function handleRemove() {
  try {
    const { ElMessageBox } = await import('element-plus')
    if (isAdmin.value) {
      const descText = (descModule.value?.nodes ?? [])
        .map((n) => n.text || '')
        .join('')
        .slice(0, 30)
      await ElMessageBox.confirm(
        `管理员删除动态「${descText || props.item.dynIdStr}」？删除后该动态将不再可见（软删，可追溯审计流水）。`,
        '管理员删除动态',
        { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
      )
    } else {
      await ElMessageBox.confirm('确定删除这条动态吗？', '确认删除', { type: 'warning' })
    }
    const res = isAdmin.value
      ? await adminRemoveMoment(props.item.dynIdStr, {
          showSuccessToast: true,
          successMessage: '已删除',
        })
      : await removeMoment(props.item.dynIdStr, {
          showSuccessToast: true,
          successMessage: '已删除',
        })
    if (res) emit('remove', props.item.dynIdStr)
  } catch {
    // 用户取消或删除失败
  }
}

function handleReport() {
  emit('report', props.item.dynIdStr)
}

/** 点击评论：inlineComment 模式卡片内展开评论区；否则透传给父组件（详情页切评论 tab） */
function handleComment() {
  if (props.inlineComment) {
    showComments.value = !showComments.value
  } else {
    emit('comment', props.item)
  }
}

/** 内联评论区总数变化：联动更新卡片 status.commentCount */
function handleCommentCountChange(count: number) {
  if (props.status) {
    props.status.commentCount = count
  }
}

/** 转发成功：乐观更新当前卡片 status.repostCount */
function handleRepostSuccess() {
  if (props.status) {
    props.status.repostCount = (props.status.repostCount ?? 0) + 1
  }
}

/** 转发弹窗中展示的原动态正文摘要（desc 模块文本） */
const repostSrcSummary = computed(() => descModule.value?.text || '')
</script>
