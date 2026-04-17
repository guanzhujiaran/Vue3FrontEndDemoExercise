<script setup lang="ts">
import type { SpuInfoType } from '@/gql/samsclub/graphql.ts'
import { formatDateTime, getTimeAgo, handleSpuInfoTagType } from '../utils'

defineProps<{
  spuInfo: SpuInfoType
}>()
</script>

<template>
  <el-collapse-item v-if="spuInfo.newTagInfos?.length" title="商品标签" name="tags">
    <div class="tags-container">
      <el-tooltip
        v-for="tag in spuInfo.newTagInfos"
        :key="tag.pk"
        placement="top"
        effect="light"
      >
        <template #content>
          <el-descriptions size="large" border>
            <el-descriptions-item label="有效时间段" v-if="tag.beginTime && tag.endTime">
              <el-tooltip :content="formatDateTime(tag.beginTime)" placement="top">
                <span>{{ getTimeAgo(tag.beginTime) }}</span>
              </el-tooltip>
              ~
              <el-tooltip :content="formatDateTime(tag.endTime)" placement="top">
                <span>{{ getTimeAgo(tag.endTime) }}</span>
              </el-tooltip>
            </el-descriptions-item>
            <el-descriptions-item label="标签更新时间">
              <el-tooltip :content="formatDateTime(tag.updateTime)" placement="top">
                <span>{{ getTimeAgo(tag.updateTime) }}</span>
              </el-tooltip>
            </el-descriptions-item>
            <el-descriptions-item label="标签代码">
              {{ tag.tagMark }}
            </el-descriptions-item>
          </el-descriptions>
        </template>
        <el-tag :type="handleSpuInfoTagType(tag.tagMark!)" effect="plain" class="info-tag">
          {{ tag.title }}
        </el-tag>
      </el-tooltip>
    </div>
  </el-collapse-item>
</template>



