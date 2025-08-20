<script setup lang="ts">
import { ref } from 'vue'
import LoginCompo from './LoginCompo.vue'
import emitter from '@/utils/mitt'

const dialogVisible = ref(false)

// 提供给外部的打开方法
const openLoginModal = () => {
  dialogVisible.value = true
}

// 关闭模态框
const closeLoginModal = () => {
  dialogVisible.value = false
}

// 处理登录成功事件
const handleLoginSuccess = () => {
  // 登录成功后关闭模态框
  closeLoginModal()
  // 可以在这里添加其他登录成功后的操作
}

// 暴露方法给父组件
defineExpose({
  openLoginModal
})

// 监听全局事件触发登录模态框
emitter.on('needLogin', () => {
  openLoginModal()
})
</script>

<template>
  <el-dialog
    v-model="dialogVisible"
    title="登录"
    width="500px"
    :show-close="true"
    :close-on-click-modal="true"
    :close-on-press-escape="true"
    :lock-scroll="false"
    @close="closeLoginModal"
  >
    <LoginCompo :is-modal="true" @login-success="handleLoginSuccess" />
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="closeLoginModal">关闭</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}
</style>
