<script setup lang="ts">
import type { TopicItem } from '@/models/communication/topic_model.ts'

const topic_items = defineModel<TopicItem[]>()


</script>

<template>
  <div class="topic-table">
    <el-table-v2 :data="topic_items" style="width: 100%" :fixed="true">
      
    </el-table-v2>
  </div>
</template>

<style scoped>

</style>