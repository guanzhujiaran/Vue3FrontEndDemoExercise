<template>
  <div class="oauth-providers">
    <!-- 第三方登录按钮 -->
    <el-button
      type="primary"
      size="large"
      class="casdoor-login-button"
      :loading="loading"
      @click="handleCasdoorLogin"
    >
      <template #icon>
        <svg viewBox="0 0 1024 1024" width="1.2em" height="1.2em">
          <path fill="#1E88E5" d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm0 820c-205.4 0-372-166.6-372-372s166.6-372 372-372 372 166.6 372 372-166.6 372-372 372z"/>
          <path fill="#1E88E5" d="M512 140c-205.4 0-372 166.6-372 372s166.6 372 372 372 372-166.6 372-372-166.6-372-372-372zm0 664c-161.3 0-292-130.7-292-292s130.7-292 292-292 292 130.7 292 292-130.7 292-292 292z"/>
          <path fill="#1E88E5" d="M512 204c-169.1 0-306 136.9-306 306s136.9 306 306 306 306-136.9 306-306-136.9-306-306-306zm0 552c-135.8 0-246-110.2-246-246s110.2-246 246-246 246 110.2 246 246-110.2 246-246 246z"/>
          <path fill="#1E88E5" d="M512 268c-134.6 0-244 109.4-244 244s109.4 244 244 244 244-109.4 244-244-109.4-244-244-244zm0 448c-112.8 0-204-91.2-204-204s91.2-204 204-204 204 91.2 204 204-91.2 204-204 204z"/>
          <path fill="#1E88E5" d="M512 332c-99.4 0-180 80.6-180 180s80.6 180 180 180 180-80.6 180-180-80.6-180-180-180zm0 320c-77.2 0-140-62.8-140-140s62.8-140 140-140 140 62.8 140 140-62.8 140-140 140z"/>
        </svg>
      </template>
      第三方登录
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import biliMessage from '@/utils/message'
import { useCasdoor } from 'casdoor-vue-sdk'
import { useJwtStore } from '@/stores/jwt_token'

const emit = defineEmits(['login-success'])

const loading = ref(false)
const { getSigninUrl } = useCasdoor()

// 使用第三方登录
const handleCasdoorLogin = () => {
  try {
    loading.value = true
    // 使用 SDK 获取登录 URL 并跳转
    window.location.href = getSigninUrl()
  } catch (error) {
    console.error('第三方登录失败:', error)
    biliMessage.error(`第三方登录失败: ${(error as Error).message}`)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.oauth-providers {
  width: 100%;
  padding: 20px;
}

.casdoor-login-button {
  width: 100%;
  height: 48px;
  font-size: 15px;
  border-radius: 8px;
  background: linear-gradient(135deg, #1E88E5 0%, #1565C0 100%);
  border: none;
  color: white;
  transition: all 0.3s ease;
}

.casdoor-login-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(30, 136, 229, 0.4);
}
</style>
