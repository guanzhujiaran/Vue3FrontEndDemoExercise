<!--
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-04-01 13:10:35
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-11-01 22:13:39
 * @FilePath: \BiliLottery\src\views\UserCenterView.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<script setup lang="ts">
import { isLogin } from '@/api/user/utils'
import router from '@/router'
import emitter from '@/utils/mitt'
import { computed, nextTick, onMounted, provide, ref, watch } from 'vue'
import accountApi from '@/api/account/account_api'
import UserGlobalConfig from '@/components/opus-detail/RightPannel/PannelItems/SettingComponent/UserGlobalConfig.vue'
import { useRoute } from 'vue-router'
import type { PageShowModel } from '@/models/account/page/model.ts'
import { accountLeftPanelReloadKey } from '@/models/inject/inject_type'
import UserBaseInfoConfig from '@/components/opus-detail/RightPannel/PannelItems/SettingComponent/UserBaseInfoConfig.vue'
import BiliUnauthorizedError from '@/components/CommonCompo/Bili-Feedback-Compo/BiliUnauthorizedError.vue'
import { ElMessage, ElIcon } from 'element-plus'
import { Avatar, Setting, Tickets, Histogram, DataAnalysis } from '@element-plus/icons-vue'

// 添加 inheritAttrs: false 以避免将属性传递给根节点
defineOptions({
  inheritAttrs: false
})

const route = useRoute()

let AccountInfos = ref<PageShowModel[]>([])

// 存储用户信息
const userInfo = ref<{
  uid: number
  user_name: string
  role: string
}>({
  uid: 0,
  user_name: '',
  role: ''
})

// 控制是否已登录
const isLoggedIn = ref(false)
// 控制是否已完成登录检查
const loginCheckCompleted = ref(false)

// 检查用户登录状态
const checkLoginStatus = async () => {
  try {
    const [isLoggedInStatus, message, userData] = await isLogin()
    
    if (!isLoggedInStatus) {
      // 用户未登录
      isLoggedIn.value = false
      loginCheckCompleted.value = true
      return false
    }
    
    // 用户已登录，设置用户信息
    if (userData) {
      userInfo.value = {
        uid: userData.uid,
        user_name: userData.user_name,
        role: userData.role
      }
    }
    
    isLoggedIn.value = true
    loginCheckCompleted.value = true
    return true
  } catch (error) {
    console.error('检查登录状态出错:', error)
    // 出现错误时显示未授权错误
    isLoggedIn.value = false
    loginCheckCompleted.value = true
    return false
  }
}

// 加载用户中心数据
const loadUserCenterData = async () => {
  await handle_left_pannel_accounts()
  handle_route_change(route)
}

const handle_left_pannel_accounts = async () => {
  try {
    const resp = await accountApi.GetAllAccounts()
    if (resp.code) {
      ElMessage.error(`获取账号信息失败！${resp.msg}`)
      return
    }
    AccountInfos.value = resp.data.map((el) => {
      return {
        info: el,
        is_show: false,
        actived: false
      }
    })
  } catch (error) {
    ElMessage.error('获取账号信息失败！')
    console.error('获取账号信息出错:', error)
  }
}

/**
 *
 * @param el route
 */
const handle_route_change = (el: any) => {
  AccountInfos.value.map((e) => (e.is_show = false))
  AccountInfos.value
    .filter((e) => e.info.account_name === el.params.account_name)
    .map((e) => {
      e.is_show = true
      e.actived = true
    })
}

watch(route, handle_route_change)

provide(accountLeftPanelReloadKey, () => {
  nextTick(async () => {
    await handle_left_pannel_accounts()
  })
})

const activeTab = ref('accounts')

const navigationItems = computed(() => [
  { 
    id: 'accounts', 
    name: '我的账号', 
    icon: Avatar,
    count: AccountInfos.value.length
  },
  { 
    id: 'profile', 
    name: '基本信息', 
    icon: Setting 
  },
  { 
    id: 'global', 
    name: '全局设置', 
    icon: Setting,
    role: 'root'
  }
])

const selectTab = (tabId: string) => {
  activeTab.value = tabId
  
  // 根据选择的标签导航到相应页面
  switch(tabId) {
    case 'accounts':
      if (AccountInfos.value.length > 0) {
        const firstAccount = AccountInfos.value[0].info.account_name
        router.push(`/app/user-center/account_detail/${firstAccount}`)
      } else {
        router.push('/app/user-center/')
      }
      break
    case 'profile':
      router.push('/app/user-center/account-base-info-config')
      break
    case 'global':
      router.push('/app/user-center/account-global-config')
      break
  }
}

onMounted(async () => {
  // 检查登录状态
  const loggedIn = await checkLoginStatus()
  if (loggedIn) {
    // 如果已登录，加载用户中心数据
    await loadUserCenterData()
  }
})
</script>

<template>
  <div class="user-center-container">
    <!-- 登录检查完成后再显示内容 -->
    <template v-if="loginCheckCompleted">
      <!-- 只有在已登录时才显示页面内容 -->
      <template v-if="isLoggedIn">
        <div class="user-center-layout">
          <!-- 侧边栏 -->
          <div class="sidebar">
            <div class="user-info">
              <el-avatar :icon="Avatar" size="large" />
              <div class="user-details">
                <div class="user-name">{{ userInfo.user_name }}</div>
                <div class="user-role">{{ userInfo.role === 'root' ? '管理员' : '普通用户' }}</div>
              </div>
            </div>
            
            <div class="nav-menu">
              <div 
                v-for="item in navigationItems" 
                :key="item.id"
                :class="['nav-item', { active: activeTab === item.id }]"
                @click="selectTab(item.id)"
                v-show="!item.role || (item.role && userInfo.role === item.role)"
              >
                <el-icon :size="18"><component :is="item.icon" /></el-icon>
                <span class="nav-text">{{ item.name }}</span>
                <span v-if="item.count" class="nav-count">{{ item.count }}</span>
              </div>
            </div>
          </div>
          
          <!-- 主内容区 -->
          <div class="main-content">
            <div class="content-header">
              <h1>
                <template v-if="route.name === '用户中心'">我的账号</template>
                <template v-else-if="route.name === '用户基本信息设置'">基本信息</template>
                <template v-else-if="route.name === '用户全局设置'">全局设置</template>
                <template v-else>账号详情</template>
              </h1>
            </div>
            
            <div class="content-body">
              <!-- 账号列表视图 -->
              <div v-if="route.name === '用户中心' || route.name === '账号详情'" class="accounts-view">
                <div v-if="AccountInfos.length === 0" class="empty-state">
                  <el-icon :size="48"><Tickets /></el-icon>
                  <p>您还没有添加账号</p>
                  <el-button type="primary" @click="$router.push('/app/user-center/account-base-info-config')">
                    添加账号
                  </el-button>
                </div>
                
                <div v-else class="accounts-content">
                  <div class="account-list">
                    <div 
                      v-for="account in AccountInfos" 
                      :key="account.info.account_name"
                      :class="['account-item', { active: account.is_show }]"
                      @click="$router.push(`/app/user-center/account_detail/${account.info.account_name}`)"
                    >
                      <div class="account-avatar">
                        <el-avatar :size="40">{{ account.info.account_name.charAt(0).toUpperCase() }}</el-avatar>
                      </div>
                      <div class="account-info">
                        <div class="account-name">{{ account.info.account_name }}</div>
                        <div class="account-status">
                          <el-tag 
                            :type="account.info.info ? 'success' : 'danger'" 
                            size="small"
                          >
                            {{ account.info.info ? '有效' : '无效' }}
                          </el-tag>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div class="account-detail">
                    <router-view />
                  </div>
                </div>
              </div>
              
              <!-- 用户基本信息设置视图 -->
              <div v-else-if="route.name === '用户基本信息设置'" class="settings-view">
                <UserBaseInfoConfig />
              </div>
              
              <!-- 用户全局设置视图 -->
              <div v-else-if="route.name === '用户全局设置' && userInfo.role === 'root'" class="settings-view">
                <UserGlobalConfig />
              </div>
              
              <!-- 404 页面 -->
              <div v-else class="not-found">
                <el-icon :size="48"><DataAnalysis /></el-icon>
                <h3>页面未找到</h3>
                <p>您访问的页面不存在</p>
                <el-button type="primary" @click="$router.push('/app/user-center/')">返回用户中心</el-button>
              </div>
            </div>
          </div>
        </div>
      </template>
      
      <!-- 未登录时显示未授权错误提示 -->
      <template v-else>
        <BiliUnauthorizedError />
      </template>
    </template>
    
    <!-- 登录检查未完成时显示加载状态 -->
    <template v-else>
      <div class="loading-state">
        <el-skeleton animated>
          <template #template>
            <el-skeleton-item variant="circle" style="width: 60px; height: 60px;" />
            <el-skeleton-item variant="h3" style="width: 50%" />
            <el-skeleton-item variant="text" style="width: 30%" />
          </template>
        </el-skeleton>
      </div>
    </template>
  </div>
</template>

<style scoped>
.user-center-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.user-center-layout {
  display: flex;
  flex: 1;
  height: 100%;
  background-color: var(--el-bg-color-page);
}

.sidebar {
  width: 240px;
  background-color: var(--el-bg-color);
  border-right: 1px solid var(--el-border-color-light);
  display: flex;
  flex-direction: column;
  padding: 20px 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.user-info {
  display: flex;
  align-items: center;
  padding: 0 20px 20px;
  border-bottom: 1px solid var(--el-border-color-light);
  margin-bottom: 20px;
}

.user-details {
  margin-left: 12px;
}

.user-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.user-role {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
}

.nav-menu {
  flex: 1;
  padding: 0 12px;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 8px;
  transition: all 0.3s;
  color: var(--el-text-color-secondary);
}

.nav-item:hover {
  background-color: var(--el-bg-color-page);
  color: var(--el-text-color-primary);
}

.nav-item.active {
  background-color: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  font-weight: 500;
}

.nav-text {
  margin-left: 12px;
  flex: 1;
}

.nav-count {
  background-color: var(--el-color-danger);
  color: white;
  border-radius: 10px;
  padding: 2px 8px;
  font-size: 12px;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.content-header {
  padding: 20px;
  border-bottom: 1px solid var(--el-border-color-light);
  background-color: var(--el-bg-color);
}

.content-header h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.content-body {
  flex: 1;
  overflow: auto;
  padding: 20px;
}

.accounts-view,
.settings-view {
  height: 100%;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--el-text-color-secondary);
}

.empty-state p {
  margin: 16px 0;
  font-size: 16px;
}

.accounts-content {
  display: flex;
  height: 100%;
  gap: 20px;
}

.account-list {
  width: 300px;
  background-color: var(--el-bg-color);
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow-y: auto;
}

.account-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
  margin-bottom: 8px;
}

.account-item:hover {
  background-color: var(--el-bg-color-page);
}

.account-item.active {
  background-color: var(--el-color-primary-light-9);
  border: 1px solid var(--el-color-primary);
}

.account-info {
  margin-left: 12px;
  flex: 1;
}

.account-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  margin-bottom: 4px;
}

.account-status .el-tag {
  height: 20px;
  line-height: 16px;
}

.account-detail {
  flex: 1;
  background-color: var(--el-bg-color);
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: auto;
}

.not-found {
  text-align: center;
  padding: 60px 20px;
  color: var(--el-text-color-secondary);
}

.not-found h3 {
  margin: 16px 0 8px;
}

.not-found p {
  margin-bottom: 16px;
}

.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  width: 100%;
  padding: 20px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .sidebar {
    width: 70px;
  }
  
  .user-details,
  .nav-text,
  .user-name,
  .user-role {
    display: none;
  }
  
  .nav-item {
    justify-content: center;
    padding: 16px 0;
  }
  
  .nav-count {
    position: absolute;
    right: 8px;
    top: 8px;
  }
  
  .accounts-content {
    flex-direction: column;
  }
  
  .account-list {
    width: 100%;
    height: auto;
    max-height: 300px;
  }
  
  .account-detail {
    flex: 1;
  }
}
</style>