<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Connection, RefreshRight } from '@element-plus/icons-vue'
import { useThemeStore } from '@/stores/theme'

const { t } = useI18n()
const themeStore = useThemeStore()

// 定义 props
interface Props {
  errorMessage?: string
}

const props = withDefaults(defineProps<Props>(), {
  errorMessage: ''
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

// 存储所有定时器引用以便清理
const timeoutIds: ReturnType<typeof setTimeout>[] = []

// 要检测的服务器列表
const servers = [
  { name: t('network.serverOwn'), host: window.location.hostname },
  { name: t('network.serverBili'), host: 'www.bilibili.com' },
  { name: t('network.serverBaidu'), host: 'www.baidu.com' }
]

const getServerIP = async (hostname: string): Promise<string> => {
  const dohServers = [
    'https://dns.alidns.com/resolve',
    'https://doh.pub/dns-query'
  ]

  for (const dohUrl of dohServers) {
    try {
      const response = await fetch(`${dohUrl}?name=${hostname}&type=A`, {
        headers: { accept: 'application/dns-json' }
      })
      const data = await response.json()
      if (data.Answer && data.Answer.length > 0) {
        const aRecord = data.Answer.find((r: { type: number }) => r.type === 1)
        if (aRecord) {
          return aRecord.data
        }
      }
    } catch (error) {
      console.error(`DNS查询失败 (${dohUrl}):`, error)
      continue
    }
  }
  return '未知'
}

const pingOwnServer = async (host: string): Promise<{ ip: string; latency: number; success: boolean }> => {
  const startTime = performance.now()

  try {
    const ip = await getServerIP(host)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    timeoutIds.push(timeoutId)

    const response = await fetch('/api/v1/ping', {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-cache'
    })

    clearTimeout(timeoutId)
    timeoutIds.splice(timeoutIds.indexOf(timeoutId), 1)
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

const pingExternalServer = async (host: string): Promise<{ ip: string; latency: number; success: boolean }> => {
  const startTime = performance.now()

  try {
    const ip = await getServerIP(host)
    const endTime = performance.now()
    const latency = Math.round(endTime - startTime)

    return {
      ip,
      latency,
      success: ip !== '未知'
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

    const isOwnServer = server.host === window.location.hostname
    const result = isOwnServer
      ? await pingOwnServer(server.host)
      : await pingExternalServer(server.host)

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

onUnmounted(() => {
  // 清理所有定时器
  timeoutIds.forEach(id => clearTimeout(id))
})
</script>

<template>
  <div class="flex min-h-screen w-full items-center justify-center bg-gradient-hero-vibrant p-8 box-border md:p-4">
    <div class="w-full max-w-[900px] rounded-2xl  p-12 shadow-[0_20px_60px_rgba(0,0,0,0.3)] md:p-6">
      <!-- 标题 -->
      <div class="mb-8 text-center">
        <el-icon class="mb-4 text-[var(--el-color-primary)]" :size="48">
          <Connection />
        </el-icon>
        <el-text class="my-4 text-[2rem] text-[var(--el-text-color-primary)] md:text-2xl" tag="h1">{{ t('network.title') }}</el-text>
        <el-text class="text-[1.1rem] text-text-regular" tag="p">{{ props.errorMessage || t('network.errorDefault') }}</el-text>
      </div>

      <!-- Ping测试结果 -->
      <div class="mb-8">
        <div class="mb-4 flex items-center justify-between md:flex-col md:items-start md:gap-4">
          <el-text class="m-0 text-2xl text-[var(--el-text-color-primary)]" tag="h2">{{ t('network.serverTest') }}</el-text>
          <el-button
            type="primary"
            :loading="isPinging"
            @click="retryPing"
            :icon="RefreshRight"
          >
            {{ isPinging ? t('network.detecting') : t('network.retest') }}
          </el-button>
        </div>

        <el-table :data="pingResults" stripe style="width: 100%">
          <el-table-column prop="host" :label="t('network.colServer')" width="200" />
          <el-table-column prop="ip" :label="t('network.colIp')" width="180" />
          <el-table-column prop="latency" :label="t('network.colLatency')" width="120">
            <template #default="{ row }">
              <el-text v-if="row.status === 'pending'" tag="span">{{ t('network.statusDetecting') }}</el-text>
              <el-text v-else-if="row.status === 'success'" class="text-[var(--el-color-success)]" tag="span">
                {{ row.latency }}ms
              </el-text>
              <el-text v-else class="text-[var(--el-color-danger)]" tag="span">{{ t('network.timeout') }}</el-text>
            </template>
          </el-table-column>
          <el-table-column prop="status" :label="t('network.colStatus')" width="120">
            <template #default="{ row }">
              <el-tag v-if="row.status === 'pending'" type="info">{{ t('network.statusDetecting') }}</el-tag>
              <el-tag v-else-if="row.status === 'success'" type="success">{{ t('network.statusNormal') }}</el-tag>
              <el-tag v-else type="danger">{{ t('network.statusFailed') }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 提示信息 -->
      <div class="mb-8">
        <el-alert
          :title="t('network.adviceTitle')"
          type="info"
          :effect="themeStore.themeEffectString"
          :closable="false"
        >
          <template #default>
            <ul class="mt-2 mb-0 pl-6">
              <li class="mb-2 leading-relaxed">{{ t('network.advice1') }}</li>
              <li class="mb-2 leading-relaxed">{{ t('network.advice2') }}</li>
              <li class="mb-2 leading-relaxed">{{ t('network.advice3') }}</li>
              <li class="mb-2 leading-relaxed">{{ t('network.advice4') }}</li>
            </ul>
          </template>
        </el-alert>
      </div>

      <!-- 操作按钮 -->
      <div class="mt-8 flex justify-center gap-4 md:flex-col">
        <el-button size="large" @click="retryPing" :loading="isPinging">
          {{ t('network.retest') }}
        </el-button>
        <el-button size="large" type="primary" @click="goHome">
          {{ t('network.backHome') }}
        </el-button>
      </div>
    </div>
  </div>
</template>
