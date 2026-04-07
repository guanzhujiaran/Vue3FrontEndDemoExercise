<script setup lang="ts">
import { ref, computed } from 'vue'
import { useJwtStore } from '@/stores/jwt_token'
import biliMessage, { ElMessageBox } from '@/utils/message'
import { CoffeeCup } from '@element-plus/icons-vue'
import { processRoutesForHome } from '@/utils/routeUtils'
import { openGlobalLoginModalKey } from '@/models/inject/inject_type.ts'
import { KeysEnum, useInject } from '@/models/base/provide_model.ts'
import type { UserNavModel } from '@/models/user/user_model.ts'
import { routes } from '@/router'
import router from '@/router'
import { useUserNavStore } from '@/stores/user_nav'
const userNavStore = useUserNavStore()
const jwtStore = useJwtStore()
const activeTab = ref('all')
const openGlobalLoginModal = inject(openGlobalLoginModalKey, () => { })
// 从路由配置中提取功能模块
const routeModules = computed(() => {
  // 从路由配置中提取顶级模块
  let modules = processRoutesForHome(routes)

  // 按order排序
  modules.sort((a: any, b: any) => (a.order || 0) - (b.order || 0))

  return modules
})

// 根据当前选择的标签过滤模块
const filteredModules = computed(() => {
  if (activeTab.value === 'all') {
    return routeModules.value
  }
  return routeModules.value.filter((module: any) => module.id === activeTab.value)
})
const biliUser = useInject(KeysEnum.BiliUser) as Ref<UserNavModel>
const isLoggedIn = computed(() => !!biliUser.value.uid)
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
      biliUser.value = { 
        uid: '', 
        user_name: '', 
        role: '', 
        face: '',
        email: '',
        level_info: {
          current_exp: '',
          current_level: '',
          current_min: '',
          next_exp: ''
        }
      }
      biliMessage.success('已成功退出登录')
    })
    .catch(() => { })
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
      .catch(() => { })
    return
  }
  path && router.push(path)
}
</script>

<template>
  <div>
    <el-main>
      <!-- 顶部横幅 -->
      <section class="relative overflow-hidden px-5 py-16 text-center text-[var(--el-color-white)]" :style="{
        background:
          'linear-gradient(135deg, var(--el-color-primary) 0%, var(--el-color-warning) 35%, var(--el-color-success) 68%, var(--el-color-info) 100%)'
      }">
        <div class="relative z-10 mx-auto max-w-3xl">
          <h1 class="mb-4 text-4xl font-bold drop-shadow-lg md:text-5xl">BiliExplosion</h1>
          <p class="mb-8 text-base opacity-90 md:text-lg">Bilibili本社爆破</p>
          <div class="mb-6 flex flex-wrap justify-center gap-4">
            <el-button type="primary" size="large" @click="handleLoginClick" v-if="!isLoggedIn">
              <el-icon class="el-icon--left">
                <User />
              </el-icon>立即登录
            </el-button>
            <el-button type="warning" size="large" @click="router.push('/app/lot-data/bili-data/official')" v-else>
              <el-icon class="el-icon--left">
                <DataAnalysis />
              </el-icon>查看抽奖数据
            </el-button>
            <el-button type="info" size="large" @click="router.push('/app/Feedback')">
              <el-icon class="el-icon--left">
                <ChatSquare />
              </el-icon>提交反馈
            </el-button>
          </div>
        </div>
        <div class="mt-8 flex justify-center gap-10" v-if="isLoggedIn"></div>
      </section>

      <!-- 功能导航区 -->
      <section class="mx-auto w-full max-w-6xl px-5 py-10">
        <div class="mb-8 flex flex-wrap items-center justify-between gap-5">
          <h2 class="m-0 text-2xl font-semibold">功能导航</h2>
          <div>
            <el-radio-group v-model="activeTab" size="large">
              <el-radio-button label="all" value="all">全部</el-radio-button>
              <el-radio-button label="lottery" value="lottery">抽奖数据</el-radio-button>
              <el-radio-button label="user" value="user">浏览器管理</el-radio-button>
              <el-radio-button label="shopping" value="shopping">山姆会员商店</el-radio-button>
            </el-radio-group>
          </div>
        </div>

        <!-- 模块列表 -->
        <grid-container item-width="300px">
          <el-card v-for="(module, moduleIndex) in filteredModules" :key="moduleIndex" class="module-card"
            :body-style="{ padding: '0px' }" shadow="hover">
            <template #header style="padding: 0">
              <div class="flex items-center gap-3 px-5 py-4" :style="{ background: module.color }">
                <el-icon :size="24">
                  <component :is="module.icon || CoffeeCup" />
                </el-icon>
                <h3 class="m-0 text-base font-semibold">{{ module.title }}</h3>
              </div>
            </template>
            <template #default>
              <div class="p-5">
                <p class="mb-5 leading-6 text-[var(--el-text-color-regular)]">
                  {{ module.description }}
                </p>
                <!-- 如果有子项，显示子项列表 -->
                <div v-if="module.children && module.children.length" class="flex flex-col gap-3">
                  <div v-for="(child, childIndex) in module.children" :key="childIndex"
                    class="flex cursor-pointer items-center rounded-md border border-[var(--el-border-color)] p-3 transition hover:translate-x-1 hover:opacity-80"
                    @click="handleCardClick(child.path, module.requiresLogin)">
                    <div
                      class="mr-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--el-color-white)]"
                      :style="{ background: child.color }">
                      <el-icon :size="16">
                        <component :is="child.icon || CoffeeCup" />
                      </el-icon>
                    </div>
                    <div class="flex-1">
                      <h4 class="m-0 mb-1 text-sm font-bold">{{ child.title }}</h4>
                      <p class="m-0 text-xs text-[var(--el-text-color-secondary)]">
                        {{ child.description }}
                      </p>
                    </div>
                    <el-icon class="text-[var(--el-text-color-placeholder)]"><el-icon-arrow-right /></el-icon>
                  </div>
                </div>

                <!-- 如果没有子项，显示直接访问按钮 -->
                <div v-else class="mt-4 flex justify-center">
                  <el-button type="default" :plain="true" @click="handleCardClick(module.path, module.requiresLogin)">
                    立即访问
                  </el-button>
                </div>
              </div>
            </template>
          </el-card>
        </grid-container>
      </section>
    </el-main>

    <!-- 页脚 -->
    <div class="mt-16 bg-[var(--el-fill-color-dark)] text-[var(--el-text-color-placeholder)]">
      <div class="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-5 py-10 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <h3 class="mt-0 mb-4 text-lg font-semibold text-[var(--el-color-white)]">关于我</h3>
          <p class="leading-7">
            BiliExplosion是一个帮助B站用户管理和分析抽奖数据的工具，提供多种功能帮助您更好地参与B站活动。
          </p>
        </div>
        <div>
          <h3 class="mt-0 mb-4 text-lg font-semibold text-[var(--el-color-white)]">快速链接</h3>
          <ul class="m-0 list-none p-0">
            <li class="mb-2">
              <a class="cursor-pointer text-[var(--el-text-color-placeholder)] no-underline hover:text-blue-500"
                @click="router.push('/app/Feedback')">反馈建议</a>
            </li>
            <li class="mb-2">
              <a class="cursor-pointer text-[var(--el-text-color-placeholder)] no-underline hover:text-blue-500"
                @click="router.push('/app/user-center')">浏览器管理</a>
            </li>
            <li class="mb-2">
              <a class="cursor-pointer text-[var(--el-text-color-placeholder)] no-underline hover:text-blue-500"
                @click="router.push('/app/lot-data/bili-data/official')">抽奖数据</a>
            </li>
          </ul>
        </div>
        <div>
          <h3 class="mt-0 mb-4 text-lg font-semibold text-[var(--el-color-white)]">联系我一个人</h3>
          <p>邮箱: guanzhujiaran2022@163.com</p>
          <p>就我一个人写前后端，更新慢点见谅</p>
        </div>
      </div>
      <div class="bg-[var(--el-bg-color-page)] py-4 text-center text-sm">
        <p>&copy; 2025 BiliExplosion</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import '@/assets/components/home/module-card-tailwind.css';
@import '@/assets/components/home/news-section-tailwind.css';

:deep(.el-card__header) {
  padding: 0;
}
</style>