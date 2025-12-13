<script setup lang="ts">
import { computed } from 'vue'
import type { SpuInfoType } from '@/gql/samsclub/graphql.ts'
import { useTimeAgo } from '@vueuse/core'
import { Calendar } from '@element-plus/icons-vue'
import { formatDateTime, getTimeAgo } from '../utils'

const props = defineProps<{
  spuInfo: SpuInfoType
}>()

const image_list = computed(() => {
  if (!props.spuInfo?.image) {
    return []
  }
  return [props.spuInfo.image]
})
</script>

<template>
  <div class="info-container">
    <div class="left-column">
      <div class="spu-image-container">
        <el-image
          v-if="props.spuInfo.image"
          :src="props.spuInfo.image"
          referrerpolicy="no-referrer"
          lazy
          fit="cover"
          class="spu-image"
          :preview-src-list="image_list"
          :preview-teleported="true"
        />
        <div v-else class="no-image">暂无图片</div>
      </div>
      <!-- 添加商品副标题显示 -->
      <el-text v-if="props.spuInfo?.subTitle" class="spu-subtitle" type="info" size="small">{{
        props.spuInfo?.subTitle
      }}</el-text>
    </div>
  </div>
</template>

<style scoped>
@import '@/assets/components/samsclub/spu-item-tailwind.css';
</style>
