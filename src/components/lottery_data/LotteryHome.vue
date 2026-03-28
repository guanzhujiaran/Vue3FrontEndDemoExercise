<script setup lang="ts">
import router from '@/router'
import { Setting, Location, Promotion, Lightning, CreditCard, ChatDotRound } from '@element-plus/icons-vue'

const navigationItems = [
  {
    title: '爬虫状态',
    description: '查看数据爬虫的运行状态',
    path: '/app/lot-data/scrapy-stat',
    icon: Setting
  },
  {
    title: '中奖统计',
    description: '查看B站中奖排行榜',
    path: '/app/lot-data/bili-atari-ranking',
    icon: Location
  },
  {
    title: '官方抽奖',
    description: 'B站官方活动抽奖数据',
    path: '/app/lot-data/bili-data/official',
    icon: Promotion
  },
  {
    title: '预约抽奖',
    description: 'B站预约活动抽奖数据',
    path: '/app/lot-data/bili-data/reserve',
    icon: Lightning
  },
  {
    title: '充电抽奖',
    description: 'B站充电活动抽奖数据',
    path: '/app/lot-data/bili-data/charge',
    icon: CreditCard
  },
  {
    title: '话题抽奖',
    description: 'B站话题活动抽奖数据',
    path: '/app/lot-data/bili-data/topic',
    icon: ChatDotRound
  }
]

const goTo = (path: string) => {
  router.push(path)

}
</script>

<template>
  <div class="lottery-home">
    <div class="header-section">
      <h1>B站抽奖数据</h1>
      <p>查看和分析B站各类抽奖活动数据</p>
    </div>
    <el-row :gutter="20" class="stats-section">
      <el-col :span="8">
        <el-card class="stat-card">
          <div class="stat-content">
            <el-icon :size="32">
              <DataAnalysis />
            </el-icon>
            <div class="stat-info">
              <h3>数据概览</h3>
              <p>综合统计信息</p>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card class="stat-card">
          <div class="stat-content">
            <el-icon :size="32">
              <Histogram />
            </el-icon>
            <div class="stat-info">
              <h3>图表分析</h3>
              <p>可视化数据展示</p>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card class="stat-card">
          <div class="stat-content">
            <el-icon :size="32">
              <Promotion />
            </el-icon>
            <div class="stat-info">
              <h3>最新活动</h3>
              <p>近期抽奖信息</p>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
    <div class="navigation-section">
      <h2>功能导航</h2>
      <el-row :gutter="20">
        <el-col :span="12" v-for="item in navigationItems" :key="item.path">
          <el-card class="nav-card" @click="goTo(item.path)">
            <div class="nav-content">
              <el-icon :size="24">
                <component :is="item.icon" />
              </el-icon>
              <div class="nav-info">
                <h3>{{ item.title }}</h3>
                <p>{{ item.description }}</p>
              </div>
              <el-icon class="arrow-icon">
                <ArrowRight />
              </el-icon>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<style scoped>
@import '@/assets/views/lottery-data-stat-tailwind.css';
</style>
