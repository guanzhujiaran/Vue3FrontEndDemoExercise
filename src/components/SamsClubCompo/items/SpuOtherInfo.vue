<script setup lang="ts">
import type { SpuInfoType } from '@/gql/samsclub/graphql.ts'
import { computed } from 'vue'

const props = defineProps<{
  spuInfo: SpuInfoType
}>()

// 检查是否有其他信息
const hasOtherInfo = computed(() => {
  const unknowField = props.spuInfo.unknowField || {}
  return (
    unknowField.purchaseLimit !== undefined ||
    unknowField.purchaseMin !== undefined ||
    unknowField.shareCount !== undefined ||
    unknowField.memberRecommendCount !== undefined
  )
})
</script>

<template>
  <el-collapse-item v-if="hasOtherInfo" title="其他信息" name="others">
    <el-descriptions :column="1" border size="small">
      <el-descriptions-item
        v-if="spuInfo.unknowField?.purchaseLimit !== undefined"
        label="购买限制"
      >
        {{ spuInfo.unknowField.purchaseLimit }}
      </el-descriptions-item>
      <el-descriptions-item
        v-if="spuInfo.unknowField?.purchaseMin !== undefined"
        label="最小购买量"
      >
        {{ spuInfo.unknowField.purchaseMin }}
      </el-descriptions-item>
      <el-descriptions-item
        v-if="spuInfo.unknowField?.shareCount !== undefined"
        label="分享次数"
      >
        {{ spuInfo.unknowField.shareCount }}
      </el-descriptions-item>
      <el-descriptions-item
        v-if="spuInfo.unknowField?.memberRecommendCount !== undefined"
        label="会员推荐数"
      >
        {{ spuInfo.unknowField.memberRecommendCount }}
      </el-descriptions-item>
    </el-descriptions>
  </el-collapse-item>
</template>


