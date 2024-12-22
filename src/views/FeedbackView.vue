<script setup lang="ts">
import Placeholder from '@/components/opus-detail/RightPannel/PannelItems/Placeholder.vue'
import comment_section from '@/components/communicate_list/comment_section.vue'
import { ref } from 'vue'
import type { CommentSectionBaseInfo } from '@/models/communication/comment_model.ts'

const placeholder_props = ref({
  inner_text: '璞熤和AC站比较厉害，数据均采集自互联网公开内容',
  is_show: true
})

const comment_section_base_info = ref<CommentSectionBaseInfo>({ oid: 2, type: 1 })
</script>

<template>
  <div class="container">
    <div class="feedback-section-wrap">
      <div class="link-wrap">
        <el-tooltip content="点击跳转大佬空间" placement="bottom-end">
          <el-link
            type="primary"
            href="https://space.bilibili.com/4265321"
            target="_blank"
            rel="noreferrer"
          >
            <Placeholder v-model="placeholder_props"></Placeholder>
          </el-link>
        </el-tooltip>
      </div>
      <comment_section v-model:comment_section_base_info="comment_section_base_info" />
    </div>
  </div>
</template>

<style scoped>
.container {
  background-color: #ffffff;
  overflow-y: scroll;
}

.container::-webkit-scrollbar {
  display: none;
}

.link-wrap {
  margin-top: 1rem;
  width: 100%;
  display: flex;
  justify-content: center;
}

.feedback-section-wrap {
  display: flex;
  gap: 1rem;
  flex-direction: column;
  align-items: center;
  height: fit-content;
  padding-bottom: 5rem;
  margin: 0 auto;
}

:deep(.placeholder) {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  position: unset;
  left: unset;
  top: unset;
  transform: unset;
}
</style>
