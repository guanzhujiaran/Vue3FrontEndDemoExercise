<script setup lang="ts">
import { computed } from 'vue'
import type { UserLevelInfo } from '@/models/user/user_model'

const props = defineProps<{
  levelInfo: UserLevelInfo
  size?: 'small' | 'default' | 'large'
}>()

const sizeMap = {
  small: { height: 4, fontSize: 10 },
  default: { height: 6, fontSize: 12 },
  large: { height: 8, fontSize: 14 }
}

const currentSize = computed(() => sizeMap[props.size || 'default'])

// 计算经验进度百分比
const progressPercent = computed(() => {
  const { current_exp, current_min, next_exp } = props.levelInfo

  // 如果已经是最高等级，显示满进度
  if (typeof next_exp === 'string' || next_exp === '--') {
    return 100
  }

  // 转换为数值
  const currentExpNum = Number(current_exp)
  const currentMinNum = Number(current_min)
  const nextExpNum = Number(next_exp)

  // 计算当前等级的经验范围
  const levelExpRange = nextExpNum - currentMinNum
  const currentLevelExp = currentExpNum - currentMinNum

  // 计算百分比
  const percent = (currentLevelExp / levelExpRange) * 100
  return Math.min(Math.max(percent, 0), 100)
})

// 计算经验进度条的宽度
const progressWidth = computed(() => `${progressPercent.value}%`)

// 格式化经验值显示
const expText = computed(() => {
  const { current_exp, next_exp } = props.levelInfo

  if (typeof next_exp === 'string' || next_exp === '--') {
    return `${current_exp}`
  }

  return `${current_exp} / ${next_exp}`
})
</script>

<template>
  <div class="w-full mt-1 flex items-center gap-2" :style="{ height: `${currentSize.height}px` }">
    <div
      class="flex-1 h-full bg-black/10 rounded-[var(--size-radius-base)] overflow-hidden relative exp-bar-bg dark:bg-white/10 ">
      <div
        class="h-full rounded-[var(--size-radius-base)] transition-[width] duration-300 ease-in-out bg-gradient-badge-success"
        :style="{ width: progressWidth }"></div>
    </div>
    <div class="whitespace-nowrap font-medium text-text-secondary dark:text-text-regular"
      :style="{ fontSize: `${currentSize.fontSize}px` }">
      {{ expText }}
    </div>
  </div>
</template>
