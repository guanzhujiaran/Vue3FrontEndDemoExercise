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
.stats-section {
  margin-bottom: 20px;
}

.stat-card {
  height: 100%;
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stat-icon {
  font-size: 32px;
  flex-shrink: 0;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1;
}
</style>