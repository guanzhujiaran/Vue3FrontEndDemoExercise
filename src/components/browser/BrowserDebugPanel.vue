<!--
 * @FilePath: \Vue3FrontEndDemoExercise\src\components\browser\BrowserDebugPanel.vue
 * @Description: RPA浏览器控制台 - 主调试面板，竖向可收起 Tab 布局
-->
<template>
  <div class="flex flex-col h-full w-full">
    <div class="flex flex-1 min-h-0">
      <!-- 左侧导航栏 -->
      <div class="flex flex-col bg-[var(--el-bg-color)] border-r border-[var(--el-border-color-lighter)] transition-all duration-250 ease w-[100px]" :class="{ 'w-[52px]': isCollapsed }">
        <nav class="flex flex-col gap-0.5 p-2 flex-1">
          <button
            v-for="tab in tabs"
            :key="tab.name"
            class="flex flex-col items-center gap-1 py-2.5 px-1 border-none bg-transparent rounded-lg cursor-pointer text-[var(--el-text-color-regular)] transition-all duration-200 whitespace-nowrap"
            :class="{ 'active bg-[var(--el-color-primary-light-9)] text-[var(--el-color-primary)]': activeTab === tab.name, 'hover:bg-[var(--el-fill-color-light)] hover:text-[var(--el-color-primary)]': activeTab !== tab.name }"
            :title="isCollapsed ? tab.label : ''"
            @click="activeTab = tab.name"
          >
            <el-icon :size="20"><component :is="tab.icon" /></el-icon>
            <span v-if="!isCollapsed" class="text-[12px] leading-tight"> {{ tab.label }}</span>
          </button>
        </nav>

        <!-- 收起/展开按钮 -->
        <button
          class="flex items-center justify-center p-2 border-none border-t border-[var(--el-border-color-lighter)] bg-transparent cursor-pointer text-[var(--el-text-color-secondary)] transition-colors duration-200 hover:text-[var(--el-color-primary)]"
          :title="isCollapsed ? '展开侧边栏' : '收起侧边栏'"
          @click="isCollapsed = !isCollapsed"
        >
          <el-icon :size="16">
            <Fold v-if="!isCollapsed" />
            <Expand v-else />
          </el-icon>
        </button>
      </div>

      <!-- 右侧内容区 -->
      <div class="flex-1 min-w-0 min-h-0 flex flex-col">
        <div class="flex-1 min-h-0 overflow-y-auto p-3">
          <!-- 实时视频控制（WebRTC）-->
          <WebRTCStreamPanel
            v-if="activeTab === 'webrtc'"
            :browser-id="browserId"
          />

          <!-- 可视化操作连接 -->
          <VisualControlPanel
            v-if="activeTab === 'visual-control'"
            :browser-id="browserId"
            @switch-tab="activeTab = $event"
          />

          <!-- 自定义操作管理 -->
          <CustomActionPanel
            v-if="activeTab === 'custom-actions'"
            :browser-id="browserId"
          />

          <!-- Debug调试面板 -->
          <DebugPanel
            v-if="activeTab === 'debug'"
            :browser-id="browserId"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, markRaw } from 'vue'
import { Connection, Tools, Cpu, VideoCamera, Fold, Expand } from '@element-plus/icons-vue'
import VisualControlPanel from './VisualControlPanel.vue'
import CustomActionPanel from './CustomActionPanel.vue'
import DebugPanel from './DebugPanel.vue'
import WebRTCStreamPanel from './WebRTCStreamPanel.vue'

// Props
const props = defineProps({
  browserId: {
    type: String,
    required: true
  }
})

// Tab 定义
const tabs = [
  { name: 'webrtc', label: '实时控制', icon: markRaw(VideoCamera) },
  { name: 'visual-control', label: '可视化操作', icon: markRaw(Connection) },
  { name: 'custom-actions', label: '自定义操作', icon: markRaw(Tools) },
  { name: 'debug', label: 'Debug 调试', icon: markRaw(Cpu) }
]

// 状态管理
const activeTab = ref('webrtc')
const isCollapsed = ref(false)
</script>


