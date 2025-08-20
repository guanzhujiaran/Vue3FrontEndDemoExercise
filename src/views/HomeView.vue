<!--
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-05-29 23:52:55
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2025-08-14 23:30:00
 * @FilePath: \Vue3FrontEndDemoExercise\src\views\HomeView.vue
 * @Description: 重新设计的主页视图组件
-->
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { routes } from '@/router'
import { useJwtStore } from '@/stores/jwt_token'
import { isLogin } from '@/api/user/utils'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  CoffeeCup,
  ShoppingCart as IconShoppingCart,
  User as IconUser,
  ChatSquare as IconChat,
  DataAnalysis as IconDataAnalysis
} from '@element-plus/icons-vue'
import { processRoutesForHome } from '@/utils/routeUtils'
import { openGlobalLoginModalKey } from '@/models/inject/inject_type.ts'
const router = useRouter()
const jwtStore = useJwtStore()
const isLoggedIn = ref(false)
const activeTab = ref('all')
const openGlobalLoginModal = inject(openGlobalLoginModalKey, () => {})
// 从路由配置中提取功能模块
const routeModules = computed(() => {
  // 从路由配置中提取顶级模块
  let modules = processRoutesForHome(routes)

  // 按order排序
  modules.sort((a: any, b: any) => (a.order || 0) - (b.order || 0))

  // 特殊处理购物助手模块，因为它在路由中是分散的
  const shoppingModule: any = {
    id: 'shopping',
    title: '购物助手',
    icon: IconShoppingCart,
    description: '购物相关功能和信息查询',
    color: '#909399',
    requiresLogin: false,
    order: 4,
    children: modules
      .filter((module: any) => module.id === 'shopping')
      .map((module: any) => ({
        title: module.title,
        icon: module.icon,
        description: module.description,
        path: module.path,
        color: module.color,
        order: module.order
      }))
  }

  // 过滤掉已经被归入购物助手的模块
  const filteredModules = modules.filter((module: any) => module.id !== 'shopping')

  // 如果购物助手有子项，添加到结果中
  if (shoppingModule.children && shoppingModule.children.length > 0) {
    filteredModules.push(shoppingModule)
  }

  return filteredModules
})

// 根据当前选择的标签过滤模块
const filteredModules = computed(() => {
  if (activeTab.value === 'all') {
    return routeModules.value
  }
  return routeModules.value.filter((module: any) => module.id === activeTab.value)
})

// 检查登录状态
const checkLoginStatus = async () => {
  try {
    const [isLoggedInStatus, message] = await isLogin()
    isLoggedIn.value = isLoggedInStatus
    if (!isLoggedInStatus && message) {
      // console.log('未登录:', message)
    }
  } catch (error) {
    // console.error('检查登录状态出错:', error)
  }
}

// 处理登录按钮点击
const handleLoginClick = () => {
  openGlobalLoginModal()
}

// 处理登出按钮点击
const handleLogoutClick = () => {
  ElMessageBox.confirm('确定要退出登录吗?', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  })
    .then(() => {
      jwtStore.delete_jwt_token()
      isLoggedIn.value = false
      ElMessage.success('已成功退出登录')
    })
    .catch(() => {})
}

// 处理登录成功
const handleLoginSuccess = () => {
  checkLoginStatus()
  ElMessage.success('登录成功！欢迎回来')
}

// 处理卡片点击
const handleCardClick = (path: string | undefined, requiresLogin = false) => {
  if (!isLoggedIn.value && requiresLogin) {
    ElMessageBox.confirm('该功能需要登录才能使用，是否立即登录?', '提示', {
      confirmButtonText: '立即登录',
      cancelButtonText: '取消',
      type: 'info'
    })
      .then(() => {
        openGlobalLoginModal()
      })
      .catch(() => {})
    return
  }
  path && router.push(path)
}

onMounted(() => {
  checkLoginStatus()
})
</script>

<template>
  <FlexContainer>
    <!-- 顶部横幅 -->
    <section class="hero-banner">
      <div class="hero-content">
        <h1 class="hero-title">BiliExplosion</h1>
        <p class="hero-subtitle">Bilibili本社爆破</p>
        <div class="hero-actions">
          <el-button type="primary" size="large" @click="handleLoginClick" v-if="!isLoggedIn">
            <el-icon class="el-icon--left"><IconUser /></el-icon>立即登录
          </el-button>
          <el-button
            type="success"
            size="large"
            @click="router.push('/app/lot-data/bili-data/official')"
            v-else
          >
            <el-icon class="el-icon--left"><IconDataAnalysis /></el-icon>查看抽奖数据
          </el-button>
          <el-button type="info" size="large" @click="router.push('/app/Feedback')">
            <el-icon class="el-icon--left"><IconChat /></el-icon>提交反馈
          </el-button>
        </div>
      </div>
      <div class="hero-stats" v-if="isLoggedIn"></div>
    </section>

    <!-- 功能导航区 -->
    <section class="features-section">
      <div class="section-header">
        <h2 class="section-title">功能导航</h2>
        <div class="tab-navigation">
          <el-radio-group v-model="activeTab" size="large">
            <el-radio-button label="all">全部</el-radio-button>
            <el-radio-button label="lottery">抽奖数据</el-radio-button>
            <el-radio-button label="user">用户中心</el-radio-button>
            <el-radio-button label="shopping">购物助手</el-radio-button>
          </el-radio-group>
        </div>
      </div>

      <!-- 模块列表 -->
      <div class="modules-container">
        <el-card
          v-for="(module, moduleIndex) in filteredModules"
          :key="moduleIndex"
          class="module-card"
          :body-style="{ padding: '0px' }"
          shadow="hover"
        >
          <template #header style="padding: 0">
            <div class="module-header" :style="{ backgroundColor: module.color }">
              <el-icon :size="24"><component :is="module.icon || CoffeeCup" /></el-icon>
              <h3>{{ module.title }}</h3>
            </div>
          </template>
          <template #default>
            <div class="module-body">
              <p class="module-description">{{ module.description }}</p>
              <!-- 如果有子项，显示子项列表 -->
              <div v-if="module.children && module.children.length" class="module-children">
                <div
                  v-for="(child, childIndex) in module.children"
                  :key="childIndex"
                  class="child-item"
                  @click="handleCardClick(child.path, module.requiresLogin)"
                >
                  <div class="child-icon" :style="{ backgroundColor: child.color }">
                    <el-icon :size="16"><component :is="child.icon || CoffeeCup" /></el-icon>
                  </div>
                  <div class="child-info">
                    <h4>{{ child.title }}</h4>
                    <p>{{ child.description }}</p>
                  </div>
                  <el-icon class="arrow-icon"><el-icon-arrow-right /></el-icon>
                </div>
              </div>

              <!-- 如果没有子项，显示直接访问按钮 -->
              <div v-else class="module-action">
                <el-button
                  type="primary"
                  :plain="true"
                  @click="handleCardClick(module.path, module.requiresLogin)"
                >
                  立即访问
                </el-button>
              </div>
            </div>
          </template>
        </el-card>
      </div>
    </section>

    <!-- 最新动态区域 -->
    <section class="news-section">
      <h2 class="section-title">最新动态</h2>
      <div class="news-container">
        <el-timeline>
          <el-timeline-item
            v-for="(activity, index) in 4"
            :key="index"
            :timestamp="'2025-08-' + (14 - index)"
            placement="top"
            :type="index === 0 ? 'primary' : 'success'"
          >
            <el-card>
              <h4>
                {{
                  [
                    '新增山姆会员店信息查询',
                    '优化B站抽奖数据分析',
                    '修复用户中心设置问题',
                    '系统上线'
                  ][index]
                }}
              </h4>
              <p>
                {{
                  [
                    '新增山姆会员店商品信息查询功能，支持价格比较和库存查询',
                    '优化了B站抽奖数据分析算法，提高了中奖预测准确率',
                    '修复了用户中心设置无法保存的问题',
                    'BiliExplosion系统正式上线，欢迎使用'
                  ][index]
                }}
              </p>
            </el-card>
          </el-timeline-item>
        </el-timeline>
      </div>
    </section>

    <!-- 页脚 -->
    <footer class="footer">
      <div class="footer-content">
        <div class="footer-section">
          <h3>关于我们</h3>
          <p>
            BiliExplosion是一个帮助B站用户管理和分析抽奖数据的工具，提供多种功能帮助您更好地参与B站活动。
          </p>
        </div>
        <div class="footer-section">
          <h3>快速链接</h3>
          <ul>
            <li><a @click="router.push('/app/Feedback')">反馈建议</a></li>
            <li><a @click="router.push('/app/user-center')">用户中心</a></li>
            <li><a @click="router.push('/app/lot-data/bili-data/official')">抽奖数据</a></li>
          </ul>
        </div>
        <div class="footer-section">
          <h3>联系我一个人</h3>
          <p>邮箱: guanzhujiaran2022@163.com</p>
        </div>
      </div>
      <div class="footer-bottom">
        <p>&copy; 2025 BiliExplosion</p>
      </div>
    </footer>
  </FlexContainer>
</template>

<style scoped>
.el-button + .el-button {
  margin-left: unset;
}
/* 顶部横幅 */
.hero-banner {
  background: linear-gradient(135deg, var(--el-color-danger) 0%, var(--el-color-info) 100%);
  padding: 60px 20px;
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  position: relative;
  overflow: hidden;
}

.hero-banner::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  opacity: 0.3;
}

.hero-content {
  max-width: 800px;
  position: relative;
  z-index: 1;
}

.hero-title {
  font-size: 48px;
  font-weight: 700;
  margin-bottom: 16px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.hero-subtitle {
  font-size: 20px;
  margin-bottom: 32px;
  opacity: 0.9;
}

.hero-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-bottom: 24px;
}

.hero-stats {
  display: flex;
  gap: 40px;
  margin-top: 32px;
}

/* 功能导航区 */
.features-section {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
  width: -webkit-fill-available;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  flex-wrap: wrap;
  gap: 20px;
}

.section-title {
  font-size: 28px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.modules-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 24px;
  margin-bottom: 40px;
}

.module-card {
  overflow: hidden;
  transition: all 0.3s ease;
}

.module-card:hover {
  transform: translateY(5px);
}

.module-header {
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.module-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.module-body {
  padding: 20px;
}

.module-description {
  margin-bottom: 20px;
  line-height: 1.5;
}

.module-children {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.child-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid;
  opacity: 0.5;
  &:hover {
    opacity: 1;
    transform: translateX(5px);
  }
}

.child-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  margin-right: 12px;
  flex-shrink: 0;
}

.child-info {
  flex: 1;
}

.child-info h4 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 500;
}

.child-info p {
  margin: 0;
  font-size: 12px;
}

.arrow-icon {
  color: #c0c4cc;
}

.module-action {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}

/* 最新动态区域 */
.news-section {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  width: -webkit-fill-available;
}

.news-container {
  margin-top: 24px;
}

/* 页脚 */
.footer {
  background-color: #303133;
  color: #909399;
  margin-top: 60px;
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 40px;
}

.footer-section h3 {
  color: #e6e6e6;
  margin-top: 0;
  margin-bottom: 16px;
  font-size: 18px;
}

.footer-section p {
  line-height: 1.6;
}

.footer-section ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.footer-section ul li {
  margin-bottom: 8px;
}

.footer-section ul li a {
  color: #909399;
  text-decoration: none;
  cursor: pointer;
  transition: color 0.2s;
}

.footer-section ul li a:hover {
  color: #41b883;
}

.footer-bottom {
  background-color: #252525;
  text-align: center;
  padding: 16px;
  font-size: 14px;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .hero-title {
    font-size: 32px;
  }

  .hero-subtitle {
    font-size: 16px;
  }

  .hero-actions {
    flex-direction: column;
    align-items: center;
  }

  .hero-stats {
    flex-direction: column;
    gap: 20px;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .modules-container {
    grid-template-columns: 1fr;
  }

  .footer-content {
    grid-template-columns: 1fr;
  }
}
:deep(.el-card__header) {
  padding: 0;
}
</style>
