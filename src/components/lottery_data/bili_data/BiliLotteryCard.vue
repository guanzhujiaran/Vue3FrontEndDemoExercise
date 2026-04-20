<template>
  <el-card
    class="lottery-card h-full overflow-hidden border-border bg-bg [--el-card-border-color:var(--color-border)] [--el-card-padding:var(--spacing-4)] sm:[--el-card-padding:var(--spacing-5)]"
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


          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <el-link
              v-if="detailLink"
              type="primary"
              class="w-fit text-sm font-semibold"
              :href="detailLink"
              target="_blank"
              rel="noreferrer"
              referrerpolicy="no-referrer"
              underline="never"
              @click="handleLinkClick"
            >
              查看详情
            </el-link>

            <div class="flex flex-wrap items-center gap-3 sm:ml-auto">
              <span class="text-xs font-medium text-text-secondary">参与记录</span>
              <div class="rounded-full border border-border-light bg-bg px-2 py-1">
                <el-switch
                  :active-text="BiliCommTxt.BiliLotteryCard.hasJoined"
                  :inactive-text="BiliCommTxt.BiliLotteryCard.hasNotJoined"
                  :model-value="hasClicked"
                  class="max-w-full"
                  inline-prompt
                  @change="handleRecordLotteryId"
                />
              </div>
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
import { isMobileDevice } from '@/utils/Browser/useDeviceDetect.ts'
import {
  getBiliLotteryResultUrl,
  getBiliOpusUrl,
  getBiliUserSpaceUrl,
  getBiliWebView
} from '@/utils/PageOpen/BiliJump.ts'
import { BiliImg } from '@/assets/img/BiliImg.ts'
import { useBiliLotteryRecord } from '@/stores/bili_lottery_record.ts'
import { BiliCommTxt } from '@/assets/text/BiliCommTxt.ts'

const handleRecordLotteryId = (val: boolean | number | string) => {
  val
    ? ClickedBiliLotteryId.enqueue(String(normalizedData.value.id))
    : ClickedBiliLotteryId.remove(String(normalizedData.value.id))
}

const handleLinkClick = () => {
  if (ClickedBiliLotteryId.auto_save_lottery) {
    ClickedBiliLotteryId.enqueue(String(normalizedData.value.id))
  }
}

const is_mobile = isMobileDevice()

const props = defineProps({
  lotteryData: {
    type: Object as PropType<AnyLotteryData>,
    required: true
  }
})

const activeCollapseNames = ref<string[]>([])
const ClickedBiliLotteryId = useBiliLotteryRecord()
const globalVars = useInject(KeysEnum.GlobalVars) as Ref<GlobalVarsType>

const hasClicked = computed(() => ClickedBiliLotteryId.contains(String(normalizedData.value.id)))
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
      link: getBiliWebView(data.upower_open_url) || undefined
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
  const data = props.lotteryData as AnyLotteryData
  const nowSec = Date.now() / 1000
  const normalized: Partial<NormalizedLottery> = {
    originalData: data,
    prizes: [],
    requirements: [],
    senderInfo: { uid: null }
  }

  if (
    'lottery_id' in data &&
    (data.business_type === 1 || data.business_type === 12 || data.business_type === 10)
  ) {
    const dynData = data as DynamicLotteryData | ChargingLotteryData
    normalized.id = dynData.lottery_id
    normalized.endTime = dynData.lottery_time ?? null
    normalized.startTime = dynData.created_at
      ? formatTimestamp(dynData.created_at) !== 'N/A'
        ? new Date(formatTimestamp(dynData.created_at)).getTime() / 1000
        : null
      : null
    normalized.participants = dynData.participants ?? null
    normalized.senderInfo = { uid: dynData.sender_uid_str || dynData.sender_uid || null }
    normalized.sourceLink = getBiliOpusUrl(dynData.business_id_str)
    normalized.resultLink =
      dynData.lottery_detail_url && dynData.lottery_detail_url.trim() !== ''
        ? dynData.lottery_detail_url
        : getBiliLotteryResultUrl(dynData.business_id_str, dynData.business_type)
    normalized.businessType = dynData.business_type

    switch (data.business_type) {
      case 1:
        normalized.type = 'DYNAMIC'
        normalized.displayType = '官方转发抽奖'
        normalized.title = dynData.first_prize_cmt || `官方转发抽奖 #${dynData.lottery_id}`
        normalized.requirements!.push({
          type: '转发',
          text: '转发动态',
          link: normalized.sourceLink
        })
        break
      case 12:
        normalized.type = 'CHARGING'
        normalized.displayType = '充电抽奖'
        normalized.title = dynData.first_prize_cmt || `充电抽奖 #${dynData.lottery_id}`
        normalized.requirements!.push({
          type: '关注',
          text: '关注UP主',
          link:
            normalized.senderInfo && normalized.senderInfo.uid
              ? getBiliUserSpaceUrl(normalized.senderInfo.uid)
              : undefined
        })
        break
      case 10:
        normalized.id = dynData.business_id_str
        normalized.type = 'RESERVATION'
        normalized.displayType = '预约抽奖'
        normalized.title = dynData.first_prize_cmt || `预约抽奖 #${dynData.lottery_id}`
        data.business_id && String(data.business_id).length > 18
          ? normalized.requirements!.push({
              type: '预约',
              text: '完成直播预约(动态)',
              link: getBiliOpusUrl(data.business_id)
            })
          : null
        normalized.requirements!.push({
          type: '预约',
          text: '完成直播预约(空间)',
          link: getBiliUserSpaceUrl(normalized.senderInfo.uid)
        })
        break
    }

    if (dynData.first_prize_cmt || (dynData.first_prize ?? 0) > 0) {
      normalized.prizes!.push({
        description: dynData.first_prize_cmt || '一等奖',
        count: dynData.first_prize ?? null,
        img: dynData.first_prize_pic || BiliImg.ranking.prize_default
      })
    }
    if (dynData.second_prize_cmt || (dynData.second_prize ?? 0) > 0) {
      normalized.prizes!.push({
        description: dynData.second_prize_cmt || '二等奖',
        count: dynData.second_prize ?? null,
        img: dynData.second_prize_pic || BiliImg.ranking.prize_default
      })
    }
    if (dynData.third_prize_cmt || (dynData.third_prize ?? 0) > 0) {
      normalized.prizes!.push({
        description: dynData.third_prize_cmt || '三等奖',
        count: dynData.third_prize ?? null,
        img: dynData.third_prize_pic || BiliImg.ranking.prize_default
      })
    }

    if (dynData.exclusive_level) {
      const chargeReq = parseExclusiveLevel(dynData.exclusive_level)
      if (chargeReq) normalized.requirements!.push(chargeReq)
      normalized.requirements!.push({
        type: '转发',
        text: '充电动态',
        link: getBiliOpusUrl(dynData.business_id_str)
      })
    }

    switch (dynData.status) {
      case -1:
        normalized.status = 'CANCELLED'
        break
      case 0:
        normalized.status = normalized.endTime && nowSec < normalized.endTime ? 'ONGOING' : 'ENDED'
        break
      case 1:
      case 2:
        normalized.status = 'ENDED'
        break
      default:
        normalized.status =
          normalized.endTime && nowSec < normalized.endTime ? 'ONGOING' : 'UNKNOWN'
    }
  } else if ('ids' in data && 'stime' in data) {
    const resData = data as ReservationLotteryData
    normalized.id = resData.ids
    normalized.type = 'RESERVATION'
    normalized.displayType = '预约抽奖'
    normalized.title = resData.name || `预约 #${resData.ids}`
    normalized.endTime = resData.etime ?? null
    normalized.startTime = resData.stime ?? null
    normalized.participants = resData.total ?? null
    normalized.senderInfo = { uid: resData.upmid_str || String(resData.upmid) || null }
    normalized.sourceLink = resData.jumpUrl || null
    normalized.resultLink = resData.jumpUrl || null
    normalized.businessType = 10

    try {
      if (resData.jumpUrl) {
        const url = new URL(resData.jumpUrl)
        const typeParam = url.searchParams.get('business_type')
        if (typeParam) normalized.businessType = parseInt(typeParam, 10) || 10
      }
    } catch (e) {}

    normalized.prizes = parsePrizeText(resData.text)
    normalized.requirements = []
    resData.dynamicId_str && resData.dynamicId_str.length > 18
      ? normalized.requirements.push({
          type: '预约',
          text: '完成直播预约(动态)',
          link:
            is_mobile == 2
              ? `bilibili://opus/detail/${resData.dynamicId_str}?h5awaken=random`
              : resData.jumpUrl
        })
      : null
    normalized.requirements.push({
      type: '预约',
      text: '完成直播预约(空间)',
      link: getBiliUserSpaceUrl(resData.upmid_str)
    })
    normalized.roomId = null
    normalized.danmu = null

    const state = resData.state
    if (state === 100 && normalized.endTime && nowSec < normalized.endTime) normalized.status = 'ONGOING'
    else if (normalized.endTime && nowSec >= normalized.endTime) normalized.status = 'ENDED'
    else normalized.status = 'UNKNOWN'
  } else if ('lot_id' in data && 'anchor_uid' in data) {
    const liveData = data as AnchorLotteryData | RedPacketData
    normalized.id = liveData.lot_id
    normalized.type = liveData.type === 'anchor' ? 'ANCHOR' : 'RED_PACKET'
    normalized.displayType = liveData.type === 'anchor' ? '天选时刻' : '红包抽奖'
    normalized.title =
      liveData.award_name || (normalized.type === 'ANCHOR' ? '天选抽奖' : '红包抽奖')
    normalized.endTime = liveData.end_time ?? null
    normalized.startTime = null
    normalized.participants = null
    normalized.senderInfo = { uid: liveData.anchor_uid ?? null }
    normalized.sourceLink =
      liveData.live_room_url ||
      (liveData.room_id ? `https://live.bilibili.com/${liveData.room_id}` : null)
    normalized.resultLink = normalized.sourceLink
    normalized.businessType = null
    normalized.roomId = liveData.room_id ?? null
    normalized.danmu = liveData.danmu ?? null
    normalized.prizes = liveData.award_name
      ? [{ description: liveData.award_name, count: 1, img: null }]
      : []

    if (liveData.require_type === 1) normalized.requirements!.push({ type: '关注', text: '关注主播' })
    else if (liveData.require_type === 2)
      normalized.requirements!.push({ type: '粉丝团', text: '加入粉丝团' })
    else if (liveData.require_type === 4 && liveData.danmu)
      normalized.requirements!.push({ type: '弹幕', text: `发送弹幕: ${liveData.danmu}` })
    else if (liveData.require_type && liveData.require_type > 2 && liveData.require_type !== 4)
      normalized.requirements!.push({ type: '其他', text: `特殊要求 (${liveData.require_type})` })

    normalized.status = normalized.endTime && nowSec < normalized.endTime ? 'ONGOING' : 'ENDED'
  } else if ('jump_url' in data && 'title' in data && 'end_date_str' in data) {
    const topicData = data as TopicEventData
    const idFromPath = topicData.jump_url && /\/([a-zA-Z0-9]+)\.html$/.exec(topicData.jump_url)
    const idFromQuery = topicData.jump_url && /id=(.*)/.exec(topicData.jump_url)
    const idFromAct = topicData.jump_url && /actId=(.*)/.exec(topicData.jump_url)
    normalized.id =
      (idFromPath && idFromPath[1]) ||
      (idFromQuery && idFromQuery[1]) ||
      (idFromAct && idFromAct[1]) ||
      topicData.lottery_sid ||
      topicData.jump_url
    normalized.type = 'TOPIC'
    normalized.displayType = topicData.lot_type_text || '话题活动'
    normalized.title = topicData.title || '未知话题活动'

    const endDate = formatTimestamp(topicData.end_date_str)
    normalized.endTime =
      endDate !== 'N/A' && !endDate.startsWith('无法解析')
        ? new Date(endDate).getTime() / 1000
        : null
    normalized.startTime = null
    normalized.participants = null
    normalized.senderInfo = { uid: null }
    normalized.sourceLink = getBiliWebView(topicData.jump_url) || null
    normalized.resultLink = normalized.sourceLink
    normalized.businessType = null
    normalized.prizes = topicData.lottery_pool_text
      ? [{ description: topicData.lottery_pool_text, count: null, img: null }]
      : []
    normalized.requirements = [
      {
        type: '参与',
        text: '参与话题活动',
        link: is_mobile === 2 ? topicData.app_sche : topicData.jump_url
      }
    ]
    normalized.roomId = null
    normalized.danmu = null
    normalized.status = normalized.endTime && nowSec < normalized.endTime ? 'ONGOING' : 'ENDED'
  } else {
    normalized.id = 'N/A'
    normalized.type = 'UNKNOWN'
    normalized.displayType = '未知类型'
    normalized.title = '无法识别的数据'
    normalized.status = 'UNKNOWN'
    normalized.endTime = null
    normalized.startTime = null
    normalized.participants = null
    normalized.prizes = []
    normalized.requirements = []
    normalized.roomId = null
    normalized.danmu = null
  }

  switch (normalized.status) {
    case 'ONGOING':
      normalized.statusText = '进行中'
      normalized.statusType = 'success'
      break
    case 'ENDED':
      normalized.statusText = '已结束/已开奖'
      normalized.statusType = 'error'
      break
    case 'CANCELLED':
      normalized.statusText = '已取消'
      normalized.statusType = 'warning'
      break
    default:
      normalized.statusText = '未知状态'
      normalized.statusType = 'error'
  }

  if (!normalized.title) normalized.title = `${normalized.displayType} #${normalized.id}`

  return normalized as NormalizedLottery
})

const detailLink = computed(() => normalizedData.value.resultLink || normalizedData.value.sourceLink || null)
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
  if (normalizedData.value.status === 'CANCELLED') {
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
