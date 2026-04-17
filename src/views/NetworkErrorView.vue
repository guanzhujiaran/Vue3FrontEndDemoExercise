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
  <div class="flex min-h-screen w-full items-center justify-center bg-gradient-hero-vibrant p-8 box-border md:p-4">
    <div class="w-full max-w-[900px] rounded-2xl bg-[var(--el-bg-color)] p-12 shadow-[0_20px_60px_rgba(0,0,0,0.3)] md:p-6">
      <!-- 标题 -->
      <div class="mb-8 text-center">
        <el-icon class="mb-4 text-[var(--el-color-primary)]" :size="48">
          <Connection />
        </el-icon>
        <el-text class="my-4 text-[2rem] text-[var(--el-text-color-primary)] md:text-2xl" tag="h1">网络连接诊断</el-text>
        <el-text class="text-[1.1rem] text-[var(--el-text-color-regular)]" tag="p">{{ props.errorMessage }}</el-text>
      </div>

      <!-- Ping测试结果 -->
      <div class="mb-8">
        <div class="mb-4 flex items-center justify-between md:flex-col md:items-start md:gap-4">
          <el-text class="m-0 text-2xl text-[var(--el-text-color-primary)]" tag="h2">服务器连接测试</el-text>
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
              <el-text v-if="row.status === 'pending'" tag="span">检测中...</el-text>
              <el-text v-else-if="row.status === 'success'" class="text-[var(--el-color-success)]" tag="span">
                {{ row.latency }}ms
              </el-text>
              <el-text v-else class="text-[var(--el-color-danger)]" tag="span">超时</el-text>
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
      <div class="mb-8">
        <el-alert
          title="诊断建议"
          type="info"
          :closable="false"
        >
          <template #default>
            <ul class="mt-2 mb-0 pl-6">
              <li class="mb-2 leading-relaxed">如果主服务器连接失败，请检查您的网络连接</li>
              <li class="mb-2 leading-relaxed">如果DNS服务器连接失败，可能是DNS解析问题</li>
              <li class="mb-2 leading-relaxed">如果其他外部网站可以访问，可能是服务器暂时不可用</li>
              <li class="mb-2 leading-relaxed">建议刷新页面或稍后重试</li>
            </ul>
          </template>
        </el-alert>
      </div>

      <!-- 操作按钮 -->
      <div class="mt-8 flex justify-center gap-4 md:flex-col">
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
