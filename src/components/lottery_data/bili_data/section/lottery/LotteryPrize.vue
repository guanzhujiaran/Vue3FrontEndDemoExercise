<script setup lang="ts">
import type { LotteryPrize } from '@/models/api/lottery/lottery_card.ts'
import utils from '@/utils/mixin.ts'
import { ref } from 'vue'

const { prizes } = defineProps<{ prizes: LotteryPrize[] }>()

const formatPrizeCount = (count: number | null) => {
  if (count === null || count === undefined || count <= 0) {
    return '待公布'
  }
  return `${count} 份`
}

const imageViewerVisible = ref(false)
const currentImage = ref('')
const handleImageClick = (imageUrl: string) => {
  if (imageUrl) {
    currentImage.value = imageUrl
    imageViewerVisible.value = true
  }
}
</script>

<template>
  <section class="rounded-lg border border-border-light bg-fill-lighter p-4">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="space-y-1">
        <p class="text-sm font-semibold text-text-primary">
          <span class="flex items-center gap-1">
            <slot name="title">奖品列表</slot>
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
              <div class="text-xs">按奖项顺序展示当前可见奖品信息。</div>
            </el-popover>
          </span>
        </p>
      </div>
      <span class="rounded-full bg-bg px-3 py-1 text-xs font-medium text-text-secondary">
        {{ prizes.length }} 档
      </span>
    </div>

    <div class="mt-3 flex gap-4 justify-center">
      <div
        v-for="(prize, index) in prizes"
        :key="`${prize.description}-${index}`"
        class="flex flex-col items-center gap-2"
        :style="{ width: `${100 / prizes.length}%`, maxWidth: '150px' }"
      >
        <div class="flex items-center justify-center w-16 h-16 rounded-lg border border-border-light bg-bg cursor-pointer relative"
             @click="handleImageClick(prize.img)">
          <el-image
            v-if="prize.img"
            :src="prize.img"
            fit="contain"
            class="w-full h-full"
            referrerpolicy="no-referrer"
          />
          <svg v-else xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-primary">
            <rect x="3" y="8" width="18" height="4" rx="1"></rect>
            <path d="M12 8v13"></path>
            <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"></path>
            <path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5a2.5 2.5 0 0 1 0 5"></path>
          </svg>

        </div>
        <div class="text-center">
          <p class="text-sm font-semibold text-text-primary mb-1">{{ utils.arabicToChinese(index + 1) }}等奖</p>
          <p class="text-sm text-text-primary mb-1 break-words">{{ prize.description }}</p>
          <p class="text-xs text-text-secondary">{{ formatPrizeCount(prize.count) }}</p>
        </div>
      </div>
    </div>

    <el-image-viewer
      v-if="imageViewerVisible"
      :url-list="[currentImage]"
      @close="imageViewerVisible = false"
      :referrer-policy="'no-referrer'"
    />


  </section>
</template>




