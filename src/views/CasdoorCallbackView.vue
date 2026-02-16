<template>
  <div class="callback-container">
    <el-result
      :icon="resultIcon"
      :title="resultTitle"
      :sub-title="resultSubtitle"
    >
      <template #extra>
        <el-button type="primary" @click="handleSuccess">
          返回首页
        </el-button>
      </template>
    </el-result>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Check, Close, Warning } from '@element-plus/icons-vue'
import { useJwtStore } from '@/stores/jwt_token'
import { useUserNavStore } from '@/stores/user_nav'
import { isLogin } from '@/api/user/utils'

const router = useRouter()
const route = useRoute()
const jwtStore = useJwtStore()
const userNavStore = useUserNavStore()

const success = ref(false)
const resultIcon = ref(Check)
const resultTitle = ref('登录中...')
const resultSubtitle = ref('正在处理登录信息，请稍候...')

const processCallback = async () => {
  const token = route.query.token as string
  const uid = route.query.uid as string
  const user_name = route.query.user_name as string

  if (!token || !uid || !user_name) {
    success.value = false
    resultIcon.value = Warning
    resultTitle.value = '登录失败'
    resultSubtitle.value = '缺少必要的登录信息'
    return
  }

  try {
    // 保存 JWT token
    jwtStore.save_jwt_token(decodeURIComponent(token))

    // 保存用户信息
    const userInfo = {
      uid: decodeURIComponent(uid),
      user_name: decodeURIComponent(user_name),
      role: '0',
      face: ''
    }
    userNavStore.save_user_nav(userInfo)

    success.value = true
    resultIcon.value = Check
    resultTitle.value = '登录成功'
    resultSubtitle.value = '欢迎使用本系统'

    ElMessage.success('登录成功')

    // 刷新获取用户状态
    const [isLoggedIn, message] = await isLogin()

    if (!isLoggedIn && message !== '未登录') {
      ElMessage.warning(`获取用户信息失败: ${message}`)
    }

    // 1.5秒后跳转到首页
    setTimeout(() => {
      router.push('/')
    }, 1500)
  } catch (error) {
    console.error('登录处理失败:', error)
    success.value = false
    resultIcon.value = Close
    resultTitle.value = '登录失败'
    resultSubtitle.value = error instanceof Error ? error.message : '登录过程中出现错误'

    ElMessage.error('登录失败')
  }
}

const handleSuccess = () => {
  router.push('/')
}

onMounted(() => {
  processCallback()
})
</script>

<style scoped>
.callback-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

:deep(.el-result) {
  background: white;
  border-radius: 8px;
  padding: 40px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  max-width: 400px;
  width: 100%;
}

:deep(.el-result__icon) {
  margin-bottom: 16px;
}

:deep(.el-result__title) {
  margin-bottom: 8px;
}
</style>
