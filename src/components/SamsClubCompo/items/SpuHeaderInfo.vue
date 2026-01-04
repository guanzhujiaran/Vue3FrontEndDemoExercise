<script setup lang="ts">
import type { SpuInfoType } from '@/gql/samsclub/graphql.ts'
import { formatDateTime, getTimeAgo } from '../utils'
const props = defineProps<{
  spuInfo: SpuInfoType
}>()
</script>

<template>
  <div class="spu-header-info">
    <!-- 基本属性信息直接显示 -->
    <el-descriptions
      :column="1"
      border
      size="small"
      label-class-name="label-bold"
      class="attributes-descriptions"
    >
      <el-descriptions-item label="创建时间">
        <el-tooltip
          placement="top"
          :content="formatDateTime(props.spuInfo.createTime)"
          effect="light"
        >
          <el-tag size="small" type="info" effect="plain">
            <el-icon><Calendar /></el-icon>
            {{ getTimeAgo(props.spuInfo.createTime) }}
          </el-tag>
        </el-tooltip>
      </el-descriptions-item>

      <el-descriptions-item label="更新时间">
        <el-tooltip
          placement="top"
          :content="formatDateTime(props.spuInfo.updateTime)"
          effect="light"
        >
          <el-tag size="small" type="info" effect="plain">
            <el-icon><Calendar /></el-icon>
            {{ getTimeAgo(props.spuInfo.updateTime) }}
          </el-tag>
        </el-tooltip>
      </el-descriptions-item>

      <el-descriptions-item v-if="props.spuInfo?.categories?.length" label="商品分类">
        <flex-container>
          <el-tag
            class="m-1"
            size="small"
            type="primary"
            v-for="(cate, idx) in props.spuInfo.categories"
            :key="idx"
            effect="plain"
            >{{ cate.categoryId }}</el-tag
          >
        </flex-container>
      </el-descriptions-item>

      <el-descriptions-item v-if="props.spuInfo.unknowField?.brandInfo" label="品牌">
        <el-tag effect="plain" size="small" type="warning">{{
          props.spuInfo.unknowField.brandInfo.name
        }}</el-tag>
      </el-descriptions-item>
    </el-descriptions>
  </div>
</template>

<style scoped>
@import '@/assets/components/samsclub/spu-item-tailwind.css';
</style>
