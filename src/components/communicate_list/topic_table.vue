<script setup lang="ts">
import type { TopicItem } from '@/models/communication/topic_model.ts'

const topic_items = defineModel<TopicItem[]>({
  required: true
})
</script>

<template>
  <div class="topic-table">
    <el-table :data="topic_items" style="width: 100%" :fixed="true"> </el-table>
  </div>
</template>

<style scoped></style>
