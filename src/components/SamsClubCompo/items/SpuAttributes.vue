<script setup lang="ts">
import type { SpuInfoType } from '@/gql/samsclub/graphql.ts'

defineProps<{
  spuInfo: SpuInfoType
}>()
</script>

<template>
  <el-collapse-item
    v-if="spuInfo.unknowField?.attrInfo?.length"
    title="商品属性"
    name="attributes"
  >
    <div class="attributes-list">
      <el-tag
        v-for="attr in spuInfo.unknowField?.attrInfo"
        :key="attr.attrId"
        class="attribute-tag"
        effect="light"
        size="small"
      >
        <b>{{ attr.title }}:</b>
        <span v-for="(value, index) in attr.attrValueList" :key="index">
          {{ value.value }}{{ index < attr.attrValueList.length - 1 ? ',' : '' }}
        </span>
      </el-tag>
    </div>
  </el-collapse-item>
</template>

<style scoped>
@import '@/assets/components/samsclub/spu-item-tailwind.css';
</style>