<script setup lang="ts">
import LevelIcon0 from '@/components/icons/LevelIcon0.vue'
import LevelIcon1 from '@/components/icons/LevelIcon1.vue'
import LevelIcon2 from '@/components/icons/LevelIcon2.vue'
import LevelIcon3 from '@/components/icons/LevelIcon3.vue'
import LevelIcon4 from '@/components/icons/LevelIcon4.vue'
import LevelIcon5 from '@/components/icons/LevelIcon5.vue'
import LevelIcon6 from '@/components/icons/LevelIcon6.vue'

const props = defineProps<{
  level: number
}>()

const levelIcons = {
  0: LevelIcon0,
  1: LevelIcon1,
  2: LevelIcon2,
  3: LevelIcon3,
  4: LevelIcon4,
  5: LevelIcon5,
  6: LevelIcon6
}

const getCurrentLevelIcon = () => {
  const index = Math.min(Math.max(props.level, 0), 6)
  return levelIcons[index as keyof typeof levelIcons]
}
</script>

<template>
  <div class="inline-flex items-center leading-none">
    <component :is="getCurrentLevelIcon()" />
  </div>
</template>


