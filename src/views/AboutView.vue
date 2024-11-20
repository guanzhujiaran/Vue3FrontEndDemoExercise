<script setup lang="ts">
import Placeholder from '@/components/opus-detail/RightPannel/PannelItems/Placeholder.vue';
import { ref } from 'vue';
const placeholder_props = ref({
  inner_text: "璞熤和AC站比较厉害，数据均采集自互联网公开内容",
  is_show: true
}
)
</script>

<template>
  <div class="container" style="background-color:#FFFFFF;">
    <div class="link-wrap" style="position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);">
      <el-tooltip content="点击跳转大佬空间">
        <el-link type="primary" href="https://space.bilibili.com/4265321" target="_blank">
          <Placeholder v-model="placeholder_props"></Placeholder>
        </el-link>
      </el-tooltip>

    </div>

  </div>

</template>

<style scoped></style>
