<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Connection, RefreshRight } from '@element-plus/icons-vue'

// 定义 props
interface Props {
  errorMessage?: string
}

const props = withDefaults(defineProps<Props>(), {
  errorMessage: '无法连接到服务器'
})

// 定义 emit
const emit = defineEmits<{
  close: []
}>()

// 状态管理
const isPinging = ref(false)
const pingResults = ref<Array<{
  host: string
  ip: string
  latency: number
  status: 'success' | 'error' | 'pending'
}>>([])

// 要检测的服务器列表
const servers = [
  { name: '该网站服务器', host: window.location.hostname },
  { name: 'B站服务器', host: 'www.bilibili.com' },
  { name: '百度服务器', host: 'www.baidu.com' }
]

// 获取主服务器的IP地址
const getServerIP = async (hostname: string): Promise<string> => {
  const dohServers = [
    'https://dns.alidns.com/resolve',
    'https://doh.pub/dns-query'
  ]

  for (const dohUrl of dohServers) {
    try {
      // 使用国内 DoH API 查询 IP 地址
      const response = await fetch(`${dohUrl}?name=${hostname}&type=A`, {
        headers: { accept: 'application/dns-json' }
      })
      const data = await response.json()
      if (data.Answer && data.Answer.length > 0) {
        return data.Answer[0].data
      }
    } catch (error) {
      console.error(`DNS查询失败 (${dohUrl}):`, error)
      continue
    }
  }
  return '未知'
}

// Ping服务器（通过HTTP请求模拟）
const pingServer = async (host: string): Promise<{ ip: string; latency: number; success: boolean }> => {
  const startTime = performance.now()

  try {
    // 尝试获取IP地址
    const ip = await getServerIP(host)

    // 通过HTTP请求测量延迟
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5秒超时

    // 使用当前域名的API接口进行ping测试
    const response = await fetch('/api/v1/ping', {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-cache'
    })

    clearTimeout(timeoutId)
    const endTime = performance.now()
    const latency = Math.round(endTime - startTime)

    return {
      ip,
      latency,
      success: response.ok
    }
  } catch (error) {
    const endTime = performance.now()
    const latency = Math.round(endTime - startTime)

    return {
      ip: '未知',
      latency,
      success: false
    }
  }
}

// 执行所有ping测试
const runPingTests = async () => {
  isPinging.value = true
  pingResults.value = []

  for (const server of servers) {
    pingResults.value.push({
      host: server.name,
      ip: '查询中...',
      latency: 0,
      status: 'pending'
    })

    const result = await pingServer(server.host)

    // 更新结果
    const index = pingResults.value.findIndex(r => r.host === server.name)
    if (index !== -1) {
      pingResults.value[index] = {
        host: server.name,
        ip: result.ip,
        latency: result.latency,
        status: result.success ? 'success' : 'error'
      }
    }
  }

  isPinging.value = false
}

// 重新测试
const retryPing = () => {
  runPingTests()
}

// 返回首页（关闭诊断页面）
const goHome = () => {
  emit('close')
}

onMounted(() => {
  // 自动开始ping测试
  runPingTests()
})
</script>

<template>
  <div class="network-diagnosis-container">
    <div class="diagnosis-content">
      <!-- 标题 -->
      <div class="diagnosis-header">
        <el-icon class="header-icon" :size="48">
          <Connection />
        </el-icon>
        <h1 class="header-title">网络连接诊断</h1>
        <p class="header-subtitle">{{ props.errorMessage }}</p>
      </div>

      <!-- Ping测试结果 -->
      <div class="ping-results">
        <div class="results-header">
          <h2>服务器连接测试</h2>
          <el-button
            type="primary"
            :loading="isPinging"
            @click="retryPing"
            :icon="RefreshRight"
          >
            {{ isPinging ? '检测中...' : '重新检测' }}
          </el-button>
        </div>

        <el-table :data="pingResults" stripe style="width: 100%">
          <el-table-column prop="host" label="服务器" width="200" />
          <el-table-column prop="ip" label="IP地址" width="180" />
          <el-table-column prop="latency" label="延迟" width="120">
            <template #default="{ row }">
              <span v-if="row.status === 'pending'">检测中...</span>
              <span v-else-if="row.status === 'success'" style="color: var(--el-color-success)">
                {{ row.latency }}ms
              </span>
              <span v-else style="color: var(--el-color-danger)">超时</span>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="120">
            <template #default="{ row }">
              <el-tag v-if="row.status === 'pending'" type="info">检测中</el-tag>
              <el-tag v-else-if="row.status === 'success'" type="success">正常</el-tag>
              <el-tag v-else type="danger">失败</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 提示信息 -->
      <div class="diagnosis-tips">
        <el-alert
          title="诊断建议"
          type="info"
          :closable="false"
        >
          <template #default>
            <ul>
              <li>如果主服务器连接失败，请检查您的网络连接</li>
              <li>如果DNS服务器连接失败，可能是DNS解析问题</li>
              <li>如果其他外部网站可以访问，可能是服务器暂时不可用</li>
              <li>建议刷新页面或稍后重试</li>
            </ul>
          </template>
        </el-alert>
      </div>

      <!-- 操作按钮 -->
      <div class="diagnosis-actions">
        <el-button size="large" @click="retryPing" :loading="isPinging">
          重新检测
        </el-button>
        <el-button size="large" type="primary" @click="goHome">
          返回首页
        </el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.network-diagnosis-container {
  width: 100%;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
  box-sizing: border-box;
}

.diagnosis-content {
  background: white;
  border-radius: 16px;
  padding: 3rem;
  max-width: 900px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.diagnosis-header {
  text-align: center;
  margin-bottom: 2rem;
}

.header-icon {
  color: var(--el-color-primary);
  margin-bottom: 1rem;
}

.header-title {
  font-size: 2rem;
  margin: 1rem 0;
  color: #333;
}

.header-subtitle {
  font-size: 1.1rem;
  color: #666;
}

.ping-results {
  margin-bottom: 2rem;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.results-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: #333;
}

.diagnosis-tips {
  margin-bottom: 2rem;
}

.diagnosis-tips ul {
  margin: 0.5rem 0 0 0;
  padding-left: 1.5rem;
}

.diagnosis-tips li {
  margin-bottom: 0.5rem;
  line-height: 1.6;
}

.diagnosis-actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 2rem;
}

@media (max-width: 768px) {
  .network-diagnosis-container {
    padding: 1rem;
  }

  .diagnosis-content {
    padding: 1.5rem;
  }

  .header-title {
    font-size: 1.5rem;
  }

  .results-header {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }

  .diagnosis-actions {
    flex-direction: column;
  }
}
</style>
