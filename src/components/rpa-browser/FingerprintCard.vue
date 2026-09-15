<script setup lang="ts">
import { computed } from 'vue'
import { Clock, Delete, Edit, EditPen, Monitor, Search, VideoPlay } from '@element-plus/icons-vue'
import type { UserBrowserInfo } from '@/models/rpa_browser'

/**
 * FingerprintCard —— 浏览器指纹卡片（单个指纹的展示 + 操作入口）
 *
 * 纯展示组件：只负责渲染并把用户操作以事件上报；
 * 接口请求 / 路由跳转 / 确认弹窗等副作用由父页面 BrowserFingerprintList 处理。
 */

interface Props {
  /** 指纹数据 */
  item: UserBrowserInfo
}

const props = defineProps<Props>()

const emit = defineEmits<{
  /** 打开实时画面 */
  open: [item: UserBrowserInfo]
  /** 查看指纹详情 */
  detail: [item: UserBrowserInfo]
  /** 重命名指纹 */
  rename: [item: UserBrowserInfo]
  /** 编辑指纹 */
  edit: [item: UserBrowserInfo]
  /** 删除指纹 */
  remove: [item: UserBrowserInfo]
}>()

/** 浏览器 ID：优先取字符串形式，避免大整数精度丢失 */
const browserId = computed(() => props.item.browser_id_str || props.item.browser_id)

/** 品牌标签配色：按浏览器类型区分（替代原右上角 absolute 装饰圆点，避免与标签重叠） */
const BROWSER_TAG_CLASS: Record<string, string> = {
  chrome: 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white border-none',
  edge: 'bg-gradient-to-r from-sky-600 to-teal-500 text-white border-none',
  opera: 'bg-gradient-to-r from-red-600 to-rose-500 text-white border-none',
  vivaldi: 'bg-gradient-to-r from-orange-600 to-amber-500 text-white border-none',
}
const BROWSER_TAG_CLASS_FALLBACK =
  'bg-gradient-to-r from-purple-600 to-pink-600 text-white border-none'

const browserTagClass = computed(
  () =>
    BROWSER_TAG_CLASS[String(props.item.browser || props.item.fingerprint_browser || '').toLowerCase()] ??
    BROWSER_TAG_CLASS_FALLBACK
)

/** 日期格式化：无值或非法值统一显示「未知」 */
const formatDate = (value?: string | null): string => (value ? new Date(value).toLocaleDateString() : '未知')
</script>

<template>
  <div class="fingerprint-card relative rounded-2xl overflow-hidden group"
    style="background: linear-gradient(135deg, #0f0f1a 0%, #1a0a2e 50%, #0d1b2a 100%);">
    <div class="fingerprint-card__glow absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

    <div class="fingerprint-card__top-line absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500"></div>

    <div class="fingerprint-card__body relative p-5">
      <div class="fingerprint-card__head flex items-start justify-between mb-4">
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-cyan-400 text-xs font-mono tracking-wider">浏览器指纹</span>
          </div>
          <h3 class="text-xl font-bold text-white group-hover:text-cyan-300 transition-colors flex items-center gap-2">
            <span class="truncate">{{ item.custom_name || '未命名' }}</span>
            <el-button size="small" text class="fingerprint-card__rename-btn rename-icon flex-shrink-0 text-gray-400 hover:text-cyan-300"
              :icon="EditPen" aria-label="重命名" @click.stop="emit('rename', item)" />
          </h3>
        </div>
        <el-tag size="small" class="fingerprint-card__brand-tag browser-card__brand-tag" :class="browserTagClass">
          {{ item.browser || item.fingerprint_browser || '未知' }}
        </el-tag>
      </div>

      <div class="fingerprint-card__id bg-black/30 rounded-lg p-3 mb-4 border border-cyan-500/20">
        <div class="text-xs text-cyan-400/70 mb-1 font-mono">浏览器ID</div>
        <div class="text-sm text-gray-200 font-mono break-all hover:text-cyan-300 transition-colors cursor-pointer"
          @click="emit('detail', item)">
          {{ browserId?.toString() || 'N/A' }}
        </div>
      </div>

      <div class="fingerprint-card__meta grid grid-cols-3 gap-3 mb-4">
        <div class="fingerprint-card__meta-item bg-black/20 rounded-lg p-2 border border-purple-500/20">
          <div class="flex items-center gap-2">
            <el-icon class="text-purple-400"><Monitor /></el-icon>
            <span class="text-xs text-gray-400">平台</span>
          </div>
          <div class="text-sm text-white mt-1">{{ item.platform || item.fingerprint_platform || '未知' }}</div>
        </div>
        <div class="fingerprint-card__meta-item bg-black/20 rounded-lg p-2 border border-pink-500/20">
          <div class="flex items-center gap-2">
            <el-icon class="text-pink-400"><Clock /></el-icon>
            <span class="text-xs text-gray-400">创建时间</span>
          </div>
          <div class="text-sm text-white mt-1">{{ formatDate(item.created_at) }}</div>
        </div>
        <div class="fingerprint-card__meta-item bg-black/20 rounded-lg p-2 border border-cyan-500/20">
          <div class="flex items-center gap-2">
            <el-icon class="text-cyan-400"><Clock /></el-icon>
            <span class="text-xs text-gray-400">更新时间</span>
          </div>
          <div class="text-sm text-white mt-1">{{ formatDate(item.updated_at) }}</div>
        </div>
      </div>

      <div class="fingerprint-card__actions flex items-center gap-2">
        <el-button size="small" class="fingerprint-card__open-btn flex-1 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white border-none font-medium"
          :icon="VideoPlay" @click="emit('open', item)">
          打开
        </el-button>
        <el-button size="small" class="fingerprint-card__detail-btn flex-1 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white border-none font-medium"
          :icon="Search" @click="emit('detail', item)">
          详情
        </el-button>
        <el-button size="small" class="fingerprint-card__edit-btn bg-black/30 border border-gray-600 text-gray-300 hover:border-gray-400 hover:text-white transition-colors"
          :icon="Edit" @click="emit('edit', item)">
          编辑
        </el-button>
        <el-button size="small" class="fingerprint-card__delete-btn bg-red-600/20 border border-red-500/50 text-red-400 hover:bg-red-600/30 hover:border-red-400 transition-colors"
          :icon="Delete" @click="emit('remove', item)">
          删除
        </el-button>
      </div>
    </div>

    <div class="fingerprint-card__bottom-line absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
  </div>
</template>
