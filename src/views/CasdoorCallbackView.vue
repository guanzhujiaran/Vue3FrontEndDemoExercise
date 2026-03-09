<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useJwtStore } from '@/stores/jwt_token'
import { useUserNavStore } from '@/stores/user_nav'

const route = useRoute()
const jwtStore = useJwtStore()
const userNavStore = useUserNavStore()

const processCallback = () => {
  const token = route.query.token as string
  const uid = route.query.uid as string
  const user_name = route.query.user_name as string

  if (!token || !uid || !user_name) {
    ElMessage.error('登录失败：缺少必要的登录信息')
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
      face: '',
      level_info: {
        current_exp: '0',
        current_level: '0',
        current_min: '0',
        next_exp: '0'
      }
    }
    userNavStore.save_user_nav(userInfo)

    ElMessage.success('登录成功，正在跳转...')

    // 跳转到首页
    setTimeout(() => {
      window.location.href = '/'
    }, 500)
  } catch (error) {
    console.error('登录处理失败:', error)
    ElMessage.error('登录失败：' + (error instanceof Error ? error.message : '未知错误'))
  }
}

onMounted(() => {
  processCallback()
})
</script>
