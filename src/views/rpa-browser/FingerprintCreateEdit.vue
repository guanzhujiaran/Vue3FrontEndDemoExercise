<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ArrowLeft, Refresh, Check } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import BiliPageHeader from '@/components/CommonCompo/Bili-Container-Compo/BiliPageHeader.vue'
import CenteredContainer from '@/components/CommonCompo/Bili-Container-Compo/CenteredContainer.vue'
import { upsertFingerprintRouterApiV1RpaBrowserUpsertFingerprintPost, genRandFingerprintRouterApiV1RpaBrowserGenRandFingerprintPost, readFingerprintRouterApiV1RpaBrowserReadFingerprintPost } from '@/api/browser/hey-api'
import { useUserNavStore } from '@/stores/user_nav'
import biliMessage from '@/utils/message'
import type { BrowserFingerprintUpsertParams } from '@/api/browser/hey-api/types.gen'

const router = useRouter()
const route = useRoute()
const userNavStore = useUserNavStore()

const browserId = route.params.browserId as string | undefined
const isEdit = !!browserId

const formData = ref<BrowserFingerprintUpsertParams>({
  browser_id: browserId,
  custom_name: '',
  fingerprint_platform: '',
  fingerprint_platform_version: '',
  fingerprint_browser: '',
  fingerprint_brand_version: '',
  fingerprint_hardware_concurrency: null,
  fingerprint_gpu_vendor: '',
  fingerprint_gpu_renderer: '',
  lang: '',
  accept_lang: '',
  timezone: '',
  proxy_server: ''
})

const loading = ref(false)
const generating = ref(false)

const loadFingerprintData = async () => {
  if (!browserId) return

  loading.value = true
  try {
    const response = await readFingerprintRouterApiV1RpaBrowserReadFingerprintPost({
      query: { browser_id: browserId },
      headers: {
        'x-bili-mid': userNavStore.user_nav.uid,
        'x-bili-level': userNavStore.user_nav.level_info.current_level
      }
    })

    if (response.data?.code === 0 && response.data?.data) {
      const data = response.data.data as any
      formData.value = {
        browser_id: browserId,
        custom_name: data.custom_name || '',
        fingerprint_platform: data.fingerprint_platform || '',
        fingerprint_platform_version: data.fingerprint_platform_version || '',
        fingerprint_browser: data.fingerprint_browser || '',
        fingerprint_brand_version: data.fingerprint_brand_version || '',
        fingerprint_hardware_concurrency: data.fingerprint_hardware_concurrency || null,
        fingerprint_gpu_vendor: data.fingerprint_gpu_vendor || '',
        fingerprint_gpu_renderer: data.fingerprint_gpu_renderer || '',
        lang: data.lang || '',
        accept_lang: data.accept_lang || '',
        timezone: data.timezone || '',
        proxy_server: data.proxy_server || ''
      }
    } else {
      biliMessage.error(response.data?.msg || '获取指纹信息失败')
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
    const response = await genRandFingerprintRouterApiV1RpaBrowserGenRandFingerprintPost({
      body: {},
      headers: {
        'x-bili-mid': userNavStore.user_nav.uid,
        'x-bili-level': userNavStore.user_nav.level_info.current_level
      }
    })

    if (response.data?.code === 0 && response.data?.data) {
      const data = response.data.data as any
      formData.value = {
        ...formData.value,
        fingerprint_platform: data.fingerprint_platform || '',
        fingerprint_platform_version: data.fingerprint_platform_version || '',
        fingerprint_browser: data.fingerprint_browser || '',
        fingerprint_brand_version: data.fingerprint_brand_version || '',
        fingerprint_hardware_concurrency: data.fingerprint_hardware_concurrency || null,
        fingerprint_gpu_vendor: data.fingerprint_gpu_vendor || '',
        fingerprint_gpu_renderer: data.fingerprint_gpu_renderer || '',
        lang: data.lang || '',
        accept_lang: data.accept_lang || '',
        timezone: data.timezone || '',
        proxy_server: data.proxy_server || ''
      }
      biliMessage.success('随机生成成功')
    } else {
      biliMessage.error(response.data?.msg || '随机生成失败')
    }
  } catch (error) {
    biliMessage.error('网络异常，请稍后重试')
  } finally {
    generating.value = false
  }
}

const handleSubmit = async () => {
  if (!formData.value.custom_name?.trim()) {
    biliMessage.warning('请输入指纹名称')
    return
  }

  loading.value = true
  try {
    const response = await upsertFingerprintRouterApiV1RpaBrowserUpsertFingerprintPost({
      body: formData.value,
      headers: {
        'x-bili-mid': userNavStore.user_nav.uid,
        'x-bili-level': userNavStore.user_nav.level_info.current_level
      }
    })

    if (response.data?.code === 0) {
      biliMessage.success(isEdit ? '更新成功' : '创建成功')
      router.push('/app/rpa-browser')
    } else {
      biliMessage.error(response.data?.msg || (isEdit ? '更新失败' : '创建失败'))
    }
  } catch (error) {
    biliMessage.error('网络异常，请稍后重试')
  } finally {
    loading.value = false
  }
}

const handleBack = () => {
  router.back()
}

onMounted(() => {
  if (isEdit) {
    loadFingerprintData()
  }
})
</script>

<template>
  <div class="min-h-screen bg-[var(--el-bg-color)] p-4">
    <BiliPageHeader :title="isEdit ? '编辑指纹' : '创建指纹'" description="创建或编辑浏览器指纹配置">
      <template #extra>
        <el-button :icon="ArrowLeft" @click="handleBack">返回</el-button>
      </template>
    </BiliPageHeader>

    <CenteredContainer class="mt-4 max-w-4xl">
      <div v-if="loading && isEdit" class="w-full">
        <el-skeleton :rows="10" animated></el-skeleton>
      </div>

      <el-form v-else v-model="formData" label-position="top" class="w-full">
        <el-card class="mb-4">
          <template #header>
            <div class="flex items-center justify-between">
              <span class="font-semibold">基本信息</span>
              <el-button type="primary" size="small" :icon="Refresh" :loading="generating" @click="handleGenerateRandom">
                随机生成
              </el-button>
            </div>
          </template>

          <el-form-item label="指纹名称" required>
            <el-input v-model="formData.custom_name" placeholder="请输入指纹名称" clearable />
          </el-form-item>

          <el-form-item label="代理服务器">
            <el-input v-model="formData.proxy_server" placeholder="例如: http://127.0.0.1:7890" clearable />
          </el-form-item>
        </el-card>

        <el-card class="mb-4">
          <template #header>
            <span class="font-semibold">平台信息</span>
          </template>

          <el-form-item label="平台">
            <el-select v-model="formData.fingerprint_platform" placeholder="请选择平台" clearable class="w-full">
              <el-option label="Windows" value="windows" />
              <el-option label="Linux" value="linux" />
              <el-option label="macOS" value="macos" />
            </el-select>
          </el-form-item>

          <el-form-item label="平台版本">
            <el-input v-model="formData.fingerprint_platform_version" placeholder="例如: 10.0.19041" clearable />
          </el-form-item>

          <el-form-item label="浏览器">
            <el-select v-model="formData.fingerprint_browser" placeholder="请选择浏览器" clearable class="w-full">
              <el-option label="Chrome" value="chrome" />
              <el-option label="Edge" value="Edge" />
              <el-option label="Opera" value="Opera" />
              <el-option label="Vivaldi" value="Vivaldi" />
            </el-select>
          </el-form-item>

          <el-form-item label="浏览器版本">
            <el-input v-model="formData.fingerprint_brand_version" placeholder="例如: 125.0.0.1" clearable />
          </el-form-item>
        </el-card>

        <el-card class="mb-4">
          <template #header>
            <span class="font-semibold">硬件信息</span>
          </template>

          <el-form-item label="CPU核心数">
            <el-input-number v-model="formData.fingerprint_hardware_concurrency" :min="1" :max="128" class="w-full" />
          </el-form-item>

          <el-form-item label="GPU厂商">
            <el-input v-model="formData.fingerprint_gpu_vendor" placeholder="例如: Intel" clearable />
          </el-form-item>

          <el-form-item label="GPU渲染器">
            <el-input v-model="formData.fingerprint_gpu_renderer" placeholder="例如: Intel Iris OpenGL Engine" clearable />
          </el-form-item>
        </el-card>

        <el-card class="mb-4">
          <template #header>
            <span class="font-semibold">语言和时区</span>
          </template>

          <el-form-item label="语言">
            <el-input v-model="formData.lang" placeholder="例如: zh-CN" clearable />
          </el-form-item>

          <el-form-item label="接受语言">
            <el-input v-model="formData.accept_lang" placeholder="例如: zh-CN,zh;q=0.9,en;q=0.8" clearable />
          </el-form-item>

          <el-form-item label="时区">
            <el-input v-model="formData.timezone" placeholder="例如: Asia/Shanghai" clearable />
          </el-form-item>
        </el-card>

        <div class="flex justify-end gap-4">
          <el-button size="large" @click="handleBack">取消</el-button>
          <el-button type="primary" size="large" :icon="Check" :loading="loading" @click="handleSubmit">
            {{ isEdit ? '保存' : '创建' }}
          </el-button>
        </div>
      </el-form>
    </CenteredContainer>
  </div>
</template>
