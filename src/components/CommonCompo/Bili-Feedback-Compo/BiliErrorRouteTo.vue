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
let timer: number | undefined | ReturnType<typeof setInterval>

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
  if (timer) clearInterval(timer)
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
  <centered-container class="error-content">
    <div class="error-image-wrapper">
      <el-image :src="props.error_img_src" referrerpolicy="no-referrer" class="error-image"> </el-image>
    </div>
    <h2 class="error-message">{{ props.error_msg }}</h2>
    <p class="error-description">{{ props.error_description }}</p>
    <div class="countdown-container">
      <p class="countdown-text">{{ countdown }}秒后自动跳转到 {{ props.route_link.name}}</p>
      <router-link :to="props.route_link">
        <el-button type="primary" size="large" round>{{ props.btn_text }}</el-button>
      </router-link>
    </div>
  </centered-container>
</template>

<style scoped>
.error-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: 40px 20px;
}

.error-image-wrapper {
  margin-bottom: 24px;
  animation: float 3s ease-in-out infinite;
}

.error-image {
  max-width: 320px;
  width: 100%;
  height: auto;
  filter: drop-shadow(0 8px 24px rgba(64, 158, 255, 0.15));
}

.error-message {
  font-size: 28px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0 0 12px 0;
  letter-spacing: 1px;
}

.error-description {
  font-size: 16px;
  color: var(--el-text-color-secondary);
  margin: 0 0 32px 0;
  line-height: 1.6;
}

.countdown-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.countdown-text {
  font-size: 14px;
  color: var(--el-text-color-placeholder);
  margin: 0;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}
</style>
