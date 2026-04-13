<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { isLogin } from '@/api/user/utils'
import { useRouter } from 'vue-router'
import { useJwtStore } from '@/stores/jwt_token'
import emitter from '@/utils/mitt.ts'
import biliMessage from '@/utils/message'
import OAuthLoginProviders from './OAuthLoginProviders.vue'

// 定义props
const props = defineProps({
  isModal: {
    type: Boolean,
    default: false
  }
})

// 定义事件
const emit = defineEmits(['login-success'])

const isLoading = ref<boolean>(false)
const router = useRouter()
const login_info = ref({
  source: 'main_web',
  go_url: '',
  spm_id_from: '',
  checked: 'casdoor',
  isSmsFocus: !1,
  captcha: void 0
})

// 在页面加载时显示提示(仅在非Modal模式下)
onMounted(() => {
  if (!props.isModal) {
    const STORAGE_KEY = 'login_page_first_visit_shown'
    const shown = localStorage.getItem(STORAGE_KEY)

    if (!shown) {
      setTimeout(() => {
        biliMessage.warning('⚠️ 当前禁止注册新账号,仅支持 Gitee 登录')
        localStorage.setItem(STORAGE_KEY, 'true')
      }, 500)
    }
  }
})

const check_login = () => {
  // 如果是在模态框中，不需要自动检查登录状态
  if (props.isModal) {
    return
  }
  isLogin()
    .then((res) => {
      if (res[0]) {
        biliMessage.info('账号已登录，等待跳转！')
        router.push('/app/user-center')
      } else {
        biliMessage.error(res[1])
      }
    })
    .catch((e) => {
      biliMessage.error(e)
      setTimeout(check_login, 2e3)
    })
}

// 处理 OAuth 登录成功
const handleOAuthLoginSuccess = async (data: { token: string, uid: string, user_name: string }) => {
  const JwtStore = useJwtStore()
  JwtStore.save_jwt_token(data.token)

  // 刷新获取用户状态
  const [isLoggedIn, message, userNav] = await isLogin()

  if (!isLoggedIn && message !== '未登录') {
    biliMessage.error(`获取用户信息失败: ${message}`)
  }

  // 发出登录成功事件
  emit('login-success')

  // 等待1秒后刷新页面，让用户看到成功提示
  setTimeout(() => {
    window.location.reload()
  }, 1000)
}
</script>

<template>
  <div class="login_wp" v-loading="isLoading">
    <div class="login__main">
      <div class="main__right">
        <!-- 使用Element Plus的Tabs组件 - 只保留第三方登录 -->
        <el-tabs :stretch="true" type="card" v-model="login_info.checked" class="login-tabs">
          <el-tab-pane label="第三方登录" name="casdoor">
            <OAuthLoginProviders
              :providers="['casdoor']"
              @login-success="handleOAuthLoginSuccess"
            />
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import '@/assets/components/auth/login-tailwind.css';
</style>
