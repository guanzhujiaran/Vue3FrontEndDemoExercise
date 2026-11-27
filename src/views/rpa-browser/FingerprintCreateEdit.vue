<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ArrowLeft, Refresh, Check } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import BiliPageHeader from '@/components/CommonCompo/Bili-Container-Compo/BiliPageHeader.vue'
import FieldInfoTip from '@/components/rpa-browser/FieldInfoTip.vue'
import { 浏览器指纹管理Service } from '@/api/browser/hey-api'
import { useUserNavStore } from '@/stores/user_nav'
import biliMessage from '@/utils/message'
import {
  GPU_OVERRIDE_LAST_SUPPORTED_MAJOR,
  supportsGpuOverride,
} from '@/models/rpa_browser'
import { resolveProxyMode, type ProxyMode } from '@/utils/rpa/proxy'
import type { BrowserFingerprintUpsertParams, BrowserExecVersionInfo } from '@/api/browser/hey-api'

const router = useRouter()
const route = useRoute()
const userNavStore = useUserNavStore()

const browserId = route.params.browserId as string | undefined
const isEdit = !!browserId

const formData = ref<BrowserFingerprintUpsertParams>({
  browser_id: browserId,
  custom_name: '',
  fingerprint_int: null,
  fingerprint_platform: '',
  fingerprint_platform_version: '',
  fingerprint_browser: '',
  fingerprint_brand_version: '',
  fingerprint_real_version: '',
  fingerprint_hardware_concurrency: null,
  fingerprint_gpu_vendor: '',
  fingerprint_gpu_renderer: '',
  lang: '',
  accept_lang: '',
  timezone: '',
  proxy_server: '',
  proxy_bypass: ''
})

/**
 * 代理三选一：
 * - `pool`   → `proxy_server` 留空，启动时回退服务端默认代理（IPv6 代理池）；
 * - `none`   → 显式 `"none"`，启动时直连、不回退默认代理；
 * - `custom` → 用户填写的 host:port。
 *
 * 自定义地址单独存 `proxyCustomValue`：来回切模式时不能丢用户已填的值。
 */
const proxyMode = ref<ProxyMode>(resolveProxyMode(''))
const proxyCustomValue = ref('')

function applyProxyServer(proxyServer?: string | null) {
  proxyMode.value = resolveProxyMode(proxyServer)
  if (proxyMode.value === 'custom') {
    proxyCustomValue.value = (proxyServer || '').trim()
  }
}

const formRef = ref<FormInstance>()

/** 页面数据加载（编辑态骨架屏）；与「提交中」分开，避免提交时整页变骨架 */
const loading = ref(false)
const submitting = ref(false)
const generating = ref(false)
const versionsLoading = ref(false)

// ── 可选真实版本（唯一数据源：服务端 browser_exec_info.json） ──────────────
const availableVersions = ref<BrowserExecVersionInfo[]>([])

const loadExecVersions = async () => {
  versionsLoading.value = true
  try {
    const response = await 浏览器指纹管理Service.listExecVersionsRouterApiV1RpaBrowserListExecVersionsPost({}) as any
    if (response?.code === 0 && Array.isArray(response?.data)) {
      availableVersions.value = response.data as BrowserExecVersionInfo[]
    } else {
      biliMessage.error(response?.msg || '获取可选浏览器版本失败')
    }
  } catch {
    biliMessage.error('获取可选浏览器版本失败，请检查网络')
  } finally {
    versionsLoading.value = false
  }
}

/** 版本号主版本段（「150.0.7871.124」→「150」） */
const majorOf = (version: string): string => (version || '').split('.')[0]

/**
 * 真实版本必填；模拟版本必须是四段号且主版本与真实版本一致。
 * 必填/格式规则只在清单可用时生效（接口失败不阻塞编辑）。
 */
const formRules = computed<FormRules>(() =>
  availableVersions.value.length
    ? {
        fingerprint_real_version: [
          { required: true, message: '请选择真实浏览器版本', trigger: 'change' }
        ],
        fingerprint_brand_version: [
          { required: true, message: '请填写模拟版本', trigger: 'blur' },
          {
            pattern: /^\d+\.\d+\.\d+\.\d+$/,
            message: '格式应为四段数字，例如 150.0.7871.124',
            trigger: 'blur'
          }
        ]
      }
    : {}
)

/** GPU 覆盖（厂商/渲染器）只在 Chrome 143 及以下内核生效，≥144 由指纹种子决定 */
const gpuOverrideSupported = computed(() =>
  supportsGpuOverride(formData.value.fingerprint_real_version)
)

// ── 字段说明（label 右侧 info 图标的 tooltip 文案） ─────────────────────────
const nameTip = '留空会自动生成「浏览器_<ID>」，同一用户下不可重名。'

/**
 * 种子是内核伪装的根：同一种子 = 同一台「虚拟设备」（canvas / audio / ClientRects
 * 等派生值稳定），换种子就换一整套指纹；库里对种子有全局唯一约束，重复会被拒绝。
 */
const seedTip =
  '指纹种子决定 canvas / audio / ClientRects / 字体等派生值：同一个种子等于同一台「虚拟设备」，跨会话稳定；换种子就换一整套指纹。留空则创建时随机生成。种子全局唯一，重复会被拒绝（同种子会让两个浏览器互相可关联）。'

const proxyTip = computed(() => {
  if (proxyMode.value === 'pool') {
    return '使用服务端默认代理（IPv6 代理池）：出口从公网 /64 前缀里随机取址，不会长期固定在同一 IP。'
  }
  if (proxyMode.value === 'none') {
    return '不使用任何代理，直接走服务器出口。同一 IP 被多个账号共用时，站点会按 IP 维度风控（验证码、登录态互踢、限流直至封禁）。'
  }
  return '自定义代理：填 host:port（可选 user:pass@host:port）。建议一个浏览器一个独立代理，避免同 IP 多账号被风控。'
})

const proxyBypassTip = computed(() =>
  proxyMode.value === 'custom'
    ? '命中的域名/IP 不走代理，逗号分隔；只支持域名或 IP，不能带 http 前缀。留空则不绕过任何主机。'
    : '仅自定义代理支持绕过；IPv6 代理池 / 直连不使用绕过列表'
)

const realVersionTip =
  '真实版本决定实际启动哪个 chromium 二进制，只能从服务端清单中选择；清单外的版本后端会拒绝保存。'

const brandVersionTip =
  '页面读到的报告版本，默认等于真实版本；可在同一主版本内改 patch（如 150.0.7871.186 → 150.0.7871.124）。跨主版本会与内核特性集 / TLS 对不上，后端会拒绝。'

const gpuOverrideTip = computed(() =>
  gpuOverrideSupported.value
    ? `GPU 厂商 / 渲染器仅对 Chrome ${GPU_OVERRIDE_LAST_SUPPORTED_MAJOR} 及以下内核生效；更高版本该项不生效。`
    : `当前真实版本 ${formData.value.fingerprint_real_version}（≥${GPU_OVERRIDE_LAST_SUPPORTED_MAJOR + 1}）已移除 GPU 覆盖开关，这两项不会生效，实际 GPU 由指纹种子决定。`
)

/**
 * 模拟版本默认跟随真实版本，但允许同主版本内改 patch。
 * 换真实版本时：模拟版本为空、或主版本已不匹配 → 跟随覆盖；同主版本则保留用户的 patch。
 */
const handleRealVersionChange = (value: string) => {
  const brand = formData.value.fingerprint_brand_version || ''
  if (!brand || majorOf(brand) !== majorOf(value)) {
    formData.value.fingerprint_brand_version = value || ''
  }
}

const loadFingerprintData = async () => {
  if (!browserId) return

  loading.value = true
  try {
    const response = await 浏览器指纹管理Service.readFingerprintRouterApiV1RpaBrowserReadFingerprintPost({
      query: { browser_id: browserId },
          }) as any  // responseStyle='data' → 直接返回 {code, data, msg}

    if (response?.code === 0 && response?.data) {
      const data = response.data as any
      formData.value = {
        browser_id: browserId,
        custom_name: data.custom_name || '',
        // 种子在响应里的字段名是 fingerprint（入参才叫 fingerprint_int）
        fingerprint_int: data.fingerprint ?? null,
        fingerprint_platform: data.fingerprint_platform || '',
        fingerprint_platform_version: data.fingerprint_platform_version || '',
        fingerprint_browser: data.fingerprint_browser || '',
        fingerprint_brand_version: data.fingerprint_brand_version || '',
        fingerprint_real_version: data.fingerprint_real_version || '',
        fingerprint_hardware_concurrency: data.fingerprint_hardware_concurrency || null,
        fingerprint_gpu_vendor: data.fingerprint_gpu_vendor || '',
        fingerprint_gpu_renderer: data.fingerprint_gpu_renderer || '',
        lang: data.lang || '',
        accept_lang: data.accept_lang || '',
        timezone: data.timezone || '',
        proxy_server: data.proxy_server || '',
        proxy_bypass: data.proxy_bypass || ''
      }
      applyProxyServer(data.proxy_server)
    } else {
      biliMessage.error(response?.msg || '获取指纹信息失败')
      router.back()
    }
  } catch (error) {
    biliMessage.error('网络异常，请稍后重试')
    router.back()
  } finally {
    loading.value = false
  }
}

const handleGenerateRandom = async () => {
  generating.value = true
  try {
    const response = await 浏览器指纹管理Service.genRandFingerprintRouterApiV1RpaBrowserGenRandFingerprintPost({
      body: {},
          }) as any  // responseStyle='data' → 直接返回 {code, data, msg}

    if (response?.code === 0 && response?.data) {
      const data = response.data as any
      formData.value = {
        ...formData.value,
        fingerprint_int: data.fingerprint ?? null,
        fingerprint_platform: data.fingerprint_platform || '',
        fingerprint_platform_version: data.fingerprint_platform_version || '',
        fingerprint_browser: data.fingerprint_browser || '',
        fingerprint_brand_version: data.fingerprint_brand_version || '',
        fingerprint_real_version: data.fingerprint_real_version || '',
        fingerprint_hardware_concurrency: data.fingerprint_hardware_concurrency || null,
        fingerprint_gpu_vendor: data.fingerprint_gpu_vendor || '',
        fingerprint_gpu_renderer: data.fingerprint_gpu_renderer || '',
        lang: data.lang || '',
        accept_lang: data.accept_lang || '',
        timezone: data.timezone || '',
        proxy_server: data.proxy_server || ''
      }
      applyProxyServer(data.proxy_server)
      biliMessage.success('随机生成成功')
    } else {
      biliMessage.error(response?.msg || '随机生成失败')
    }
  } catch (error) {
    biliMessage.error('网络异常，请稍后重试')
  } finally {
    generating.value = false
  }
}

const handleSubmit = async () => {
  // 表单规则（真实版本必选）：先走 el-form，让字段级错误提示出现在输入框下方
  if (formRef.value) {
    const valid = await formRef.value.validate().catch(() => false)
    if (!valid) return
  }
  // 白名单二次校验：后端还会再校验一次，这里提前拦住手改的非法值
  if (availableVersions.value.length > 0) {
    const realVersion = formData.value.fingerprint_real_version || ''
    if (!availableVersions.value.some((item) => item.full_version === realVersion)) {
      biliMessage.error('真实浏览器版本不在服务端可选清单内')
      return
    }
    const brandVersion = formData.value.fingerprint_brand_version || ''
    if (!brandVersion) {
      formData.value.fingerprint_brand_version = realVersion
    } else if (majorOf(brandVersion) !== majorOf(realVersion)) {
      biliMessage.error('模拟版本只能在同一主版本内调整，主版本需与真实版本一致')
      return
    }
  }

  // 代理模式 → proxy_server 映射：
  // 池 = "pool"（启动时回退服务端默认代理）；直连 = "none"（不回退）；自定义 = 输入值
  // 池不能用空串：入参层会把空串归一成 None，更新时按「未提供」跳过，旧代理清不掉
  if (proxyMode.value === 'pool') {
    formData.value.proxy_server = POOL_PROXY_VALUE
  } else if (proxyMode.value === 'none') {
    formData.value.proxy_server = 'none'
  } else {
    const custom = proxyCustomValue.value.trim()
    if (!custom) {
      biliMessage.error('请填写自定义代理地址（host:port）')
      return
    }
    formData.value.proxy_server = custom
  }

  // 绕过列表只对自定义代理有意义：其它模式清空，避免残留旧规则
  if (proxyMode.value !== 'custom') {
    formData.value.proxy_bypass = ''
  }

  submitting.value = true
  try {
    // 代理绕过列表清洗：分号/空格/换行 → 逗号、去重、去首尾空白；空值归一为 undefined（不覆盖后端值）
    if (formData.value.proxy_bypass) {
      formData.value.proxy_bypass = formData.value.proxy_bypass
        .split(/[;,\s]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .filter((s, i, arr) => arr.indexOf(s) === i)
        .join(',')
    }
    const response = await 浏览器指纹管理Service.upsertFingerprintRouterApiV1RpaBrowserUpsertFingerprintPost({
      body: formData.value,
          }) as any  // responseStyle='data' → 直接返回 {code, data, msg}

    if (response?.code === 0) {
      biliMessage.success(isEdit ? '更新成功' : '创建成功')
      router.push('/app/rpa-browser')
    } else {
      biliMessage.error(response?.msg || (isEdit ? '更新失败' : '创建失败'))
    }
  } catch (error) {
    biliMessage.error('网络异常，请稍后重试')
  } finally {
    submitting.value = false
  }
}

const handleBack = () => {
  router.back()
}

onMounted(() => {
  loadExecVersions()
  if (isEdit) {
    loadFingerprintData()
  }
})
</script>

<template>
  <FlexContainer class="fingerprint-cyber-container">
    <BiliPageHeader :title="isEdit ? '编辑指纹' : '创建指纹'" hide-title description="配置你的数字身份">
      <template #extra>
        <el-button :icon="ArrowLeft" @click="handleBack" class="cyber-btn">返回</el-button>
      </template>
    </BiliPageHeader>

    <div class="fingerprint-cyber-content mt-4 w-full rounded-2xl p-4">
      <div v-if="loading && isEdit" class="w-full">
        <el-skeleton :rows="10" animated></el-skeleton>
      </div>

      <el-form v-else ref="formRef" :model="formData" :rules="formRules" label-position="top" class="w-full cyber-form">
        <div class="cyber-grid-bg"></div>

        <div class="cyber-cards-container">
          <el-card class="cyber-card">
            <template #header>
              <div class="flex items-center justify-between">
                <div class="cyber-title">
                  <span class="cyber-icon animate-pulse-glow">◈</span>
                  <span>基础配置</span>
                </div>
                <el-button type="primary" :icon="Refresh" :loading="generating" @click="handleGenerateRandom" class="cyber-btn cyber-btn-primary fingerprint-form__generate-btn">
                  随机生成
                </el-button>
              </div>
            </template>

            <el-form-item label="指纹名称">
              <template #label>
                <span class="fingerprint-form__label">
                  指纹名称
                  <FieldInfoTip :content="nameTip" />
                </span>
              </template>
              <el-input v-model="formData.custom_name" placeholder="留空将自动生成" clearable class="cyber-input" />
            </el-form-item>

            <el-form-item prop="fingerprint_int">
              <template #label>
                <span class="fingerprint-form__label">
                  指纹种子
                  <FieldInfoTip :content="seedTip" />
                </span>
              </template>
              <el-input-number
                v-model="formData.fingerprint_int"
                class="w-full fingerprint-form__seed cyber-input-number"
                placeholder="留空则随机生成"
                :min="-2147483648"
                :max="2147483647"
                :controls="false"
              />
            </el-form-item>

            <el-form-item>
              <template #label>
                <span class="fingerprint-form__label">
                  代理设置
                  <FieldInfoTip :content="proxyTip" />
                </span>
              </template>
              <el-radio-group v-model="proxyMode" class="fingerprint-form__proxy-mode">
                <el-radio-button value="pool">IPv6 代理池</el-radio-button>
                <el-radio-button value="none">不使用代理</el-radio-button>
                <el-radio-button value="custom">自定义代理</el-radio-button>
              </el-radio-group>
            </el-form-item>

            <el-form-item v-if="proxyMode === 'custom'" label="自定义代理地址">
              <el-input
                v-model="proxyCustomValue"
                placeholder="例如: 127.0.0.1:7890"
                clearable
                class="cyber-input"
              />
            </el-form-item>

            <el-form-item>
              <template #label>
                <span class="fingerprint-form__label">
                  代理绕过
                  <FieldInfoTip :content="proxyBypassTip" :tone="proxyMode === 'custom' ? 'normal' : 'warning'" />
                </span>
              </template>
              <el-input
                v-model="formData.proxy_bypass"
                type="textarea"
                :rows="2"
                :disabled="proxyMode !== 'custom'"
                placeholder="例如: *.bilibili.com,127.0.0.1"
                clearable
                class="cyber-input"
              />
            </el-form-item>
          </el-card>

          <el-card class="cyber-card">
            <template #header>
              <div class="cyber-title">
                <span class="cyber-icon animate-pulse-glow">◈</span>
                <span>平台信息</span>
              </div>
            </template>

            <div class="cyber-grid">
              <el-form-item label="平台">
                <el-select v-model="formData.fingerprint_platform" placeholder="选择平台" clearable class="w-full cyber-select">
                  <el-option label="Windows" value="windows" />
                  <el-option label="Linux" value="linux" />
                  <el-option label="macOS" value="macos" />
                </el-select>
              </el-form-item>

              <el-form-item label="平台版本">
                <el-input v-model="formData.fingerprint_platform_version" placeholder="例如: 10.0.19041" clearable class="cyber-input" />
              </el-form-item>
            </div>

            <div class="cyber-grid">
              <el-form-item label="浏览器">
                <el-select v-model="formData.fingerprint_browser" placeholder="选择浏览器" clearable class="w-full cyber-select">
                  <el-option label="Chrome" value="chrome" />
                  <el-option label="Edge" value="edge" />
                  <el-option label="Opera" value="opera" />
                  <el-option label="Vivaldi" value="vivaldi" />
                </el-select>
              </el-form-item>

              <el-form-item prop="fingerprint_real_version">
                <template #label>
                  <span class="fingerprint-form__label">
                    真实版本
                    <FieldInfoTip :content="realVersionTip" />
                  </span>
                </template>
                <el-select
                  v-model="formData.fingerprint_real_version"
                  class="w-full cyber-select fingerprint-form__real-version"
                  placeholder="选择真实浏览器版本"
                  :loading="versionsLoading"
                  @change="handleRealVersionChange"
                >
                  <el-option
                    v-for="version in availableVersions"
                    :key="version.full_version"
                    :label="version.is_installed ? version.full_version : `${version.full_version}（未安装）`"
                    :value="version.full_version"
                  />
                </el-select>
              </el-form-item>
            </div>

            <el-form-item prop="fingerprint_brand_version">
              <template #label>
                <span class="fingerprint-form__label">
                  模拟版本
                  <FieldInfoTip :content="brandVersionTip" />
                </span>
              </template>
              <el-input
                v-model="formData.fingerprint_brand_version"
                class="cyber-input fingerprint-form__brand-version"
                placeholder="默认跟随真实版本，如 150.0.7871.124"
                clearable
              />
            </el-form-item>
          </el-card>

          <el-card class="cyber-card">
            <template #header>
              <div class="cyber-title">
                <span class="cyber-icon animate-pulse-glow">◈</span>
                <span>硬件指纹</span>
              </div>
            </template>

            <el-form-item label="CPU核心数">
              <el-input-number v-model="formData.fingerprint_hardware_concurrency" :min="1" :max="128" class="cyber-input-number" />
            </el-form-item>

            <div class="cyber-grid">
              <el-form-item>
                <template #label>
                  <span class="fingerprint-form__label">
                    GPU厂商
                    <FieldInfoTip :content="gpuOverrideTip" :tone="gpuOverrideSupported ? 'normal' : 'warning'" />
                  </span>
                </template>
                <el-input v-model="formData.fingerprint_gpu_vendor" placeholder="例如: Intel" clearable class="cyber-input" />
              </el-form-item>

              <el-form-item>
                <template #label>
                  <span class="fingerprint-form__label">
                    GPU渲染器
                    <FieldInfoTip :content="gpuOverrideTip" :tone="gpuOverrideSupported ? 'normal' : 'warning'" />
                  </span>
                </template>
                <el-input v-model="formData.fingerprint_gpu_renderer" placeholder="例如: Intel Iris OpenGL Engine" clearable class="cyber-input" />
              </el-form-item>
            </div>
          </el-card>

          <el-card class="cyber-card">
            <template #header>
              <div class="cyber-title">
                <span class="cyber-icon animate-pulse-glow">◈</span>
                <span>语言时区</span>
              </div>
            </template>

            <div class="cyber-grid">
              <el-form-item label="语言">
                <el-input v-model="formData.lang" placeholder="例如: zh-CN" clearable class="cyber-input" />
              </el-form-item>

              <el-form-item label="接受语言">
                <el-input v-model="formData.accept_lang" placeholder="例如: zh-CN,zh;q=0.9,en;q=0.8" clearable class="cyber-input" />
              </el-form-item>
            </div>

            <el-form-item label="时区">
              <el-input v-model="formData.timezone" placeholder="例如: Asia/Shanghai" clearable class="cyber-input" />
            </el-form-item>
          </el-card>
        </div>

        <div class="cyber-actions">
          <el-button size="large" @click="handleBack" class="cyber-btn">取消</el-button>
          <el-button type="primary" size="large" :icon="Check" :loading="submitting" @click="handleSubmit" class="cyber-btn cyber-btn-primary">
            {{ isEdit ? '保存配置' : '创建指纹' }}
          </el-button>
        </div>
      </el-form>
    </div>
  </FlexContainer>
</template>
