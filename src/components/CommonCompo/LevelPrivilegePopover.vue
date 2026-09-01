<script setup lang="ts">
import { computed } from 'vue'
import { ROLE_DESCRIPTIONS, type UserRole } from '@/models/user/user_model'

const props = withDefaults(
  defineProps<{
    /** 当前等级（数字 0~6），只展示该等级的权益说明 */
    currentLevel?: number
  }>(),
  {
    currentLevel: 0,
  }
)

/** 成长等级（7 档），与 user_role_const.js 中 ROLE_DESCRIPTIONS 对齐 */
const LEVEL_ROLES: UserRole[] = [
  'level0',
  'level1',
  'level2',
  'level3',
  'level4',
  'level5',
  'level6',
]

interface LevelItem {
  level: number
  name: string
  description: string
}

const levelItems = computed<LevelItem[]>(() =>
  LEVEL_ROLES.map((role) => {
    const info = ROLE_DESCRIPTIONS[role]
    return {
      level: info.level,
      name: info.name,
      description: info.description,
    }
  })
)

const currentLevelNum = computed(() => {
  const n = Number(props.currentLevel)
  if (Number.isNaN(n)) return 0
  return Math.min(Math.max(n, 0), 6)
})

/** 仅取当前等级这一项的权益说明 */
const currentItem = computed<LevelItem>(() => {
  const item = levelItems.value.find((it) => it.level === currentLevelNum.value)
  return item ?? levelItems.value[0]
})
</script>

<template>
  <div class="level-privilege-popover flex flex-col gap-2">
    <div class="level-privilege-popover__title text-sm font-bold text-text-primary">
      等级权益说明
    </div>
    <div class="level-privilege-popover__item flex items-start gap-2 px-2 py-1.5 rounded-md bg-primary-light-9">
      <span
        class="level-privilege-popover__lv shrink-0 inline-flex items-center justify-center text-xs font-bold text-white rounded-sm w-10 h-4.5"
        :class="`bili-level-bg-${currentItem.level}`"
      >
        LV{{ currentItem.level }}
      </span>
      <div class="level-privilege-popover__info flex flex-col min-w-0">
        <span class="level-privilege-popover__name text-sm font-medium text-primary">
          {{ currentItem.name }}
        </span>
        <span class="level-privilege-popover__sub text-xs text-text-secondary leading-snug">
          {{ currentItem.description }}
        </span>
      </div>
    </div>
  </div>
</template>