<!--
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-12-24 00:00:00
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-12-24 00:00:00
 * @FilePath: \Vue3FrontEndDemoExercise\src\components\browser\FingerprintDetailDialog.vue
 * @Description: RPA浏览器控制台 - 指纹详情对话框组件
-->
<template>
  <el-dialog title="指纹详情" v-model="visible" width="800px" @close="handleClose">
    <el-descriptions :column="2" border v-if="fingerprint">
      <el-descriptions-item label="ID">{{ fingerprint.id_str || fingerprint.id }}</el-descriptions-item>
      <el-descriptions-item label="用户ID">{{ fingerprint.mid }}</el-descriptions-item>
      <el-descriptions-item label="创建时间">{{ formatTime(fingerprint.created_at) }}</el-descriptions-item>
      <el-descriptions-item label="更新时间">{{ formatTime(fingerprint.updated_at) }}</el-descriptions-item>

      <el-descriptions-item label="浏览器">{{ fingerprint.fingerprint_browser }}</el-descriptions-item>
      <el-descriptions-item label="平台">{{ fingerprint.fingerprint_platform }}</el-descriptions-item>
      <el-descriptions-item label="版本">{{ fingerprint.fingerprint_brand_version }}</el-descriptions-item>

      <el-descriptions-item label="CPU核心">{{ fingerprint.fingerprint_hardware_concurrency }}</el-descriptions-item>
      <el-descriptions-item label="GPU厂商">{{ fingerprint.fingerprint_gpu_vendor }}</el-descriptions-item>
      <el-descriptions-item label="GPU渲染器">{{ fingerprint.fingerprint_gpu_renderer }}</el-descriptions-item>

      <el-descriptions-item label="语言" :span="2">{{ fingerprint.lang }}</el-descriptions-item>
      <el-descriptions-item label="时区">{{ fingerprint.timezone }}</el-descriptions-item>

      <el-descriptions-item label="Accept-Language" :span="2">{{ fingerprint.accept_lang }}</el-descriptions-item>
      <el-descriptions-item label="代理服务器" :span="2">{{ fingerprint.proxy_server || '未配置' }}</el-descriptions-item>
    </el-descriptions>

    <template #footer>
      <span class="flex justify-end gap-3">
        <el-button type="primary" @click="openDebugPanel" v-if="fingerprint">
          <el-icon><Operation /></el-icon>
          调试面板
        </el-button>
        <el-button @click="handleClose">关闭</el-button>
      </span>
    </template>
  </el-dialog>

  <!-- 调试面板对话框 -->
  <el-dialog
    v-model="debugPanelVisible"
    title="前端调试面板"
    width="90%"
    :fullscreen="true"
    destroy-on-close
    @close="closeDebugPanel"
  >
    <BrowserDebugPanel
      v-if="debugPanelVisible && fingerprint"
      :browser-id="String(fingerprint.id)"
    />
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Operation } from '@element-plus/icons-vue'
import type { UserBrowserInfoReadResp } from '@/types/browser-automation-api'
import BrowserDebugPanel from './BrowserDebugPanel.vue'

// 定义Model
const visible = defineModel<boolean>('visible', { default: false })

// 定义Props
interface Props {
  fingerprint: UserBrowserInfoReadResp | null
}

const props = defineProps<Props>()

// 调试面板可见性
const debugPanelVisible = ref(false)

// 格式化时间
const formatTime = (time: string | undefined) => {
  if (!time) return '未知'
  return new Date(time).toLocaleString('zh-CN')
}

// 关闭对话框
const handleClose = () => {
  visible.value = false
}

// 打开调试面板
const openDebugPanel = () => {
  if (props.fingerprint) {
    debugPanelVisible.value = true
    visible.value = false
  }
}

// 关闭调试面板
const closeDebugPanel = () => {
  debugPanelVisible.value = false
  visible.value = true
}
</script>

