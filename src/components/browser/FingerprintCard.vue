<!--
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-12-24 00:00:00
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-12-24 00:00:00
 * @FilePath: \Vue3FrontEndDemoExercise\src\components\browser\FingerprintCard.vue
 * @Description: 指纹卡片组件
-->
<template>
  <el-card 
    class="fingerprint-card"
    @click="$emit('click', fingerprint)"
  >
    <!-- 卡片头部 -->
    <div class="card-header">
      <div class="browser-info">
        <el-icon :size="24" color="#409EFF" class="browser-icon">
          <Monitor />
        </el-icon>
        <div class="browser-details">
          <h3 class="browser-name">{{ fingerprint.mid || '匿名用户' }}</h3>
          <div class="browser-platform">ID: {{ fingerprint.id_str || fingerprint.id }}</div>
        </div>
      </div>
      <div class="status-indicator">
        <el-tag size="small" :type="getBrowserType(fingerprint.fingerprint_browser)">
          {{ fingerprint.fingerprint_browser || '未知浏览器' }}
        </el-tag>
        <el-tag size="small" type="info" class="ml-2">
          {{ fingerprint.fingerprint_platform || '未知平台' }}
        </el-tag>
      </div>
    </div>

    <!-- 基本信息 -->
    <div class="basic-info">
      <div class="info-row">
        <span class="label">版本:</span>
        <span class="value">{{ fingerprint.fingerprint_brand_version || '未知' }}</span>
      </div>
      <div class="info-row">
        <span class="label">语言:</span>
        <span class="value">{{ fingerprint.lang || '未知' }}</span>
      </div>
      <div class="info-row">
        <span class="label">时区:</span>
        <span class="value">{{ fingerprint.timezone || '未知' }}</span>
      </div>
    </div>

    <!-- 硬件信息 -->
    <div class="hardware-info">
      <div class="hardware-row">
        <el-icon><Cpu /></el-icon>
        <span class="hardware-label">CPU:</span>
        <span class="hardware-value">{{ fingerprint.fingerprint_hardware_concurrency || 'N/A' }} 核</span>
      </div>
      <div class="hardware-row">
        <el-icon><VideoPlay /></el-icon>
        <span class="hardware-label">GPU:</span>
        <span class="hardware-value">{{ fingerprint.fingerprint_gpu_vendor?.split(' ')[0] || 'N/A' }}</span>
      </div>
    </div>

    <!-- 代理设置 -->
    <div class="proxy-info">
      <el-icon><Connection /></el-icon>
      <span class="proxy-label">代理:</span>
      <el-tag v-if="fingerprint.proxy_server" size="small" type="success">已配置</el-tag>
      <el-tag v-else size="small" type="info">未配置</el-tag>
    </div>

    <!-- 操作按钮 -->
    <div class="action-buttons">
      <el-button size="small" @click.stop="$emit('view', fingerprint)">查看</el-button>
      <el-button size="small" type="primary" @click.stop="$emit('edit', fingerprint)">编辑</el-button>
      <el-button size="small" type="danger" @click.stop="$emit('delete', fingerprint)">删除</el-button>
      <el-button size="small" type="success" @click.stop="$emit('start', fingerprint)" :loading="fingerprint.starting">
        启动
      </el-button>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { Monitor, Cpu, VideoPlay, Connection } from '@element-plus/icons-vue'
import type { UserBrowserInfoReadResp } from '@/types/browser-automation-api'

// 定义Props
interface Props {
  fingerprint: UserBrowserInfoReadResp & {
    starting?: boolean
  }
}

const props = defineProps<Props>()

// 定义Emit
const emit = defineEmits<{
  click: [fingerprint: UserBrowserInfoReadResp]
  view: [fingerprint: UserBrowserInfoReadResp]
  edit: [fingerprint: UserBrowserInfoReadResp]
  delete: [fingerprint: UserBrowserInfoReadResp]
  start: [fingerprint: UserBrowserInfoReadResp]
}>()

// 方法
const getBrowserType = (
  browser: string | null | undefined
): 'primary' | 'success' | 'warning' | 'danger' | 'info' => {
  if (!browser) {
    return 'info'
  }

  const browserTypes: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'info'> = {
    chrome: 'primary',
    Edge: 'success',
    Opera: 'warning',
    Vivaldi: 'danger'
  }
  return browserTypes[browser] || 'info'
}
</script>

<style scoped>
.fingerprint-card {
  cursor: pointer;
  transition: all 0.3s ease;
  margin-bottom: 16px;
}

.fingerprint-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.browser-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.browser-icon {
  flex-shrink: 0;
}

.browser-details {
  line-height: 1.2;
}

.browser-name {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.browser-platform {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.status-indicator {
  display: flex;
  gap: 4px;
}

.basic-info {
  margin-bottom: 12px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
  font-size: 12px;
}

.info-row .label {
  color: var(--el-text-color-secondary);
  min-width: 40px;
}

.info-row .value {
  color: var(--el-text-color-primary);
  font-weight: 500;
}

.hardware-info {
  margin-bottom: 12px;
}

.hardware-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
  font-size: 12px;
}

.hardware-label {
  color: var(--el-text-color-secondary);
  min-width: 30px;
}

.hardware-value {
  color: var(--el-text-color-primary);
  font-weight: 500;
}

.proxy-info {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
  font-size: 12px;
}

.proxy-label {
  color: var(--el-text-color-secondary);
}

.action-buttons {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
}

.action-buttons .el-button {
  flex: 1;
}
</style>