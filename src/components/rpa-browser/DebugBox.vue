<script setup lang="ts">
import { ref, onMounted, inject, computed } from 'vue'
import { Search, Refresh, VideoPlay, Folder, Tools } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import FlexContainer from '@/components/CommonCompo/Bili-Container-Compo/FlexContainer.vue'
import { listRegisteredActionsApiV1RpaBrowserControlActionsRegisteredPost, getPagesListApiV1RpaBrowserControlPagesListPost, getPageInfoApiV1RpaBrowserControlOperationGetPageInfoPost } from '@/api/browser/hey-api'
import { useUserNavStore } from '@/stores/user_nav'
import biliMessage from '@/utils/message'
import ActionCard from './ActionCard.vue'
import ToolboxPanel from './ToolboxPanel.vue'

interface Props {
  browserId: string
  isSessionConnected: boolean
}

const props = defineProps<Props>()

const userNavStore = useUserNavStore()

const availableActions = ref<any[]>([])
const selectedAction = ref<any>(null)
const actionParams = ref<Record<string, any>>({})
const executionResult = ref<any>(null)
const isExecuting = ref(false)
const isToolboxVisible = ref(false)
const pagesList = ref<any[]>([])
const currentPageIndex = ref(0)
const searchQuery = ref('')

const loadRegisteredActions = async () => {
  try {
    const response = await listRegisteredActionsApiV1RpaBrowserControlActionsRegisteredPost({
      headers: {
        'x-bili-mid': userNavStore.user_nav.uid,
        'x-bili-level': userNavStore.user_nav.level_info.current_level
      }
    })

    if (response.data?.code === 0 && response.data?.data) {
      availableActions.value = response.data.data as any[]
    }
  } catch (error) {
    biliMessage.error('获取操作列表失败')
  }
}

const loadPagesList = async () => {
  if (!props.isSessionConnected) return

  try {
    const response = await getPagesListApiV1RpaBrowserControlPagesListPost({
      query: { browser_id: props.browserId },
      headers: {
        'x-bili-mid': userNavStore.user_nav.uid,
        'x-bili-level': userNavStore.user_nav.level_info.current_level
      }
    })

    if (response.data?.code === 0 && response.data?.data) {
      pagesList.value = response.data.data as any[]
    }
  } catch (error) {
    console.error('Failed to load pages list')
  }
}

const handleSelectAction = (action: any) => {
  selectedAction.value = action
  actionParams.value = {}
  if (action.json_schema?.properties) {
    for (const [key, config] of Object.entries(action.json_schema.properties as Record<string, any>)) {
      actionParams.value[key] = (config as any).default ?? ''
    }
  }
  executionResult.value = null
}

const handleExecuteAction = async () => {
  if (!selectedAction.value) return

  isExecuting.value = true
  try {
    const executeJS = selectedAction.value.action_id === 'evaluate'

    if (executeJS) {
      const response = await fetch('/api/v1/rpa/browser/control/operation/execute_js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-bili-mid': userNavStore.user_nav.uid,
          'x-bili-level': userNavStore.user_nav.level_info.current_level
        },
        body: JSON.stringify({
          script: actionParams.value.script,
          page_index: currentPageIndex.value
        })
      })
      const result = await response.json()
      executionResult.value = result
    }
  } catch (error) {
    biliMessage.error('执行失败')
  } finally {
    isExecuting.value = false
  }
}

const handleSaveAsWorkflow = async () => {
  if (!selectedAction.value) return

  try {
    await ElMessageBox.prompt('请输入工作流名称', '保存为工作流', {
      confirmButtonText: '确定',
      cancelButtonText: '取消'
    })
    biliMessage.info('工作流保存功能开发中')
  } catch (error) {
  }
}

const handleRefreshPages = () => {
  loadPagesList()
}

const toggleToolbox = () => {
  isToolboxVisible.value = !isToolboxVisible.value
}

onMounted(() => {
  loadRegisteredActions()
  if (props.isSessionConnected) {
    loadPagesList()
  }
})
</script>

<template>
  <div class="h-full flex flex-col bg-[var(--el-bg-color)] border border-[var(--el-border-color)] rounded-lg overflow-hidden">
    <div class="flex items-center gap-2 px-4 py-2 border-b border-[var(--el-border-color)] bg-[var(--el-fill-color-light)]">
      <el-input v-model="searchQuery" placeholder="搜索操作..." :prefix-icon="Search" clearable class="w-48" />

      <el-select v-model="currentPageIndex" placeholder="选择页面" class="w-32" @focus="loadPagesList">
        <el-option v-for="page in pagesList" :key="page.index" :label="`页面 ${page.index + 1}`" :value="page.index" />
      </el-select>

      <el-button size="small" :icon="Refresh" @click="handleRefreshPages">刷新</el-button>

      <div class="flex-1"></div>

      <el-button size="small" type="primary" :icon="Tools" @click="toggleToolbox">工具箱</el-button>
    </div>

    <div class="flex-1 flex overflow-hidden">
      <div class="flex-1 flex flex-col overflow-hidden p-4">
        <div class="mb-4">
          <h3 class="text-lg font-semibold mb-2">可用操作</h3>
          <div class="grid grid-cols-2 lg:grid-cols-3 gap-2">
            <ActionCard v-for="action in availableActions" :key="action.action_id" :action="action" :selected="selectedAction?.action_id === action.action_id" @click="handleSelectAction(action)" />
          </div>
        </div>

        <div v-if="selectedAction" class="flex-1 overflow-auto">
          <el-card>
            <template #header>
              <div class="flex items-center justify-between">
                <span class="font-semibold">{{ selectedAction.action_id }}</span>
                <div class="flex gap-2">
                  <el-button size="small" type="primary" :icon="VideoPlay" :loading="isExecuting" :disabled="!isSessionConnected" @click="handleExecuteAction">
                    执行
                  </el-button>
                  <el-button size="small" :icon="Folder" @click="handleSaveAsWorkflow">保存</el-button>
                </div>
              </div>
            </template>

            <p class="text-sm text-[var(--el-text-color-secondary)] mb-4">{{ selectedAction.json_schema?.description || '无描述' }}</p>

            <el-form label-position="top">
              <el-form-item v-for="(config, key) in selectedAction.json_schema?.properties" :key="key" :label="(config as any).title || key">
                <el-input v-if="(config as any).type === 'string'" v-model="actionParams[key]" :placeholder="(config as any).description" type="textarea" :rows="3" />
                <el-input-number v-else-if="(config as any).type === 'number'" v-model="actionParams[key]" :min="(config as any).minimum" :max="(config as any).maximum" />
                <el-switch v-else-if="(config as any).type === 'boolean'" v-model="actionParams[key]" />
              </el-form-item>
            </el-form>

            <div v-if="executionResult" class="mt-4">
              <h4 class="font-semibold mb-2">执行结果</h4>
              <pre class="bg-[var(--el-fill-color)] p-4 rounded-lg overflow-auto text-sm">{{ JSON.stringify(executionResult, null, 2) }}</pre>
            </div>
          </el-card>
        </div>

        <el-empty v-else description="请选择一个操作进行配置和执行" />
      </div>

      <ToolboxPanel v-if="isToolboxVisible" :browser-id="browserId" :is-session-connected="isSessionConnected" class="w-80 border-l border-[var(--el-border-color)]" />
    </div>
  </div>
</template>
