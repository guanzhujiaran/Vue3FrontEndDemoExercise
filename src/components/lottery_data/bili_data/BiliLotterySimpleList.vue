<template>
  <div class="bili-lottery-simple-list">
    <div
      class="grid gap-3 grid-cols-[repeat(auto-fill,minmax(220px,1fr))]"
    >
      <div
        v-for="(item, idx) in parsedData"
        :key="getKey(item, idx)"
        class="simple-card group cursor-pointer rounded-lg border border-border-light bg-bg-page p-3 min-h-[110px] transition-colors hover:border-primary hover:bg-fill-lighter"
        :class="{ 'simple-card-grand-prize': item.normalized.extraInfo?.is_grand_prize }"
        @click="openDetail(item)"
      >
        <!-- 类型 + 状态 小标识 -->
        <div class="mb-2 flex flex-wrap items-center gap-2">
          <span class="inline-flex items-center gap-1 bg-fill-lighter px-2 py-0.5 border border-border-light rounded-full font-medium text-text-secondary text-xs">
            <BiliStatusIcon :icon="item.normalized.statusType ?? 'info'" :popover_text="item.normalized.statusText" />
            {{ item.normalized.displayType }}
          </span>
          <span
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium text-xs border"
            :class="item.participated
              ? 'bg-success-light-9 border-success text-success'
              : 'bg-fill-lighter border-border-light text-text-secondary'"
          >
            <span
              class="inline-block h-1.5 w-1.5 rounded-full"
              :class="item.participated ? 'bg-success' : 'bg-text-placeholder'"
            ></span>
            {{ item.participated ? '已参加' : '未参加' }}
          </span>
          <span
            v-if="item.normalized.extraInfo?.is_grand_prize"
            class="ml-auto inline-flex items-center bg-amber-50 px-2 py-0.5 border border-amber-400 rounded-full font-medium text-amber-700 text-xs"
          >
            大奖
          </span>
        </div>

        <!-- 抽奖名称 -->
        <p
          class="line-clamp-2 font-medium text-text-primary text-sm leading-relaxed wrap-break-word"
          :title="item.normalized.title"
        >
          {{ item.normalized.title }}
        </p>

        <div v-if="item.normalized.id" class="lottery-simple-list__id mt-2 text-xs text-text-placeholder">ID: {{ item.normalized.id }}</div>

        <!-- 跳转连接（点击链接不触发卡片弹窗） -->
        <div class="mt-3 flex flex-wrap items-center gap-3" @click.stop>
          <el-link
            v-if="item.normalized.sourceLink"
            type="primary"
            :href="item.normalized.sourceLink"
            target="_blank"
            :rel="LINK_REL"
            :referrerpolicy="LINK_REFERRER_POLICY"
            underline="never"
            icon="link"
            class="text-xs!"
            @click="handleLinkClick(item.normalized)"
          >
            查看源动态
          </el-link>
          <el-link
            v-if="item.normalized.resultLink"
            type="primary"
            :href="item.normalized.resultLink"
            target="_blank"
            :rel="LINK_REL"
            :referrerpolicy="LINK_REFERRER_POLICY"
            underline="never"
            icon="link"
            class="text-xs!"
            @click="handleLinkClick(item.normalized)"
          >
            抽奖详情
          </el-link>
          <!-- 点赞 / 收藏 / 转发到动态 → 三个点下拉框（hover/click/右键） -->
          <el-dropdown
            class="lottery-simple-card__more-actions ml-auto"
            :trigger="['click', 'hover', 'contextmenu']"
            placement="bottom-end"
          >
            <span class="lottery-simple-card__more-trigger inline-flex items-center justify-center w-7 h-7 rounded-full cursor-pointer text-text-primary hover:opacity-80 transition-opacity">
              <component :is="MoreIcon" class="w-4 h-4" />
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="handleLike(item)">
                  <span class="inline-flex items-center gap-1">
                    点赞
                    <span :class="statusOf(item).isLike ? 'text-danger font-semibold' : ''">{{ statusOf(item).likeCount ?? 0 }}</span>
                  </span>
                </el-dropdown-item>
                <el-dropdown-item @click="handleFavorite(item)">
                  <span class="inline-flex items-center gap-1">
                    收藏
                    <span :class="statusOf(item).isFavorite ? 'text-warning font-semibold' : ''">{{ statusOf(item).favoriteCount ?? 0 }}</span>
                  </span>
                </el-dropdown-item>
                <el-dropdown-item :disabled="interactLoading" @click="handleForward(item)">
                  转发到动态
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </div>

    <el-dialog
      v-model="detailVisible"
      align-center
      width="680px"
      class="lottery-detail-dialog"
      :title="selectedNormalized?.title"
      append-to-body
    >
      <BiliLotteryCard v-if="selectedRaw" :lottery-data="selectedRaw" />
    </el-dialog>

    <!-- 转发抽奖到动态：复用统一动态编辑器（attach 资源模式） -->
    <MomentPublishForm
      v-model:visible="forwardVisible"
      :attach-resource="{
        bizType: InteractionBizTypeEnum.LOTTERY,
        bizId: forwardingItem ? String(forwardingItem.normalized.id) : '',
        name: forwardingItem?.normalized.title || undefined,
      }"
    />

    <!-- 收藏到收藏夹：选择/新建收藏夹 -->
    <MomentFavoriteDialog
      v-model="favDialogVisible"
      :dyn-id="favItem ? String(favItem.normalized.id) : ''"
      :biz-type="InteractionBizTypeEnum.LOTTERY"
      :biz-id="favItem ? String(favItem.normalized.id) : ''"
      @changed="handleFavChanged"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, reactive, watch } from 'vue'
import BiliLotteryCard from '@/components/lottery_data/bili_data/BiliLotteryCard.vue'
import { LINK_REL, LINK_REFERRER_POLICY } from '@/utils/PageOpen/linkPolicy'
import BiliStatusIcon from '@/components/CommonCompo/Bili-Status-Compo/BiliStatusIcon.vue'
import { normalizeLotteryData } from '@/utils/lotteryNormalization.ts'
import { handleLotteryLinkClick, isLotteryParticipated } from '@/utils/lotteryParticipation'
import MoreIcon from '@/assets/svgs/more.svg?component'
import MomentPublishForm from '@/components/moment/MomentPublishForm.vue'
import MomentFavoriteDialog from '@/components/moment/MomentFavoriteDialog.vue'
import { fetchInteractionStatus, InteractionBizTypeEnum, thumbMoment } from '@/api/notify/moment-api'
import type { InteractionStatusItem } from '@/api/notify/moment-api'

interface SimpleListItem {
  raw: any
  normalized: ReturnType<typeof normalizeLotteryData>
  participated: boolean
}

const props = withDefaults(
  defineProps<{ data: any[] }>(),
  { data: () => [] }
)

const parsedData = computed<SimpleListItem[]>(() =>
  props.data.map((el) => {
    // 透传完整对象：extra_info 等附加信息在响应顶层，normalizeLotteryData 内部会自行处理 raw 解包
    const raw = el
    const normalized = normalizeLotteryData(raw)
    return { raw, normalized, participated: isLotteryParticipated(String(normalized.id)) }
  })
)

const getKey = (item: SimpleListItem, idx: number): string =>
  `${item.normalized.id ?? 'noid'}-${idx}`

const detailVisible = ref(false)
const selectedRaw = ref<any>(null)
const selectedNormalized = computed(() =>
  selectedRaw.value ? normalizeLotteryData(selectedRaw.value) : null
)

const openDetail = (item: SimpleListItem) => {
  selectedRaw.value = item.raw
  detailVisible.value = true
}

const handleLinkClick = (normalized: SimpleListItem['normalized']) => {
  handleLotteryLinkClick(String(normalized.id))
}

// ============ 点赞 / 收藏 / 转发到动态（2.20.0，批量拉取互动状态）============
const statusMap = reactive<Record<string, InteractionStatusItem>>({})
const interactLoading = ref(false)

async function loadAllStatus() {
  const ids = parsedData.value.map((i) => String(i.normalized.id)).filter(Boolean)
  if (!ids.length) return
  const seq = ++loadSeq
  try {
    const res = await fetchInteractionStatus(InteractionBizTypeEnum.LOTTERY, ids)
    if (seq !== loadSeq) return // 过期响应（期间又切页）丢弃
    for (const item of res?.items ?? []) {
      if (item?.bizId) statusMap[item.bizId] = item
    }
  } catch {
    // 弱依赖：失败不阻断展示
  }
}
// 切页（分页/翻页 data 变化）时重新拉取本页互动状态；内容不变去重跳过、空页清空
let lastLoadedKey = ''
let loadSeq = 0
watch(
  computed(() => {
    const ids = parsedData.value.map((i) => String(i.normalized.id)).filter(Boolean)
    return ids.slice().sort().join(',')
  }),
  async (key) => {
    if (!key) {
      lastLoadedKey = ''
      for (const k of Object.keys(statusMap)) delete statusMap[k]
      return
    }
    if (key === lastLoadedKey) return
    lastLoadedKey = key
    await loadAllStatus()
  },
  { immediate: true }
)

function statusOf(item: SimpleListItem): InteractionStatusItem {
  return statusMap[String(item.normalized.id)] ?? { bizId: String(item.normalized.id), bizType: InteractionBizTypeEnum.LOTTERY }
}

async function handleLike(item: SimpleListItem) {
  if (interactLoading.value) return
  interactLoading.value = true
  const id = String(item.normalized.id)
  const st = statusOf(item)
  const next = !Boolean(st.isLike)
  const res = await thumbMoment(id, next ? 1 : 2, { bizType: InteractionBizTypeEnum.LOTTERY, bizId: id })
  interactLoading.value = false
  if (res) {
    statusMap[id] = { ...st, isLike: next, likeCount: Math.max(0, Number(st.likeCount ?? 0) + (next ? 1 : -1)) }
  }
}

/** 收藏到收藏夹：弹出收藏夹选择弹窗（多夹），选择/新建收藏夹后收藏 */
const favDialogVisible = ref(false)
const favItem = ref<SimpleListItem | null>(null)
function handleFavorite(item: SimpleListItem) {
  favItem.value = item
  favDialogVisible.value = true
}

/** 收藏夹变更后重新拉取最新互动状态 */
async function handleFavChanged() {
  await loadAllStatus()
}

// 转发到动态：弹窗由 MomentPublishForm（attach 资源模式）处理
const forwardVisible = ref(false)
const forwardingItem = ref<SimpleListItem | null>(null)
function handleForward(item: SimpleListItem) {
  forwardingItem.value = item
  forwardVisible.value = true
}
</script>
