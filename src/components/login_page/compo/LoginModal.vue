<script setup lang="ts">
import { ref, watch } from 'vue'
import biliMessage from '@/utils/message'
import LoginCompo from './LoginCompo.vue'
import emitter from '@/utils/mitt'

const dialogVisible = ref(false)
const STORAGE_KEY = 'login_modal_first_open_shown'
const hasShownFirstTip = ref<boolean>(false)

// 检查是否已经显示过首次提示
const checkFirstOpen = () => {
  const shown = localStorage.getItem(STORAGE_KEY)
  return shown === 'true'
}

// 显示首次提示
const showFirstOpenTip = () => {
  if (!checkFirstOpen()) {
    hasShownFirstTip.value = true
    setTimeout(() => {
      biliMessage.warning('⚠️ 当前禁止注册新账号,仅支持 Gitee 登录')
      localStorage.setItem(STORAGE_KEY, 'true')
    }, 500)
  }
}

// 提供给外部的打开方法
const openLoginModal = () => {
  dialogVisible.value = true
  showFirstOpenTip()
}

// 关闭模态框
const closeLoginModal = () => {
  dialogVisible.value = false
}

// 处理登录成功事件
const handleLoginSuccess = () => {
  // 登录成功后关闭模态框
  closeLoginModal()
  // 刷新页面
  window.location.reload()
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
    :lock-scroll="true"
    @close="closeLoginModal"
    :destroy-on-close="true"
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
  margin-top: calc(var(--component-spacing) * 0.5);
}
</style>
