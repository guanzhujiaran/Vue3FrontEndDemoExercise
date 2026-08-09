<!--
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2025-08-17
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2025-08-17
 * @FilePath: \Vue3FrontEndDemoExercise\src\components\CommonCompo\Bili-Feedback-Compo\BiliUnauthorizedError.vue
 * @Description: 未授权访问页面，当用户未登录时展示
-->
<script setup lang="ts">
import { ref, computed, inject, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { type BiliErrorDetailType, BiliErrorRouteToTxt } from '@/assets/text/BiliErrorTxt.ts'
import { openGlobalLoginModalKey, type openGlobalLoginModal as OpenGlobalLoginModalType } from '@/models/inject/inject_type.ts'

const router = useRouter()
const openGlobalLoginModal = inject<OpenGlobalLoginModalType>(openGlobalLoginModalKey)

const props = withDefaults(
  defineProps<{
    detail: BiliErrorDetailType
  }>(),
  {
    detail: () => BiliErrorRouteToTxt.unknown
  }
)

// 登录类错误：不强制倒计时跳转，而是提供登录入口
const isLoginAction = computed(() => props.detail.action === 'login')

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

// 组件挂载时启动倒计时（仅 route 类错误）
onMounted(() => {
  if (!isLoginAction.value && import.meta.env.VITE_BILI_ENV !== 'dev') {
    startCountdown()
  }
})
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})

const onLoginClick = () => {
  openGlobalLoginModal?.()
}
</script>

<template>
  <centered-container class="flex flex-col items-center justify-center min-h-[60vh] py-10 px-5 text-center">
    <div class="mb-6 animate-float">
      <el-image
        :src="props.detail.error_img_src"
        referrerpolicy="no-referrer"
        class="max-w-[70vw] w-full h-auto drop-shadow-[0_8px_24px_rgba(64,158,255,0.15)]"
      />
    </div>
    <h2 class="text-[28px] font-semibold text-text-primary m-0 mb-3 tracking-wide text-center">
      {{ props.detail.error_msg }}
    </h2>
    <p class="text-base text-text-secondary m-0 mb-8 leading-normal text-center">
      {{ props.detail.error_description }}
    </p>
    <div class="flex flex-col items-center gap-4">
      <p
        v-if="!isLoginAction"
        class="text-sm text-text-placeholder m-0 text-center"
      >
        {{ countdown }}秒后自动跳转到 {{ props.detail.route_link?.name }}
      </p>
      <router-link v-if="!isLoginAction" :to="props.detail.route_link!">
        <el-button type="primary" size="large" round>{{ props.detail.btn_text }}</el-button>
      </router-link>
      <el-button
        v-else
        type="primary"
        size="large"
        round
        @click="onLoginClick"
      >
        {{ props.detail.btn_text }}
      </el-button>
    </div>
  </centered-container>
</template>
