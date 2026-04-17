<script setup lang="ts">
import router from '@/router'
import { Setting, DataAnalysis, Trophy, Promotion, Lightning, CreditCard, ChatDotRound } from '@element-plus/icons-vue'

const navigationItems = [
  {
    title: '爬虫状态',
    description: '查看数据爬虫的运行状态',
    path: '/app/lot-data/scrapy-stat',
    icon: Setting,
    color: 'var(--color-gradient-hero-warm)'
  },
  {
    title: '中奖统计',
    description: '查看B站中奖排行榜',
    path: '/app/lot-data/bili-atari-ranking',
    icon: Trophy,
    color: 'var(--color-gradient-hero-elegant)'
  },
  {
    title: '官方抽奖',
    description: 'B站官方活动抽奖数据',
    path: '/app/lot-data/bili-data/official',
    icon: Promotion,
    color: 'var(--color-gradient-lottery-item)'
  },
  {
    title: '预约抽奖',
    description: 'B站预约活动抽奖数据',
    path: '/app/lot-data/bili-data/reserve',
    icon: Lightning,
    color: 'var(--color-gradient-lottery-item)'
  },
  {
    title: '充电抽奖',
    description: 'B站充电活动抽奖数据',
    path: '/app/lot-data/bili-data/charge',
    icon: CreditCard,
    color: 'var(--color-gradient-lottery-item)'
  },
  {
    title: '话题抽奖',
    description: 'B站话题活动抽奖数据',
    path: '/app/lot-data/bili-data/topic',
    icon: ChatDotRound,
    color: 'var(--color-gradient-lottery-item)'
  }
]

const goTo = (path: string) => {
  router.push(path)
}
</script>

<template>
  <div class="lottery-home">
    <!-- 顶部横幅 -->
    <section class="relative overflow-hidden px-5 py-16 text-center text-white md:py-20"
      style="background: var(--color-gradient-hero-vibrant)">
      <div class="pointer-events-none absolute -left-20 -top-20 h-80 w-80 rounded-full bg-white/10 blur-3xl"></div>
      <div class="pointer-events-none absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-white/10 blur-3xl"></div>

      <div class="relative z-10 mx-auto max-w-3xl">
        <el-text class="mb-3 block text-4xl font-bold tracking-tight drop-shadow-lg md:text-5xl"
          tag="h1">B站抽奖数据</el-text>
        <el-text class="mb-8 block text-lg opacity-90 md:text-xl" tag="p">
          查看和分析B站各类抽奖活动数据，包括官方抽奖、预约抽奖、充电抽奖和话题抽奖等
        </el-text>
        <div class="flex flex-wrap justify-center gap-3">
          <el-button type="primary" size="large" @click="router.push('/app/lot-data/bili-data/official')"
            class="shadow-lg!">
            <el-icon class="el-icon--left">
              <Promotion />
            </el-icon>
            官方抽奖
          </el-button>
          <el-button type="success" size="large" @click="router.push('/app/lot-data/bili-atari-ranking')"
            class="shadow-lg!">
            <el-icon class="el-icon--left">
              <Trophy />
            </el-icon>
            中奖统计
          </el-button>
          <el-button type="warning" size="large" @click="router.push('/app/lot-data/scrapy-stat')"
            class="shadow-lg!">
            <el-icon class="el-icon--left">
              <Setting />
            </el-icon>
            爬虫状态
          </el-button>
        </div>
      </div>
    </section>

    <!-- 功能导航区 -->
    <section class="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div class="mb-6">
        <el-text class="m-0 block text-2xl font-semibold tracking-tight" tag="h2">功能导航</el-text>
        <el-text class="mt-1 block text-sm text-text-secondary" tag="p">选择你需要的功能开始使用</el-text>
      </div>

      <!-- 模块列表：两列布局 -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- 每个功能作为独立卡片 -->
        <div v-for="item in navigationItems" :key="item.path"
          class="flex cursor-pointer flex-col overflow-hidden rounded-xl border border-border shadow-sm hover:shadow-md transition-all duration-200"
          @click="goTo(item.path)">
          <!-- 卡片头部 -->
          <div class="flex items-center gap-3 px-5 py-4 text-white" :style="{ background: item.color }">
            <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <el-icon :size="20" class="text-white">
                <component :is="item.icon" />
              </el-icon>
            </div>
            <el-text class="m-0 text-base font-semibold drop-shadow-sm" tag="h3">{{ item.title }}</el-text>
          </div>
          <!-- 卡片内容 -->
          <div class="flex min-h-16 flex-1 flex-col justify-center p-5 bg-bg hover:bg-fill-light/90 transition-colors duration-200">
            <p class="text-sm leading-6 text-text-regular">
              {{ item.description }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- 数据概览区 -->
    <section class="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div class="mb-6">
        <el-text class="m-0 block text-2xl font-semibold tracking-tight" tag="h2">数据概览</el-text>
        <el-text class="mt-1 block text-sm text-text-secondary" tag="p">快速查看各类抽奖数据的统计信息</el-text>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="flex flex-col overflow-hidden rounded-xl border border-border shadow-sm hover:shadow-md transition-all duration-200">
          <div class="flex items-center gap-3 px-5 py-4 text-white"
            style="background: var(--color-gradient-module-primary)">
            <el-icon :size="24" class="text-white">
              <DataAnalysis />
            </el-icon>
            <el-text class="m-0 text-base font-semibold drop-shadow-sm" tag="h3">综合统计</el-text>
          </div>
          <div class="flex min-h-20 flex-1 flex-col justify-center p-5 bg-bg hover:bg-fill-light/90">
            <p class="text-sm leading-6 text-text-regular">
              查看所有抽奖类型的汇总统计信息，包括总数据量、最新更新时间等
            </p>
          </div>
        </div>

        <div class="flex flex-col overflow-hidden rounded-xl border border-border shadow-sm hover:shadow-md transition-all duration-200">
          <div class="flex items-center gap-3 px-5 py-4 text-white"
            style="background: var(--color-gradient-module-success)">
            <el-icon :size="24" class="text-white">
              <Trophy />
            </el-icon>
            <el-text class="m-0 text-base font-semibold drop-shadow-sm" tag="h3">中奖榜单</el-text>
          </div>
          <div class="flex min-h-20 flex-1 flex-col justify-center p-5 bg-bg hover:bg-fill-light/90">
            <p class="text-sm leading-6 text-text-regular">
              查看B站中奖排行榜，了解哪些用户参与抽奖最为活跃
            </p>
          </div>
        </div>

        <div class="flex flex-col overflow-hidden rounded-xl border border-border shadow-sm hover:shadow-md transition-all duration-200">
          <div class="flex items-center gap-3 px-5 py-4 text-white"
            style="background: var(--color-gradient-module-warning)">
            <el-icon :size="24" class="text-white">
              <Promotion />
            </el-icon>
            <el-text class="m-0 text-base font-semibold drop-shadow-sm" tag="h3">最新活动</el-text>
          </div>
          <div class="flex min-h-20 flex-1 flex-col justify-center p-5 bg-bg hover:bg-fill-light/90">
            <p class="text-sm leading-6 text-text-regular">
              浏览近期热门的抽奖活动，获取最新的抽奖动态和参与机会
            </p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>



