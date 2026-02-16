<template>
  <div class="oauth-providers">
    <div v-if="!showCustomProvider" class="provider-buttons">
      <!-- Gitee -->
      <el-button
        v-if="providers.includes('gitee')"
        type="primary"
        size="large"
        class="provider-button gitee"
        :loading="loading === 'gitee'"
        @click="handleOAuthLogin('gitee')"
      >
        <template #icon>
          <svg viewBox="0 0 1024 1024" width="1.2em" height="1.2em">
            <path fill="#C71D23" d="M512 64a448 448 0 1 1 0 896 0 448 448 0 0 1 0-896z"/>
            <path fill="#FFFFFF" d="M725.3 608.2c-12.5 0-22.6-10.1-22.6-22.6v-68.2c0-12.5 10.1-22.6 22.6-22.6h68.2c12.5 0 22.6 10.1 22.6 22.6v68.2c0 12.5-10.1 22.6-22.6 22.6h-68.2z"/>
          </svg>
        </template>
        Gitee 登录
      </el-button>

      <!-- GitHub -->
      <el-button
        v-if="providers.includes('github')"
        type="default"
        size="large"
        class="provider-button github"
        :loading="loading === 'github'"
        @click="handleOAuthLogin('github')"
      >
        <template #icon>
          <svg viewBox="0 0 1024 1024" width="1.2em" height="1.2em">
            <path fill="#24292e" d="M512 42.666667A464.64 464.64 0 0 0 42.666667 502.186667 460.373333 460.373333 0 0 0 150.186666 336.213333c2.666667 23.466667 14.933333 84.48 14.933334 84.48a106.666667 106.666667 0 0 1 23.466666 3.626667c42.666667-8.533333 56.533333-37.333333 56.533334-37.333334s10.666667-41.6 10.666666-41.6a70.826667 70.826667 0 0 0-20.266666-50.133333 84.906667 84.906667 0 0 1 19.2-56.533334 128 128 0 0 0-61.866667-34.133333 8.533333 8.533333 0 0 0-3.2 10.666666 68.266667 68.266667 0 0 1 23.466667 25.6 56.533333 56.533333 0 0 1 30.933333 25.6c0 42.666667-27.733333 74.666667-27.733333 74.666667a128 128 0 0 0-83.2-23.466667 8.533333 8.533333 0 0 0-3.2 10.666667 68.266667 68.266667 0 0 1 23.466667 25.6 56.533333 56.533333 0 0 1 30.933333 25.6c0 42.666667-27.733333 74.666667-27.733333 74.666667a128 128 0 0 0-83.2-23.466667z"/>
          </svg>
        </template>
        GitHub 登录
      </el-button>

      <!-- Google -->
      <el-button
        v-if="providers.includes('google')"
        type="default"
        size="large"
        class="provider-button google"
        :loading="loading === 'google'"
        @click="handleOAuthLogin('google')"
      >
        <template #icon>
          <svg viewBox="0 0 1024 1024" width="1.2em" height="1.2em">
            <path fill="#4285F4" d="M512 256c-70.69 0-131.125 28.56-176.031 74.688L206.531 143.156C278.625 72.438 390.156 32 512 32c85.563 0 163.438 34.281 220.438 89.875L594.563 259.781C576.063 243.781 545.688 256 512 256z"/>
            <path fill="#34A853" d="M841.438 389.688c-4.5-14.156-11.469-27.625-20.375-40.25l-138 78.938a154.688 154.688 0 0 1-60.563 121.563h0.313a154.188 154.188 0 0 1-108.313-44.563h0.313l-138-78.938A154.688 154.688 0 0 1 357 434.313h0.313L512 357.313z"/>
            <path fill="#FBBC05" d="M206.531 143.156L335.969 330.688a154.188 154.188 0 0 1-44.563 108.313h0.313A154.688 154.688 0 0 1 512 768c-85.563 0-163.438-34.281-220.438-89.875l137.875-137.969z"/>
            <path fill="#EA4335" d="M841.438 634.313c-4.5 14.156-11.469 27.625-20.375 40.25l-137.875 137.969A154.188 154.188 0 0 1 512 768c85.563 0 163.438-34.281 220.438-89.875l-137.875-137.969A154.688 154.688 0 0 1 594.563 550.219L732.438 412.25z"/>
          </svg>
        </template>
        Google 登录
      </el-button>

      <!-- QQ -->
      <el-button
        v-if="providers.includes('qq')"
        type="default"
        size="large"
        class="provider-button qq"
        :loading="loading === 'qq'"
        @click="handleOAuthLogin('qq')"
      >
        <template #icon>
          <svg viewBox="0 0 1024 1024" width="1.2em" height="1.2em">
            <path fill="#12B7F5" d="M824.8 613.2c-16-51.4-34.4-94.6-62.7-127.8-13.8-16.2-28.8-29-44.6-39 2.4-11.8 4.2-24.6 5-38.4 1.6-20.2 2.2-42 1.6-65.4-1.8-65.6-18-121.4-52.4-166.2-12.4-16.6-27.6-31.2-45.2-43.8 0.4-14.2 0.2-28.6-0.8-42.8-2-33-7.2-62.4-19.8-87.6-35.6-59-94-95.8-154-160.6-154-49.8 0-95 21.2-128 56-33 34.8-54 79-56 127.6-3.8 16-6.8 32.8-8.8 49.8-4.2 34.2-3.4 68.4 2.4 102.2-13.4 23.6-24.4 46.6-32.8 68.4-3.6 10-6.6 20.2-9 30.6 16.2 17.8 29.8 38.6 40.2 62 16.2 35.4 24.2 74.4 24 116.8 0 13.2-1.4 26.6-4 39.8-9.6 49.8-2.4 84.8 6 105.8 19.4 22.4 16.4 41.6 37.6 57.6 63 6.8 10.8 14.2 21.6 22.4 32-6.8 14.8-13.2 29.8-19.2 45.2-0.4 1.4-0.8 2.8-1.2 4.2 3.2 11.6 6.2 23.4 8.8 35.4 8 34.2 3.4 68.8-13.6 99.8-17.8 32.6-40.8 58.8-69 77.8-27.2 18.6-58.2 30-91.2 33.2-11.6 1.2-23.2 1.8-34.8 1.8h-4.2c-11.6 0-23.2-0.6-34.8-1.8-33-3.2-64-14.6-91.2-33.2-28.2-19-51.2-45.2-69-77.8-5.8-11.8-10.8-23.6-15.2-35.4 0.6-3.6 1.2-7.2 1.6-10.8 13.6-18.6 27.4-37.6 41.4-57.2 14.8-21.2 26-43.4 33.2-66.4 7.2-23 8.8-47.2 4.6-71.6-4-23.6-14.6-44.4-31.2-61.2-16.8-16.8-36.8-28.6-59.6-34.8-11.4-3-22.8-4.4-34.4-4.4h-4.4z"/>
          </svg>
        </template>
        QQ 登录
      </el-button>

      <!-- Casdoor -->
      <el-button
        v-if="providers.includes('casdoor')"
        type="primary"
        size="large"
        class="provider-button casdoor"
        :loading="loading === 'casdoor'"
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
        Casdoor 登录
      </el-button>

      <!-- 更多登录方式 -->
      <el-button
        v-if="providers.length > 4"
        type="info"
        size="large"
        class="provider-button more"
        @click="showCustomProvider = true"
      >
        <template #icon>
          <el-icon><MoreFilled /></el-icon>
        </template>
        更多登录方式
      </el-button>
    </div>

    <!-- 自定义提供商列表 -->
    <div v-else class="custom-providers">
      <el-button
        v-for="provider in allProviders"
        :key="provider.name"
        size="large"
        class="provider-button custom"
        :loading="loading === provider.name"
        @click="handleOAuthLogin(provider.name)"
      >
        <template #icon>
          <el-icon><User /></el-icon>
        </template>
        {{ provider.displayName }}
      </el-button>
      <el-button
        size="large"
        @click="showCustomProvider = false"
      >
        <template #icon>
          <el-icon><Back /></el-icon>
        </template>
        返回
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { MoreFilled, User, Back } from '@element-plus/icons-vue'
import { loginWithCasdoor } from '@/config/casdoor'
import { useJwtStore } from '@/stores/jwt_token'

interface OAuthProvider {
  name: string
  displayName: string
  icon: string
}

const props = defineProps<{
  providers?: string[]
}>()

const emit = defineEmits(['login-success'])

const allProviders: OAuthProvider[] = [
  { name: 'gitee', displayName: 'Gitee', icon: 'gitee' },
  { name: 'github', displayName: 'GitHub', icon: 'github' },
  { name: 'google', displayName: 'Google', icon: 'google' },
  { name: 'qq', displayName: 'QQ', icon: 'qq' },
  { name: 'wechat', displayName: '微信', icon: 'wechat' },
  { name: 'dingtalk', displayName: '钉钉', icon: 'dingtalk' },
  { name: 'azure', displayName: 'Azure AD', icon: 'azure' },
  { name: 'casdoor', displayName: 'Casdoor', icon: 'casdoor' },
]

const showCustomProvider = ref(false)
const loading = ref<string | null>(null)

// 使用 Casdoor 登录（直接跳转到 Casdoor 登录页面）
const handleCasdoorLogin = () => {
  loading.value = 'casdoor'
  try {
    loginWithCasdoor()
  } catch (error) {
    console.error('Casdoor 登录失败:', error)
    ElMessage.error(`Casdoor 登录失败: ${(error as Error).message}`)
  } finally {
    loading.value = null
  }
}

// 处理OAuth登录
const handleOAuthLogin = (provider: string) => {
  loading.value = provider
  try {
    // 对于Gitee等OAuth提供商，通过后端代理进行认证
    const redirectUri = encodeURIComponent(`${window.location.origin}/login`)
    const oauthUrl = `/api/v1/casdoor/oauth/${provider}?redirect_uri=${redirectUri}`
    window.location.href = oauthUrl
  } catch (error) {
    console.error(`${provider} 登录失败:`, error)
    ElMessage.error(`${provider} 登录失败: ${(error as Error).message}`)
  } finally {
    loading.value = null
  }
}

// 检查OAuth回调
const checkOAuthCallback = () => {
  const urlParams = new URLSearchParams(window.location.search)
  const loginStatus = urlParams.get('login')
  const error = urlParams.get('error')

  if (error) {
    ElMessage.error(decodeURIComponent(error))
    return
  }

  if (loginStatus === 'success') {
    const token = urlParams.get('token')
    const uid = urlParams.get('uid')
    const userName = urlParams.get('user_name')

    if (token) {
      // 直接使用已导入的jwtStore
      const jwtStore = useJwtStore()
      jwtStore.save_jwt_token(token)

      // 通知父组件
      emit('login-success', {
        token: token,
        uid: uid,
        user_name: userName,
      })

      ElMessage.success('登录成功！')

      // 清理URL参数
      window.history.replaceState({}, document.title, window.location.pathname)

      // 刷新页面
      setTimeout(() => {
        window.location.reload()
      }, 500)
    }
  }
}

onMounted(() => {
  checkOAuthCallback()
})
</script>

<style scoped>
.oauth-providers {
  width: 100%;
  padding: 20px;
}

.provider-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
}

.provider-button {
  flex: 1;
  min-width: 200px;
  height: 48px;
  font-size: 15px;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.provider-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.provider-button.gitee {
  background: linear-gradient(135deg, #C71D23 0%, #E84545 100%);
  border: none;
  color: white;
}

.provider-button.github {
  background: #24292e;
  border: 1px solid #d1d5da;
  color: white;
}

.provider-button.google {
  background: white;
  border: 1px solid #d3d3d3;
  color: #5f6368;
}

.provider-button.qq {
  background: #12B7F5;
  border: none;
  color: white;
}

.provider-button.more {
  background: var(--el-color-info);
  border: none;
  color: white;
}

.custom-providers {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
}

.provider-button.custom {
  height: 48px;
  font-size: 14px;
}
</style>
