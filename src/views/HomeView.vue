<script setup lang="ts">
import { ref, computed, inject } from 'vue'
import { useJwtStore } from '@/stores/jwt_token'
import biliMessage, { ElMessageBox } from '@/utils/message'
import { CoffeeCup } from '@element-plus/icons-vue'
import { processRoutesForHome } from '@/utils/routeUtils'
import { openGlobalLoginModalKey } from '@/models/inject/inject_type.ts'
import { KeysEnum, useInject } from '@/models/base/provide_model.ts'
import type { UserNavModel } from '@/models/user/user_model.ts'
import { routes } from '@/router'
import router from '@/router'
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
    <el-main class="p-0!">
      <!-- 顶部横幅 - 增强视觉效果 -->
      <section class="relative overflow-hidden px-5 py-20 text-center text-white md:py-28"
        style="background: var(--color-gradient-hero-primary)">
        <!-- 半透明遮罩层提升文字可读性 -->
        <div class="absolute inset-0 bg-linear-to-b from-black/20 via-transparent to-black/30"></div>
        <!-- 装饰性光晕 -->
        <div class="pointer-events-none absolute -left-20 -top-20 h-80 w-80 rounded-full bg-white/10 blur-3xl"></div>
        <div class="pointer-events-none absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-white/10 blur-3xl">
        </div>

        <div class="relative z-10 mx-auto max-w-3xl">
          <el-text class="mb-3 block text-5xl font-bold tracking-tight drop-shadow-lg md:text-6xl"
            tag="h1">BiliExplosion</el-text>
          <el-text class="mb-8 block text-lg opacity-90 md:text-xl" tag="p">哔哩哔哩本社爆破</el-text>
          <div class="flex flex-wrap justify-center gap-3">
            <el-button type="primary" size="large" @click="handleLoginClick" v-if="!isLoggedIn" class="shadow-lg!">
              <el-icon class="el-icon--left">
                <User />
              </el-icon>
              立即登录
            </el-button>
            <el-button type="primary" size="large" @click="router.push('/app/lot-data/bili-data/official')" v-else
              class="shadow-lg!">
              <el-icon class="el-icon--left">
                <DataAnalysis />
              </el-icon>
              查看抽奖数据
            </el-button>
            <el-button type="info" size="large" @click="router.push('/app/Feedback')" class="shadow-lg!">
              <el-icon class="el-icon--left">
                <ChatSquare />
              </el-icon>
              提交反馈
            </el-button>
          </div>
        </div>
      </section>

      <div class="mt-8 flex justify-center gap-10" v-if="isLoggedIn"></div>
    </el-main>

    <!-- 功能导航区 -->
    <section class="mx-5 py-10 lg:mx-10 sm:px-0 sm:mx-0">
      <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <el-text class="m-0 block text-2xl font-semibold tracking-tight" tag="h2">功能导航</el-text>
          <el-text class="mt-1 block text-sm" tag="p">选择你需要的工具开始使用</el-text>
        </div>
        <div>
          <el-radio-group v-model="activeTab" size="large">
            <el-radio-button value="all">全部</el-radio-button>
            <el-radio-button value="lottery">抽奖数据</el-radio-button>
            <el-radio-button value="user-center">浏览器管理</el-radio-button>
            <el-radio-button value="shopping">山姆会员商店</el-radio-button>
            <el-radio-button value="feedback">反馈区</el-radio-button>
          </el-radio-group>
        </div>
      </div>

      <!-- 模块列表：两列布局，卡片之间有间距 -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- 每个模块作为独立卡片 -->
        <div v-for="(module, index) in filteredModules" :key="index"
          class="flex flex-col overflow-hidden rounded-xl border border-border shadow-sm hover:shadow-md transition-all duration-200">
          <!-- 模块头部 -->
          <div class="flex items-center gap-3 px-5 py-4 text-white" :style="{ background: module.color }">
            <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <el-icon :size="20" class="text-white">
                <component :is="module.icon || CoffeeCup" />
              </el-icon>
            </div>
            <el-text class="m-0 text-base font-semibold drop-shadow-sm" tag="h3">{{ module.title }}</el-text>
          </div>
          <!-- 模块内容 -->
          <div class="flex min-h-3xl flex-1 flex-col p-5 bg-bg hover:bg-fill-light/90">
            <p class="mb-4 text-sm leading-6 text-text-regular">
              {{ module.description }}
            </p>
            <!-- 如果有子项，显示子项列表 -->
            <div v-if="module.children && module.children.length"
              class="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border">
              <div v-for="(child, childIndex) in module.children" :key="childIndex"
                class="group flex cursor-pointer items-center p-3 transition-all duration-150 hover:bg-fill-light"
                @click="handleCardClick(child.path, module.requiresLogin)">
                <div class="mr-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
                  :style="{ background: child.color }">
                  <el-icon :size="15">
                    <component :is="child.icon || CoffeeCup" />
                  </el-icon>
                </div>
                <div class="min-w-0 flex-1">
                  <el-text class="m-0 mb-0.5 block text-sm font-semibold" tag="h4">{{ child.title }}</el-text>
                  <el-text class="m-0 block truncate text-xs text-text-secondary" tag="p">
                    {{ child.description }}
                  </el-text>
                </div>
                <el-icon
                  class="shrink-0 text-text-secondary transition-transform duration-150 group-hover:translate-x-0.5">
                  <el-icon-arrow-right />
                </el-icon>
              </div>
            </div>

            <!-- 如果没有子项，显示直接访问按钮 -->
            <div v-else class="flex justify-center">
              <el-button type="default" :plain="true" @click="handleCardClick(module.path, module.requiresLogin)">
                立即访问
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 页脚 -->
    <footer class="mt-16 border-t border-border-lighter bg-fill-light/50">
      <div class="mx-auto max-w-6xl px-5 py-12">
        <div class="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <el-text class="mb-4 block text-base font-semibold" tag="h3">关于我</el-text>
            <el-text class="text-sm leading-7 text-text-regular">
              BiliExplosion是一个帮助B站用户管理和分析抽奖数据的工具，提供多种功能帮助您更好地参与B站活动。
            </el-text>
          </div>
          <div>
            <el-text class="mb-4 block text-base font-semibold" tag="h3">快速链接</el-text>
            <ul class="m-0 list-none space-y-2.5 p-0">
              <li>
                <el-link class="text-sm! no-underline" @click="router.push('/app/Feedback')">
                  反馈建议
                </el-link>
              </li>
              <li>
                <el-link class="text-sm! no-underline" @click="router.push('/app/user-center')">
                  浏览器管理
                </el-link>
              </li>
              <li>
                <el-link class="text-sm! no-underline" @click="router.push('/app/lot-data/bili-data/official')">
                  抽奖数据
                </el-link>
              </li>
            </ul>
          </div>
          <div>
            <el-text class="mb-4 block text-base font-semibold" tag="h3">联系我</el-text>
            <el-text class="block text-sm text-text-regular" tag="p">邮箱: guanzhujiaran2022@163.com</el-text>
            <el-text class="mt-2 block text-sm text-text-secondary" tag="p">就我一个人写前后端，更新慢点见谅</el-text>
          </div>
        </div>
        <div class="mt-8 border-t border-border-lighter pt-8 text-center">
          <el-text class="text-xs text-text-secondary" tag="p">&copy; 2025 BiliExplosion. All rights reserved.</el-text>
        </div>
      </div>
    </footer>
  </div>
</template>