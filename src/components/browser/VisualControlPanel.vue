<!--
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2026-04-11 00:00:00
 * @FilePath: \Vue3FrontEndDemoExercise\src\components\browser\VisualControlPanel.vue
 * @Description: 可视化操作连接面板 - 卡片式展示浏览器控制操作
-->
<template>
  <div class="visual-control-panel">
    <!-- 浏览器状态卡片 -->
    <el-card class="status-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <el-icon><Monitor /></el-icon>
          <span>浏览器状态</span>
          <el-tag :type="statusTagType" size="small">{{ statusText }}</el-tag>
        </div>
      </template>
      <div class="status-info">
        <el-row :gutter="20">
          <el-col :span="8">
            <div class="info-item">
              <label>会话ID:</label>
              <span>{{ browserId }}</span>
            </div>
          </el-col>
          <el-col :span="8">
            <div class="info-item">
              <label>运行状态:</label>
              <span>{{ sessionStatus?.is_running ? '运行中' : '未运行' }}</span>
            </div>
          </el-col>
          <el-col :span="8">
            <div class="info-item">
              <label>人工操作:</label>
              <span>{{ operationStatus?.manual_mode ? '启用' : '禁用' }}</span>
            </div>
          </el-col>
        </el-row>
      </div>
      <div class="status-actions">
        <el-button size="small" @click="refreshStatus" :loading="statusLoading">
          <el-icon><Refresh /></el-icon>
          刷新状态
        </el-button>
        <el-button
          v-if="!sessionStatus?.is_running"
          type="primary"
          size="small"
          @click="createSession"
          :loading="creatingSession"
        >
          <el-icon><VideoPlay /></el-icon>
          启动浏览器
        </el-button>
        <el-button
          v-else
          type="danger"
          size="small"
          @click="forceRelease"
          :loading="releasing"
        >
          <el-icon><Close /></el-icon>
          强制释放
        </el-button>
      </div>
    </el-card>

    <!-- 快捷操作卡片组 -->
    <div class="action-cards">
      <h3 class="section-title">
        <el-icon><Operation /></el-icon>
        快捷操作
      </h3>
      <el-row :gutter="16">
        <!-- 导航操作 -->
        <el-col :xs="24" :sm="12" :md="8" :lg="6">
          <el-card class="action-card" shadow="hover" @click="showNavigateDialog = true">
            <div class="card-icon navigate">
              <el-icon><Link /></el-icon>
            </div>
            <div class="card-content">
              <h4>页面导航</h4>
              <p>跳转到指定URL</p>
            </div>
          </el-card>
        </el-col>

        <!-- 截图操作 -->
        <el-col :xs="24" :sm="12" :md="8" :lg="6">
          <el-card class="action-card" shadow="hover" @click="captureScreenshot">
            <div class="card-icon screenshot">
              <el-icon><Camera /></el-icon>
            </div>
            <div class="card-content">
              <h4>页面截图</h4>
              <p>捕获当前页面快照</p>
            </div>
          </el-card>
        </el-col>

        <!-- JavaScript执行 -->
        <el-col :xs="24" :sm="12" :md="8" :lg="6">
          <el-card class="action-card" shadow="hover" @click="showJsDialog = true">
            <div class="card-icon js">
              <el-icon><Document /></el-icon>
            </div>
            <div class="card-content">
              <h4>执行JS</h4>
              <p>运行自定义脚本</p>
            </div>
          </el-card>
        </el-col>

        <!-- 插件管理 -->
        <el-col :xs="24" :sm="12" :md="8" :lg="6">
          <el-card class="action-card" shadow="hover" @click="togglePlugins">
            <div class="card-icon plugin">
              <el-icon><Setting /></el-icon>
            </div>
            <div class="card-content">
              <h4>插件管理</h4>
              <p>暂停/恢复插件</p>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 系统操作卡片列表 -->
    <div class="system-actions">
      <h3 class="section-title">
        <el-icon><List /></el-icon>
        系统操作
      </h3>
      <el-row :gutter="12">
        <el-col
          v-for="action in registeredActions"
          :key="action.id"
          :xs="24"
          :sm="12"
          :md="8"
          :lg="6"
        >
          <el-card class="action-item-card" shadow="hover">
            <div class="action-header">
              <el-tag size="small" :type="getActionTagType(action.type)">
                {{ action.type }}
              </el-tag>
              <span class="action-name">{{ action.name }}</span>
            </div>
            <p class="action-desc">{{ action.description }}</p>
            <div class="action-footer">
              <el-button
                size="small"
                type="primary"
                @click="executeSystemAction(action)"
                :disabled="!sessionStatus?.is_running"
              >
                执行
              </el-button>
            </div>
          </el-card>
        </el-col>
      </el-row>
      <el-empty v-if="registeredActions.length === 0" description="暂无系统操作" />
    </div>

    <!-- 导航对话框 -->
    <el-dialog v-model="showNavigateDialog" title="页面导航" width="500px">
      <el-form :model="navigateForm" label-width="80px">
        <el-form-item label="URL" required>
          <el-input
            v-model="navigateForm.url"
            placeholder="https://example.com"
            clearable
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showNavigateDialog = false">取消</el-button>
        <el-button type="primary" @click="handleNavigate" :loading="navigating">
          导航
        </el-button>
      </template>
    </el-dialog>

    <!-- JavaScript执行对话框 -->
    <el-dialog v-model="showJsDialog" title="执行JavaScript" width="600px">
      <el-form :model="jsForm" label-width="100px">
        <el-form-item label="代码" required>
          <el-input
            v-model="jsForm.code"
            type="textarea"
            :rows="8"
            placeholder="console.log('Hello World');"
          />
        </el-form-item>
        <el-form-item label="安全模式">
          <el-switch v-model="jsForm.safeMode" />
          <span class="form-tip">启用后将进行安全检查</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showJsDialog = false">取消</el-button>
        <el-button type="primary" @click="handleExecuteJs" :loading="executingJs">
          执行
        </el-button>
      </template>
    </el-dialog>

    <!-- 截图预览对话框 -->
    <el-dialog v-model="showScreenshotDialog" title="页面截图" width="800px">
      <div class="screenshot-container">
        <img v-if="screenshotUrl" :src="screenshotUrl" alt="截图" class="screenshot-img" />
        <el-empty v-else description="暂无截图" />
      </div>
      <template #footer>
        <el-button @click="showScreenshotDialog = false">关闭</el-button>
        <el-button type="primary" @click="downloadScreenshot" :disabled="!screenshotUrl">
          下载截图
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Monitor,
  Refresh,
  VideoPlay,
  Close,
  Operation,
  Link,
  Camera,
  Document,
  Setting,
  List
} from '@element-plus/icons-vue'
import { browserLiveControlApi } from '@/api/browser/browser_api'
import type {
  ActionMetadataResponse,
  BrowserSessionStatus
} from '@/types/browser-automation-api'

// Props
const props = defineProps({
  browserId: {
    type: String,
    required: true
  }
})

// 状态管理
const statusLoading = ref(false)
const creatingSession = ref(false)
const releasing = ref(false)
const navigating = ref(false)
const executingJs = ref(false)
const showNavigateDialog = ref(false)
const showJsDialog = ref(false)
const showScreenshotDialog = ref(false)
const screenshotUrl = ref('')

// 数据
const sessionStatus = ref<BrowserSessionStatus | null>(null)
const operationStatus = ref<any>(null)
const registeredActions = ref<ActionMetadataResponse[]>([])

// 表单
const navigateForm = ref({ url: '' })
const jsForm = ref({ code: '', safeMode: true })

// 计算属性
const statusText = computed(() => {
  if (!sessionStatus.value) return '未知'
  return sessionStatus.value.is_running ? '运行中' : '未启动'
})

const statusTagType = computed(() => {
  if (!sessionStatus.value) return 'info'
  return sessionStatus.value.is_running ? 'success' : 'info'
})

// 获取浏览器状态
const refreshStatus = async () => {
  statusLoading.value = true
  try {
    const [sessionRes, operationRes] = await Promise.all([
      browserLiveControlApi.getBrowserSessionStatus({ browser_id: props.browserId }),
      browserLiveControlApi.getOperationStatus({ browser_id: props.browserId })
    ])

    if (sessionRes.code === 0 && sessionRes.data) {
      sessionStatus.value = sessionRes.data
    }
    if (operationRes.code === 0 && operationRes.data) {
      operationStatus.value = operationRes.data
    }
  } catch (error) {
    ElMessage.error('获取状态失败')
    console.error(error)
  } finally {
    statusLoading.value = false
  }
}

// 创建会话
const createSession = async () => {
  creatingSession.value = true
  try {
    const res = await browserLiveControlApi.createBrowserSession({
      browser_id: props.browserId
    })
    if (res.code === 0) {
      ElMessage.success('浏览器启动成功')
      await refreshStatus()
    } else {
      ElMessage.error(res.msg || '启动失败')
    }
  } catch (error) {
    ElMessage.error('网络错误')
    console.error(error)
  } finally {
    creatingSession.value = false
  }
}

// 强制释放
const forceRelease = async () => {
  releasing.value = true
  try {
    const res = await browserLiveControlApi.forceReleaseBrowser(props.browserId)
    if (res.code === 0) {
      ElMessage.success('浏览器已释放')
      await refreshStatus()
    } else {
      ElMessage.error(res.msg || '释放失败')
    }
  } catch (error) {
    ElMessage.error('网络错误')
    console.error(error)
  } finally {
    releasing.value = false
  }
}

// 页面导航
const handleNavigate = async () => {
  if (!navigateForm.value.url) {
    ElMessage.warning('请输入URL')
    return
  }

  navigating.value = true
  try {
    const res = await browserLiveControlApi.navigateToUrl({
      browser_id: props.browserId,
      request: { url: navigateForm.value.url }
    })
    if (res.code === 0) {
      // 静默成功，仅在失败时提示
      showNavigateDialog.value = false
      navigateForm.value.url = ''
    } else {
      ElMessage.error(res.msg || '导航失败')
    }
  } catch (error) {
    ElMessage.error('网络错误')
    console.error(error)
  } finally {
    navigating.value = false
  }
}

// 截图
const captureScreenshot = async () => {
  try {
    const blob = await browserLiveControlApi.getScreenshot(props.browserId)
    screenshotUrl.value = URL.createObjectURL(blob)
    showScreenshotDialog.value = true
  } catch (error) {
    ElMessage.error('截图失败')
    console.error(error)
  }
}

// 下载截图
const downloadScreenshot = () => {
  if (!screenshotUrl.value) return
  const a = document.createElement('a')
  a.href = screenshotUrl.value
  a.download = `screenshot-${Date.now()}.png`
  a.click()
}

// 执行JavaScript
const handleExecuteJs = async () => {
  if (!jsForm.value.code) {
    ElMessage.warning('请输入JavaScript代码')
    return
  }

  executingJs.value = true
  try {
    const api = jsForm.value.safeMode
      ? browserLiveControlApi.safeExecuteJavaScript
      : browserLiveControlApi.executeJavaScript

    const res = await api({
      browser_id: props.browserId,
      request: { code: jsForm.value.code }
    })

    if (res.code === 0) {
      // 静默成功，结果输出到控制台
      console.log('JS执行结果:', res.data)
      showJsDialog.value = false
      jsForm.value.code = ''
    } else {
      ElMessage.error(res.msg || '执行失败')
    }
  } catch (error) {
    ElMessage.error('网络错误')
    console.error(error)
  } finally {
    executingJs.value = false
  }
}

// 切换插件状态
const togglePlugins = async () => {
  try {
    const res = await browserLiveControlApi.pausePlugins({ browser_id: props.browserId })
    if (res.code !== 0) {
      // 仅在失败时提示
      ElMessage.error(res.msg || '操作失败')
    }
  } catch (error) {
    ElMessage.error('网络错误')
    console.error(error)
  }
}

// 获取操作标签类型
const getActionTagType = (type: string) => {
  const typeMap: Record<string, any> = {
    navigation: 'primary',
    interaction: 'success',
    extraction: 'warning',
    utility: 'info'
  }
  return typeMap[type] || ''
}

// 执行系统操作
const executeSystemAction = async (action: ActionMetadataResponse) => {
  ElMessage.info(`执行操作: ${action.name}`)
  // TODO: 实现具体操作执行逻辑
}

// 获取系统操作列表
const fetchRegisteredActions = async () => {
  try {
    const res = await browserLiveControlApi.listRegisteredActions()
    if (res.code === 0 && res.data) {
      registeredActions.value = res.data
    }
  } catch (error) {
    console.error('获取系统操作失败:', error)
  }
}

// 初始化
onMounted(() => {
  refreshStatus()
  fetchRegisteredActions()
})
</script>

<style scoped lang="scss">
.visual-control-panel {
  .status-card {
    margin-bottom: 20px;

    .card-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: bold;
    }

    .status-info {
      margin-bottom: 16px;

      .info-item {
        display: flex;
        flex-direction: column;
        gap: 4px;

        label {
          font-size: 12px;
          color: #909399;
        }

        span {
          font-size: 14px;
          color: #303133;
          font-weight: 500;
        }
      }
    }

    .status-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }
  }

  .section-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 16px;
    font-weight: bold;
    color: #303133;
    margin: 24px 0 16px 0;
  }

  .action-cards {
    .action-card {
      cursor: pointer;
      transition: all 0.3s;
      height: 100%;

      &:hover {
        transform: translateY(-4px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      .card-icon {
        width: 48px;
        height: 48px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 12px;
        font-size: 24px;
        color: white;

        &.navigate {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        &.screenshot {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        }

        &.js {
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        }

        &.plugin {
          background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
        }
      }

      .card-content {
        h4 {
          margin: 0 0 4px 0;
          font-size: 14px;
          color: #303133;
        }

        p {
          margin: 0;
          font-size: 12px;
          color: #909399;
        }
      }
    }
  }

  .system-actions {
    .action-item-card {
      margin-bottom: 12px;
      height: 100%;

      .action-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;

        .action-name {
          font-weight: bold;
          font-size: 14px;
          color: #303133;
        }
      }

      .action-desc {
        font-size: 12px;
        color: #606266;
        margin: 8px 0;
        min-height: 32px;
      }

      .action-footer {
        display: flex;
        justify-content: flex-end;
      }
    }
  }

  .screenshot-container {
    text-align: center;

    .screenshot-img {
      max-width: 100%;
      max-height: 600px;
      border: 1px solid #ebeef5;
      border-radius: 4px;
    }
  }

  .form-tip {
    margin-left: 8px;
    font-size: 12px;
    color: #909399;
  }
}
</style>
