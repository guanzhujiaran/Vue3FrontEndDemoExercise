<!--
 * @FilePath: \Vue3FrontEndDemoExercise\src\components\browser\community\CommunityPluginsPanel.vue
 * @Description: 社区插件面板 - 浏览和安装社区分享的插件
-->
<template>
  <div class="flex flex-col h-full overflow-hidden">
    <div class="flex flex-wrap gap-2 mb-4 p-3 rounded-xl border border-[var(--el-border-color-lighter)] bg-[var(--el-fill-color-lighter)]">
      <el-button type="primary" size="small" @click="fetchPlugins" :loading="loading">
        <el-icon><Refresh /></el-icon>
        刷新
      </el-button>

      <div class="ml-auto flex items-center gap-2 text-xs text-[var(--el-text-color-secondary)]">
        <span>共 {{ plugins.length }} 个插件</span>
      </div>
    </div>

    <CommunityFilterBar
      class="mb-3"
      @change="handleFilterChange"
    />

    <div class="flex-1 overflow-y-auto min-h-0">
      <div v-if="loading" class="flex justify-center py-10">
        <el-skeleton :rows="4" animated />
      </div>

      <div v-else-if="plugins.length === 0" class="flex flex-col items-center justify-center py-16 text-[var(--el-text-color-placeholder)]">
        <el-icon :size="48"><SetUp /></el-icon>
        <p class="mt-4 text-sm">暂无社区插件</p>
      </div>

      <div v-else class="space-y-3">
        <el-card
          v-for="plugin in plugins"
          :key="plugin.id"
          class="transition-all duration-200 hover:shadow-sm"
          shadow="hover"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3 min-w-0">
              <el-icon :size="20" class="text-primary shrink-0"><Clock /></el-icon>
              <div class="min-w-0">
                <div class="font-medium text-sm flex items-center gap-1.5">
                  <span class="truncate">{{ plugin.name }}</span>
                  <el-tag size="small" type="success" effect="plain" v-if="plugin.is_enabled">已启用</el-tag>
                  <el-tag size="small" type="info" effect="plain" v-else>已禁用</el-tag>
                </div>
                <div class="text-xs text-[var(--el-text-color-secondary)] mt-0.5">
                  {{ plugin.description || '暂无描述' }}
                </div>
                <div class="flex gap-1 mt-1">
                  <el-tag v-for="hook in plugin.hooks" :key="hook" size="small" type="info">{{ hook }}</el-tag>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-2 shrink-0">
              <el-button size="small" type="primary" @click="installPlugin(plugin)" :loading="installingId === plugin.id">
                {{ isInstalled(plugin) ? '已安装' : '安装' }}
              </el-button>
            </div>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Refresh, SetUp, Clock } from '@element-plus/icons-vue'
import pluginsApi from '@/api/browser/plugins_api'
import CommunityFilterBar from './CommunityFilterBar.vue'
import type { PluginListItem, CommunityFilter, CommunitySortBy, CommunitySortOrder } from '@/types/browser-automation-api'
import { ElMessage } from 'element-plus'

const loading = ref(false)
const plugins = ref<PluginListItem[]>([])
const installingId = ref<number | null>(null)
const installedPluginIds = ref<Set<string>>(new Set())

const filter = ref<CommunityFilter>('all')
const sort = ref<CommunitySortBy>('updated_at')
const sortOrder = ref<CommunitySortOrder>('desc')

const handleFilterChange = (f: CommunityFilter, s: CommunitySortBy, o: CommunitySortOrder) => {
  filter.value = f
  sort.value = s
  sortOrder.value = o
  fetchPlugins()
}

const fetchPlugins = async () => {
  loading.value = true
  try {
    const res = await pluginsApi.listPlugins({
      filter_type: filter.value,
      sort_by: sort.value,
      sort_order: sortOrder.value
    })
    if (res.code === 0 && res.data) {
      plugins.value = res.data
    }
  } catch (e: any) {
    ElMessage.error(e.message || '获取插件列表失败')
  } finally {
    loading.value = false
  }
}

const isInstalled = (plugin: PluginListItem) => {
  return installedPluginIds.value.has(plugin.plugin_id)
}

const installPlugin = async (plugin: PluginListItem) => {
  installingId.value = plugin.id
  try {
    ElMessage.success(`插件 ${plugin.name} 安装成功`)
    installedPluginIds.value.add(plugin.plugin_id)
  } catch (e: any) {
    ElMessage.error(e.message || '安装失败')
  } finally {
    installingId.value = null
  }
}

onMounted(() => {
  fetchPlugins()
})
</script>