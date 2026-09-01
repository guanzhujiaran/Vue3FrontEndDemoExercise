<script setup lang="ts">
import { computed } from 'vue'
import type { UserLevelInfo } from '@/models/user/user_model'

const props = withDefaults(
  defineProps<{
    levelInfo: UserLevelInfo
    /** 控件大小：large（用于下拉菜单/个人中心）/default（头像下方小条）/small（更小） */
    size?: 'small' | 'default' | 'large'
    /** 是否显示右侧「当前经验 / 下一级经验」文本 */
    showText?: boolean
  }>(),
  {
    size: 'default',
    showText: true,
  }
)

/**
 * 尺寸映射表（B 站风格：LV 徽章 + 进度条 + 文本）
 * - height：整体高度（包含徽章、进度条轨道）
 * - badgeWidth：LV 徽章矩形部分宽度（不含箭头尖端）
 * - arrowWidth：徽章右向箭头尖端宽度（视觉上像被进度条吞入）
 * - textSize：右侧「当前/下一级」字号
 */
const sizeMap = {
  small: { height: 16, badgeWidth: 36, arrowWidth: 8, fontSize: 11, textSize: 11 },
  default: { height: 20, badgeWidth: 46, arrowWidth: 10, fontSize: 12, textSize: 12 },
  large: { height: 26, badgeWidth: 56, arrowWidth: 12, fontSize: 14, textSize: 13 },
}

const currentSize = computed(() => sizeMap[props.size])

const currentLevel = computed(() => {
  const lv = Number(props.levelInfo?.current_level)
  if (Number.isNaN(lv)) return 0
  return Math.min(Math.max(lv, 0), 6)
})

/** 等级对应的 Tailwind 类（bg-渐变 + fill-水平渐变 + track-轨道 + arrow-尖端） */
const levelClass = computed(() => ({
  bg: `bili-level-bg-${currentLevel.value}`,
  fill: `bili-level-fill-${currentLevel.value}`,
  arrow: `bili-level-arrow-${currentLevel.value}`,
  track: `bili-level-track-${currentLevel.value}`,
}))

/** 当前等级相对下一级经验的进度（百分比），满级为 100 */
const progressPercent = computed(() => {
  const info = props.levelInfo
  if (!info) return 0

  // 满级 / 下一级经验为 '--'（B 站对最高等级的约定）
  if (info.next_exp === '--' || info.next_exp == null) return 100

  const currentExpNum = Number(info.current_exp)
  const currentMinNum = Number(info.current_min)
  const nextExpNum = Number(info.next_exp)

  if (Number.isNaN(currentExpNum) || Number.isNaN(currentMinNum) || Number.isNaN(nextExpNum)) {
    return 0
  }
  const levelExpRange = nextExpNum - currentMinNum
  if (levelExpRange <= 0) return 100
  const currentLevelExp = currentExpNum - currentMinNum
  const percent = (currentLevelExp / levelExpRange) * 100
  return Math.min(Math.max(percent, 0), 100)
})

/**
 * 进度条填充宽度计算：
 * - 进度条整体宽度 = 100%（flex-1 占据除徽章 + 文本外的剩余宽度）
 * - 徽章宽度（含箭头尖端）= badgeWidth + arrowWidth
 * - 因为徽章是 fixed 宽度不在 flex-1 内，进度条 fill 直接按百分比走即可
 */
const fillWidth = computed(() => `${progressPercent.value}%`)

const currentExpText = computed(() => {
  const v = props.levelInfo?.current_exp
  return v == null ? '0' : String(v)
})

const nextExpText = computed(() => {
  const v = props.levelInfo?.next_exp
  return v == null || v === '--' ? '--' : String(v)
})

const isMaxLevel = computed(
  () => props.levelInfo?.next_exp === '--' || props.levelInfo?.next_exp == null
)
</script>

<template>
  <div class="bili-exp-bar flex items-center w-full">
    <!-- 左侧：LV 徽章（带右向箭头尖端），与进度条同色，营造「嵌入进度条」的视觉 -->
    <div
      class="bili-exp-bar__lv relative flex items-center justify-center text-white font-bold shrink-0 select-none rounded-l-sm overflow-hidden"
      :class="levelClass.bg"
      :style="{
        height: `${currentSize.height}px`,
        width: `${currentSize.badgeWidth}px`,
        fontSize: `${currentSize.fontSize}px`,
      }"
    >
      <span class="bili-exp-bar__lv-text relative z-10 tracking-tight">
        LV{{ currentLevel }}
      </span>
    </div>

    <!-- 箭头尖端（在徽章和进度条之间，让 LV 徽章看起来像被进度条吞入） -->
    <span
      class="bili-exp-bar__lv-arrow shrink-0 -ml-px"
      :class="levelClass.arrow"
      :style="{
        height: `${currentSize.height}px`,
        width: `${currentSize.arrowWidth}px`,
        clipPath: 'polygon(0 0, 100% 50%, 0 100%)',
      }"
    />

    <!-- 中间：进度条（轨道 + 填充），与徽章同色系 -->
    <div
      class="bili-exp-bar__track relative flex-1 overflow-hidden rounded-r-sm"
      :class="levelClass.track"
      :style="{ height: `${currentSize.height}px` }"
    >
      <div
        class="bili-exp-bar__fill h-full transition-all duration-300 ease-in-out"
        :class="levelClass.fill"
        :style="{ width: fillWidth }"
      />
    </div>

    <!-- 右侧：当前经验 / 下一级经验 -->
    <div
      v-if="showText"
      class="bili-exp-bar__text whitespace-nowrap text-text-secondary ml-2"
      :style="{ fontSize: `${currentSize.textSize}px` }"
    >
      <template v-if="isMaxLevel">
        {{ currentExpText }} / 满级
      </template>
      <template v-else>
        {{ currentExpText }} / {{ nextExpText }}
      </template>
    </div>
  </div>
</template>