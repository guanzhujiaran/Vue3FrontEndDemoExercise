<template>
  <FlexContainer>
    <div class="lottery-home">
      <el-page-header title="返回" content="B站抽奖数据" @back="() => $router.back()" />
      <router-view v-slot="{ Component }">
        <keep-alive>
          <component :is="Component" v-if="Component" />
        </keep-alive>
      </router-view>
      <template v-if="$route.name === 'B站抽奖数据' || $route.name === '抽奖数据'">
        <div class="header-section">
          <h1>B站抽奖数据</h1>
          <p>查看和分析B站各类抽奖活动数据</p>
        </div>
        <el-row :gutter="20" class="stats-section">
          <el-col :span="8">
            <el-card class="stat-card">
              <div class="stat-content">
                <el-icon :size="32"><DataAnalysis /></el-icon>
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
                <el-icon :size="32"><Histogram /></el-icon>
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
                <el-icon :size="32"><Promotion /></el-icon>
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
                  <el-icon :size="24"><component :is="item.icon" /></el-icon>
                  <div class="nav-info">
                    <h3>{{ item.title }}</h3>
                    <p>{{ item.description }}</p>
                  </div>
                  <el-icon class="arrow-icon"><ArrowRight /></el-icon>
                </div>
              </el-card>
            </el-col>
          </el-row>
        </div>
      </template>
    </div>
  </FlexContainer>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import {
  DataAnalysis,
  Histogram,
  Promotion,
  ArrowRight,
  Setting,
  Location,
  Lightning,
  CreditCard
} from '@element-plus/icons-vue'

const router = useRouter()

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
    title: '中奖统计',
    description: '查看B站中奖排行榜',
    path: '/app/lot-data/bili-atari-ranking',
    icon: Location
  }
]

const goTo = (path: string) => {
  router.push(path)
}
</script>

<style scoped>
.lottery-home {
  width: inherit;
  height: inherit;
  margin: 0 auto;
  padding: var(--el-main-padding);
}

.header-section {
  text-align: center;
  margin: 30px 0;
}

.header-section h1 {
  font-size: 2.5rem;
  color: var(--el-text-color-primary);
  margin-bottom: 10px;
}

.header-section p {
  font-size: 1.1rem;
  color: var(--el-text-color-regular);
}

.stats-section {
  margin: 30px 0;
}

.stat-card {
  cursor: pointer;
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 15px;
}

.stat-info h3 {
  margin: 0 0 5px 0;
  font-size: 1.2rem;
  color: var(--el-text-color-primary);
}

.stat-info p {
  margin: 0;
  font-size: 0.9rem;
  color: var(--el-text-color-secondary);
}

.navigation-section {
  margin: 40px 0;
}

.navigation-section h2 {
  font-size: 1.8rem;
  color: var(--el-text-color-primary);
  margin-bottom: 20px;
}

.nav-card {
  cursor: pointer;
  margin-bottom: 20px;
  transition: all 0.3s ease;
}

.nav-card:hover {
  transform: translateX(5px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.nav-content {
  display: flex;
  align-items: center;
  gap: 15px;
}

.nav-info {
  flex: 1;
}

.nav-info h3 {
  margin: 0 0 5px 0;
  font-size: 1.1rem;
  color: var(--el-text-color-primary);
}

.nav-info p {
  margin: 0;
  font-size: 0.9rem;
  color: var(--el-text-color-secondary);
}

.arrow-icon {
  color: var(--el-text-color-placeholder);
}
</style>
