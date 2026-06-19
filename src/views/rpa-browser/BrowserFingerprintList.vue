<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Delete, Edit, VideoPlay, Plus, Monitor, Clock, Search } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import FlexContainer from '@/components/CommonCompo/Bili-Container-Compo/FlexContainer.vue'
import CenteredContainer from '@/components/CommonCompo/Bili-Container-Compo/CenteredContainer.vue'
import BiliPageHeader from '@/components/CommonCompo/Bili-Container-Compo/BiliPageHeader.vue'
import { listFingerprintRouterApiV1RpaBrowserListFingerprintPost, deleteFingerprintRouterApiV1RpaBrowserDeleteFingerprintPost, renameFingerprintRouterApiV1RpaBrowserRenameFingerprintPost } from '@/api/browser/hey-api'
import { useUserNavStore } from '@/stores/user_nav'
import biliMessage from '@/utils/message'
import type { BrowserFingerprintListParams } from '@/api/browser/hey-api/types.gen'
import { RouteName } from '@/models/router/index.ts'

interface UserBrowserInfo {
  browser_id: string | number
  browser_id_str: string | null
  custom_name: string | null
  created_at: string
  updated_at: string
  platform: string
  browser: string
  fingerprint_int: number | null
  fingerprint_platform: string | null
  fingerprint_platform_version: string | null
  fingerprint_browser: string | null
  fingerprint_brand_version: string | null
  fingerprint_hardware_concurrency: number | null
  fingerprint_gpu_vendor: string | null
  fingerprint_gpu_renderer: string | null
  lang: string | null
  accept_lang: string | null
  timezone: string | null
  proxy_server: string | null
}

const router = useRouter()
const userNavStore = useUserNavStore()

const fingerprintList = ref<UserBrowserInfo[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const loading = ref(false)

const loadFingerprintList = async () => {
  loading.value = true
  try {
    const params: BrowserFingerprintListParams = {
      page: currentPage.value,
      per_page: pageSize.value
    }
    
    const response = await listFingerprintRouterApiV1RpaBrowserListFingerprintPost({
      body: params,
      headers: {
        'x-bili-mid': userNavStore.user_nav.uid,
        'x-bili-level': String(userNavStore.user_nav.level_info.current_level)
      }
    })
    if (response.data?.code === 0 && response.data?.data) {
      const data = response.data.data as any
      console.log('API返回的数据:', data)
      console.log('items数组第一个元素:', data.items?.[0])
      fingerprintList.value = data.items || []
      total.value = data.total || 0
    } else {
      console.error('获取指纹列表失败:', response.data?.msg || '未知错误')
      console.error('response.data?.code:', response.data?.code)
      console.error('response.data?.data:', response.data?.data)
    }
  } catch (error) {
    console.error('网络异常:', error)
  } finally {
    loading.value = false
  }
}

const handlePageChange = (page: number) => {
  currentPage.value = page
  loadFingerprintList()
}

const handleDelete = async (browserId: string | number) => {
  try {
    await ElMessageBox.confirm('确定要删除这个浏览器指纹吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    const response = await deleteFingerprintRouterApiV1RpaBrowserDeleteFingerprintPost({
      query: { browser_id: String(browserId) },
      headers: {
        'x-bili-mid': userNavStore.user_nav.uid,
        'x-bili-level': String(userNavStore.user_nav.level_info.current_level)
      }
    })

    if (response.data?.code === 0) {
      biliMessage.success('删除成功')
      loadFingerprintList()
    } else {
      biliMessage.error(response.data?.msg || '删除失败')
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      biliMessage.error('删除失败')
    }
  }
}

const handleRename = async (browserId: string | number, currentName: string | null) => {
  try {
    const { value: newName } = await ElMessageBox.prompt('请输入新的名称', '重命名', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputValue: currentName || '',
      type: 'info'
    })

    const response = await renameFingerprintRouterApiV1RpaBrowserRenameFingerprintPost({
      body: { custom_name: newName },
      query: { browser_id: String(browserId) },
      headers: {
        'x-bili-mid': userNavStore.user_nav.uid,
        'x-bili-level': String(userNavStore.user_nav.level_info.current_level)
      }
    })

    if (response.data?.code === 0) {
      biliMessage.success('重命名成功')
      loadFingerprintList()
    } else {
      biliMessage.error(response.data?.msg || '重命名失败')
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      biliMessage.error('重命名失败')
    }
  }
}

const handleOpenStream = (browserId: string | number) => {
  console.log('handleOpenStream called with browserId:', browserId)
  router.push({
    name: RouteName.RPA_BROWSER_STREAM,
    params: { browserId: String(browserId) }
  }).then(() => {
    console.log('Navigation successful')
  }).catch((err: any) => {
    console.error('Navigation failed:', err)
  })
}

const showBrowserIdDetail = (item: UserBrowserInfo) => {
  const browserId = (item.browser_id_str || item.browser_id)?.toString() || 'N/A'
  
  const detailContent = `
    <div class="p-4 max-w-2xl">
      <div class="space-y-6">
        <div class="border-b border-cyan-500/20 pb-4">
          <h3 class="text-lg font-bold text-cyan-400 mb-3">基本信息</h3>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <span class="text-gray-400 text-sm">名称：</span>
              <span class="text-white font-medium">${item.custom_name || '未命名'}</span>
            </div>
            <div>
              <span class="text-gray-400 text-sm">Browser ID：</span>
              <code class="text-purple-300 font-mono text-sm">${browserId}</code>
            </div>
            <div>
              <span class="text-gray-400 text-sm">浏览器：</span>
              <span class="text-white">${item.browser || item.fingerprint_browser || 'Unknown'}</span>
            </div>
            <div>
              <span class="text-gray-400 text-sm">平台：</span>
              <span class="text-white">${item.platform || item.fingerprint_platform || 'Unknown'}</span>
            </div>
          </div>
        </div>

        <div class="border-b border-purple-500/20 pb-4">
          <h3 class="text-lg font-bold text-purple-400 mb-3">版本信息</h3>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <span class="text-gray-400 text-sm">平台版本：</span>
              <span class="text-white">${item.fingerprint_platform_version || 'Unknown'}</span>
            </div>
            <div>
              <span class="text-gray-400 text-sm">浏览器版本：</span>
              <span class="text-white">${item.fingerprint_brand_version || 'Unknown'}</span>
            </div>
          </div>
        </div>

        <div class="border-b border-pink-500/20 pb-4">
          <h3 class="text-lg font-bold text-pink-400 mb-3">硬件信息</h3>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <span class="text-gray-400 text-sm">CPU核心数：</span>
              <span class="text-white">${item.fingerprint_hardware_concurrency || 'Unknown'}</span>
            </div>
            <div>
              <span class="text-gray-400 text-sm">GPU厂商：</span>
              <span class="text-white">${item.fingerprint_gpu_vendor || 'Unknown'}</span>
            </div>
            <div>
              <span class="text-gray-400 text-sm">GPU渲染器：</span>
              <span class="text-white">${item.fingerprint_gpu_renderer || 'Unknown'}</span>
            </div>
          </div>
        </div>

        <div class="border-b border-cyan-500/20 pb-4">
          <h3 class="text-lg font-bold text-cyan-400 mb-3">语言与区域</h3>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <span class="text-gray-400 text-sm">语言：</span>
              <span class="text-white">${item.lang || 'Unknown'}</span>
            </div>
            <div>
              <span class="text-gray-400 text-sm">接受语言：</span>
              <span class="text-white">${item.accept_lang || 'Unknown'}</span>
            </div>
            <div>
              <span class="text-gray-400 text-sm">时区：</span>
              <span class="text-white">${item.timezone || 'Unknown'}</span>
            </div>
          </div>
        </div>

        <div>
          <h3 class="text-lg font-bold text-green-400 mb-3">网络配置</h3>
          <div>
            <span class="text-gray-400 text-sm">代理服务器：</span>
            <span class="text-white">${item.proxy_server || '未配置'}</span>
          </div>
        </div>

        <div class="border-t border-gray-700 pt-4">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <span class="text-gray-400 text-sm">创建时间：</span>
              <span class="text-white">${item.created_at ? new Date(item.created_at).toLocaleString('zh-CN') : 'Unknown'}</span>
            </div>
            <div>
              <span class="text-gray-400 text-sm">更新时间：</span>
              <span class="text-white">${item.updated_at ? new Date(item.updated_at).toLocaleString('zh-CN') : 'Unknown'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
  
  ElMessageBox.alert(detailContent, '指纹详情', {
    dangerouslyUseHTMLString: true,
    confirmButtonText: '关闭',
    confirmButtonClass: 'bg-gradient-to-r from-cyan-600 to-purple-600 border-none',
    customClass: 'cyber-modal',
    width: '500px'
  })
}

const handleCreateFingerprint = () => {
  router.push({
    name: RouteName.RPA_BROWSER_CREATE
  })
}

onMounted(() => {
  loadFingerprintList()
})
</script>

<template>
  <FlexContainer>
    <BiliPageHeader title="浏览器指纹管理" description="管理你的浏览器指纹列表" tag="浏览器指纹">
      <template #extra>
        <el-button type="primary" :icon="Plus" @click="handleCreateFingerprint">
          创建指纹
        </el-button>
      </template>
    </BiliPageHeader>

    <FlexContainer class="mt-4">
      <div v-if="loading" class="w-full">
        <div class="grid gap-4" style="grid-template-columns: repeat(auto-fill, minmax(350px, 1fr))">
          <div v-for="i in 6" :key="i" class="rounded-xl  p-5 border border-[var(--el-border-color-light)]">
            <el-skeleton :rows="4" animated></el-skeleton>
          </div>
        </div>
      </div>

      <div v-else-if="fingerprintList.length > 0" class="w-full">
        <div class="grid gap-6" style="grid-template-columns: repeat(auto-fill, minmax(380px, 1fr))">
          <div 
            v-for="item in fingerprintList" 
            :key="item.browser_id_str || item.browser_id"
            class="relative rounded-2xl overflow-hidden group"
            style="background: linear-gradient(135deg, #0f0f1a 0%, #1a0a2e 50%, #0d1b2a 100%);"
          >
            <div class="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500"></div>
            
            <div class="absolute top-3 right-3 w-8 h-8 border border-cyan-500/30 rounded-full flex items-center justify-center">
              <div class="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
            </div>

            <div class="relative p-5">
              <div class="flex items-start justify-between mb-4">
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-cyan-400 text-xs font-mono tracking-wider">浏览器指纹</span>
                  </div>
                  <h3 class="text-xl font-bold text-white group-hover:text-cyan-300 transition-colors">
                    {{ item.custom_name || '未命名' }}
                  </h3>
                </div>
                <el-tag 
                  size="small" 
                  class="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-none"
                >
                  {{ item.browser || item.fingerprint_browser || '未知' }}
                </el-tag>
              </div>

              <div class="bg-black/30 rounded-lg p-3 mb-4 border border-cyan-500/20">
                <div class="text-xs text-cyan-400/70 mb-1 font-mono">浏览器ID</div>
                <div class="text-sm text-gray-200 font-mono break-all hover:text-cyan-300 transition-colors cursor-pointer" 
                     @click="showBrowserIdDetail(item)">
                  {{ (item.browser_id_str || item.browser_id)?.toString() || 'N/A' }}
                </div>
              </div>

              <div class="grid grid-cols-3 gap-3 mb-4">
                <div class="bg-black/20 rounded-lg p-2 border border-purple-500/20">
                  <div class="flex items-center gap-2">
                    <el-icon class="text-purple-400"><Monitor /></el-icon>
                    <span class="text-xs text-gray-400">平台</span>
                  </div>
                  <div class="text-sm text-white mt-1">{{ item.platform || item.fingerprint_platform || '未知' }}</div>
                </div>
                <div class="bg-black/20 rounded-lg p-2 border border-pink-500/20">
                  <div class="flex items-center gap-2">
                    <el-icon class="text-pink-400"><Clock /></el-icon>
                    <span class="text-xs text-gray-400">创建时间</span>
                  </div>
                  <div class="text-sm text-white mt-1">
                    {{ item.created_at ? new Date(item.created_at).toLocaleDateString() : '未知' }}
                  </div>
                </div>
                <div class="bg-black/20 rounded-lg p-2 border border-cyan-500/20">
                  <div class="flex items-center gap-2">
                    <el-icon class="text-cyan-400"><Clock /></el-icon>
                    <span class="text-xs text-gray-400">更新时间</span>
                  </div>
                  <div class="text-sm text-white mt-1">
                    {{ item.updated_at ? new Date(item.updated_at).toLocaleDateString() : '未知' }}
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <el-button 
                  size="small" 
                  class="flex-1 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white border-none font-medium"
                  :icon="VideoPlay" 
                  @click="handleOpenStream(item.browser_id_str || item.browser_id)"
                >
                  打开
                </el-button>
                <el-button 
                  size="small" 
                  class="flex-1 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white border-none font-medium"
                  :icon="Search" 
                  @click="showBrowserIdDetail(item)"
                >
                  详情
                </el-button>
                <el-button 
                  size="small" 
                  class="bg-black/30 border border-gray-600 text-gray-300 hover:border-gray-400 hover:text-white transition-colors"
                  :icon="Edit" 
                  @click="handleRename(item.browser_id_str || item.browser_id, item.custom_name)"
                >
                  编辑
                </el-button>
                <el-button 
                  size="small" 
                  class="bg-red-600/20 border border-red-500/50 text-red-400 hover:bg-red-600/30 hover:border-red-400 transition-colors"
                  :icon="Delete" 
                  @click="handleDelete(item.browser_id_str || item.browser_id)"
                >
                  删除
                </el-button>
              </div>
            </div>

            <div class="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
          </div>
        </div>

        <div class="mt-6 flex justify-center">
          <el-pagination
            v-model:current-page="currentPage"
            :page-size="pageSize"
            :total="total"
            layout="prev, pager, next, total"
            @current-change="handlePageChange"
          />
        </div>
      </div>

      <CenteredContainer v-else class="py-20">
        <el-empty description="暂无浏览器指纹">
          <el-button type="primary" @click="handleCreateFingerprint">创建第一个指纹</el-button>
        </el-empty>
      </CenteredContainer>
    </FlexContainer>
  </FlexContainer>
</template>
