<template>
  <div class="plugin-management-workspace flex gap-2 h-full p-2 overflow-hidden">
    <!-- 左侧：插件列表 -->
    <aside class="plugin-list w-48 flex flex-col gap-1.5 overflow-y-auto shrink-0 bg-white rounded-lg border border-[var(--el-border-color-lighter)] p-2 shadow-sm">
      <div
        v-for="plugin in plugins"
        :key="plugin.id || plugin.plugin_id"
        class="plugin-card group relative p-2 rounded-lg border transition-all cursor-pointer"
        :class="getPluginCardClass(plugin)"
        @click="selectPlugin(plugin)"
      >
        <!-- 钩子数量指示器 -->
        <div v-if="getPluginHooks(plugin).length > 0" class="absolute -top-1 -right-1 z-10">
          <el-tooltip
            :content="`${getPluginHooks(plugin).length} 个钩子`"
            placement="top"
          >
            <span
              class="inline-flex items-center justify-center w-4 h-4 rounded-full text-white text-[9px] font-bold shadow-md"
              :class="isTriggering(plugin) ? 'bg-purple-500 animate-pulse' : 'bg-purple-400'"
            >
              {{ getPluginHooks(plugin).length }}
            </span>
          </el-tooltip>
        </div>

        <!-- 插件信息 -->
        <div class="flex items-center gap-1.5 mb-1 pr-4">
          <el-icon :size="14" class="text-primary"><Box /></el-icon>
          <span class="text-xs font-medium truncate flex-1">{{ plugin.name }}</span>
        </div>

        <div class="flex items-center gap-1 mb-1">
          <el-switch
            v-model="plugin.active"
            size="small"
            @change="(val: boolean) => togglePluginStatus(plugin, val)"
            @click.stop
          />
          <el-tag v-if="plugin.version" size="small" type="info" effect="plain" class="!text-[10px]">v{{ plugin.version }}</el-tag>
        </div>

        <p class="text-[10px] text-[var(--el-text-color-placeholder)] m-0 truncate font-mono">
          {{ plugin.plugin_id || plugin.id }}
        </p>

        <!-- 选中时显示钩子列表 -->
        <div
          v-if="selectedPlugin?.id === (plugin.id || plugin.plugin_id) && getPluginHooks(plugin).length > 0 && !compactMode"
          class="mt-2 pt-2 border-t border-dashed border-[var(--el-border-color-lighter)] space-y-1"
        >
          <div
            v-for="hook in getPluginHooks(plugin)"
            :key="hook.name"
            class="flex items-center gap-1.5 px-1.5 py-1 rounded text-[10px] bg-purple-50/80"
            :class="{ 'ring-1 ring-purple-400': isHookTriggering(plugin, hook.name) }"
          >
            <span
              class="w-2 h-2 rounded-full shrink-0"
              :class="isHookTriggering(plugin, hook.name) ? 'bg-purple-500 animate-ping' : 'bg-purple-300'"
            />
            <el-tag size="small" type="warning" effect="plain" class="!text-[10px] !py-0 !px-1 shrink-0">{{ hook.type }}</el-tag>
            <span class="text-purple-700 truncate flex-1 font-medium">{{ hook.name }}</span>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="plugins.length === 0 && !loading" class="text-center py-8 text-xs text-[var(--el-text-color-placeholder)]">
        暂无已加载的插件
      </div>
    </aside>

    <!-- 右侧：插件详情 -->
    <main class="plugin-detail flex-1 flex flex-col gap-2 min-w-0 overflow-y-auto">
      <!-- 插件详情卡片 -->
      <section v-if="selectedPlugin" class="detail-card bg-white rounded-lg border border-[var(--el-border-color-lighter)] p-3 shadow-sm shrink-0">
        <div class="flex items-center justify-between mb-2">
          <h4 class="text-sm font-medium m-0 flex items-center gap-2">
            <el-icon><Box /></el-icon>
            {{ selectedPlugin.name }}
          </h4>
          <el-switch
            v-model="selectedPlugin.active"
            active-text="启用"
            inactive-text="禁用"
            size="small"
            @change="(val: boolean) => togglePluginStatus(selectedPlugin, val)"
          />
        </div>

        <p v-if="selectedPlugin.description && !compactMode" class="text-xs text-[var(--el-text-color-secondary)] m-0 mb-3 leading-relaxed">
          {{ selectedPlugin.description }}
        </p>

        <!-- 配置参数表单 -->
        <div v-if="selectedPlugin.config_schema?.length" class="space-y-2 mt-2 pt-3 border-t border-[var(--el-border-color-lighter)]">
          <div class="flex items-center justify-between">
            <label class="text-xs font-medium text-[var(--el-text-color-secondary)] flex items-center gap-1">
              <el-icon :size="12"><Setting /></el-icon> 配置参数
              <el-badge :value="selectedPlugin.config_schema.length" :max="99" />
            </label>
            <el-button size="small" text @click="resetConfigToDefault" :disabled="!hasCustomConfig">
              <el-icon><RefreshRight /></el-icon> 重置
            </el-button>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div
              v-for="(config, idx) in selectedPlugin.config_schema"
              :key="idx"
              class="space-y-0.5"
            >
              <label class="text-[10px] text-[var(--el-text-color-placeholder)] font-mono">{{ config.key }}</label>
              <div class="flex gap-1">
                <el-input
                  v-model="config.currentValue"
                  :placeholder="String(config.default ?? '')"
                  size="small"
                  class="flex-1"
                />
                <el-tag size="small" effect="plain" class="shrink-0 !text-[10px]">{{ config.type || 'string' }}</el-tag>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 未选择提示 -->
      <section v-else class="empty-state bg-white rounded-lg border border-dashed border-[var(--el-border-color-lighter)] p-6 text-center shadow-sm shrink-0">
        <el-icon :size="32" class="text-[var(--el-text-color-placeholder)]"><Box /></el-icon>
        <p class="text-sm text-[var(--el-text-color-secondary)] mt-2 m-0">请从左侧选择一个插件</p>
      </section>

      <!-- 触发历史（紧凑模式隐藏） -->
      <section v-if="triggerHistory.length > 0 && !compactMode" class="trigger-history bg-white rounded-lg border border-[var(--el-border-color-lighter)] p-2 shadow-sm max-h-40 overflow-y-auto shrink-0">
        <div class="text-xs font-medium text-[var(--el-text-color-secondary)] mb-1.5 flex items-center gap-1">
          <el-icon :size="12"><Clock /></el-icon> 触发历史
          <el-badge :value="triggerHistory.length" :max="99" />
        </div>

        <div class="space-y-0.5">
          <div
            v-for="(event, idx) in triggerHistory.slice(-10).reverse()"
            :key="idx"
            class="flex items-center gap-2 px-2 py-1 rounded text-xs hover:bg-base-100 transition-colors"
          >
            <span
              class="w-2 h-2 rounded-full shrink-0"
              :class="event.success ? 'bg-green-500' : 'bg-red-500'"
            />
            <el-tag size="small" type="warning" effect="plain" class="!text-[10px] !py-0 !px-1 shrink-0">{{ event.hook }}</el-tag>
            <span class="text-purple-600 truncate flex-1 font-medium">{{ event.pluginName }}</span>
            <span class="text-[var(--el-text-color-placeholder)] shrink-0 text-[10px]">{{ formatTime(event.time) }}</span>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject, onMounted } from 'vue'
import { Box, Setting, RefreshRight, Clock } from '@element-plus/icons-vue'
import pluginsApi from '@/api/browser/plugins_api'

const props = defineProps<{
  browserId: string
  browserRunning: boolean
  compactMode?: boolean
}>()

const emit = defineEmits<{
  log: [message: string, type: 'info' | 'success' | 'warning' | 'error']
}>()

const addGlobalLog = inject('addGlobalLog') as (level: any, message: string, source?: string) => void

// 状态
const loading = ref(false)
const plugins = ref<any[]>([])
const selectedPlugin = ref<any>(null)

// 触发历史
interface TriggerEvent {
  pluginName: string
  hook: string
  time: number
  success: boolean
}
const triggerHistory = ref<TriggerEvent[]>([])

// 触发状态（用于UI动画）
const triggeringPluginId = ref<string | null>(null)
const triggeringHookName = ref<string | null>(null)

// 计算属性
const hasCustomConfig = computed(() => {
  if (!selectedPlugin.value?.config_schema) return false
  return selectedPlugin.value.config_schema.some(
    (c: any) => c.currentValue !== c.default && c.currentValue !== undefined && c.currentValue !== ''
  )
})

// 方法
const getPluginCardClass = (plugin: any): Record<string, boolean> => {
  const isSelected = selectedPlugin.value?.id === (plugin.id || plugin.plugin_id)
  return {
    'border-primary bg-primary/5 shadow-sm': isSelected,
    'border-green-300 bg-green-50/50': plugin.active && !isSelected,
    'border-base-200 hover:border-base-300 hover:shadow-sm': !plugin.active && !isSelected
  }
}

const isTriggering = (plugin: any): boolean =>
  triggeringPluginId.value === (plugin.id || plugin.plugin_id)

const isHookTriggering = (plugin: any, hookName: string): boolean =>
  isTriggering(plugin) && triggeringHookName.value === hookName

const getPluginHooks = (plugin: any): Array<{ name: string; type: string }> => {
  const hooks: Array<{ name: string; type: string }> = []
  const name = (plugin.name || '').toLowerCase()
  const id = (plugin.plugin_id || '').toLowerCase()

  if (name.includes('screenshot') || id.includes('screenshot')) {
    hooks.push({ name: 'before_action', type: '前置' }, { name: 'after_action', type: '后置' })
  }
  if (name.includes('delay') || name.includes('延迟')) {
    hooks.push({ name: 'before_click', type: '点击前' }, { name: 'before_input', type: '输入前' })
  }
  if (name.includes('verify') || name.includes('验证')) {
    hooks.push({ name: 'after_action', type: '验证' }, { name: 'on_error', type: '错误处理' })
  }

  if (!hooks.length && plugin.config_schema?.length) {
    hooks.push({ name: 'before_action', type: '通用' })
  }

  return hooks
}

const selectPlugin = (plugin: any) => {
  selectedPlugin.value = plugin
  addGlobalLog?.('plugin', `选中插件: ${plugin.name}`)
}

const togglePluginStatus = async (plugin: any, val: boolean) => {
  try {
    const res = await pluginsApi.updatePlugin({
      id: plugin.id,
      ...plugin,
      active: val
    })

    if (res.code === 0) {
      addGlobalLog?.(val ? 'success' : 'warn', `插件 "${plugin.name}" 已${val ? '启用' : '禁用'}`)

      triggerHistory.value.push({
        pluginName: plugin.name,
        hook: '状态变更',
        time: Date.now(),
        success: true
      })

      emit('log', `[Plugin] ${plugin.name} ${val ? '启用' : '禁用'}`, 'info')
    } else {
      plugin.active = !val
      addGlobalLog?.('error', `状态切换失败: ${res.msg}`)
    }
  } catch (e: any) {
    plugin.active = !val
    addGlobalLog?.('error', `异常: ${e.message}`)
  }
}

const resetConfigToDefault = () => {
  if (!selectedPlugin.value?.config_schema) return

  selectedPlugin.value.config_schema.forEach((c: any) => {
    c.currentValue = c.default ?? ''
  })

  addGlobalLog?.('plugin', '配置参数已重置为默认值')
}

const refreshPlugins = async () => {
  loading.value = true
  try {
    emit('log', '刷新插件列表...', 'info')
    const res = await pluginsApi.listPlugins()

    if (res.code === 0 && res.data) {
      plugins.value = res.data.map((p: any) => ({
        ...p,
        config_schema: (p.config_schema || []).map((c: any) => ({
          ...c,
          currentValue: c.default ?? ''
        }))
      }))
      addGlobalLog?.('success', `已加载 ${plugins.value.length} 个插件`)
    } else {
      addGlobalLog?.('error', `刷新失败: ${res.msg}`)
    }
  } catch (e: any) {
    addGlobalLog?.('error', `刷新异常: ${e.message}`)
  } finally {
    loading.value = false
  }
}

const formatTime = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString('zh-CN', { hour12: false })

const loadData = () => refreshPlugins()

defineExpose({ loadData, simulateTrigger: () => {} })
</script>

<style scoped>
.plugin-management-workspace {
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
