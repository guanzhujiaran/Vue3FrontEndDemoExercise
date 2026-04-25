<!--
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-12-27 00:00:00
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-12-27 00:00:00
 * @FilePath: \Vue3FrontEndDemoExercise\src\components\browser\FingerprintEditForm.vue
 * @Description: 浏览器指纹编辑表单组件
-->
<template>
  <div class="w-full">
    <!-- 操作栏 -->
    <div class="mb-4">
      <el-button 
        type="info" 
        :icon="Refresh"
        @click="handleGenerateRandom"
        :loading="generateLoading"
      >
        生成随机指纹
      </el-button>
    </div>

    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-position="top"
      size="default"
    >
      <!-- 基本信息 -->
      <el-card class="form-section mb-4" shadow="never" style="--el-card-header-padding: 1rem 1.25rem; --el-card-body-padding: 1.25rem; border-bottom: 1px solid var(--el-border-color-light); background-color: var(--el-bg-color-page);">
        <template #header>
          <div class="flex items-center gap-2 font-semibold text-[var(--el-text-color-primary)] [&_.el-icon]:text-[var(--el-color-primary)]">
            <el-icon><Monitor /></el-icon>
            <span>基本信息</span>
          </div>
        </template>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="浏览器类型" prop="fingerprint_browser">
              <el-select
                v-model="formData.fingerprint_browser"
                placeholder="请选择浏览器类型"
                style="width: 100%"
              >
                <el-option
                  v-for="browser in browserOptions"
                  :key="browser.value"
                  :label="browser.label"
                  :value="browser.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="浏览器版本" prop="fingerprint_brand_version">
              <el-input
                v-model="formData.fingerprint_brand_version"
                placeholder="如: 120.0.0.0"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="操作系统" prop="fingerprint_platform">
              <el-select
                v-model="formData.fingerprint_platform"
                placeholder="请选择操作系统"
                style="width: 100%"
              >
                <el-option
                  v-for="platform in platformOptions"
                  :key="platform.value"
                  :label="platform.label"
                  :value="platform.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="系统版本" prop="fingerprint_platform_version">
              <el-input
                v-model="formData.fingerprint_platform_version"
                placeholder="如: Windows 10 或 macOS 14.0"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="CPU核心数" prop="fingerprint_hardware_concurrency">
              <el-input-number
                v-model="formData.fingerprint_hardware_concurrency"
                :min="1"
                :max="32"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="设备类型" prop="is_desktop">
              <el-switch
                v-model="formData.is_desktop"
                active-text="桌面端"
                inactive-text="移动端"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-card>

      <!-- GPU信息 -->
      <el-card class="form-section mb-4" shadow="never" style="--el-card-header-padding: 1rem 1.25rem; --el-card-body-padding: 1.25rem; border-bottom: 1px solid var(--el-border-color-light); background-color: var(--el-bg-color-page);">
        <template #header>
          <div class="flex items-center gap-2 font-semibold text-[var(--el-text-color-primary)] [&_.el-icon]:text-[var(--el-color-primary)]">
            <el-icon><Picture /></el-icon>
            <span>GPU信息</span>
          </div>
        </template>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="GPU厂商" prop="fingerprint_gpu_vendor">
              <el-select
                v-model="formData.fingerprint_gpu_vendor"
                placeholder="请选择GPU厂商"
                style="width: 100%"
                filterable
                allow-create
              >
                <el-option
                  v-for="vendor in gpuVendorOptions"
                  :key="vendor.value"
                  :label="vendor.label"
                  :value="vendor.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="GPU渲染器" prop="fingerprint_gpu_renderer">
              <el-input
                v-model="formData.fingerprint_gpu_renderer"
                placeholder="如: NVIDIA GeForce RTX 4090"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-card>

      <!-- 语言和地区 -->
      <el-card class="form-section mb-4" shadow="never" style="--el-card-header-padding: 1rem 1.25rem; --el-card-body-padding: 1.25rem; border-bottom: 1px solid var(--el-border-color-light); background-color: var(--el-bg-color-page);">
        <template #header>
          <div class="flex items-center gap-2 font-semibold text-[var(--el-text-color-primary)] [&_.el-icon]:text-[var(--el-color-primary)]">
            <el-icon><Location /></el-icon>
            <el-text tag="span">语言和地区</el-text>
          </div>
        </template>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="语言" prop="lang">
              <el-select
                v-model="formData.lang"
                placeholder="请选择语言"
                style="width: 100%"
                filterable
                allow-create
              >
                <el-option
                  v-for="lang in languageOptions"
                  :key="lang.value"
                  :label="lang.label"
                  :value="lang.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Accept-Language" prop="accept_lang">
              <el-input
                v-model="formData.accept_lang"
                placeholder="如: zh-CN,zh;q=0.9,en;q=0.8"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="时区" prop="timezone">
          <el-select
            v-model="formData.timezone"
            placeholder="请选择时区"
            style="width: 100%"
            filterable
            allow-create
          >
            <el-option
              v-for="tz in timezoneOptions"
              :key="tz.value"
              :label="tz.label"
              :value="tz.value"
            />
          </el-select>
        </el-form-item>
      </el-card>

      <!-- 代理设置 -->
      <el-card class="form-section mb-4" shadow="never" style="--el-card-header-padding: 1rem 1.25rem; --el-card-body-padding: 1.25rem; border-bottom: 1px solid var(--el-border-color-light); background-color: var(--el-bg-color-page);">
        <template #header>
          <div class="flex items-center gap-2 font-semibold text-[var(--el-text-color-primary)] [&_.el-icon]:text-[var(--el-color-primary)]">
            <el-icon><Connection /></el-icon>
            <span>代理设置</span>
          </div>
        </template>
        
        <el-form-item label="代理服务器" prop="proxy_server">
          <el-input
            v-model="formData.proxy_server"
            placeholder="如: http://proxy.example.com:8080 或 socks5://proxy.example.com:1080"
          />
        </el-form-item>
      </el-card>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import {
  Monitor,
  Picture,
  Location,
  Connection,
  Refresh
} from '@element-plus/icons-vue'
import type {
  BrowserFingerprintUpsertParams,
  BrowserEnum,
  PlatformEnum,
  UserBrowserInfoReadResp
} from '@/types/browser-automation-api'

interface Props {
  fingerprint?: UserBrowserInfoReadResp | null
  defaultData?: any | null
}

interface Emits {
  (e: 'submit', data: BrowserFingerprintUpsertParams): void
  (e: 'generateRandom'): void
}

const props = withDefaults(defineProps<Props>(), {
  defaultData: null
})

const emit = defineEmits<Emits>()
const generateLoading = ref(false)

const formRef = ref<FormInstance>()

// 表单数据
const formData = reactive<BrowserFingerprintUpsertParams & { is_desktop?: boolean }>({
  id: null,
  fingerprint_int: null,
  fingerprint_platform: null,
  fingerprint_platform_version: null,
  fingerprint_browser: null,
  fingerprint_brand_version: null,
  fingerprint_hardware_concurrency: null,
  fingerprint_gpu_vendor: null,
  fingerprint_gpu_renderer: null,
  lang: null,
  accept_lang: null,
  timezone: null,
  proxy_server: null,
  is_desktop: undefined
})

// 表单验证规则
const formRules: FormRules = {
  fingerprint_browser: [
    { required: true, message: '请选择浏览器类型', trigger: 'change' }
  ],
  fingerprint_platform: [
    { required: true, message: '请选择操作系统', trigger: 'change' }
  ],
  fingerprint_hardware_concurrency: [
    { required: true, message: '请设置CPU核心数', trigger: 'blur' }
  ],
  lang: [
    { required: true, message: '请选择语言', trigger: 'change' }
  ],
  timezone: [
    { required: true, message: '请选择时区', trigger: 'change' }
  ]
}

// 浏览器选项
const browserOptions = [
  { label: 'Chrome', value: 'chrome' },
  { label: 'Edge', value: 'edge' },
  { label: 'Opera', value: 'opera' },
  { label: 'Vivaldi', value: 'vivaldi' }
]

// 平台选项
const platformOptions = [
  { label: 'Windows', value: 'windows' },
  { label: 'Linux', value: 'linux' },
  { label: 'macOS', value: 'macos' }
]

// GPU厂商选项
const gpuVendorOptions = [
  { label: 'NVIDIA', value: 'NVIDIA' },
  { label: 'AMD', value: 'AMD' },
  { label: 'Intel', value: 'Intel' },
  { label: 'Apple', value: 'Apple' },
  { label: 'Qualcomm', value: 'Qualcomm' },
  { label: 'ARM', value: 'ARM' }
]

// 语言选项
const languageOptions = [
  { label: '中文简体', value: 'zh-CN' },
  { label: '中文繁体', value: 'zh-TW' },
  { label: '英文', value: 'en-US' },
  { label: '日文', value: 'ja-JP' },
  { label: '韩文', value: 'ko-KR' },
  { label: '法文', value: 'fr-FR' },
  { label: '德文', value: 'de-DE' },
  { label: '西班牙文', value: 'es-ES' }
]

// 时区选项
const timezoneOptions = [
  { label: 'Asia/Shanghai', value: 'Asia/Shanghai' },
  { label: 'Asia/Tokyo', value: 'Asia/Tokyo' },
  { label: 'Asia/Seoul', value: 'Asia/Seoul' },
  { label: 'UTC+8', value: 'UTC+8' },
  { label: 'UTC', value: 'UTC' },
  { label: 'America/New_York', value: 'America/New_York' },
  { label: 'Europe/London', value: 'Europe/London' },
  { label: 'Europe/Paris', value: 'Europe/Paris' }
]

// 监听指纹数据变化，自动填充表单
watch(() => props.fingerprint, (fingerprint) => {
  if (fingerprint) {
    // 编辑模式：填充现有数据
    const formDataWithDesktop: typeof formData = {
      id: fingerprint.id_str || fingerprint.id,
      fingerprint_int: fingerprint.fingerprint_int,
      fingerprint_platform: fingerprint.fingerprint_platform,
      fingerprint_platform_version: fingerprint.fingerprint_platform_version,
      fingerprint_browser: fingerprint.fingerprint_browser,
      fingerprint_brand_version: fingerprint.fingerprint_brand_version,
      fingerprint_hardware_concurrency: fingerprint.fingerprint_hardware_concurrency,
      fingerprint_gpu_vendor: fingerprint.fingerprint_gpu_vendor,
      fingerprint_gpu_renderer: fingerprint.fingerprint_gpu_renderer,
      lang: fingerprint.lang,
      accept_lang: fingerprint.accept_lang,
      timezone: fingerprint.timezone,
      proxy_server: fingerprint.proxy_server,
      is_desktop: (fingerprint as any).is_desktop
    }
    Object.assign(formData, formDataWithDesktop)
  } else {
    // 新建模式：使用默认数据或重置
    const defaultValues = props.defaultData || {
      id: null,
      fingerprint_int: null,
      fingerprint_platform: null,
      fingerprint_platform_version: null,
      fingerprint_browser: null,
      fingerprint_brand_version: null,
      fingerprint_hardware_concurrency: 4,
      fingerprint_gpu_vendor: null,
      fingerprint_gpu_renderer: null,
      lang: 'zh-CN',
      accept_lang: 'zh-CN,zh;q=0.9,en;q=0.8',
      timezone: 'Asia/Shanghai',
      proxy_server: null,
      is_desktop: true
    }
    Object.assign(formData, defaultValues)
  }
}, { immediate: true })

// 监听默认数据变化（用于新建模式）
watch(() => props.defaultData, (defaultData) => {
  if (defaultData && !props.fingerprint) {
    // 只有在新建模式下才使用默认数据
    Object.assign(formData, defaultData)
  }
}, { immediate: true, deep: true })

// 提交表单
const submitForm = async () => {
  if (!formRef.value) return false
  
  try {
    await formRef.value.validate()
    emit('submit', { ...formData })
    return true
  } catch (error) {
    console.error('表单验证失败:', error)
    return false
  }
}

// 重置表单
const resetForm = () => {
  if (formRef.value) {
    formRef.value.resetFields()
  }
}

// 处理生成随机指纹
const handleGenerateRandom = () => {
  generateLoading.value = true
  emit('generateRandom')
  
  // 模拟加载状态，父组件会通过 defaultData 传回新生成的数据
  setTimeout(() => {
    generateLoading.value = false
  }, 1000)
}

// 暴露方法给父组件
defineExpose({
  submitForm,
  resetForm
})
</script>


