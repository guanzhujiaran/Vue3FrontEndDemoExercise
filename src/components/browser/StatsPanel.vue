<!--
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-12-24 00:00:00
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-12-24 00:00:00
 * @FilePath: \Vue3FrontEndDemoExercise\src\components\browser\StatsPanel.vue
 * @Description: 统计面板组件
-->
<template>
  <el-row :gutter="16" class="stats-section">
    <el-col :span="6">
      <el-card class="stat-card">
        <div class="stat-content">
          <el-icon class="stat-icon" color="#409EFF"><UserFilled /></el-icon>
          <div class="stat-info">
            <div class="stat-value">{{ stats.total }}</div>
            <div class="stat-label">指纹总数</div>
          </div>
        </div>
      </el-card>
    </el-col>
    <el-col :span="6">
      <el-card class="stat-card">
        <div class="stat-content">
          <el-icon class="stat-icon" color="#67C23A"><ChromeFilled /></el-icon>
          <div class="stat-info">
            <div class="stat-value">{{ stats.chrome }}</div>
            <div class="stat-label">Chrome</div>
          </div>
        </div>
      </el-card>
    </el-col>
    <el-col :span="6">
      <el-card class="stat-card">
        <div class="stat-content">
          <el-icon class="stat-icon" color="#E6A23C"><Monitor /></el-icon>
          <div class="stat-info">
            <div class="stat-value">{{ stats.edge }}</div>
            <div class="stat-label">Edge</div>
          </div>
        </div>
      </el-card>
    </el-col>
    <el-col :span="6">
      <el-card class="stat-card">
        <div class="stat-content">
          <el-icon class="stat-icon" color="#F56C6C"><Monitor /></el-icon>
          <div class="stat-info">
            <div class="stat-value">{{ stats.windows }}</div>
            <div class="stat-label">Windows</div>
          </div>
        </div>
      </el-card>
    </el-col>
  </el-row>
</template>

<script setup lang="ts">
import { UserFilled, ChromeFilled, Monitor } from '@element-plus/icons-vue'

// 定义Props
interface Props {
  stats: {
    total: number
    chrome: number
    edge: number
    windows: number
  }
}

const props = defineProps<Props>()
</script>

<style scoped>
@import '@/assets/components/browser/stats-panel-tailwind.css';

/* 基础样式已在 tailwind.css 的 @layer components 中定义 */
</style>