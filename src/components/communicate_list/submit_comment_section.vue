<script setup lang="ts">
import { ref, useTemplateRef, computed } from 'vue'
import { useUserNavStore } from '@/stores/user_nav.ts'
import { BiliImg } from '@/assets/img/BiliImg.ts'
import { useDebounceFn } from '@vueuse/core'

const { user_nav } = useUserNavStore()
const userAvatar = computed(() => user_nav.face || BiliImg.face.noface)

const is_valid = ref(false)
const is_loading = ref(true)
const textareaRef = useTemplateRef('textareaRef')
const props = defineProps({
  submit_comment: {
    type: Function,
    required: true
  },
  placeholder: {
    type: String,
    default: '发一条友善的评论'
  }
})
const handle_btn_click = useDebounceFn(async () => {
  is_submitting.value = true
  if (await props.submit_comment()) {
    comment_content.value = ''
    is_valid.value = false
  }
  is_submitting.value = false
}, 1e3)
const is_submitting = ref(false)
const comment_content = defineModel<string>('comment_content')

const handleInput = () => {
  is_valid.value = (comment_content.value?.trim()?.length || 0) > 0
}
</script>

<template>
  <div class="bili-submit-wrap flex gap-3 w-full" v-loading="is_submitting">
    <!-- 左侧头像 -->
    <el-avatar :size="40" class="shrink-0">
      <img :src="userAvatar" referrerpolicy="no-referrer" alt="头像" />
    </el-avatar>
    
    <!-- 右侧输入区 -->
    <div class="flex-1 flex flex-col gap-2">
      <div class="relative">
        <textarea
          ref="textareaRef"
          v-model="comment_content"
          :placeholder="props.placeholder"
          @input="handleInput"
          class="w-full min-h-[40px] px-3 py-2 rounded-md bg-bg-secondary border border-border-light text-sm text-text-primary placeholder-text-placeholder outline-none transition-all duration-200 resize-none"
          :class="{ 'border-primary! ring-1 ring-primary/30': is_valid, 'hover:border-primary/50 focus:border-primary focus:ring-1 focus:ring-primary/30': !is_valid }"
          rows="2"
        ></textarea>
        <span class="absolute right-2 bottom-1 text-xs text-text-placeholder">{{ (comment_content?.length || 0) }}/4096</span>
      </div>
      <div class="flex items-center justify-end gap-2">
        <span class="text-xs text-text-placeholder mr-auto">Ctrl+Enter 发送</span>
        <el-button
          :disabled="!is_valid"
          size="small"
          type="primary"
          @click="handle_btn_click"
          class="send-btn"
        >
          发表评论
        </el-button>
      </div>
    </div>
  </div>
</template>
