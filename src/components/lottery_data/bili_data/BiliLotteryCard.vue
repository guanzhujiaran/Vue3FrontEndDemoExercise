<template>
  <el-card
    v-bind="attrs"
    class="lottery-card rounded-xl"
    :class="['lottery-type-' + normalizedData.type.toLowerCase(), cardBgClass, cardEdgeClass]"
    shadow="hover" body-class="lottery-card-body">
    <template #header>
      <div class="flex flex-col gap-4">
        <div class="flex flex-wrap items-start gap-2">
          <!-- 左侧 badges 组：占满剩余空间、可换行、可缩（内容多时换行不被挤出） -->
          <div class="flex flex-1 min-w-0 flex-wrap items-start gap-2">
            <el-tag size="default" :type="typeInfo.tagType" effect="plain" round class="w-fit">
              {{ normalizedData.displayType }}
            </el-tag>
            <span
              class="inline-flex items-center gap-2 bg-fill-lighter px-3 py-1 border border-border-light rounded-full font-medium text-text-primary text-xs">
              <BiliStatusIcon :icon="statusIcon" :popover_text="normalizedData.statusText" />
              <span>{{ normalizedData.statusText }}</span>
            </span>
            <!-- extra_info 附加信息标识 -->
            <span v-if="normalizedData.extraInfo?.is_grand_prize"
              class="inline-flex items-center gap-1 bg-amber-50 px-3 py-1 border border-amber-400 rounded-full font-medium text-amber-700 text-xs lottery-extra-badge lottery-extra-badge-animated">
              大奖
            </span>
            <span v-if="normalizedData.extraInfo?.need_comment"
              class="inline-flex items-center gap-1 bg-blue-50 px-3 py-1 border border-blue-300 rounded-full font-medium text-blue-600 text-xs lottery-extra-badge lottery-extra-badge-animated">
              <el-icon :size="13">
                <ChatDotSquare />
              </el-icon>
              需评论
            </span>
            <span v-if="normalizedData.extraInfo?.need_repost"
              class="inline-flex items-center gap-1 bg-green-50 px-3 py-1 border border-green-300 rounded-full font-medium text-green-600 text-xs lottery-extra-badge lottery-extra-badge-animated">
              <el-icon :size="13">
                <Share />
              </el-icon>
              需转发
            </span>
          </div>
          <!-- 右侧固定组：浏览数 + ID，不缩小不被换行挤出 -->
          <div class="flex shrink-0 items-center gap-1">
            <span
              class="lottery-card__view-count inline-flex items-center gap-1 bg-bg-page px-3 py-1 border border-border-light rounded-full font-medium text-text-secondary text-xs"
              :title="'浏览 ' + viewCount">
              <component :is="EyeIcon" class="w-4 h-4 shrink-0" />
              <span>{{ viewCount }}</span>
            </span>
            <span
              v-if="normalizedData.id"
              class="lottery-card__id-badge inline-flex items-center bg-bg-page px-3 py-1 border border-border-light rounded-full font-medium text-text-secondary text-xs">
              ID: {{ normalizedData.id }}
            </span>
          </div>
        </div>

        <div class="space-y-2">
          <h3 class="font-semibold text-text-primary text-base sm:text-lg wrap-break-word leading-relaxed bg-bg rounded-sm px-2.5 py-1"
            :title="normalizedData.title">
            {{ normalizedData.title }}
          </h3>
          <p v-if="headerDescription" class="text-text-secondary text-xs sm:text-sm leading-relaxed bg-bg rounded-sm px-2.5 py-1">
            {{ headerDescription }}
          </p>
        </div>

        <div class="flex flex-col gap-3 bg-fill-lighter p-3 border border-border-light rounded-lg">
          <div class="flex flex-nowrap justify-between items-center gap-2">
            <!-- 查看详情按钮 -->

            <el-link v-if="sourceLink" type="primary" size="default" :href="sourceLink" target="_blank" :rel="LINK_REL" :referrerpolicy="LINK_REFERRER_POLICY"
              @click="handleLinkClick" link icon="link" underline="never" class="whitespace-nowrap">
              查看源动态
            </el-link>
            <!-- 第三方抽奖动态：站内详情页（评论区 + 互动，按 dynId 定位） -->
            <el-link
              v-if="normalizedData.type === 'THIRD_PARTY' && canInteract"
              type="primary"
              size="default"
              underline="never"
              class="lottery-card__detail-link whitespace-nowrap"
              @click="goOthersLotDynDetail"
            >
              查看详情
            </el-link>
            <el-button icon="link" v-else type="info" size="default" disabled class="whitespace-nowrap">
              暂无源动态
            </el-button>
            <el-link v-if="resultLink" type="primary" size="default" :href="resultLink" target="_blank" :rel="LINK_REL" :referrerpolicy="LINK_REFERRER_POLICY"
              @click="handleLinkClick" link icon="link" underline="never" class="whitespace-nowrap">
              查看h5抽奖详情
            </el-link>
            <!-- 参加/不参加开关 -->
            <div class="flex items-center gap-2 whitespace-nowrap">
              <span class="font-medium text-text-secondary text-sm whitespace-nowrap">
                {{ hasClicked ? '已参加' : '未参加' }}
              </span>
              <el-tooltip :content="hasClicked ? '取消标记参加' : '标记为已参加'" placement="top">
                <el-switch :model-value="hasClicked" @change="handleRecordLotteryId" />
              </el-tooltip>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #default>
      <div class="flex flex-col gap-4 h-full main-content-wrapper">
        <section class="bg-bg-page p-4 border border-border-light rounded-lg">
          <div class="space-y-3">
            <p class="font-medium text-text-secondary text-xs">{{ countdownTitle }}</p>

            <div class="rounded-lg border border-border-light bg-bg px-4 py-3 sm:min-w-40">
              <el-countdown v-if="normalizedData.endTime !== null && normalizedData.status === 'ONGOING'"
                class="font-semibold text-text-primary text-sm sm:text-base lottery__countdown"
                :value="normalizedData.endTime * 1e3" format="DD 天 HH 时 mm 分 ss 秒" />
              <div v-else-if="normalizedData.endTime !== null"
                class="font-semibold text-text-primary text-sm sm:text-base">
                {{ deadlineReachedText }}
              </div>
              <div v-else class="font-medium text-text-placeholder text-sm">
                暂无开奖时间
              </div>
            </div>
          </div>
        </section>

        <section class="gap-0.5 sm:gap-1 lg:gap-2 grid grid-cols-2 lg:grid-cols-4">
          <div v-for="item in summaryItems" :key="item.label"
            class="bg-fill-lighter p-4 border border-border-light rounded-lg">
            <div class="flex items-center gap-1">
              <span class="font-medium text-text-secondary text-xs">{{ item.label }}</span>
              <el-popover v-if="item.hint" trigger="hover" placement="top" width="200">
                <template #reference>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                    class="text-text-secondary cursor-help">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                </template>
                <div class="text-xs">{{ item.hint }}</div>
              </el-popover>
            </div>
            <div>
              <el-link v-if="item.link" :href="item.link" target="_blank" type="primary" underline="never"
                class="mt-2 w-fit font-semibold text-sm sm:text-base text-left no-underline leading-relaxed"
                :rel="LINK_REL" :referrerpolicy="LINK_REFERRER_POLICY" @click="handleLinkClick">
                {{ item.value }}
              </el-link>
              <div v-else
                class="mt-2 font-semibold text-text-primary text-sm sm:text-base wrap-break-word leading-relaxed">
                {{ item.value }}
              </div>
            </div>
          </div>
        </section>

        <section v-if="normalizedData.type === 'THIRD_PARTY' && normalizedData.dynContent"
          :class="['rounded-lg border border-border-light bg-fill-lighter p-4']">
          <div class="flex flex-wrap justify-between items-center gap-2 mb-2">
            <p class="font-semibold text-text-primary text-sm">动态内容</p>
            <span class="bg-bg px-3 py-1 rounded-full font-medium text-text-secondary text-xs">
              原文展示
            </span>
          </div>
          <el-text :line-clamp="dynContentExpanded ? undefined : 5" size="large"
            class="break-words whitespace-pre-wrap cursor-pointer select-text"
            @click="dynContentExpanded = !dynContentExpanded">
            {{ normalizedData.dynContent }}
          </el-text>
          <div class="mt-1 text-right">
            <el-link type="primary" underline="hover" size="default" @click="dynContentExpanded = !dynContentExpanded">
              {{ dynContentExpanded ? '收起' : '展开全部' }}
            </el-link>
          </div>
        </section>

        <LotteryPrize
          v-if="normalizedData.prizes.length > 0 && normalizedData.type !== 'TOPIC' && normalizedData.type !== 'THIRD_PARTY'"
          :class="{ 'mt-auto': normalizedData.requirements.length === 0 }" :prizes="normalizedData.prizes" />

        <section v-if="normalizedData.type === 'THIRD_PARTY' && normalizedData.prizes.length > 0"
          :class="['rounded-lg border border-border-light bg-fill-lighter p-4', { 'mt-auto': normalizedData.requirements.length === 0 }]">
          <div class="flex flex-wrap justify-between items-start gap-3">
            <div class="space-y-1">
              <p class="font-semibold text-text-primary text-sm">奖品列表</p>
              <p class="text-text-secondary text-xs leading-relaxed">
                自动提取的奖品名称，仅供参考。
              </p>
            </div>
            <span class="bg-bg px-3 py-1 rounded-full font-medium text-text-secondary text-xs">
              {{ normalizedData.prizes.length }} 项
            </span>
          </div>
          <div class="space-y-2 mt-3">
            <div v-for="(prize, index) in normalizedData.prizes" :key="`${prize.description}-${index}`"
              class="bg-bg px-3 py-3 border border-border-light rounded-lg text-text-primary text-sm leading-relaxed">
              {{ prize.description }}
            </div>
          </div>
        </section>

        <section v-if="normalizedData.type === 'TOPIC' && normalizedData.prizes.length > 0"
          class="bg-fill-lighter p-4 border border-border-light rounded-lg">
          <div class="flex flex-wrap justify-between items-start gap-3">
            <div class="space-y-1">
              <p class="font-semibold text-text-primary text-sm">奖品池</p>
              <p class="text-text-secondary text-xs leading-relaxed">
                话题活动通常会在活动页展示完整规则，这里先展示抓取到的摘要信息。
              </p>
            </div>
            <span class="bg-bg px-3 py-1 rounded-full font-medium text-text-secondary text-xs">
              {{ normalizedData.prizes.length }} 条
            </span>
          </div>
          <div class="space-y-2 mt-3">
            <div v-for="(prize, index) in normalizedData.prizes" :key="`${prize.description}-${index}`"
              class="bg-bg px-3 py-3 border border-border-light rounded-lg text-text-primary text-sm leading-relaxed">
              {{ prize.description }}
            </div>
          </div>
        </section>

        <section v-if="normalizedData.requirements.length > 0"
          class="bg-fill-lighter mt-auto p-4 border border-border-light rounded-lg">
          <div class="flex flex-wrap justify-between items-start gap-3">
            <div class="space-y-1">
              <p class="font-semibold text-text-primary text-sm">
                <span class="flex items-center gap-1">
                  参与条件
                  <el-popover trigger="hover" placement="top" width="200">
                    <template #reference>
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                        class="text-text-secondary cursor-help">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="16" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                      </svg>
                    </template>
                    <div class="text-xs">完成以下条件后即可参与本次活动。</div>
                  </el-popover>
                </span>
              </p>
            </div>
            <span class="bg-bg px-3 py-1 rounded-full font-medium text-text-secondary text-xs">
              {{ normalizedData.requirements.length }} 项
            </span>
          </div>
          <div class="flex flex-wrap gap-2 mt-3">
            <template v-for="(req, index) in normalizedData.requirements" :key="`${req.type}-${index}`">
              <el-link v-if="req.link" :href="req.link" target="_blank" type="primary" underline="never"
                class="no-underline" :rel="LINK_REL" :referrerpolicy="LINK_REFERRER_POLICY" @click="handleLinkClick">
                <el-tag :type="getRequirementTagType(req.type)" size="default" effect="plain" round>
                  {{ req.text }}
                </el-tag>
              </el-link>
              <el-tag v-else :type="getRequirementTagType(req.type)" size="default" effect="plain" round>
                {{ req.text }}
              </el-tag>
            </template>
          </div>
        </section>
      </div>
    </template>

    <template #footer>
      <!-- 互动栏：参考 B 站动态页脚（icon + 数字 / 无数量时显示中文）。数量走 props.status 接口统一展示 -->
      <div class="lottery-card__interaction-bar flex items-center justify-around gap-3 bg-fill-lighter mb-3 py-3 border-border-light border-t px-3">
        <template v-if="canInteract">
        <!-- 评论 -->
        <button
          class="lottery-card__action-comment inline-flex items-center gap-1.5 text-text-secondary hover:text-text-primary text-sm cursor-pointer transition-colors"
          type="button"
          @click="handleComment">
          <component :is="ChatDotRound" class="w-4 h-4 shrink-0" />
          <template v-if="commentCount > 0">
            <span class="font-medium">{{ commentCount }}</span>
          </template>
          <template v-else>
            <span>评论</span>
          </template>
        </button>
        <!-- 点赞 -->
        <button
          class="lottery-card__action-like inline-flex items-center gap-1.5 text-text-secondary hover:text-text-primary text-sm cursor-pointer transition-colors"
          type="button"
          @click="handleLike">
          <component :is="likeActive ? LikeActiveIcon : LikeIcon" class="w-4 h-4 shrink-0" :class="likeActive ? 'text-primary' : ''" />
          <template v-if="likeCount > 0">
            <span :class="likeActive ? 'font-medium text-primary' : 'font-medium'">{{ likeCount }}</span>
          </template>
          <template v-else>
            <span>点赞</span>
          </template>
        </button>
        <!-- 收藏 -->
        <button
          class="lottery-card__action-favorite inline-flex items-center gap-1.5 text-text-secondary hover:text-text-primary text-sm cursor-pointer transition-colors"
          type="button"
          @click="handleFavorite">
          <component :is="FavoriteIcon" class="w-4 h-4 shrink-0" :class="favActive ? 'text-warning' : ''" />
          <template v-if="favCount > 0">
            <span :class="favActive ? 'font-medium text-warning' : 'font-medium'">{{ favCount }}</span>
          </template>
          <template v-else>
            <span>收藏</span>
          </template>
        </button>
        <!-- 转发 -->
        <button
          class="lottery-card__action-forward inline-flex items-center gap-1.5 text-text-secondary hover:text-text-primary text-sm cursor-pointer transition-colors"
          type="button"
          @click="handleForward">
          <component :is="ForwardIcon" class="w-4 h-4 shrink-0" />
          <template v-if="forwardCount > 0">
            <span class="font-medium">{{ forwardCount }}</span>
          </template>
          <template v-else>
            <span>转发</span>
          </template>
        </button>
        </template>
        <!-- 缺失规范互动 ID（lottery_id）的旧数据：禁止互动/转发，避免后端 400 资源不存在 -->
        <el-text v-else class="lottery-card__interaction-disabled text-sm" type="info">
          卡片数据已过期，暂不支持互动
        </el-text>
      </div>

      <!-- 评论区（卡片内就地展开，首次点击懒加载；对标 B 站动态信息流） -->
      <div
        v-if="commentsVisible"
        class="lottery-card__comments mt-3 border-t border-border-light pt-3"
        @click.stop>
        <LotteryCommentSection
          :oid="lotteryId"
          :type="interactionBizType"
          @count-change="handleCommentCountChange"
        />
      </div>

      <el-collapse v-model="activeCollapseNames" class="details-collapse">
        <el-collapse-item name="details">
          <template #title>
            <div class="flex items-center gap-2 font-medium text-text-primary text-sm">
              <el-icon class="text-text-secondary">
                <InfoFilled />
              </el-icon>
              <span>原始数据</span>
            </div>
          </template>
          <el-descriptions :column="isCompactScreen ? 1 : 2" border size="default" class="rounded-lg">
            <el-descriptions-item label="开始时间" v-if="normalizedData.startTime">
              {{ formatTimestamp(normalizedData.startTime) }}
            </el-descriptions-item>
            <el-descriptions-item label="业务类型码" v-if="normalizedData.businessType !== null">
              {{ normalizedData.businessType }}
            </el-descriptions-item>
            <el-descriptions-item label="原始弹幕要求" v-if="normalizedData.danmu !== null && normalizedData.danmu !== ''">
              {{ normalizedData.danmu }}
            </el-descriptions-item>
          </el-descriptions>
          <pre
            class="bg-fill-lighter p-3 rounded-md overflow-x-auto text-text-secondary text-xs break-all leading-relaxed whitespace-pre-wrap raw-data-pre">
  {{ JSON.stringify(normalizedData.originalData, null, 2) }}</pre>
        </el-collapse-item>
      </el-collapse>
    </template>
  </el-card>

  <!-- 转发抽奖到动态：复用统一动态编辑器（attach 资源模式） -->
  <MomentPublishForm
    v-model:visible="forwardVisible"
    :attach-resource="{
      bizType: interactionBizType,
      bizId: lotteryId,
      name: normalizedData.title || undefined,
    }"
  />

  <!-- 收藏到收藏夹：选择/新建收藏夹 -->
  <MomentFavoriteDialog
    v-model="favDialogVisible"
    :dyn-id="lotteryId"
    :biz-type="interactionBizType"
    :biz-id="lotteryId"
    @changed="handleFavChanged"
  />
</template>

<script setup lang="ts">
import { computed, ref, useAttrs, type PropType, type Ref } from 'vue'
import { useRouter } from 'vue-router'
import type { TagProps } from 'element-plus'
import { RouteName } from '@/models/router'

defineOptions({
  // 模板存在多个根节点（el-card + MomentPublishForm），关闭自动继承，
  // 由下方 useAttrs 将外部属性（如 class）手动绑定到主容器 el-card 上
  inheritAttrs: false
})

const attrs = useAttrs()
import { type GlobalVarsType, ScreenTypeEnum } from '@/models/global_var/global_var_model.ts'
import { KeysEnum, useInject } from '@/models/base/provide_model.ts'
import { ChatDotRound, ChatDotSquare, Share, Link } from '@element-plus/icons-vue'
import LikeIcon from '@/assets/svgs/like.svg?component'
import LikeActiveIcon from '@/assets/svgs/like_active.svg?component'
import FavoriteIcon from '@/assets/svgs/dynamic/detail/side_toolbar/favorite.svg?component'
import ForwardIcon from '@/assets/svgs/dynamic/detail/side_toolbar/forward.svg?component'
import EyeIcon from '@/assets/svgs/space/eye.svg?component'

import { interactionBizTypeOf } from '@/stores/lottery_detail.ts'

import type {
  AnchorLotteryData,
  AnyLotteryData,
  ChargingLotteryData,
  DynamicLotteryData,
  NormalizedLottery,
  RedPacketData,
  ReservationLotteryData,
  TopicEventData
} from '@/models/api/lottery/lottery_card.ts'
import { normalizeLotteryData } from '@/utils/lotteryNormalization.ts'
import { getBiliUserSpaceUrl } from '@/utils/PageOpen/BiliJump.ts'
import { LINK_REL, LINK_REFERRER_POLICY } from '@/utils/PageOpen/linkPolicy'
import { isMobileDevice } from '@/utils/Browser/useDeviceDetect.ts'
import { BiliCommTxt } from '@/assets/text/BiliCommTxt.ts'
import { handleLotteryLinkClick, setLotteryParticipation, isLotteryParticipated } from '@/utils/lotteryParticipation'
import { thumbMoment, fetchInteractionStatus } from '@/api/notify/moment-api'
import type { InteractionStatusItem } from '@/api/notify/moment-api'
import MomentPublishForm from '@/components/moment/MomentPublishForm.vue'
import MomentFavoriteDialog from '@/components/moment/MomentFavoriteDialog.vue'
import LotteryCommentSection from '@/components/lottery_data/LotteryCommentSection.vue'

const handleRecordLotteryId = (val: boolean | number | string) => {
  setLotteryParticipation(String(normalizedData.value.id), Boolean(val))
}

const handleLinkClick = () => {
  handleLotteryLinkClick(String(normalizedData.value.id))
}

const is_mobile = isMobileDevice()

// ============ 点赞 / 收藏 / 转发到动态（2.20.0）============
const lotteryId = computed(() => String(normalizedData.value.id ?? ''))
/**
 * 互动 / 评论区 bizType：第三方抽奖动态（THIRD_PARTY）走独立命名空间
 * `others_lot_dyn`（bizId = dynId），其余抽奖卡片走 `lottery`（bizId = lottery_id）。
 * 两者混用会被后端 `check_lottery_exist` 判为「资源不存在」（400），故必须分流。
 */
const interactionBizType = computed(() => interactionBizTypeOf(normalizedData.value.type))
/** 互动可用性：旧缓存数据可能缺失规范互动 ID（lottery_id），此时禁用全部互动入口 */
const canInteract = computed(() => Boolean(normalizedData.value.id))
const interactLoading = ref(false)
// 互动状态由容器层批量拉取后经 status prop 下发，卡片只读派生（单向数据流）
const likeActive = computed(() => Boolean(props.status?.isLike))
const likeCount = computed(() => Number(props.status?.likeCount ?? 0))
const favActive = computed(() => Boolean(props.status?.isFavorite))
const favCount = computed(() => Number(props.status?.favoriteCount ?? 0))
/** 评论数 / 转发数：来自 props.status 统一接口（dynamic 才有真实计数，lottery 等非动态资源恒为 0） */
const commentCount = computed(() => Number((props.status as InteractionStatusItem | undefined)?.commentCount ?? 0))
const forwardCount = computed(() => Number((props.status as InteractionStatusItem | undefined)?.repostCount ?? 0))
/** 浏览数：来自 props.status 统一接口（status 接口即浏览统计触发点） */
const viewCount = computed(() => Number((props.status as InteractionStatusItem | undefined)?.viewCount ?? 0))

/** 点赞 / 取消点赞 */
async function handleLike() {
  if (interactLoading.value || !canInteract.value) return
  interactLoading.value = true
  const nextActive = !likeActive.value
  const res = await thumbMoment(lotteryId.value, nextActive ? 1 : 2, {
    bizType: interactionBizType.value,
    bizId: lotteryId.value,
  })
  interactLoading.value = false
  if (res) {
    emit('update-status', {
      bizId: lotteryId.value,
      status: {
        isLike: nextActive,
        likeCount: Math.max(0, likeCount.value + (nextActive ? 1 : -1)),
      },
    })
  }
}

/** 评论：卡片内就地展开评论区（对标 B 站动态信息流，首次点击懒加载） */
const commentsVisible = ref(false)
function handleComment() {
  if (!canInteract.value) return
  commentsVisible.value = !commentsVisible.value
}

/** 内联评论区总数变化：浅合并上报容器层（保留其它互动字段） */
function handleCommentCountChange(count: number) {
  emit('update-status', { bizId: lotteryId.value, status: { commentCount: count } })
}

/** 收藏：弹出收藏夹选择弹窗（多夹），选择/新建收藏夹后收藏 */
const favDialogVisible = ref(false)
function handleFavorite() {
  if (!canInteract.value) return
  favDialogVisible.value = true
}

/** 收藏夹变更后重新拉取最新互动状态并上报容器层 */
async function handleFavChanged() {
  try {
    const res = await fetchInteractionStatus(interactionBizType.value, [lotteryId.value])
    const item = res?.items?.[0]
    if (item?.bizId) {
      emit('update-status', { bizId: item.bizId, status: item })
    }
  } catch {
    // 静默：刷新失败不影响浏览
  }
}

/** 第三方抽奖动态：跳转站内详情页（按 dynId 定位，评论区 + 互动都在详情页） */
const router = useRouter()
function goOthersLotDynDetail() {
  if (!lotteryId.value) return
  router.push({ name: RouteName.OTHERS_LOT_DYN_DETAIL, query: { dynId: lotteryId.value } })
}

/** 转发到动态：弹窗由 MomentPublishForm（attach 资源模式）处理 */
const forwardVisible = ref(false)

function handleForward() {
  if (!canInteract.value) return
  forwardVisible.value = true
}

const props = defineProps({
  lotteryData: {
    type: Object as PropType<AnyLotteryData>,
    required: true
  },
  /** 互动状态（bizType=lottery，由容器层批量拉取后下发；卡片不再各自查询） */
  status: {
    type: Object as PropType<InteractionStatusItem | undefined>,
    default: undefined
  }
})

const emit = defineEmits<{
  (e: 'update-status', payload: { bizId: string; status: Partial<InteractionStatusItem> }): void
}>()

const activeCollapseNames = ref<string[]>([])
const dynContentExpanded = ref(false)
const globalVars = useInject(KeysEnum.GlobalVars) as Ref<GlobalVarsType>

const hasClicked = computed(() => isLotteryParticipated(String(normalizedData.value.id)))
const isCompactScreen = computed(() => globalVars.value.screen_size !== ScreenTypeEnum.large)

const formatTimestamp = (timestamp: number | string | null | undefined): string => {
  if (timestamp === null || timestamp === undefined || timestamp === '') {
    return 'N/A'
  }
  try {
    let date: Date
    if (typeof timestamp === 'number') {
      date = new Date(timestamp * 1000)
    } else {
      const numTimestamp = Number(timestamp)
      if (!isNaN(numTimestamp) && timestamp.trim() !== '') {
        date = new Date(numTimestamp * (numTimestamp < 10000000000 ? 1000 : 1))
      } else {
        const cleanString = timestamp.replace('截止', '').trim()
        date = new Date(cleanString)
      }
    }

    if (isNaN(date.getTime())) {
      return `无法解析: ${timestamp}`
    }
    return date.toLocaleString('zh-CN', { hour12: false })
  } catch (e) {
    console.error('Timestamp format error:', timestamp, e)
    return '格式错误'
  }
}

const parsePrizeText = (
  text: string | null | undefined
): Array<{ description: string; count: number | null; img: null }> => {
  if (!text) return []
  const prizes: Array<{ description: string; count: number | null; img: null }> = []
  const prizePart = text.split(/：|:/).pop()?.trim() || text
  const items = prizePart
    .split(/、|,|，/)
    .map((s) => s.trim())
    .filter(Boolean)

  items.forEach((item) => {
    const match = item.match(/^(.*?)(?:\*|\s+x\s*|\s*×\s*|\s+)(\d+)\s*(?:份|个|名)?$/)
    if (match && match[1] && match[2]) {
      const description = match[1].trim()
      const count = parseInt(match[2], 10)
      if (description && !isNaN(count)) {
        prizes.push({ description, count, img: null })
        return
      }
    }
    prizes.push({ description: item, count: 1, img: null })
  })

  return prizes
}

const parseExclusiveLevel = (
  jsonString: string | null | undefined
): { type: string; text: string; link?: string } | null => {
  if (!jsonString) return null
  try {
    const data = JSON.parse(jsonString)
    const reqText =
      data.upower_level_str || data.upower_title || `充电等级 ${data.privilege_type || ''}`
    return {
      type: '充电',
      text: `充电专属: ${reqText}`,
      link: getBiliUserSpaceUrl(data.upower_open_url) || undefined
    }
  } catch (e) {
    console.error('Failed to parse exclusive_level JSON:', jsonString, e)
    return { type: '充电', text: '充电专属 (解析失败)' }
  }
}

const getRequirementTagType = (reqType: string): TagProps['type'] => {
  switch (reqType.toLowerCase()) {
    case '关注':
      return 'success'
    case '转发':
      return 'success'
    case '评论':
      return 'primary'
    case '弹幕':
      return 'warning'
    case '充电':
      return 'warning'
    case '预约':
      return 'primary'
    case '等级':
      return 'info'
    case '粉丝团':
      return 'warning'
    case '参与':
      return 'primary'
    default:
      return 'info'
  }
}

const normalizedData = computed<NormalizedLottery>(() => {
  return normalizeLotteryData(props.lotteryData)
})

// 不同卡片使用 theme.css 中 --color-* 对应的 bg-* 工具类，按唯一 id 取色保证每张都不一样
const cardBgPalette = [
  'bg-primary-light-9',
  'bg-success-light-9',
  'bg-warning-light-9',
  'bg-danger-light-9',
  'bg-error-light-9',
  'bg-info-light-9',
  'bg-primary-light-8',
  'bg-success-light-8',
  'bg-warning-light-8',
  'bg-danger-light-8',
  'bg-error-light-8',
  'bg-info-light-8'
]
const cardBgClass = computed(() => {
  const id = Number(normalizedData.value.id) || 0
  return cardBgPalette[id % cardBgPalette.length]
})

// 根据 extra_info 决定卡片边缘样式：大奖=金边(FGO 5星风格)，需评论=蓝边，需转发=绿边
const cardEdgeClass = computed(() => {
  const extra = normalizedData.value.extraInfo
  if (!extra) return ''
  if (extra.is_grand_prize) return 'lottery-card-grand-prize'
  if (extra.need_comment) return 'lottery-card-edge-comment'
  if (extra.need_repost) return 'lottery-card-edge-repost'
  return ''
})

const sourceLink = computed(() => normalizedData.value.sourceLink || null)
const resultLink = computed(() => normalizedData.value.resultLink || null)
const senderProfileLink = computed(() =>
  normalizedData.value.senderInfo.uid ? getBiliUserSpaceUrl(String(normalizedData.value.senderInfo.uid)) : null
)
const statusIcon = computed(() => normalizedData.value.statusType || 'info')
const deadlineText = computed(() => formatTimestamp(normalizedData.value.endTime))
const timeSummaryLabel = computed(() => {
  switch (normalizedData.value.type) {
    case 'TOPIC':
      return '活动截止'
    case 'THIRD_PARTY':
      return '开奖时间'
    default:
      return '截止时间'
  }
})
const countdownTitle = computed(() => {
  switch (normalizedData.value.type) {
    case 'TOPIC':
      return '活动截止倒计时'
    case 'THIRD_PARTY':
      return '开奖倒计时'
    default:
      return '开奖倒计时'
  }
})
const countdownDescription = computed(() =>
  normalizedData.value.type === 'TOPIC'
    ? '活动结束后通常会在活动页公布后续结果。'
    : '倒计时结束后即可前往详情页查看开奖情况。'
)
const deadlineReachedText = computed(() => {
  if (normalizedData.value.status === 'CANCELLED' || normalizedData.value.status == "UNKNOWN") {
    return '活动已取消'
  }
  return normalizedData.value.type === 'TOPIC' ? '活动已截止' : '已到开奖时间'
})
const totalPrizeCount = computed(() =>
  normalizedData.value.prizes.reduce((total, prize) => total + (prize.count ?? 0), 0)
)
const summaryItems = computed(() => {

  const items: Array<{ label: string; value: string; hint?: string; link?: string }> = [
    {
      label: timeSummaryLabel.value,
      value: normalizedData.value.type === 'THIRD_PARTY'
        ? (normalizedData.value.lotteryTimeText || (normalizedData.value.endTime ? formatTimestamp(normalizedData.value.endTime) : '暂无'))
        : deadlineText.value,
      hint: normalizedData.value.endTime !== null ? '以站内活动页展示为准' : '暂无截止时间'
    }
  ]

  if (normalizedData.value.type !== 'TOPIC' && normalizedData.value.participants !== null) {
    items.push({
      label: '参与人数',
      value: `${normalizedData.value.participants}`,
      hint: '接口返回为非实时人数，仅供参考'
    })
  }

  if (normalizedData.value.prizes.length > 0 && normalizedData.value.type !== 'THIRD_PARTY') {
    items.push({
      label: '抽取名额',
      value: totalPrizeCount.value > 0 ? `${totalPrizeCount.value} 名` : '待公布',
      hint:
        normalizedData.value.prizes.length > 1
          ? `共 ${normalizedData.value.prizes.length} 档奖品`
          : '按当前奖品配置展示'
    })
  }

  if (normalizedData.value.type !== 'THIRD_PARTY' && normalizedData.value.senderInfo.uid) {
    items.push({
      label: '发起者 UID',
      value: String(normalizedData.value.senderInfo.uid),
      hint: '可快速定位活动发起账号',
      link: senderProfileLink.value || undefined
    })
  } else if (normalizedData.value.roomId) {
    items.push({
      label: '直播间',
      value: String(normalizedData.value.roomId),
      hint: '点击详情可直接跳转房间'
    })
  }

  // 第三方抽奖专用字段
  if (normalizedData.value.displayType === '第三方抽奖') {
    if (normalizedData.value.authorName) {
      items.push({
        label: 'UP主',
        value: String(normalizedData.value.authorName),
        hint: '动态发布者',
        link: senderProfileLink.value || undefined
      })
    }
    if (normalizedData.value.officialLotType) {
      items.push({
        label: '抽奖类型',
        value: String(normalizedData.value.officialLotType),
        hint: '动态标注的抽奖类型'
      })
    }
    if (normalizedData.value.pubTime) {
      items.push({
        label: '发布时间',
        value: formatTimestamp(normalizedData.value.pubTime),
        hint: '动态发布时间'
      })
    }
    if (normalizedData.value.createdAt) {
      items.push({
        label: '收录时间',
        value: formatTimestamp(normalizedData.value.createdAt),
        hint: '数据库收录时间'
      })
    }
    if (normalizedData.value.commentCount !== null && normalizedData.value.commentCount !== undefined) {
      items.push({
        label: '评论数',
        value: normalizedData.value.commentCount >= 0 ? `${normalizedData.value.commentCount}` : '暂无',
        hint: '数据仅供参考'
      })
    }
    if (normalizedData.value.repostCount !== null && normalizedData.value.repostCount !== undefined) {
      items.push({
        label: '转发数',
        value: normalizedData.value.repostCount >= 0 ? `${normalizedData.value.repostCount}` : '暂无',
        hint: '数据仅供参考'
      })
    }
  }

  if (normalizedData.value.type === 'TOPIC' && normalizedData.value.prizes.length > 0) {
    items.push({
      label: '奖品池摘要',
      value: normalizedData.value.prizes[0]?.description ?? '活动页查看',
      hint: '话题活动通常在活动页展示完整规则'
    })
  }

  return items.slice(0, normalizedData.value.type === 'THIRD_PARTY' ? 6 : 4)
})

const typeInfo = computed(() => {
  switch (normalizedData.value.type) {
    case 'DYNAMIC':
      return { tagType: 'success' as TagProps['type'] }
    case 'CHARGING':
      return { tagType: 'warning' as TagProps['type'] }
    case 'RESERVATION':
      return { tagType: 'primary' as TagProps['type'] }
    case 'ANCHOR':
      return { tagType: 'success' as TagProps['type'] }
    case 'RED_PACKET':
      return { tagType: 'danger' as TagProps['type'] }
    case 'TOPIC':
      return { tagType: 'info' as TagProps['type'] }
    case 'THIRD_PARTY':
      return { tagType: 'info' as TagProps['type'] }
    default:
      return { tagType: 'info' as TagProps['type'] }
  }
})

const headerDescription = computed(() => {
  switch (normalizedData.value.type) {
    case 'DYNAMIC':
      return '官方转发抽奖活动，完成转发即可参与'
    case 'CHARGING':
      return '充电专属抽奖活动，支持UP主的同时参与抽奖'
    case 'RESERVATION':
      return '预约直播抽奖活动，完成预约即可参与'
    case 'ANCHOR':
      return '直播间天选时刻抽奖活动'
    case 'RED_PACKET':
      return '直播间红包抽奖活动'
    case 'TOPIC':
      return '话题活动抽奖，参与话题即可有机会获奖'
    case 'THIRD_PARTY':
      return '第三方（非官方号）发布的抽奖动态，参与条件以动态内容为准'
    default:
      return ''
  }
})
</script>
