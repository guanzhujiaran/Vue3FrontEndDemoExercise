<!--
 * @FilePath: \Vue3FrontEndDemoExercise\src\components\browser\PluginPanel.vue
 * @Description: 插件管理面板 - 管理浏览器自动化插件
-->
<template>
  <div class="flex flex-col h-full overflow-hidden">
    <!-- 操作栏 -->
    <div class="flex flex-wrap gap-2 mb-4 p-3 rounded-xl border border-[var(--el-border-color-lighter)] bg-[var(--el-fill-color-lighter)]">
      <el-button type="primary" size="small" @click="openCreateDialog()">
        <el-icon><Plus /></el-icon>
        新建插件
      </el-button>
      <el-button size="small" @click="refreshPlugins" :loading="loading">
        <el-icon><Refresh /></el-icon>
        刷新
      </el-button>

      <div class="ml-auto flex items-center gap-2 text-xs text-[var(--el-text-color-secondary)]">
        <span>共 {{ plugins.length }} 个插件</span>
      </div>
    </div>

    <!-- 插件列表 -->
    <div class="flex-1 overflow-y-auto min-h-0">
      <div v-if="loading" class="flex justify-center py-10">
        <el-skeleton :rows="4" animated />
      </div>

      <el-row v-else :gutter="16">
        <el-col
          v-for="plugin in plugins"
          :key="plugin.id || plugin.plugin_id"
          :xs="24"
          :sm="12"
          :md="8"
          :lg="6"
        >
          <el-card
            class="mb-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
            shadow="hover"
            @click="viewDetail(plugin)"
          >
            <div class="flex justify-between items-center mb-2">
              <div class="flex items-center gap-1.5 flex-wrap">
                <el-icon :size="18"><Box /></el-icon>
                <el-tag :type="plugin.active ? 'success' : 'warning'" size="small" effect="plain">
                  {{ plugin.active ? '激活' : '未激活' }}
                </el-tag>
                <el-tag v-if="plugin.version" size="small" type="info" effect="plain">v{{ plugin.version }}</el-tag>
              </div>
              <el-dropdown trigger="click" @command="(cmd: string) => handleCommand(cmd, plugin)" @click.stop>
                <el-button text size="small">
                  <el-icon><MoreFilled /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="edit"><el-icon><Edit /></el-icon> 编辑</el-dropdown-item>
                    <el-dropdown-item command="toggle" divided>
                      <el-icon><component :is="plugin.active ? 'Close' : 'Check'" /></el-icon>
                      {{ plugin.active ? '禁用' : '启用' }}
                    </el-dropdown-item>
                    <el-dropdown-item command="delete" divided danger><el-icon><Delete /></el-icon> 删除</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>

            <h4 class="font-medium text-sm m-0 mb-1 truncate">{{ plugin.name }}</h4>
            <p class="text-xs text-[var(--el-text-color-secondary)] m-0 mb-2 line-clamp-2">{{ plugin.description || '暂无描述' }}</p>

            <div class="flex items-center justify-between pt-2 border-t border-[var(--el-border-color-lighter)]">
              <span class="text-xs text-[var(--el-text-color-placeholder)] font-mono truncate max-w-[120px]">{{ plugin.plugin_id || plugin.id }}</span>
              <span v-if="plugin.author_name" class="text-xs text-[var(--el-text-color-placeholder)]">{{ plugin.author_name }}</span>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <el-empty v-if="!loading && plugins.length === 0" description="暂无插件">
        <el-button type="primary" size="small" @click="openCreateDialog()">创建第一个插件</el-button>
      </el-empty>
    </div>

    <!-- 创建/编辑对话框 -->
    <el-dialog
      v-model="showCreateDialog"
      :title="editingPlugin ? '编辑插件' : '新建插件'"
      width="600px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form :model="formData" label-width="90px" size="small" label-position="top">
        <el-form-item label="插件名称" required>
          <el-input v-model="formData.name" placeholder="例: OCR识别插件" />
        </el-form-item>

        <el-form-item label="插件ID">
          <el-input v-model="formData.plugin_id" placeholder="唯一标识符 (自动生成)" />
        </el-form-item>

        <el-form-item label="描述">
          <el-input v-model="formData.description" type="textarea" :rows="2" placeholder="描述插件的功能和用途" />
        </el-form-item>

        <el-form-item label="版本号">
          <el-input v-model="formData.version" placeholder="1.0.0" />
        </el-form-item>

        <el-form-item label="配置参数">
          <div class="space-y-2 w-full">
            <div
              v-for="(config, idx) in formData.config_schema"
              :key="idx"
              class="flex gap-2 items-start mb-2 p-2 rounded-lg bg-[var(--el-fill-color-lighter)]"
            >
              <el-input v-model="config.key" placeholder="键名" class="w-28" />
              <el-select v-model="config.type" class="w-24">
                <el-option label="字符串" value="string" />
                <el-option label="整数" value="int" />
                <el-option label="布尔" value="boolean" />
                <el-option label="JSON" value="json" />
              </el-select>
              <el-input v-model="config.default" placeholder="默认值" class="w-32" />
              <el-button text type="danger" :icon="Delete" size="small" @click="formData.config_schema.splice(idx, 1)" />
            </div>
            <el-button size="small" text :icon="Plus" @click="addConfigItem">添加配置项</el-button>
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          {{ editingPlugin ? '保存修改' : '创建' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 查看详情对话框 -->
    <el-dialog v-model="showDetailDialog" title="插件详情" width="650px" destroy-on-close>
      <div v-if="currentDetail">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="插件ID" :span="2">{{ currentDetail.plugin_id || currentDetail.id }}</el-descriptions-item>
          <el-descriptions-item label="名称">{{ currentDetail.name }}</el-descriptions-item>
          <el-descriptions-item label="版本">{{ currentDetail.version || '-' }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="currentDetail.active ? 'success' : 'warning'" size="small">
              {{ currentDetail.active ? '激活' : '未激活' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="作者">{{ currentDetail.author_name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatTime(currentDetail.created_at) }}</el-descriptions-item>
          <el-descriptions-item label="描述" :span="2">{{ currentDetail.description || '暂无描述' }}</el-descriptions-item>
        </el-descriptions>

        <el-divider content-position="left">配置参数</el-divider>
        <el-table :data="currentDetail.config_schema || []" size="small" v-if="currentDetail.config_schema?.length">
          <el-table-column prop="key" label="键名" />
          <el-table-column prop="type" label="类型" width="80" />
          <el-table-column prop="default" label="默认值" />
        </el-table>
        <div v-else class="text-xs text-[var(--el-text-color-placeholder)] py-2 text-center">无配置参数</div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh, Box, MoreFilled, Edit, Delete } from '@element-plus/icons-vue'
import pluginsApi from '@/api/browser/plugins_api'

const props = defineProps<{
  browserId: string
}>()

const loading = ref(false)
const submitting = ref(false)
const showCreateDialog = ref(false)
const showDetailDialog = ref(false)
const editingPlugin = ref<any>(null)
const currentDetail = ref<any>(null)

const plugins = ref<Array<{
  id?: number | string
  name: string
  plugin_id?: string
  description?: string
  version?: string
  author_name?: string
  active?: boolean
  config_schema?: Array<{ key: string; type: string; default?: any }>
  created_at?: string
}>[]>([])

const formData = ref({
  name: '',
  plugin_id: '',
  description: '',
  version: '1.0.0',
  config_schema: [] as Array<{ key: string; type: string; default?: any }>
})

const addConfigItem = () => {
  formData.value.config_schema.push({ key: '', type: 'string', default: '' })
}

const fetchPlugins = async (silent = false) => {
  loading.value = true
  try {
    const res = await pluginsApi.listPlugins()
    if (res.code === 0 && res.data) {
      plugins.value = res.data
    } else if (!silent) {
      ElMessage.error(res.msg || '获取插件列表失败')
    }
  } catch (error: any) {
    if (!silent) ElMessage.error(error.message || '获取插件列表失败')
  } finally {
    loading.value = false
  }
}

const refreshPlugins = () => fetchPlugins()

const openCreateDialog = (plugin?: any | null) => {
  if (plugin) {
    editingPlugin.value = plugin
    pluginsApi.getPlugin(plugin.id?.toString() || plugin.plugin_id).then(res => {
      if (res.code === 0 && res.data) {
        const detail = res.data
        formData.value = {
          name: detail.name,
          plugin_id: detail.plugin_id,
          description: detail.description,
          version: detail.version || '1.0.0',
          config_schema: detail.config_schema || []
        }
        showCreateDialog.value = true
      }
    })
  } else {
    editingPlugin.value = null
    formData.value = {
      name: '',
      plugin_id: '',
      description: '',
      version: '1.0.0',
      config_schema: []
    }
    showCreateDialog.value = true
  }
}

const handleSubmit = async () => {
  if (!formData.value.name.trim()) {
    ElMessage.warning('请输入插件名称')
    return
  }

  submitting.value = true
  try {
    const requestData = {
      name: formData.value.name.trim(),
      plugin_id: formData.value.plugin_id || undefined,
      description: formData.value.description,
      version: formData.value.version,
      config_schema: formData.value.config_schema.length > 0 ? formData.value.config_schema : undefined
    }

    let res
    if (editingPlugin.value) {
      res = await pluginsApi.updatePlugin({
        id: editingPlugin.value.id,
        ...requestData
      })
    } else {
      res = await pluginsApi.createPlugin(requestData)
    }

    if (res.code === 0) {
      ElMessage.success(editingPlugin.value ? '更新成功' : '创建成功')
      showCreateDialog.value = false
      await fetchPlugins(true)
    } else {
      ElMessage.error(res.msg || (editingPlugin.value ? '更新失败' : '创建失败'))
    }
  } catch (error: any) {
    ElMessage.error(error.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

const viewDetail = async (plugin: any) => {
  try {
    const res = await pluginsApi.getPlugin(plugin.id?.toString() || plugin.plugin_id)
    if (res.code === 0 && res.data) {
      currentDetail.value = res.data
      showDetailDialog.value = true
    }
  } catch (error: any) {
    ElMessage.error(error.message || '获取详情失败')
  }
}

const handleCommand = async (command: string, plugin: any) => {
  switch (command) {
    case 'edit':
      openCreateDialog(plugin)
      break
    case 'toggle':
      await togglePlugin(plugin)
      break
    case 'delete':
      await deletePlugin(plugin)
      break
  }
}

const togglePlugin = async (plugin: any) => {
  try {
    const newStatus = !plugin.active
    const res = await pluginsApi.updatePlugin({
      id: plugin.id,
      ...plugin,
      active: newStatus
    })
    if (res.code === 0) {
      ElMessage.success(newStatus ? '已启用' : '已禁用')
      plugin.active = newStatus
    } else {
      ElMessage.error(res.msg || '操作失败')
    }
  } catch (error: any) {
    ElMessage.error(error.message || '操作失败')
  }
}

const deletePlugin = async (plugin: any) => {
  try {
    await ElMessageBox.confirm(`确定要删除插件 "${plugin.name}" 吗?`, '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    const res = await pluginsApi.deletePlugin(plugin.id?.toString() || plugin.plugin_id)
    if (res.code === 0) {
      ElMessage.success('删除成功')
      await fetchPlugins(true)
    } else {
      ElMessage.error(res.msg || '删除失败')
    }
  } catch (error: any) {
    if (error !== 'cancel') ElMessage.error(error.message || '删除失败')
  }
}

const formatTime = (time?: string) => {
  if (!time) return '-'
  return new Date(time).toLocaleString('zh-CN')
}

onMounted(() => {
  fetchPlugins()
})
</script>