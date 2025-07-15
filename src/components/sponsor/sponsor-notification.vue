<script setup lang="ts">
const open = () => {
  ElNotification({
    title: '通知',
    message: '赞助可以通过zfb口令方式发送至 guanzhujiaran2022@163.com\n反馈信息也可以发送喵',
    duration: 3e3
  })
}
onMounted(() => {
  open()
})
</script>

<template></template>

<style scoped></style>
