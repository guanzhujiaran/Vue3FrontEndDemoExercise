<template>
  <el-card
    class="lottery-card"
    :class="['lottery-type-' + normalizedData.type.toLowerCase()]"
    shadow="hover"
  >
    <template #header>
      <div class="card-header">
        <span>
          <el-tag size="small" :type="typeInfo.tagType" effect="light" class="type-tag">{{
            normalizedData.displayType
          }}</el-tag>
          <span class="card-title" :title="normalizedData.title">{{ normalizedData.title }}</span>
          <span class="card-id">ID: {{ normalizedData.id }}</span>
        </span>
        <el-link
          v-if="normalizedData.resultLink || normalizedData.sourceLink"
          type="primary"
          :href="normalizedData.resultLink || normalizedData.sourceLink!"
          target="_blank"
          rel="noreferrer"
          referrerpolicy="no-referrer"
          :underline="false"
        >
          查看详情
        </el-link>
        <el-switch
          :model-value="hasClicked"
          inline-prompt
          @change="handleRecordLotteryId"
          :active-icon="Flag"
        ></el-switch>
      </div>
    </template>
    <template #default>
      <!-- --- Key Info --- -->
      <el-descriptions :column="2" border size="small" class="key-info-desc">
        <el-descriptions-item label="状态" :span="1">
          <BiliStatusIcon
            :icon="normalizedData.statusType"
            :popover_text="normalizedData.statusText"
            >{{ normalizedData.statusText }}
          </BiliStatusIcon>
        </el-descriptions-item>
        <el-descriptions-item label="截止时间" :span="1">
          {{ formatTimestamp(normalizedData.endTime) }}
        </el-descriptions-item>
        <el-descriptions-item
          label="参与人数(非即时)"
          v-if="normalizedData.participants !== null"
          :span="2"
        >
          {{ normalizedData.participants }}
        </el-descriptions-item>
        <el-descriptions-item label="发起者UID" v-if="normalizedData.senderInfo.uid" :span="2">
          {{ normalizedData.senderInfo.uid }}
          <span v-if="normalizedData.senderInfo.name"> ({{ normalizedData.senderInfo.name }})</span>
        </el-descriptions-item>
        <el-descriptions-item label="直播间" v-if="normalizedData.roomId" :span="2">
          <el-link
            type="primary"
            :href="normalizedData.sourceLink!"
            target="_blank"
            rel="noreferrer"
            referrerpolicy="no-referrer"
          >
            <!-- Corrected Icon -->
            房间号: {{ normalizedData.roomId }}
            <el-icon>
              <Link />
            </el-icon>
          </el-link>
        </el-descriptions-item>
      </el-descriptions>
      <!-- --- Prize Info --- -->
      <el-descriptions
        v-if="normalizedData.prizes.length > 0"
        title="奖品信息"
        :column="1"
        border
        size="large"
        class="prize-info-desc"
      >
        <el-descriptions-item v-for="(prize, index) in normalizedData.prizes" :key="index">
          <template #label>
            <div class="prize-label">
              <el-icon v-if="index === 0">
                <TrophyBase />
              </el-icon>
              <el-icon v-else-if="index === 1">
                <Trophy />
              </el-icon>
              <el-icon v-else>
                <Medal />
              </el-icon>
              <span>{{ utils.arabicToChinese(index + 1) }}等奖</span>
              <span v-if="prize.count !== null"> ({{ prize.count }}份)</span>
            </div>
          </template>
          <div class="prize-details">
            <p>{{ prize.description || 'N/A' }}</p>
            <div class="prize-image-wrapper">
              <el-image
                style="width: 100%; height: 100%"
                v-if="prize.img"
                alt="加载失败"
                class="prize-image"
                :src="prize.img"
                :preview-src-list="[prize.img]"
                :max-scale="7"
                :min-scale="0.2"
                fit="fill"
                :preview-teleported="true"
                referrerpolicy="no-referrer"
                :hide-on-click-modal="true"
              >
              </el-image>
            </div>
          </div>
        </el-descriptions-item>
      </el-descriptions>
      <div v-else class="no-prize-info">
        <el-text type="info" size="small">无具体奖品信息</el-text>
      </div>

      <!-- --- Requirements Info --- -->
      <el-descriptions
        v-if="normalizedData.requirements.length > 0"
        title="参与条件"
        :column="1"
        border
        size="small"
        class="requirements-desc"
      >
        <el-descriptions-item>
          <div class="conditions">
            <div class="condition" v-for="(req, index) in normalizedData.requirements" :key="index">
              <el-link
                v-if="req.link"
                :href="req.link"
                target="_blank"
                type="primary"
                style="margin-left: 4px; vertical-align: middle; font-size: 1em"
                :underline="false"
                class="condition-link"
                rel="noreferrer"
                referrerpolicy="no-referrer"
              >
                <el-tag
                  :type="getRequirementTagType(req.type)"
                  size="small"
                  effect="plain"
                  :title="req.link"
                >
                  {{ req.text }}
                </el-tag>
              </el-link>
              <el-tag
                v-else
                :type="getRequirementTagType(req.type)"
                size="small"
                effect="plain"
                :title="req.link"
              >
                {{ req.text }}
              </el-tag>
            </div>
          </div>
        </el-descriptions-item>
      </el-descriptions>

      <!-- --- Collapsible: More Details / Raw Data --- -->
      <el-collapse v-model="activeCollapseNames" class="details-collapse">
        <el-collapse-item name="details">
          <template #title>
            <el-icon>
              <InfoFilled />
            </el-icon>
            <span style="margin-left: 5px">原始数据</span>
          </template>
          <el-descriptions :column="2" border size="small">
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
            <!-- Add more specific original fields if needed -->
          </el-descriptions>
          <pre class="raw-data-pre">{{ JSON.stringify(normalizedData.originalData, null, 2) }}</pre>
        </el-collapse-item>
      </el-collapse>
    </template>
  </el-card>
</template>

<script setup lang="ts">
import { Flag } from '@element-plus/icons-vue'
import { ref, computed } from 'vue'
import type { PropType } from 'vue'
import type { TagProps } from 'element-plus'
import type {
  AnchorLotteryData,
  AnyLotteryData,
  ChargingLotteryData,
  DynamicLotteryData,
  NormalizedLottery,
  RedPacketData,
  ReservationLotteryData,
  TopicEventData
} from '@/models/lottery/lottery_card.ts'
import { isMobileDevice } from '@/utils/Browser/useDeviceDetect.ts'
import {
  getBiliLotteryResultUrl,
  getBiliOpusUrl,
  getBiliUserSpaceUrl,
  getBiliWebView
} from '@/utils/PageOpen/BiliJump.ts'
import { BiliImg } from '@/assets/img/BiliImg.ts'
import utils from '@/utils/mixin.ts'
import { useBiliLotteryRecord } from '@/stores/bili_lottery_record.ts'

const handleRecordLotteryId = (val: boolean | number | string) => {
  val
    ? ClickedBiliLotteryId.enqueue(String(normalizedData.value.id))
    : ClickedBiliLotteryId.remove(String(normalizedData.value.id))
}
const is_mobile = isMobileDevice()
// --- Props ---
const props = defineProps({
  lotteryData: {
    type: Object as PropType<AnyLotteryData>,
    required: true
  }
})

// --- State ---
const activeCollapseNames = ref<string[]>([])
const ClickedBiliLotteryId = useBiliLotteryRecord()

const hasClicked = computed(() => ClickedBiliLotteryId.contains(String(normalizedData.value.id)))

// --- Helper Functions ---

const formatTimestamp = (timestamp: number | string | null | undefined): string => {
  if (timestamp === null || timestamp === undefined || timestamp === '') {
    return 'N/A'
  }
  try {
    let date: Date
    if (typeof timestamp === 'number') {
      date = new Date(timestamp * 1000)
    } else {
      {
        const numTimestamp = Number(timestamp)
        if (!isNaN(numTimestamp) && timestamp.trim() !== '') {
          // Check if it's a numeric string
          // Heuristic: Check if it looks like seconds or milliseconds
          date = new Date(numTimestamp * (numTimestamp < 10000000000 ? 1000 : 1))
        } else {
          // Assume date string like "YYYY-MM-DD HH:MM:SS" or ISO or with "截止"
          let cleanString = timestamp.replace('截止', '').trim()
          date = new Date(cleanString)
        }
      }
    }

    if (isNaN(date.getTime())) {
      return `无法解析: ${timestamp}`
    } // Return original on failure
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
  // Split by common separators like '、', ',', potentially keeping items with '*' together first
  const items = prizePart
    .split(/、|,|，/)
    .map((s) => s.trim())
    .filter(Boolean)

  items.forEach((item) => {
    // Try matching "Description*Count份", "Description x Count" or "Description Count份"
    const match = item.match(/^(.*?)(?:\*|\s+x\s*|\s*×\s*|\s+)(\d+)\s*(?:份|个|名)?$/)
    if (match && match[1] && match[2]) {
      // Ensure both parts are captured
      const description = match[1].trim()
      const count = parseInt(match[2], 10)
      if (description && !isNaN(count)) {
        prizes.push({ description, count, img: null })
        return // Move to next item
      }
    }
    // If no count structure found, assume count is 1
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

// --- Normalization Logic ---
const normalizedData = computed<NormalizedLottery>(() => {
  const data = props.lotteryData as AnyLotteryData
  const nowSec = Date.now() / 1000
  let normalized: Partial<NormalizedLottery> = {
    originalData: data,
    prizes: [],
    requirements: [],
    senderInfo: { uid: null }
  } // Initialize required arrays/objects

  // 1. Identify Type and Map Core Fields
  if (
    'lottery_id' in data &&
    (data.business_type === 1 || data.business_type === 12 || data.business_type === 10)
  ) {
    const dynData = data as DynamicLotteryData | ChargingLotteryData
    normalized.id = dynData.lottery_id
    normalized.endTime = dynData.lottery_time ?? null
    // Attempt to parse created_at safely
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
        : getBiliLotteryResultUrl(dynData.business_id_str, dynData.business_type) // Prefer detail URL if present
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
    }

    // Prizes
    if (dynData.first_prize_cmt || (dynData.first_prize ?? 0) > 0)
      normalized.prizes!.push({
        description: dynData.first_prize_cmt || '一等奖',
        count: dynData.first_prize ?? null,
        img: dynData.first_prize_pic || BiliImg.ranking.prize_default
      })
    if (dynData.second_prize_cmt || (dynData.second_prize ?? 0) > 0)
      normalized.prizes!.push({
        description: dynData.second_prize_cmt || '二等奖',
        count: dynData.second_prize ?? null,
        img: dynData.second_prize_pic || BiliImg.ranking.prize_default
      })
    if (dynData.third_prize_cmt || (dynData.third_prize ?? 0) > 0)
      normalized.prizes!.push({
        description: dynData.third_prize_cmt || '三等奖',
        count: dynData.third_prize ?? null,
        img: dynData.third_prize_pic || BiliImg.ranking.prize_default
      })
    // Requirements
    if (dynData.exclusive_level) {
      const chargeReq = parseExclusiveLevel(dynData.exclusive_level)
      if (chargeReq) normalized.requirements!.push(chargeReq)
      normalized.requirements!.push({
        type: '转发',
        text: '充电动态',
        link: getBiliOpusUrl(dynData.business_id_str)
      })
      // If exclusive_level exists, don't also show the generic 'has_charge_right' tag
    }
    // Status
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
    // Extract type from URL if possible, default 10
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
    normalized.roomId = null // Usually no room ID directly here
    normalized.danmu = null
    // Status mapping
    const state = resData.state
    if (state === 100 && normalized.endTime && nowSec < normalized.endTime)
      normalized.status = 'ONGOING'
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
    normalized.resultLink = normalized.sourceLink // Check in room
    normalized.businessType = null
    normalized.roomId = liveData.room_id ?? null
    normalized.danmu = liveData.danmu ?? null // Use corrected interface
    normalized.prizes = liveData.award_name
      ? [{ description: liveData.award_name, count: 1, img: null }]
      : []
    // Requirements
    if (liveData.require_type === 1)
      normalized.requirements!.push({ type: '关注', text: '关注主播' })
    else if (liveData.require_type === 2)
      normalized.requirements!.push({ type: '粉丝团', text: '加入粉丝团' })
    else if (liveData.require_type === 4 && liveData.danmu)
      normalized.requirements!.push({ type: '弹幕', text: `发送弹幕: ${liveData.danmu}` })
    else if (liveData.require_type && liveData.require_type > 2 && liveData.require_type !== 4)
      normalized.requirements!.push({ type: '其他', text: `特殊要求 (${liveData.require_type})` }) // Catch others
    // Status
    normalized.status = normalized.endTime && nowSec < normalized.endTime ? 'ONGOING' : 'ENDED'
  } else if ('jump_url' in data && 'title' in data && 'end_date_str' in data) {
    const topicData = data as TopicEventData
    // Use lottery_sid if available, otherwise create a pseudo-ID from title/url
    let _id_re = topicData.jump_url && /\/([a-zA-Z0-9]+)\.html$/.exec(topicData.jump_url)
    let _id_re1 = topicData.jump_url && /id=(.*)/.exec(topicData.jump_url)
    normalized.id = (_id_re && _id_re[1]) || (_id_re1 && _id_re1[1]) || topicData.jump_url
    normalized.type = 'TOPIC'
    normalized.displayType = '话题活动'
    normalized.title = topicData.title || '未知话题活动'
    // Try parsing end_date_str
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
      : [] // Use corrected interface
    normalized.requirements = [
      {
        type: '参与',
        text: '参与话题活动',
        link: is_mobile === 2 ? topicData.app_sche : topicData.jump_url
      }
    ]
    normalized.roomId = null
    normalized.danmu = null
    // Status
    normalized.status = normalized.endTime && nowSec < normalized.endTime ? 'ONGOING' : 'ENDED'
  } else {
    // --- Unknown Type ---
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

  // Finalize Status Text and Type
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

// Computed property for type tag styling
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
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 500;
  gap: 5px;
  flex-wrap: wrap;
}

:deep(.el-card__header),
:deep(.el-card__body) {
  padding: 0.2rem 0.2rem;
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
  justify-content: center;
  align-items: stretch;
}

:deep(.el-card__body) {
  flex-grow: 1;
}

.card-header > span,
.card-header > a {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  flex-wrap: wrap;
}

.type-tag {
  flex-shrink: 0;
}

.card-title {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-grow: 1;
  min-width: 50px;
}

.card-id {
  font-size: 0.8em;
  color: #909399;
  white-space: nowrap;
  flex-shrink: 0;
}

.key-info-desc,
.prize-info-desc,
.requirements-desc,
.details-collapse {
  margin-top: 12px;
  width: 100%;
}

.key-info-desc {
  margin-top: 0;
}

.no-prize-info {
  margin-top: 12px;
  padding: 10px;
  background-color: #f9f9f9;
  border-radius: 4px;
  text-align: center;
}

.prize-label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-weight: 500;

  span {
    white-space: nowrap;
  }
}

.prize-details {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  width: 100%;

  .prize-image-wrapper {
    width: 64px;
    height: 64px;
    border-radius: 4px;
    display: inline-block;
    border: 1px solid #ebeef5;
    background-color: #fafafa;
    flex-shrink: 0;
    box-sizing: border-box;
  }

  :deep(.el-image__inner) {
    width: 100%;
    height: 100%;
  }
}

.prize-details p {
  margin: 0;
  line-height: 1.5;
  flex-grow: 1;
  align-self: center;
  white-space: break-spaces;
}

.conditions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

:deep(.el-descriptions__content),
:deep(.el-descriptions__label) {
  word-break: break-all;
}

:deep(.prize-info-desc .el-descriptions-item__content) {
  white-space: normal;
}

.raw-data-pre {
  background-color: #f8f8f9;
  padding: 10px;
  border-radius: 4px;
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.8em;
  color: #5f6368;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 250px;
  overflow-y: auto;
  margin-top: 10px;
}

.details-collapse {
  border-top: none;
  margin-top: auto;
}

:deep(.el-collapse-item__header) {
  border-top: 1px solid var(--el-border-color-lighter);
  padding-top: 10px;
  font-size: 0.95em;
  font-weight: normal;
  order: 2; /* 标题放在后面 */
}

:deep(.el-collapse-item__wrap) {
  border-bottom: none;
  order: 1;
}

:deep(.el-collapse-item__arrow),
:deep(.el-tabs__nav) {
  transform: rotate(90deg);
}

:deep(.el-collapse-item__arrow.is-active) {
  transform: rotate(-90deg);
}

:deep(.el-collapse-item) {
  display: flex;
  flex-direction: column;
}

:deep(.el-collapse-item__content) {
  padding-bottom: 5px;
  padding-top: 10px;
}

.el-tag {
  cursor: default;
}

/* Fix link icon alignment if needed */
.el-link .el-icon {
  vertical-align: middle;
}

.el-tag .el-link .el-icon svg {
  font-size: inherit; /* Make icon size consistent with tag text */
}

.condition-link {
  :hover {
    cursor: pointer;
  }
}

.lottery-card {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

:deep(.el-descriptions__table) {
  width: 100%;
}
</style>
