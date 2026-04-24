<template>
  <el-card
    class="lottery-card h-full min-w-80 overflow-hidden border-border bg-bg [--el-card-border-color:var(--color-border)] [--el-card-padding:var(--spacing-4)] sm:[--el-card-padding:var(--spacing-5)]"
    :class="['lottery-type-' + normalizedData.type.toLowerCase()]"
    shadow="hover"
    body-class="lottery-card-body"
  >
    <template #header>
      <div class="flex flex-col gap-4">
        <div class="flex flex-wrap items-start gap-2">
          <el-tag size="default" :type="typeInfo.tagType" effect="plain" round class="w-fit">
            {{ normalizedData.displayType }}
          </el-tag>
          <span
            class="inline-flex items-center gap-2 rounded-full border border-border-light bg-fill-lighter px-3 py-1 text-xs font-medium text-text-primary"
          >
            <BiliStatusIcon :icon="statusIcon" :popover_text="normalizedData.statusText" />
            <span>{{ normalizedData.statusText }}</span>
          </span>
          <span
            class="ml-auto inline-flex items-center rounded-full border border-border-light bg-bg-page px-3 py-1 text-xs font-medium text-text-secondary"
          >
            ID: {{ normalizedData.id }}
          </span>
        </div>

        <div class="space-y-2">
          <h3
            class="wrap-break-word text-base leading-relaxed font-semibold text-text-primary sm:text-lg"
            :title="normalizedData.title"
          >
            {{ normalizedData.title }}
          </h3>
          <p v-if="headerDescription" class="text-xs leading-relaxed text-text-secondary sm:text-sm">
            {{ headerDescription }}
          </p>
        </div>

        <div class="flex flex-col gap-3 rounded-lg border border-border-light bg-fill-lighter p-3">
          <div class="flex items-center justify-between gap-2 flex-nowrap">
            <!-- 查看详情按钮 -->
             
            <el-link
              v-if="sourceLink"
              type="primary"
              size="default"
              :href="sourceLink"
              target="_blank"
              rel="noreferrer"
              @click="handleLinkClick"
              link
              icon="link"
              underline="never"
              class="whitespace-nowrap"
            >
             查看源动态
            </el-link>
            <el-button icon="link" v-else type="info" size="default" disabled class="whitespace-nowrap">
              暂无源动态
            </el-button>
            <el-link
              v-if="resultLink"
              type="primary"
              size="default"
              :href="resultLink"
              target="_blank"
              rel="noreferrer"
              @click="handleLinkClick"
              link
              icon="link"
              underline="never"
              class="whitespace-nowrap"
            >
              查看h5抽奖详情
            </el-link>
            <el-button icon="link" v-else type="info" size="default" disabled class="whitespace-nowrap">
              查看h5抽奖详情
            </el-button>
            <!-- 参加/不参加开关 -->
            <div class="flex items-center gap-2 whitespace-nowrap">
              <span class="text-sm font-medium text-text-secondary whitespace-nowrap">
                {{ hasClicked ? '已参加' : '未参加' }}
              </span>
              <el-tooltip
                :content="hasClicked ? '取消标记参加' : '标记为已参加'"
                placement="top"
              >
                <el-switch
                  :model-value="hasClicked"
                  @change="handleRecordLotteryId"
                />
              </el-tooltip>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #default>
      <div class="main-content-wrapper flex h-full flex-col gap-4">
        <section
          v-if="normalizedData.endTime !== null"
          class="rounded-lg border border-border-light bg-bg-page p-4"
        >
          <div class="space-y-3">
            <p class="text-xs font-medium text-text-secondary">{{ countdownTitle }}</p>

            <div class="rounded-lg border border-border-light bg-bg px-4 py-3 sm:min-w-(--spacing-40)">
              <el-countdown
                v-if="normalizedData.status === 'ONGOING'"
                class="lottery__countdown text-sm font-semibold text-text-primary sm:text-base"
                :value="normalizedData.endTime * 1e3"
                format="DD 天 HH 时 mm 分 ss 秒"
              />
              <div v-else class="text-sm font-semibold text-text-primary sm:text-base">
                {{ deadlineReachedText }}
              </div>
            </div>
          </div>
        </section>

        <section class="grid gap-3 sm:grid-cols-2">
          <div
            v-for="item in summaryItems"
            :key="item.label"
            class="rounded-lg border border-border-light bg-fill-lighter p-4"
          >
            <div class="flex items-center gap-1">
              <span class="text-xs font-medium text-text-secondary">{{ item.label }}</span>
              <el-popover
                v-if="item.hint"
                trigger="hover"
                placement="top"
                width="200"
              >
                <template #reference>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-text-secondary cursor-help">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                </template>
                <div class="text-xs">{{ item.hint }}</div>
              </el-popover>
            </div>
            <div>
              <el-link
                v-if="item.link"
                :href="item.link"
                target="_blank"
                type="primary"
                underline="never"
                class="mt-2 w-fit text-left text-sm font-semibold leading-relaxed no-underline sm:text-base"
                rel="noreferrer"
                referrerpolicy="no-referrer"
                @click="handleLinkClick"
              >
                {{ item.value }}
              </el-link>
              <div v-else class="mt-2 wrap-break-word text-sm font-semibold leading-relaxed text-text-primary sm:text-base">
                {{ item.value }}
              </div>
            </div>
          </div>
        </section>

        <LotteryPrize
          v-if="normalizedData.prizes.length > 0 && normalizedData.type !== 'TOPIC'"
          :prizes="normalizedData.prizes"
        />

        <section
          v-if="normalizedData.type === 'TOPIC' && normalizedData.prizes.length > 0"
          class="rounded-lg border border-border-light bg-fill-lighter p-4"
        >
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="space-y-1">
              <p class="text-sm font-semibold text-text-primary">奖品池</p>
              <p class="text-xs leading-relaxed text-text-secondary">
                话题活动通常会在活动页展示完整规则，这里先展示抓取到的摘要信息。
              </p>
            </div>
            <span class="rounded-full bg-bg px-3 py-1 text-xs font-medium text-text-secondary">
              {{ normalizedData.prizes.length }} 条
            </span>
          </div>
          <div class="mt-3 space-y-2">
            <div
              v-for="(prize, index) in normalizedData.prizes"
              :key="`${prize.description}-${index}`"
              class="rounded-lg border border-border-light bg-bg px-3 py-3 text-sm leading-relaxed text-text-primary"
            >
              {{ prize.description }}
            </div>
          </div>
        </section>

        <section
          v-if="normalizedData.requirements.length > 0"
          class="mt-auto rounded-lg border border-border-light bg-fill-lighter p-4"
        >
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="space-y-1">
              <p class="text-sm font-semibold text-text-primary">
                <span class="flex items-center gap-1">
                  参与条件
                  <el-popover
                    trigger="hover"
                    placement="top"
                    width="200"
                  >
                    <template #reference>
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-text-secondary cursor-help">
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
            <span class="rounded-full bg-bg px-3 py-1 text-xs font-medium text-text-secondary">
              {{ normalizedData.requirements.length }} 项
            </span>
          </div>
          <div class="mt-3 flex flex-wrap gap-2">
            <template v-for="(req, index) in normalizedData.requirements" :key="`${req.type}-${index}`">
              <el-link
                v-if="req.link"
                :href="req.link"
                target="_blank"
                type="primary"
                underline="never"
                class="no-underline"
                rel="noreferrer"
                referrerpolicy="no-referrer"
                @click="handleLinkClick"
              >
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
      <el-collapse v-model="activeCollapseNames" class="details-collapse">
        <el-collapse-item name="details">
          <template #title>
            <div class="flex items-center gap-2 text-sm font-medium text-text-primary">
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
            <el-descriptions-item
              label="原始弹幕要求"
              v-if="normalizedData.danmu !== null && normalizedData.danmu !== ''"
            >
              {{ normalizedData.danmu }}
            </el-descriptions-item>
          </el-descriptions>
          <pre class="raw-data-pre overflow-x-auto whitespace-pre-wrap break-all rounded-md bg-fill-lighter p-3 text-xs leading-relaxed text-text-secondary">{{ JSON.stringify(normalizedData.originalData, null, 2) }}</pre>
        </el-collapse-item>
      </el-collapse>
    </template>
  </el-card>
</template>

<script setup lang="ts">
import { computed, ref, type PropType, type Ref } from 'vue'
import type { TagProps } from 'element-plus'
import { type GlobalVarsType, ScreenTypeEnum } from '@/models/global_var/global_var_model.ts'
import { KeysEnum, useInject } from '@/models/base/provide_model.ts'
import { Link } from '@element-plus/icons-vue'

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
import { normalizeLotteryData, formatTimestamp } from '@/utils/lotteryNormalization.ts'
import { getBiliUserSpaceUrl } from '@/utils/PageOpen/BiliJump.ts'
import { isMobileDevice } from '@/utils/Browser/useDeviceDetect.ts'
import { BiliCommTxt } from '@/assets/text/BiliCommTxt.ts'
import { handleLotteryLinkClick, setLotteryParticipation, isLotteryParticipated } from '@/utils/lotteryParticipation'

const handleRecordLotteryId = (val: boolean | number | string) => {
  setLotteryParticipation(String(normalizedData.value.id), Boolean(val))
}

const handleLinkClick = () => {
  handleLotteryLinkClick(String(normalizedData.value.id))
}

const is_mobile = isMobileDevice()

const props = defineProps({
  lotteryData: {
    type: Object as PropType<AnyLotteryData>,
    required: true
  }
})

const activeCollapseNames = ref<string[]>([])
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

const sourceLink = computed(() => normalizedData.value.sourceLink || null)
const resultLink = computed(() => normalizedData.value.resultLink || null)
const senderProfileLink = computed(() =>
  normalizedData.value.senderInfo.uid ? getBiliUserSpaceUrl(String(normalizedData.value.senderInfo.uid)) : null
)
const statusIcon = computed(() => normalizedData.value.statusType || 'info')
const deadlineText = computed(() => formatTimestamp(normalizedData.value.endTime))
const timeSummaryLabel = computed(() => (normalizedData.value.type === 'TOPIC' ? '活动截止' : '截止时间'))
const countdownTitle = computed(() => (normalizedData.value.type === 'TOPIC' ? '活动截止倒计时' : '开奖倒计时'))
const countdownDescription = computed(() =>
  normalizedData.value.type === 'TOPIC'
    ? '活动结束后通常会在活动页公布后续结果。'
    : '倒计时结束后即可前往详情页查看开奖情况。'
)
const deadlineReachedText = computed(() => {
  if (normalizedData.value.status === 'CANCELLED' || normalizedData.value.status =="UNKNOWN") {
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
      value: deadlineText.value,
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

  if (normalizedData.value.prizes.length > 0) {
    items.push({
      label: '抽取名额',
      value: totalPrizeCount.value > 0 ? `${totalPrizeCount.value} 名` : '待公布',
      hint:
        normalizedData.value.prizes.length > 1
          ? `共 ${normalizedData.value.prizes.length} 档奖品`
          : '按当前奖品配置展示'
    })
  }

  if (normalizedData.value.senderInfo.uid) {
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

  if (normalizedData.value.type === 'TOPIC' && normalizedData.value.prizes.length > 0) {
    items.push({
      label: '奖品池摘要',
      value: normalizedData.value.prizes[0]?.description ?? '活动页查看',
      hint: '话题活动通常在活动页展示完整规则'
    })
  }

  return items.slice(0, 4)
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
    default:
      return ''
  }
})
</script>
