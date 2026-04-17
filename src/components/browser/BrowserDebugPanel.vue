<!--
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2026-04-10 00:00:00
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2026-04-11 00:00:00
 * @FilePath: \Vue3FrontEndDemoExercise\src\components\browser\BrowserDebugPanel.vue
 * @Description: RPA浏览器控制台 - 卡片式操作面板,包含可视化连接、自定义操作和Debug界面
-->
<template>
  <div class="browser-debug-panel">
    <!-- 顶部导航标签 -->
    <el-tabs v-model="activeTab" type="card" class="main-tabs mb-5">
      <!-- 可视化操作连接 -->
      <el-tab-pane name="visual-control">
        <template #label>
          <span class="flex items-center gap-1.5 text-sm">
            <el-icon><Connection /></el-icon>
            可视化操作
          </span>
        </template>
        <VisualControlPanel :browser-id="browserId" />
      </el-tab-pane>

      <!-- 自定义操作管理 -->
      <el-tab-pane name="custom-actions">
        <template #label>
          <span class="flex items-center gap-1.5 text-sm">
            <el-icon><Tools /></el-icon>
            自定义操作
          </span>
        </template>
        <CustomActionPanel :browser-id="browserId" />
      </el-tab-pane>

      <!-- Debug调试面板 -->
      <el-tab-pane name="debug">
        <template #label>
          <span class="flex items-center gap-1.5 text-sm">
            <el-icon><Cpu /></el-icon>
            Debug调试
          </span>
        </template>
        <DebugPanel :browser-id="browserId" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Connection, Tools, Cpu } from '@element-plus/icons-vue'
import VisualControlPanel from './VisualControlPanel.vue'
import CustomActionPanel from './CustomActionPanel.vue'
import DebugPanel from './DebugPanel.vue'

// Props
const props = defineProps({
  browserId: {
    type: String,
    required: true
  }
})

// 状态管理
const activeTab = ref('visual-control')
</script>
