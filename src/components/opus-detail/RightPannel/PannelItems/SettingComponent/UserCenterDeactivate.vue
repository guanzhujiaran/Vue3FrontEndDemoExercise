<template>
  <div class="bili-deactivate flex flex-col gap-5 max-w-2xl">
    <header class="bili-deactivate__header">
      <h2 class="bili-deactivate__title">账号注销</h2>
      <p class="bili-deactivate__desc text-text-secondary">
        提交注销申请后，系统将在后台异步清理你的账户与相关数据，过程不可恢复。
      </p>
    </header>

    <el-alert
      class="bili-deactivate__alert"
      type="error"
      :closable="false"
      title="注销前请务必了解以下后果"
    >
      <ul class="bili-deactivate__risks list-disc pl-5 mt-2 space-y-1">
        <li>账户将被标记为注销，登录态与关联的第三方（Casdoor）账户将一并失效；</li>
        <li>你的关注、粉丝、黑名单等社交关系将被清理，且无法恢复；</li>
        <li>你发布的动态、评论、私信等数据将按清理策略异步删除；</li>
        <li>注销为不可逆操作，完成后无法重新激活同一账户。</li>
      </ul>
    </el-alert>

    <section class="bili-deactivate__confirm flex items-center gap-2">
      <el-checkbox v-model="agreed">我已了解上述后果，仍要申请注销</el-checkbox>
    </section>

    <footer class="bili-deactivate__actions">
      <el-button type="danger" :disabled="!agreed" @click="onDeactivate">
        申请注销账户
      </el-button>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import userApi from '@/api/user/user_api.ts'
import { useJwtStore } from '@/stores/jwt_token.ts'
import { useUserNavStore } from '@/stores/user_nav.ts'
import { RouteName } from '@/models/router/index.ts'

defineOptions({ name: 'UserCenterDeactivate' })

const router = useRouter()
const userNavStore = useUserNavStore()
const jwtStore = useJwtStore()

const agreed = ref(false)
const submitting = ref(false)

async function onDeactivate() {
  if (!agreed.value) return
  try {
    await ElMessageBox.confirm(
      '注销后账户与数据将不可恢复，确定要提交注销申请吗？',
      '二次确认',
      { type: 'warning', confirmButtonText: '确定注销', cancelButtonText: '再想想' },
    )
  } catch {
    return
  }

  submitting.value = true
  try {
    const res = await userApi.Deactivate(true, true)
    // 注意：businessHandler 返回的是 { success, data, ... }，没有 code 字段，
    // 判空 code === 0 会恒为 false，导致注销成功后不提示、不登出
    if (res.success) {
      ElMessage.success('注销申请已提交，账户将在后台异步清理')
      agreed.value = false
      // 注销不可逆，必须主动登出：
      // 1) JWT 存放于 HttpOnly Cookie（bili_jwt，有效期 15 天），前端删不掉，
      //    只有网关 /api/v1/user/logout 会下发清除该 Cookie 的响应；
      // 2) 注销流程只删业务数据、不写 JWT 黑名单，不登出会残留「账号已不存在
      //    但仍可发请求」的幽灵登录态。
      try {
        await userApi.Logout(true)
      } catch (error) {
        // 清 Cookie 失败也要继续清本地登录态，不能把用户留在已注销的界面上
        console.error('注销后退出登录失败:', error)
      }
      userNavStore.delete_user_nav()
      jwtStore.delete_jwt_token()
      await router.push({ name: RouteName.HOME })
      // 刷新页面，重置各模块持有的用户态（与个人中心退出登录口径一致）
      setTimeout(() => {
        window.location.reload()
      }, 100)
    }
  } finally {
    submitting.value = false
  }
}
</script>
