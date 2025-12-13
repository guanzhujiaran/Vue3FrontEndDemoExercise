<script setup lang="ts">
import type { SpuInfoType } from '@/gql/samsclub/graphql.ts'
import { computed } from 'vue'

const props = defineProps<{
  spuInfo: SpuInfoType
}>()

// 检查是否有销售信息
const hasSalesInfo = computed(() => {
  const unknowField = props.spuInfo.unknowField || {}
  return (
    unknowField.monthSales !== undefined ||
    unknowField.stockNum !== undefined ||
    unknowField.commentCount !== undefined ||
    unknowField.rebuyCount !== undefined
  )
})
</script>

<template>
  <el-collapse-item v-if="hasSalesInfo" title="销售信息" name="sales">
    <el-descriptions :column="1" border size="small">
      <el-descriptions-item
        v-if="spuInfo.unknowField?.monthSales !== undefined"
        label="月销量"
      >
        {{ spuInfo.unknowField.monthSales }}
      </el-descriptions-item>
      <el-descriptions-item
        v-if="spuInfo.unknowField?.stockNum !== undefined"
        label="库存"
      >
        {{ spuInfo.unknowField.stockNum }}
      </el-descriptions-item>
      <el-descriptions-item
        v-if="spuInfo.unknowField?.commentCount !== undefined"
        label="评论数"
      >
        {{ spuInfo.unknowField.commentCount }}
      </el-descriptions-item>
      <el-descriptions-item
        v-if="spuInfo.unknowField?.rebuyCount !== undefined"
        label="复购次数"
      >
        {{ spuInfo.unknowField.rebuyCount }}
      </el-descriptions-item>
    </el-descriptions>
  </el-collapse-item>
</template>

<style scoped>
@import '@/assets/components/samsclub/spu-item-tailwind.css';
</style>