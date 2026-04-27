<!--
 * @FilePath: \Vue3FrontEndDemoExercise\src\components\browser\FingerprintCard.vue
 * @Description: 指纹卡片组件 - 重构提升视觉层级
-->
<template>
  <div
    class="fingerprint-card group relative flex flex-col gap-0 rounded-xl border border-[var(--el-border-color-lighter)] bg-[var(--el-bg-color)] overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(0,0,0,0.1)] hover:border-[var(--el-color-primary-light-5)]"
    @click="$emit('click', fingerprint)"
  >
    <!-- 卡片顶部装饰条 -->
    <div :class="['h-1 w-full', getBrowserGradient(fingerprint.fingerprint_browser)]"></div>

    <!-- 卡片主体 -->
    <div class="p-4 flex flex-col gap-3 flex-1">
      <!-- 头部：名称 + 浏览器标签 -->
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-center gap-2 min-w-0 flex-1">
            <div :class="['w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-white', getBrowserGradient(fingerprint.fingerprint_browser)]">
              <el-icon :size="18"><Monitor /></el-icon>
            </div>
            <div class="min-w-0 flex-1">
              <!-- 名称编辑模式 -->
              <div v-if="isEditing" class="flex items-center gap-1">
                <el-input
                  ref="nameInputRef"
                  v-model="editName"
                  size="small"
                  placeholder="输入自定义名称"
                  class="flex-1"
                  @keyup.enter="handleSaveName"
                  @blur="handleSaveName"
                />
                <el-button size="small" type="primary" text @click="handleSaveName">
                  <el-icon><Check /></el-icon>
                </el-button>
                <el-button size="small" text @click="handleCancelEdit">
                  <el-icon><Close /></el-icon>
                </el-button>
              </div>
              <!-- 名称显示模式 -->
              <div v-else class="flex items-center gap-1">
                <span
                  class="font-semibold text-sm text-[var(--el-text-color-primary)] truncate"
                  :title="fingerprint.custom_name || `未命名${fingerprint.id_str || fingerprint.id}`"
                >
                  {{ fingerprint.custom_name || `未命名${fingerprint.id_str || fingerprint.id}` }}
                </span>
                <el-button size="small" text @click.stop="handleStartEdit" title="修改名称">
                  <el-icon :size="12"><Edit /></el-icon>
                </el-button>
              </div>
              <div class="text-xs text-[var(--el-text-color-secondary)] font-mono truncate" :title="fingerprint.id_str || String(fingerprint.id)">
                {{ fingerprint.id_str || fingerprint.id }}
              </div>
            </div>
          </div>
        <div class="flex flex-col items-end gap-1 shrink-0">
          <el-tag size="small" :type="getBrowserTagType(fingerprint.fingerprint_browser)" effect="plain">
            {{ fingerprint.fingerprint_browser || '未知' }}
          </el-tag>
          <el-tag size="small" type="info" effect="plain">
            {{ fingerprint.fingerprint_platform || '未知平台' }}
          </el-tag>
        </div>
      </div>

      <!-- 信息列表 -->
      <div class="grid grid-cols-2 gap-x-3 gap-y-1.5">
        <div class="flex items-center gap-1.5 text-xs">
          <el-icon class="text-[var(--el-text-color-secondary)] shrink-0"><Flag /></el-icon>
          <span class="text-[var(--el-text-color-secondary)] shrink-0">版本</span>
          <span class="text-[var(--el-text-color-primary)] truncate font-medium">{{ fingerprint.fingerprint_brand_version || 'N/A' }}</span>
        </div>
        <div class="flex items-center gap-1.5 text-xs">
          <el-icon class="text-[var(--el-text-color-secondary)] shrink-0"><ChatDotRound /></el-icon>
          <span class="text-[var(--el-text-color-secondary)] shrink-0">语言</span>
          <span class="text-[var(--el-text-color-primary)] font-medium">{{ fingerprint.lang || 'N/A' }}</span>
        </div>
        <div class="flex items-center gap-1.5 text-xs">
          <el-icon class="text-[var(--el-text-color-secondary)] shrink-0"><Cpu /></el-icon>
          <span class="text-[var(--el-text-color-secondary)] shrink-0">CPU</span>
          <span class="text-[var(--el-text-color-primary)] font-medium">{{ fingerprint.fingerprint_hardware_concurrency || 'N/A' }} 核</span>
        </div>
        <div class="flex items-center gap-1.5 text-xs">
          <el-icon class="text-[var(--el-text-color-secondary)] shrink-0"><Clock /></el-icon>
          <span class="text-[var(--el-text-color-secondary)] shrink-0">时区</span>
          <span class="text-[var(--el-text-color-primary)] truncate font-medium">{{ fingerprint.timezone ? formatTimezone(fingerprint.timezone) : 'N/A' }}</span>
        </div>
      </div>

      <!-- 代理状态 -->
      <div class="flex items-center gap-1.5 text-xs">
        <el-icon :class="fingerprint.proxy_server ? 'text-green-500' : 'text-[var(--el-text-color-secondary)]'"><Connection /></el-icon>
        <span class="text-[var(--el-text-color-secondary)]">代理</span>
        <template v-if="fingerprint.proxy_server">
          <el-tag size="small" type="success" effect="plain">已配置</el-tag>
          <code class="text-[10px] text-[var(--el-text-color-secondary)] truncate max-w-[120px]" :title="fingerprint.proxy_server">
            {{ fingerprint.proxy_server }}
          </code>
        </template>
        <el-tag v-else size="small" type="info" effect="plain">未配置</el-tag>
      </div>
    </div>

    <!-- 操作区域 -->
    <div class="px-4 pb-3 pt-1 border-t border-[var(--el-border-color-extra-light)] flex items-center gap-2" @click.stop>
      <el-button size="small" text @click="$emit('view', fingerprint)" title="查看详情">
        <el-icon><View /></el-icon>
      </el-button>
      <el-button size="small" text @click="$emit('edit', fingerprint)" title="编辑指纹">
        <el-icon><Edit /></el-icon>
      </el-button>
      <el-button size="small" text type="danger" @click="$emit('delete', fingerprint)" title="删除指纹">
        <el-icon><Delete /></el-icon>
      </el-button>
      <el-button
        class="ml-auto"
        size="small"
        type="primary"
        @click="$emit('start', fingerprint)"
        :loading="(fingerprint as any).starting"
        round
      >
        <el-icon><VideoPlay /></el-icon>
        启动控制台
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Monitor, Cpu, VideoPlay, Connection, View, Edit, Delete, Flag, ChatDotRound, Clock, Check, Close } from '@element-plus/icons-vue'
import type { UserBrowserInfoReadResp } from '@/types/browser-automation-api'
import { ref, nextTick } from 'vue'
import type { InputInstance } from 'element-plus'

interface Props {
  fingerprint: UserBrowserInfoReadResp & { starting?: boolean }
}

const props = defineProps<Props>()

const emit = defineEmits<{
  click: [fingerprint: UserBrowserInfoReadResp]
  view: [fingerprint: UserBrowserInfoReadResp]
  edit: [fingerprint: UserBrowserInfoReadResp]
  delete: [fingerprint: UserBrowserInfoReadResp]
  start: [fingerprint: UserBrowserInfoReadResp]
  'quick-edit': [browserId: string, newName: string]
}>()

// 内联编辑状态
const isEditing = ref(false)
const editName = ref('')
const nameInputRef = ref<InputInstance>()

// 开始编辑
const handleStartEdit = () => {
  editName.value = props.fingerprint.custom_name || ''
  isEditing.value = true
  nextTick(() => {
    nameInputRef.value?.focus()
  })
}

// 保存名称
const handleSaveName = () => {
  const newName = editName.value.trim()
  if (!newName) return
  isEditing.value = false
  emit('quick-edit', String(props.fingerprint.id_str || props.fingerprint.id), newName)
}

// 取消编辑
const handleCancelEdit = () => {
  isEditing.value = false
  editName.value = ''
}

const getBrowserTagType = (browser: string | null | undefined): 'primary' | 'success' | 'warning' | 'danger' | 'info' => {
  if (!browser) return 'info'
  const map: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'info'> = {
    chrome: 'primary', Edge: 'success', Opera: 'warning', Vivaldi: 'danger'
  }
  return map[browser] || 'info'
}

const getBrowserGradient = (browser: string | null | undefined) => {
  const map: Record<string, string> = {
    chrome: 'bg-gradient-to-br from-blue-500 to-indigo-600',
    Edge: 'bg-gradient-to-br from-teal-500 to-cyan-600',
    Opera: 'bg-gradient-to-br from-red-500 to-orange-500',
    Vivaldi: 'bg-gradient-to-br from-pink-500 to-rose-600'
  }
  return map[browser || ''] || 'bg-gradient-to-br from-gray-400 to-gray-500'
}

const formatTimezone = (tz: string) => {
  // 简化时区显示，如 "Asia/Shanghai" -> "Asia/Shanghai"
  return tz.split('/').slice(-1)[0] || tz
}
</script>
