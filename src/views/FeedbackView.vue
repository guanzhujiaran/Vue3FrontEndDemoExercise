<script setup lang="ts">
import BiliPageHeader from '@/components/CommonCompo/Bili-Container-Compo/BiliPageHeader.vue'
import comment_section from '@/components/communicate_list/comment_section.vue'
import { ref } from 'vue'
import type { CommentSectionBaseInfo } from '@/models/api/communication/comment_model.ts'

const comment_section_base_info = ref<CommentSectionBaseInfo>({ oid: 2, type: 1 })
</script>

<template>
  <FlexContainer class="bg-bg p-4">
    <BiliPageHeader title="反馈区" description="提交问题反馈和建议" />
    <div class="flex w-full justify-center">
      <el-tooltip content="点击跳转大佬空间" placement="bottom-end">
        <el-link
          type="primary"
          href="https://space.bilibili.com/4265321"
          target="_blank"
          rel="noreferrer"
        >
          <el-text class="text-center text-sm text-text-regular" tag="div">璞熤和AC站比较厉害，数据均采集自互联网公开内容</el-text>
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
