<template>
  <FlexContainer class="rpa-mcp-config-view flex flex-col gap-4">
    <!-- 页头 -->
    <BiliPageHeader
      title="MCP 配置指南"
      hide-title
      description="RPA 把用户可用的全部接口以 MCP（Streamable HTTP）暴露出来，可在 Cursor / Claude Desktop 等客户端里直接调用动作调试、工作流运行与日志查询。按下方步骤生成客户端配置并复制即可。"
    />

    <!-- 表单：网关地址 + bili_jwt -->
    <div class="rpa-mcp-config-view__form grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div class="rpa-mcp-config-view__field flex flex-col gap-1.5">
        <span class="rpa-mcp-config-view__label text-sm text-text-secondary">网关地址</span>
        <el-input
          v-model="gatewayBase"
          size="large"
          class="rpa-mcp-config-view__gateway-input"
          placeholder="http://你的网关:10007"
          clearable
        >
          <template #prepend>
            <span class="rpa-mcp-config-view__prepend text-xs">端点</span>
          </template>
        </el-input>
        <span class="rpa-mcp-config-view__hint text-xs text-text-placeholder">
          默认取当前站点 origin（前端本就跑在网关后）。端点 = 网关地址 + /api/v1/rpa/mcp
        </span>
      </div>

      <div class="rpa-mcp-config-view__field flex flex-col gap-1.5">
        <span class="rpa-mcp-config-view__label text-sm text-text-secondary">本站登录令牌 bili_jwt</span>
        <el-input
          v-model="biliJwt"
          size="large"
          class="rpa-mcp-config-view__token-input"
          type="password"
          show-password
          placeholder="本站网关签发的 bili_jwt（非 B 站 Cookie）"
          clearable
        />
        <span class="rpa-mcp-config-view__hint text-xs text-text-placeholder">
          bili_jwt 是本站登录时由网关签发的本站令牌，不是 B 站的 SESSDATA / bili_jct，也不需要您提供 B 站账号或密码。可在 DevTools → Application → Cookies 中查看；鉴权只认此 Cookie，不支持 Authorization 头
        </span>
      </div>
    </div>

    <!-- 测试连接：同源自动带 bili_jwt Cookie，验证端点与登录态是否可用 -->
    <div class="rpa-mcp-config-view__test flex flex-col gap-2 rounded-2xl bg-primary-light-9 border border-primary-light-8 p-4">
      <div class="rpa-mcp-config-view__test-head flex flex-wrap items-center gap-3">
        <el-button
          type="success"
          size="large"
          class="rpa-mcp-config-view__test-btn"
          :icon="Connection"
          :loading="testing"
          @click="testConnection"
        >
          {{ testing ? '测试中…' : '测试连接' }}
        </el-button>
        <span class="rpa-mcp-config-view__test-hint text-sm text-text-secondary">
          以当前登录态（自动带 bili_jwt）向端点发一次 MCP initialize 握手，确认可达且鉴权通过
        </span>
      </div>
      <el-alert
        v-if="testResult && testResult.ok"
        class="rpa-mcp-config-view__test-ok"
        type="success"
        :closable="false"
        show-icon
        title="连接成功"
        description="MCP initialize 握手通过，端点与登录态均正常。把上面的配置复制到客户端即可（客户端需自行带上 bili_jwt）。"
      />
      <template v-else-if="testResult">
        <el-alert
          class="rpa-mcp-config-view__test-fail"
          type="error"
          :closable="false"
          show-icon
          title="连接失败"
          :description="testResult.status === 0 ? '请求未发出或被浏览器拦截（跨域/网络）。' : '端点返回的不是合法 MCP 响应，通常是网关鉴权失败（返回 {code,msg,ttl} 信封）。请确认已登录、bili_jwt 未过期、且 URL 指向的是网关而非直连 RPA。'"
        />
        <pre class="rpa-mcp-config-view__test-body overflow-auto rounded-xl bg-primary-light-8 border border-primary-light-7 p-3 text-xs text-text-primary font-mono leading-relaxed">HTTP {{ testResult.status }}

{{ testResult.body }}</pre>
      </template>
    </div>

    <!-- 客户端类型 Tab -->
    <el-tabs v-model="activeTab" class="rpa-mcp-config-view__tabs" type="border-card">
      <el-tab-pane label="Cursor / 原生 HTTP 客户端" name="http">
        <div class="rpa-mcp-config-view__code-block flex flex-col gap-2">
          <div class="rpa-mcp-config-view__code-head flex items-center justify-between">
            <span class="rpa-mcp-config-view__code-title text-sm text-text-secondary">
              mcp.json（直接写入客户端 MCP 配置）
            </span>
            <el-button
              type="primary"
              size="default"
              class="rpa-mcp-config-view__copy-btn"
              :icon="CopyDocument"
              :loading="copying"
              @click="handleCopy(httpConfig)"
            >
              {{ copied ? '已复制' : '复制配置' }}
            </el-button>
          </div>
          <pre class="rpa-mcp-config-view__code flex-1 overflow-auto rounded-xl bg-primary-light-9 border border-primary-light-8 p-4 text-sm text-text-primary font-mono leading-relaxed">{{ httpConfig }}</pre>
        </div>
      </el-tab-pane>

      <el-tab-pane label="Claude Desktop" name="claude">
        <div class="rpa-mcp-config-view__code-block flex flex-col gap-2">
          <div class="rpa-mcp-config-view__code-head flex items-center justify-between">
            <span class="rpa-mcp-config-view__code-title text-sm text-text-secondary">
              claude_desktop_config.json（需 mcp-remote 桥接）
            </span>
            <el-button
              type="primary"
              size="default"
              class="rpa-mcp-config-view__copy-btn"
              :icon="CopyDocument"
              :loading="copying"
              @click="handleCopy(claudeConfig)"
            >
              {{ copied ? '已复制' : '复制配置' }}
            </el-button>
          </div>
          <pre class="rpa-mcp-config-view__code flex-1 overflow-auto rounded-xl bg-primary-light-9 border border-primary-light-8 p-4 text-sm text-text-primary font-mono leading-relaxed">{{ claudeConfig }}</pre>
          <el-alert
            class="rpa-mcp-config-view__alert"
            type="info"
            :closable="false"
            show-icon
            title="Claude Desktop 原生不支持 Streamable HTTP，需要 npx mcp-remote 桥接"
            description="先在本地安装 Node.js，mcp-remote 会通过 npx 自动拉取。其他原生支持 HTTP 传输的客户端（如新版 Cursor）直接用上面「Cursor」页签的配置即可。"
          />
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 注意事项 -->
    <el-alert
      class="rpa-mcp-config-view__notice"
      type="warning"
      :closable="false"
      show-icon
      title="连接与鉴权注意事项"
    >
      <template #default>
        <ul class="rpa-mcp-config-view__notice-list flex flex-col gap-1.5 text-sm text-text-secondary list-disc pl-5">
          <li>鉴权全部走网关：网关校验 JWT（含登出黑名单）后注入 x-bili-* 可信头，RPA 侧只透传，不解析 Cookie、也不接受写死 mid。</li>
          <li>只能带 Cookie: bili_jwt，不支持 Authorization 头（网关 JwtModule 只从 Cookie 读 JWT）。</li>
          <li>网关端口：容器/生产 = NODEJS_PPTR_PORT（默认 10007），本地 dev = 9926；直连 RPA 调试仅限内网 http://&lt;rpa-host&gt;:28000/api/v1/rpa/mcp，勿暴露公网。</li>
          <li>网关对非 SSE 请求有 180s 超时，rpa_debug_workflow_run 等待超过 3 分钟会被断开。</li>
          <li>服务端开关：RPA 侧 RPA_MCP_ENABLED（默认 dev 开、prod 关），一般无需改动；自检命令 python -m app.mcp --selftest。</li>
        </ul>
      </template>
    </el-alert>
  </FlexContainer>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { CopyDocument, Connection } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { copyToClipboard } from '@/utils/rpa/clipboard'

defineOptions({ name: 'RpaMcpConfigView' })

const gatewayBase = ref(typeof window !== 'undefined' ? window.location.origin : '')
const biliJwt = ref('')
const activeTab = ref<'http' | 'claude'>('http')
const copying = ref(false)
const copied = ref(false)
const testing = ref(false)
const testResult = ref<{ ok: boolean; status: number; body: string } | null>(null)

const endpoint = computed(() => {
  const base = (gatewayBase.value || '').replace(/\/+$/, '')
  return `${base}/api/v1/rpa/mcp`
})

const tokenPlaceholder = '<你的 bili_jwt>'
const cookieValue = computed(() => biliJwt.value.trim() || tokenPlaceholder)

const httpConfig = computed(() =>
  JSON.stringify(
    {
      mcpServers: {
        rpa: {
          type: 'http',
          url: endpoint.value,
          headers: {
            Cookie: `bili_jwt=${cookieValue.value}`
          }
        }
      }
    },
    null,
    2
  )
)

const claudeConfig = computed(() =>
  JSON.stringify(
    {
      mcpServers: {
        rpa: {
          command: 'npx',
          args: [
            'mcp-remote',
            endpoint.value,
            '--header',
            `Cookie:bili_jwt=${cookieValue.value}`
          ]
        }
      }
    },
    null,
    2
  )
)

async function handleCopy(text: string) {
  copying.value = true
  copied.value = false
  const ok = await copyToClipboard(text)
  copying.value = false
  if (ok) {
    copied.value = true
    ElMessage.success('配置已复制到剪贴板')
    window.setTimeout(() => (copied.value = false), 2000)
  } else {
    ElMessage.error('复制失败，请手动选择文本复制')
  }
}

// 同源自测：浏览器已带 bili_jwt Cookie，直接对端点发一次 MCP initialize 握手。
// 成功 = 返回 jsonrpc:"2.0" 且带 result；失败基本是网关鉴权信封（{code,msg,ttl}）。
async function testConnection() {
  if (!endpoint.value) return
  testing.value = true
  testResult.value = null
  try {
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), 15000)
    const res = await fetch(endpoint.value, {
      method: 'POST',
      credentials: 'include',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'rpa-web-test', version: '1.0.0' }
        }
      })
    })
    window.clearTimeout(timer)
    const text = await res.text()
    let ok = false
    try {
      const data = JSON.parse(text)
      ok = data.jsonrpc === '2.0' && data.result != null
    } catch {
      ok = false
    }
    testResult.value = { ok, status: res.status, body: text }
  } catch (err) {
    testResult.value = {
      ok: false,
      status: 0,
      body: `请求未发出：${err instanceof Error ? err.message : String(err)}`
    }
  } finally {
    testing.value = false
  }
}

</script>
