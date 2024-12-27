<script setup lang="ts">
import { type PropType, ref } from 'vue'
import { KeysEnum, useInject } from '@/models/base/provide_model.ts'

const globalVars = useInject(KeysEnum.globalVars)

const my_tool_bars = ref({
  bold: true, // 粗体
  italic: true, // 斜体
  header: true, // 标题
  underline: true, // 下划线
  strikethrough: true, // 中划线
  mark: true, // 标记
  superscript: true, // 上角标
  subscript: true, // 下角标
  quote: true, // 引用
  ol: true, // 有序列表
  ul: true, // 无序列表
  link: true, // 链接
  // imagelink: true, // 图片链接
  code: true, // code
  table: true, // 表格
  fullscreen: true, // 全屏编辑
  readmodel: true, // 沉浸式阅读
  htmlcode: true, // 展示html源码
  help: true, // 帮助
  /* 1.3.5 */
  undo: true, // 上一步
  redo: true, // 下一步
  trash: true, // 清空
  // save: true, // 保存（触发events中的save事件）
  /* 1.4.2 */
  navigation: true, // 导航目录
  /* 2.1.8 */
  alignleft: true, // 左对齐
  aligncenter: true, // 居中
  alignright: true, // 右对齐
  /* 2.2.1 */
  subfield: true, // 单双栏模式
  preview: true // 预览
})
const small_screen_tool_bars = ref({
  help: true, // 帮助
  trash: true, // 清空
  preview: true // 预览
})

const props = defineProps({
  submit_comment: {
    type: Function as PropType<(evt: MouseEvent) => any>,
    required: true
  },
  placeholder: {
    type: String,
    default: ''
  }
})
const comment_content = defineModel<string>('comment_content')
</script>

<template>
  <el-card
    class="submit-comment-section"
    shadow="hover"
    body-style="padding-top:0.5rem;padding-bottom:0.5rem;padding:unset;"
  >
    <mavon-editor
      class="markdown-editor"
      :toolbars="
        (globalVars.screen_size ?? 'large') === 'large' ? my_tool_bars : small_screen_tool_bars
      "
      v-model="comment_content"
      :placeholder="props.placeholder"
      :autofocus="false"
    />
    <el-button class="submit-btn" type="primary" @click="props.submit_comment">发送</el-button>
  </el-card>
</template>

<style scoped>
.markdown-editor {
  max-height: 15rem;
  min-height: 10rem;
  min-width: 0;
  transition: height 1s ease; /* 平滑过渡效果 */
}

.submit-btn {
  float: right;
  margin: 1rem;
}

.submit-comment-section {
  background: #ffffff;
  width: 100%;
}
</style>
