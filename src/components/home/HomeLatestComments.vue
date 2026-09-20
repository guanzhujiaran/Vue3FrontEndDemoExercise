<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import commentApi, { InteractionBizTypeEnum } from '@/api/lottery_comment.ts'
import type { CommentLatestGroup, CommentItem, CommentLatestResp } from '@/api/lottery_comment.ts'
import { RouteName } from '@/models/router'
import { BiliImg } from '@/assets/img/BiliImg.ts'
import { ChatDotRound } from '@element-plus/icons-vue'

const { t } = useI18n()
const router = useRouter()

const loading = ref(false)
/** 单个资源类型下的最新根评论数（limit） */
const limitPerType = 5
const groups = ref<CommentLatestGroup[]>([])
const totalCount = ref(0)

/** 资源类型 → 首页展示标签（多语言） */
function typeLabel(type: InteractionBizTypeEnum): string {
  switch (type) {
    case InteractionBizTypeEnum.DYNAMIC:
      return t('home.typeDynamic')
    case InteractionBizTypeEnum.LOTTERY:
      return t('home.typeLottery')
    case InteractionBizTypeEnum.OTHERS_LOT_DYN:
      return t('home.typeOthersLotDyn')
    case InteractionBizTypeEnum.RPA_ACTION:
      return t('home.typeRpaAction')
    case InteractionBizTypeEnum.RPA_WORKFLOW:
      return t('home.typeRpaWorkflow')
    case InteractionBizTypeEnum.RPA_BROWSER:
      return t('home.typeRpaBrowser')
    case InteractionBizTypeEnum.RPA_PLUGIN:
      return t('home.typeRpaPlugin')
    default:
      return t('home.typeDynamic')
  }
}

/** 作者展示名（CommentUserBrief 为松散类型，显式取 string，缺省回退） */
function unameOf(item: CommentItem): string {
  const u = item.member?.uname
  return u == null ? '' : String(u)
}

/** 作者头像地址（缺省返回 ''，由模板兜底 BiliImg.face.noface） */
function avatarOf(item: CommentItem): string {
  const a = item.member?.avatar
  return a == null ? '' : String(a)
}

/** 时间展示：今天以内显示时分，更早显示日期时间 */
function formatTime(ctime?: string): string {
  if (!ctime) return ''
  const d = new Date(ctime)
  if (isNaN(d.getTime())) return ctime
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) {
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
  }
  return d.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
}

/** 点击单条评论 → 跳转对应资源的评论区（LOTTERY / OTHERS_LOT_DYN / DYNAMIC 支持，RPA 暂无详情页仅展示） */
function goComment(item: CommentItem, type: InteractionBizTypeEnum) {
  if (!item.oid) return
  const rpid = String(item.rpid ?? '')
  if (type === InteractionBizTypeEnum.LOTTERY) {
    router.push({ name: RouteName.LOTTERY_CARD_DETAIL, query: { id: String(item.oid), ...(rpid ? { rpid } : {}) } })
  } else if (type === InteractionBizTypeEnum.OTHERS_LOT_DYN) {
    // 第三方抽奖动态：按 dynId 走独立详情页（无 lottery_id）
    router.push({ name: RouteName.OTHERS_LOT_DYN_DETAIL, query: { dynId: String(item.oid), ...(rpid ? { rpid } : {}) } })
  } else if (type === InteractionBizTypeEnum.DYNAMIC) {
    router.push({ name: 'MOMENT_DETAIL', params: { momentId: String(item.oid) }, query: rpid ? { rpid } : {} })
  }
}

async function load() {
  if (loading.value) return
  loading.value = true
  try {
    const resp = await commentApi.latest(undefined, limitPerType)
    const data = (resp?.data ?? {}) as CommentLatestResp
    groups.value = data.groups ?? []
    totalCount.value = (groups.value || []).reduce((sum: number, g: CommentLatestGroup) => sum + (g.comments?.length || 0), 0)
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <section
    class="home-latest-comments mx-5 rounded-3xl border border-border-lighter bg-bg-secondary px-4 py-10 lg:mx-10 lg:px-8"
  >
    <div class="mb-6">
      <el-text class="m-0 flex items-center gap-2 text-2xl font-semibold tracking-tight" tag="h2">
        <el-icon :size="22" class="text-primary"><ChatDotRound /></el-icon>
        {{ t('home.latestCommentsTitle') }}
        <el-text v-if="totalCount" class="text-sm text-text-secondary" tag="span">
          ({{ totalCount }})
        </el-text>
      </el-text>
      <el-text class="mt-1 block text-sm text-text-regular" tag="p">{{ t('home.latestCommentsDesc') }}</el-text>
    </div>

    <div v-loading="loading">
      <!-- el-carousel 轮播：每页一个资源类型分区框，左右切换查看各类型最新评论 -->
      <el-carousel
        v-if="groups.length"
        class="home-latest-comments__carousel"
        :interval="5000"
        height="25rem"
        arrow="hover"
        indicator-position="outside"
        type="card"
      >
        <el-carousel-item v-for="group in groups" :key="group.type">
          <div class="home-latest-comments__group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-bg shadow-sm">
              <div class="flex items-center justify-between px-5 py-3 border-b border-border-light">
                <el-tag type="primary" effect="light" round>{{ typeLabel(group.type) }}</el-tag>
                <el-text class="text-xs text-text-placeholder" tag="span">
                  {{ group.comments?.length }} 条
                </el-text>
              </div>

              <el-scrollbar v-if="group.comments?.length" class="home-latest-comments__list flex-1 min-h-0">
                <div class="divide-y divide-border-light">
                  <div
                    v-for="item in group.comments"
                    :key="item.rpid"
                    class="home-latest-comments__item flex gap-3 px-5 py-3"
                    :class="{
                      'cursor-pointer hover:bg-fill-light': item.oid
                    }"
                    @click="goComment(item, group.type)"
                  >
                    <el-avatar :size="32" class="home-latest-comments__avatar shrink-0">
                      <img
                        :src="avatarOf(item) || BiliImg.face.noface"
                        referrerpolicy="no-referrer"
                        :alt="unameOf(item) || '头像'"
                      />
                    </el-avatar>
                    <div class="home-latest-comments__content min-w-0 flex-1">
                      <div class="flex items-center justify-between gap-2">
                        <el-text class="truncate text-sm font-medium text-text-primary" tag="span">
                          {{ unameOf(item) || t('common.user') }}
                        </el-text>
                        <el-text class="shrink-0 text-xs text-text-placeholder" tag="span">
                          {{ formatTime(item.ctime) }}
                        </el-text>
                      </div>
                      <el-text class="block truncate text-sm text-text-regular" tag="p">
                        {{ item.message }}
                      </el-text>
                    </div>
                  </div>
                </div>
              </el-scrollbar>

              <div v-else class="flex items-center justify-center px-5 py-6">
                <el-text class="text-sm text-text-placeholder" tag="span">{{ t('home.latestCommentsEmpty') }}</el-text>
              </div>
          </div>
        </el-carousel-item>
      </el-carousel>

      <!-- 整体空态 -->
      <div
        v-else-if="!loading"
        class="home-latest-comments__empty flex flex-col items-center justify-center rounded-xl border border-dashed border-border-lighter bg-bg py-10"
      >
        <el-icon :size="32" class="text-text-placeholder"><ChatDotRound /></el-icon>
        <el-text class="mt-2 text-sm text-text-placeholder" tag="span">{{ t('home.latestCommentsEmpty') }}</el-text>
      </div>
    </div>
  </section>
</template>