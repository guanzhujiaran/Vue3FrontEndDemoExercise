<!--
 * @FilePath: \Vue3FrontEndDemoExercise\src\components\browser\workflow\PluginSelector.vue
 * @Description: 插件选择器组件 - 支持多选、动态参数表单
-->
<template>
  <div class="text-primary">
    <div class="flex items-center gap-2 mb-2">
      <span class="text-sm font-medium">已启用插件</span>
      <el-tag size="small" type="info" effect="plain">{{ plugins.length }}</el-tag>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-6">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span class="ml-2 text-xs text-[var(--el-text-color-secondary)]">加载插件列表...</span>
    </div>

    <div v-else-if="error" class="text-xs text-red-500 py-2">
      <el-icon><Warning /></el-icon>
      <span class="ml-1">{{ error }}</span>
    </div>

    <div v-else class="space-y-3">
      <el-popover
        v-for="(plugin, index) in plugins"
        :key="plugin.plugin_id + '_' + index"
        placement="bottom-start"
        :width="360"
        trigger="click"
      >
        <template #reference>
          <div class="plugin-item flex items-center gap-2 p-2 rounded-lg border border-[var(--el-border-color-lighter)] hover:border-[var(--el-color-primary-light-5)] cursor-pointer transition-colors">
            <div class="flex items-center gap-2 flex-1 min-w-0">
              <el-tag size="small" effect="plain" class="shrink-0">
                {{ getPluginName(plugin.plugin_id) }}
              </el-tag>
              <!-- 钩子类型标签 -->
              <el-tag
                v-if="plugin.hook_type"
                size="small"
                :type="getHookTagType(plugin.hook_type)"
                effect="plain"
                class="shrink-0 !text-[10px]"
              >
                {{ getHookLabel(plugin.hook_type) }}
              </el-tag>
              <!-- 优先级标签 -->
              <el-tag
                v-if="plugin.priority != null"
                size="small"
                type="info"
                effect="plain"
                round
                class="shrink-0 !text-[10px]"
              >
                P{{ plugin.priority }}
              </el-tag>
              <span class="text-xs text-[var(--el-text-color-secondary)] truncate">
                {{ getPluginDescription(plugin.plugin_id) }}
              </span>
            </div>
            <div class="flex gap-1 shrink-0">
              <el-button
                size="small"
                text
                :icon="Edit"
                @click.stop="editPluginConfig(index)"
              />
              <el-button
                size="small"
                text
                :icon="Delete"
                class="!text-red-400"
                @click.stop="removePlugin(index)"
              />
            </div>
          </div>
        </template>
        <div class="p-2">
          <div class="text-sm font-medium mb-3">{{ getPluginName(plugin.plugin_id) }} - 配置参数</div>
          <div class="space-y-3">
            <!-- 钩子类型选择 -->
            <div>
              <label class="text-xs text-[var(--el-text-color-secondary)] mb-1 block">
                钩子类型
                <span class="text-[var(--el-text-color-placeholder)]">(触发时机)</span>
              </label>
              <el-select
                v-model="editingPlugin!.hook_type"
                size="small"
                placeholder="选择钩子类型"
                class="w-full"
              >
                <el-option
                  v-for="hook in hookTypeOptions"
                  :key="hook.value"
                  :label="hook.label"
                  :value="hook.value"
                >
                  <div class="flex items-center gap-2">
                    <span>{{ hook.icon }}</span>
                    <span>{{ hook.label }}</span>
                    <span class="text-xs text-[var(--el-text-color-placeholder)]">{{ hook.desc }}</span>
                  </div>
                </el-option>
              </el-select>
            </div>

            <!-- 优先级配置 -->
            <div>
              <label class="text-xs text-[var(--el-text-color-secondary)] mb-1 block">
                优先级
                <span class="text-[var(--el-text-color-placeholder)]">(数值越小越先执行)</span>
              </label>
              <el-input-number
                v-model="editingPlugin!.priority"
                size="small"
                controls-position="right"
                :min="0"
                :max="9999"
                :step="10"
                class="w-full"
              />
            </div>

            <!-- 配置参数 -->
            <template v-for="param in getPluginParams(plugin.plugin_id)" :key="param.name">
              <div>
                <label class="text-xs text-[var(--el-text-color-secondary)] mb-1 block">
                  {{ param.name }}{{ param.required ? ' *' : '' }}
                  <span class="text-[var(--el-text-color-placeholder)]">({{ param.type }})</span>
                </label>
                <el-input
                  v-if="param.type === 'string'"
                  v-model="editingPlugin!.config_params[param.name]"
                  size="small"
                  :placeholder="param.description"
                />
                <el-input-number
                  v-else-if="param.type === 'number'"
                  v-model="editingPlugin!.config_params[param.name]"
                  size="small"
                  controls-position="right"
                  class="w-full"
                />
                <el-switch
                  v-else-if="param.type === 'boolean'"
                  v-model="editingPlugin!.config_params[param.name]"
                  size="small"
                />
              </div>
            </template>
          </div>
          <div class="mt-4 flex justify-end gap-2">
            <el-button size="small" @click="cancelEdit">取消</el-button>
            <el-button size="small" type="primary" @click="saveEdit">保存</el-button>
          </div>
        </div>
      </el-popover>

      <el-popover placement="bottom-start" :width="300" trigger="click">
        <template #reference>
          <el-button type="default" size="small" :icon="Plus" round class="w-full">
            添加插件
          </el-button>
        </template>
        <div class="max-h-64 overflow-y-auto">
          <div
            v-for="plugin in availablePlugins"
            :key="plugin.plugin_id"
            class="p-2 hover:bg-[var(--el-fill-color-light)] cursor-pointer rounded"
            @click="handleAddPlugin(plugin.plugin_id)"
          >
            <div class="flex items-center justify-between">
              <div>
                <div class="font-medium text-sm">{{ plugin.name }}</div>
                <div class="text-xs text-[var(--el-text-color-secondary)]">{{ plugin.description }}</div>
              </div>
              <el-tag size="small" type="info" class="ml-2">{{ plugin.hooks?.join(', ') || '' }}</el-tag>
            </div>
          </div>
          <div v-if="availablePlugins.length === 0" class="p-4 text-center text-xs text-[var(--el-text-color-placeholder)]">
            暂无可用插件
          </div>
        </div>
      </el-popover>
    </div>

    <div v-if="invalidPluginIds.length > 0" class="mt-3 p-2 rounded bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
      <div class="flex items-center gap-1 text-xs text-red-500 mb-1">
        <el-icon><Warning /></el-icon>
        <span>以下插件已失效</span>
      </div>
      <div class="flex flex-wrap gap-1">
        <el-tag
          v-for="pluginId in invalidPluginIds"
          :key="pluginId"
          size="small"
          type="danger"
          effect="plain"
          closable
          @close="removeInvalidPlugin(pluginId)"
        >
          {{ pluginId }}
        </el-tag>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Plus, Delete, Edit, Loading, Warning } from '@element-plus/icons-vue'
import pluginsApi from '@/api/browser/plugins_api'
import type { PluginListItem, PluginSchemaParam, EnabledPlugin, PluginHookType } from '@/types/browser-automation-api'

const plugins = defineModel<EnabledPlugin[]>({ default: [] })

const availablePlugins = ref<PluginListItem[]>([])
const pluginSchemas = ref<Map<string, PluginSchemaParam[]>>(new Map())
const loading = ref(false)
const error = ref<string | null>(null)
const editingIndex = ref<number | null>(null)
const editingPlugin = ref<EnabledPlugin | null>(null)

// 钩子类型选项配置
const hookTypeOptions = [
  { value: 'before_action' as PluginHookType, label: '操作前', icon: '⏮️', desc: '预处理、日志' },
  { value: 'after_action' as PluginHookType, label: '操作后', icon: '⏭️', desc: '后处理、验证' },
  { value: 'on_success' as PluginHookType, label: '成功时', icon: '✅', desc: '成功回调' },
  { value: 'on_error' as PluginHookType, label: '失败时', icon: '❌', desc: '错误处理' },
  { value: 'on_timeout' as PluginHookType, label: '超时时', icon: '⏰', desc: '超时处理' }
]

// 钩子类型辅助函数
const getHookLabel = (hookType?: PluginHookType): string => {
  const option = hookTypeOptions.find(h => h.value === hookType)
  return option?.label || hookType || ''
}

const getHookTagType = (hookType?: PluginHookType): string => {
  const map: Record<string, string> = {
    before_action: '',
    after_action: 'success',
    on_success: 'success',
    on_error: 'danger',
    on_timeout: 'warning'
  }
  return map[hookType || ''] || 'info'
}

const invalidPluginIds = computed(() => {
  return plugins.value
    .map(p => p.plugin_id)
    .filter(id => !availablePlugins.value.find(p => p.plugin_id === id))
})

const fetchPlugins = async () => {
  loading.value = true
  error.value = null
  try {
    const res = await pluginsApi.listPlugins()
    if (res.code === 0 && res.data) {
      availablePlugins.value = res.data
    } else {
      error.value = res.msg || '获取插件列表失败'
    }
  } catch (e: any) {
    error.value = e.message || '网络错误'
  } finally {
    loading.value = false
  }
}

const fetchPluginSchema = async (pluginId: string) => {
  if (pluginSchemas.value.has(pluginId)) return
  try {
    const res = await pluginsApi.getPluginSchema(pluginId)
    if (res.code === 0 && res.data) {
      pluginSchemas.value.set(pluginId, res.data.parameters)
    }
  } catch (e) {
    console.warn(`[PluginSelector] 获取插件 ${pluginId} schema 失败:`, e)
  }
}

const getPluginName = (pluginId: string) => {
  return availablePlugins.value.find(p => p.plugin_id === pluginId)?.name || pluginId
}

const getPluginDescription = (pluginId: string) => {
  return availablePlugins.value.find(p => p.plugin_id === pluginId)?.description || ''
}

const getPluginParams = (pluginId: string): PluginSchemaParam[] => {
  return pluginSchemas.value.get(pluginId) || []
}

const handleAddPlugin = (pluginId: string) => {
  const pluginInfo = availablePlugins.value.find(p => p.plugin_id === pluginId)
  const defaultHookType = pluginInfo?.hooks?.[0] as PluginHookType || 'before_action'
  plugins.value = [...plugins.value, {
    plugin_id: pluginId,
    hook_type: defaultHookType,
    priority: 50,
    config_params: {}
  }]
  fetchPluginSchema(pluginId)
}

const editPluginConfig = async (index: number) => {
  const plugin = plugins.value[index]
  if (!plugin) return
  await fetchPluginSchema(plugin.plugin_id)
  editingIndex.value = index
  editingPlugin.value = { ...plugin, config_params: { ...plugin.config_params } }
}

const saveEdit = () => {
  if (editingIndex.value !== null && editingPlugin.value) {
    const newList = [...plugins.value]
    newList[editingIndex.value] = { ...editingPlugin.value }
    plugins.value = newList
  }
  cancelEdit()
}

const cancelEdit = () => {
  editingIndex.value = null
  editingPlugin.value = null
}

const removePlugin = (index: number) => {
  plugins.value = plugins.value.filter((_, i) => i !== index)
}

const removeInvalidPlugin = (pluginId: string) => {
  plugins.value = plugins.value.filter(p => p.plugin_id !== pluginId)
}

onMounted(() => {
  fetchPlugins()
})
</script>