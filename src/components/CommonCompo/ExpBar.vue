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
  <div class="exp-bar-container" :style="{ height: `${currentSize.height}px` }">
    <div class="exp-bar-bg">
      <div class="exp-bar-fill" :style="{ width: progressWidth }"></div>
    </div>
    <div class="exp-text" :style="{ fontSize: `${currentSize.fontSize}px` }">
      {{ expText }}
    </div>
  </div>
</template>

<style scoped>
.exp-bar-container {
  width: 100%;
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.exp-bar-bg {
  flex: 1;
  height: 100%;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 3px;
  overflow: hidden;
  position: relative;
}

.exp-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #00a1d6 0%, #00d6be 100%);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.exp-text {
  white-space: nowrap;
  color: #666;
  font-weight: 500;
}

/* 暗色主题适配 */
:global(.dark) .exp-bar-bg {
  background: rgba(255, 255, 255, 0.1);
}

:global(.dark) .exp-text {
  color: #ccc;
}
</style>
