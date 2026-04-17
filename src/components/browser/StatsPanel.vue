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
          <el-icon class="stat-icon fill-primary"><UserFilled /></el-icon>
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
          <el-icon class="stat-icon fill-success"><ChromeFilled /></el-icon>
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
          <el-icon class="stat-icon fill-warning"><Monitor /></el-icon>
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
          <el-icon class="stat-icon fill-danger"><Monitor /></el-icon>
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