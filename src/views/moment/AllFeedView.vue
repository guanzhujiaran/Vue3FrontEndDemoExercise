<template>
  <div class="all-feed h-full flex flex-col">
    <MomentFeedList ref="feedRef" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import MomentFeedList from '@/components/moment/MomentFeedList.vue'

defineOptions({ name: 'AllFeedView' })

// 保留原 AllFeedView 对外暴露的 refresh（供父布局刷新推荐流）
const feedRef = ref<InstanceType<typeof MomentFeedList> | null>(null)
defineExpose({ refresh: () => feedRef.value?.refresh() })
</script>
