<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { LiveViewerInfo } from '@/models/rpa_browser/live_stream'

/**
 * 「谁在看」面板（观看者列表）
 *
 * 数据来自会话状态 SSE 快照（后端已把监管管理员观看者过滤掉，归属者无感知），
 * 打开弹层**不发**任何请求。
 */
interface Props {
  viewers: LiveViewerInfo[]
  viewerCount: number
}

const props = defineProps<Props>()

const { t } = useI18n()

/** 接入时间 → 本地 HH:MM（比相对时间更省文案，且无需多语言拼接） */
const formatConnectedAt = (timestamp?: number) => {
  if (!timestamp) return ''
  const date = new Date(timestamp * 1000)
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

/** 接入时间 → 本地 YYYY-MM-DD HH:MM:SS（tooltip 用，精确到秒，便于对日志） */
const formatConnectedAtFull = (timestamp?: number) => {
  if (!timestamp) return '-'
  const date = new Date(timestamp * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  const ymd = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  return `${ymd} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

/**
 * 设备类型稳定码 → i18n 文案
 *
 * 后端只下发码（`desktop` / `mobile` / `tablet`），文案在前端出 ——
 * 与 `client_device`（厂商名，无需翻译）区分开，避免后端下发中文被写死在英文界面里。
 * 未识别的码返回空串（不展示徽标），也不会把裸码显示给用户。
 */
const DEVICE_TYPE_LABEL_KEYS: Record<string, string> = {
  desktop: 'rpa.viewerDeviceDesktop',
  mobile: 'rpa.viewerDeviceMobile',
  tablet: 'rpa.viewerDeviceTablet',
}

const viewerDeviceTypeLabel = (code?: string): string => {
  const key = code ? DEVICE_TYPE_LABEL_KEYS[code] : ''
  return key ? t(key) : ''
}

/** 清晰度档位 → i18n 文案（与顶栏档位下拉同一套文案） */
const QUALITY_LABEL_KEYS: Record<string, string> = {
  original: 'rpa.qualityOriginal',
  ultra: 'rpa.qualityUltra',
  high: 'rpa.qualityHigh',
  medium: 'rpa.qualityMedium',
  low: 'rpa.qualityLow',
}

const qualityLabel = (level?: string): string => {
  const key = level ? QUALITY_LABEL_KEYS[level] : ''
  return key ? t(key) : ''
}

/**
 * tooltip 里的清晰度文案
 *
 * 用户档位与本端生效档位**不同**时（本端不可见被降档）才追加「生效」后缀；
 * 相同（多观看者场景下绝大多数情况）只给一个值，避免噪音。
 */
const viewerQualityText = (viewer: LiveViewerInfo): string => {
  const effective = qualityLabel(viewer.effective_level)
  const user = qualityLabel(viewer.level)
  if (!effective && !user) return '-'
  if (!effective || !user || user === effective) return effective || user
  return t('rpa.viewerTooltipQualityEffective', { user, effective })
}
</script>

<template>
  <div class="live-viewers-panel">
    <div class="live-viewers-panel__header mb-2 flex items-center justify-between text-xs font-medium text-text-secondary">
      <span>{{ t('rpa.viewersTitle') }}</span>
      <span class="tabular-nums">{{ props.viewerCount }}</span>
    </div>
    <ul class="live-viewers-panel__list max-h-64 space-y-1.5 overflow-y-auto">
      <el-tooltip
        v-for="viewer in props.viewers"
        :key="viewer.viewer_id || viewer.stream_key"
        placement="right"
        :show-after="200"
        popper-class="live-viewers-tooltip"
      >
        <template #content>
          <div class="live-viewers-tooltip__content flex flex-col gap-1">
            <div class="live-viewers-tooltip__row flex items-baseline gap-2">
              <span class="live-viewers-tooltip__label w-16 shrink-0 text-text-secondary">{{ t('rpa.viewerTooltipDevice') }}</span>
              <span class="live-viewers-tooltip__value">{{ viewer.client_device || t('rpa.viewerUnknownDevice') }}</span>
            </div>
            <div class="live-viewers-tooltip__row flex items-baseline gap-2">
              <span class="live-viewers-tooltip__label w-16 shrink-0 text-text-secondary">{{ t('rpa.viewerTooltipType') }}</span>
              <span class="live-viewers-tooltip__value">{{ viewerDeviceTypeLabel(viewer.client_device_type) || '-' }}</span>
            </div>
            <div class="live-viewers-tooltip__row flex items-baseline gap-2">
              <span class="live-viewers-tooltip__label w-16 shrink-0 text-text-secondary">{{ t('rpa.viewerTooltipRegion') }}</span>
              <span class="live-viewers-tooltip__value">{{ viewer.client_ip_region || t('rpa.viewerUnknownRegion') }}</span>
            </div>
            <div class="live-viewers-tooltip__row flex items-baseline gap-2">
              <span class="live-viewers-tooltip__label w-16 shrink-0 text-text-secondary">{{ t('rpa.viewerTooltipIsp') }}</span>
              <span class="live-viewers-tooltip__value">{{ viewer.client_ip_isp || t('rpa.viewerUnknownIsp') }}</span>
            </div>
            <div class="live-viewers-tooltip__row flex items-baseline gap-2">
              <span class="live-viewers-tooltip__label w-16 shrink-0 text-text-secondary">IP</span>
              <span class="live-viewers-tooltip__value tabular-nums">{{ viewer.client_ip || t('rpa.viewerUnknownIp') }}</span>
            </div>
            <div class="live-viewers-tooltip__row flex items-baseline gap-2">
              <span class="live-viewers-tooltip__label w-16 shrink-0 text-text-secondary">{{ t('rpa.viewerTooltipConnectedAt') }}</span>
              <span class="live-viewers-tooltip__value tabular-nums">{{ formatConnectedAtFull(viewer.connected_at) }}</span>
            </div>
            <div class="live-viewers-tooltip__row flex items-baseline gap-2">
              <span class="live-viewers-tooltip__label w-16 shrink-0 text-text-secondary">{{ t('rpa.quality') }}</span>
              <span class="live-viewers-tooltip__value">{{ viewerQualityText(viewer) }}</span>
            </div>
          </div>
        </template>

        <li
          class="live-viewers-panel__row rounded border border-border bg-fill-light px-2 py-1.5 text-xs"
        >
          <div class="live-viewers-panel__main flex items-center gap-1.5">
            <span class="live-viewers-panel__online-dot inline-block h-1.5 w-1.5 rounded-full bg-green-500"></span>
            <span class="live-viewers-panel__device font-medium">
              {{ viewer.client_device || t('rpa.viewerUnknownDevice') }}
            </span>
            <span
              v-if="viewerDeviceTypeLabel(viewer.client_device_type)"
              class="live-viewers-panel__device-type rounded bg-fill-light px-1 text-text-secondary"
            >{{ viewerDeviceTypeLabel(viewer.client_device_type) }}</span>
            <span v-if="viewer.paused" class="text-text-secondary"> · {{ t('rpa.streamPaused') }} </span>
          </div>
          <div class="live-viewers-panel__meta mt-0.5 flex items-center gap-1.5 pl-3 text-text-secondary">
            <span class="live-viewers-panel__region">
              {{ viewer.client_ip_region || t('rpa.viewerUnknownRegion') }}
            </span>
            <span class="live-viewers-panel__isp">
              · {{ viewer.client_ip_isp || t('rpa.viewerUnknownIsp') }}
            </span>
            <span class="live-viewers-panel__ip tabular-nums">· {{ viewer.client_ip || t('rpa.viewerUnknownIp') }}</span>
            <span v-if="viewer.connected_at">· {{ formatConnectedAt(viewer.connected_at) }}</span>
          </div>
        </li>
      </el-tooltip>
      <li v-if="props.viewers.length === 0" class="text-xs text-text-secondary">
        {{ t('rpa.viewersEmpty') }}
      </li>
    </ul>
  </div>
</template>
