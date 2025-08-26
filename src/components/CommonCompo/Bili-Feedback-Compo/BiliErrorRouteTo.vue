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
import { type BiliErrorDetailType, BiliErrorRouteToTxt } from '@/assets/text/BiliErrorTxt.ts'

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
  import.meta.env.VITE_BILI_ENV === 'dev' ? null : startCountdown()
})
onBeforeUnmount(() => {
  clearInterval(timer)
})
withDefaults(
  defineProps<{
    props: BiliErrorDetailType
  }>(),
  {
    props: () => BiliErrorRouteToTxt.unknown
  }
)
</script>

<template>
  <div class="error-content">
    <el-image :src="props.error_img_src" referrerpolicy="no-referrer"> </el-image>
    <h2 class="error-message">{{ props.error_msg }}</h2>
    <p class="error-description">{{ props.error_description }}</p>
    <div class="countdown-container">
      <p class="countdown-text">{{ countdown }}秒后自动跳转到首页</p>
      <router-link :to="props.route_link">
        <el-button type="primary">{{ props.btn_text }}</el-button>
      </router-link>
    </div>
  </div>
</template>

<style scoped>
.error-content {
  justify-self: center;
  align-self: center;
  text-align: center;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  max-width: 500px;
  width: -webkit-fill-available;
  margin: 0 auto;
  background-color: var(--el-bg-color);
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
