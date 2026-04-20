<script setup lang="ts">
import { ElNotification } from 'element-plus'
import { onMounted } from 'vue'

const open = () => {
  ElNotification({
    title: '通知',
    message: '有事联系 guanzhujiaran2022@163.com',
    duration: 3e3
  })
}
onMounted(() => {
  open()
})
</script>

<template>
  <!-- 赞助商通知组件 -->
</template>