<script setup lang="ts">
import comment_section from '@/components/communicate_list/comment_section.vue'
import { ref } from 'vue'
import type { CommentSectionBaseInfo } from '@/models/api/communication/comment_model.ts'

const comment_section_base_info = ref<CommentSectionBaseInfo>({ oid: 2, type: 1 })
</script>

<template>
  <FlexContainer>
    <div class="link-wrap">
      <el-tooltip content="点击跳转大佬空间" placement="bottom-end">
        <el-link
          type="primary"
          href="https://space.bilibili.com/4265321"
          target="_blank"
          rel="noreferrer"
        >
          <div class="placeholder-text">璞熤和AC站比较厉害，数据均采集自互联网公开内容</div>
        </el-link>
      </el-tooltip>
    </div>
    <comment_section
      :sort_by="'time'"
      v-model:comment_section_base_info="comment_section_base_info"
    />
    <ScrollButtons></ScrollButtons>
  </FlexContainer>
</template>

<style scoped>
.link-wrap {
  margin-top: 1rem;
  width: 100%;
  display: flex;
  justify-content: center;
}

.placeholder-text {
  padding: 1rem;
  text-align: center;
  color: var(--el-text-color-regular);
  font-size: 14px;
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
