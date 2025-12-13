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
    <el-image :src="props.error_img_src" referrerpolicy="no-referrer"> </el-image>
    <h2 class="error-message">{{ props.error_msg }}</h2>
    <p class="error-description">{{ props.error_description }}</p>
    <div class="countdown-container">
      <p class="countdown-text">{{ countdown }}秒后自动跳转到 {{ props.route_link.name}}</p>
      <router-link :to="props.route_link">
        <el-button type="primary">{{ props.btn_text }}</el-button>
      </router-link>
    </div>
  </centered-container>
</template>

<style scoped>
@import '@/assets/components/feedback/bili-error-route-to-tailwind.css';
</style>
