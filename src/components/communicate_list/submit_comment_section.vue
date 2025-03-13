<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import BiliVditorEdit from '@/components/CommonCompo/Bili-Markdown-Compo/BiliVditorEdit.vue'
import { useDebounceFn } from '@vueuse/core'

const is_valid = ref(false)
const is_loading = ref(true)
const biliVditorEditRef = useTemplateRef('biliVditorEdit')
const props = defineProps({
  submit_comment: {
    type: Function,
    required: true
  },
  placeholder: {
    type: String,
    default: ''
  }
})
const handle_btn_click = useDebounceFn(async () => {
  is_submitting.value = true
  if (await props.submit_comment()) biliVditorEditRef.value?.setValue('', true)
  is_submitting.value = false
}, 1e3)
const is_submitting = ref(false)
const comment_content = defineModel<string>('comment_content')
</script>

<template>
  <el-card
    class="submit-comment-section"
    shadow="hover"
    :body-style="{
      'padding-top': '0.5rem',
      'padding-bottom': '0.5rem',
      padding: 'unset'
    }"
    v-loading="is_loading || is_submitting"
  >
    <BiliVditorEdit
      ref="biliVditorEdit"
      class="markdown-editor"
      v-model="comment_content"
      v-model:is_loading="is_loading"
      v-model:placeholder="props.placeholder"
      v-model:is_valid="is_valid"
    />
    <el-button :disabled="!is_valid" class="submit-btn" type="primary" @click="handle_btn_click"
      >发送
    </el-button>
  </el-card>
</template>

<style scoped>
.markdown-editor {
  min-height: 5rem;
  transition: height 1s ease; /* 平滑过渡效果 */
}

.submit-btn {
  float: right;
  margin: 0.3rem 0.3rem 0.1rem 0;
}

.submit-comment-section {
  background: #ffffff;
  min-width: fit-content;
}
</style>
