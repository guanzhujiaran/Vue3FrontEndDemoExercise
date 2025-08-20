<!--
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2025-08-17
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2025-08-17
 * @FilePath: \Vue3FrontEndDemoExercise\src\components\CommonCompo\Bili-Feedback-Compo\BiliUnauthorizedError.vue
 * @Description: 未授权访问页面，当用户未登录时展示
-->
<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { BiliImg } from '@/assets/img/BiliImg.ts'

const router = useRouter()
const countdown = ref(10)
let timer: number | undefined

// 倒计时函数
const startCountdown = () => {
  timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(timer)
      router.push('/')
    }
  }, 1000)
}

// 组件挂载时启动倒计时
onMounted(() => {
  startCountdown()
})

// 组件卸载前清除定时器
onBeforeUnmount(() => {
  if (timer) {
    clearInterval(timer)
  }
})

// 立即跳转到首页
const goHome = () => {
  if (timer) {
    clearInterval(timer)
  }
  router.push('/')
}
onBeforeUnmount(() => {
  clearInterval(timer)
})
</script>

<template>
  <div class="unauthorized-content">
    <el-image :src="BiliImg.error.un_authorized" referrerpolicy="no-referrer"> </el-image>
    <h2 class="error-message">未授权访问</h2>
    <p class="error-description">抱歉，您需要登录后才能访问此页面</p>
    <div class="countdown-container">
      <p class="countdown-text">{{ countdown }}秒后自动跳转到首页</p>
      <el-button type="primary" @click="goHome">立即返回首页</el-button>
    </div>
  </div>
</template>

<style scoped>
.unauthorized-content {
  justify-self: center;
  align-self: center;
  text-align: center;
  padding: 2rem;
  border-radius: 8px;
  background-color: var(--el-bg-color);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  max-width: 500px;
  width: 100%;
  margin: 0 auto;
}

.error-message {
  font-size: 2rem;
  color: var(--el-text-color-regular);
  margin: 1rem 0;
}

.error-description {
  font-size: 1rem;
  color: var(--el-text-color-secondary);
  margin-bottom: 2rem;
}

.countdown-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.countdown-text {
  font-size: 1rem;
  color: var(--el-text-color-primary);
}
</style>
