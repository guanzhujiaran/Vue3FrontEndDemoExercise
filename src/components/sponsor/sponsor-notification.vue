<script setup lang="ts">
import { ElNotification } from 'element-plus'

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

<template></template>

<style scoped></style>
