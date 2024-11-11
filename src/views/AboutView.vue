<script setup lang="ts">
import Placeholder from '@/components/opus-detail/RightPannel/PannelItems/Placeholder.vue';
import { ref } from 'vue';
const placeholder_props = ref({
  inner_text: "数据均采集自互联网公开内容",
  is_show: true
}
)
</script>

<template>
  <div class="container">
    <Placeholder v-model="placeholder_props"></Placeholder>
  </div>
</template>

<style></style>
