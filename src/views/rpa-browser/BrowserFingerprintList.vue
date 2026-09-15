<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, SetUp } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import FlexContainer from '@/components/CommonCompo/Bili-Container-Compo/FlexContainer.vue'
import CenteredContainer from '@/components/CommonCompo/Bili-Container-Compo/CenteredContainer.vue'
import BiliPageHeader from '@/components/CommonCompo/Bili-Container-Compo/BiliPageHeader.vue'
import FingerprintCard from '@/components/rpa-browser/FingerprintCard.vue'
import { 浏览器指纹管理Service } from '@/api/browser/hey-api'
import { useUserNavStore } from '@/stores/user_nav'
import { businessHandler } from '@/utils/businessHandler'
import type { BrowserFingerprintListParams } from '@/api/browser/hey-api'
import type { UserBrowserInfo } from '@/models/rpa_browser'
import { RouteName } from '@/models/router/index.ts'

/** 浏览器 ID：优先取字符串形式，避免大整数精度丢失 */
const getBrowserId = (item: UserBrowserInfo) => item.browser_id_str || item.browser_id

const router = useRouter()
const userNavStore = useUserNavStore()

const fingerprintList = ref<UserBrowserInfo[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const loading = ref(false)

const loadFingerprintList = async () => {
  loading.value = true
  const params: BrowserFingerprintListParams = {
    page: currentPage.value,
    per_page: pageSize.value
  }

  // businessHandler 直接接收 hey-api 返回的 {code, data, msg}（responseStyle='data' 已解包）
  const result = await businessHandler<{ items?: UserBrowserInfo[]; total?: number }>(
    浏览器指纹管理Service.listFingerprintRouterApiV1RpaBrowserListFingerprintPost({
      body: params,
      headers: {
        'x-bili-mid': userNavStore.user_nav.uid,
        'x-bili-level': String(userNavStore.user_nav.level_info.current_level)
      }
    }) as any,
    { successMessage: '', errorMessage: '获取指纹列表失败', showSuccessToast: false }
  )

  if (result.success && result.data) {
    fingerprintList.value = result.data.items || []
    total.value = result.data.total || 0
  }
  loading.value = false
}

const handlePageChange = (page: number) => {
  currentPage.value = page
  loadFingerprintList()
}

const handleDelete = async (item: UserBrowserInfo) => {
  const browserId = getBrowserId(item)

  try {
    await ElMessageBox.confirm('确定要删除这个浏览器指纹吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
      lockScroll: false
    })
  } catch {
    return // 用户取消
  }

  await businessHandler(
    浏览器指纹管理Service.deleteFingerprintRouterApiV1RpaBrowserDeleteFingerprintPost({
      query: { browser_id: String(browserId) },
      headers: {
        'x-bili-mid': userNavStore.user_nav.uid,
        'x-bili-level': String(userNavStore.user_nav.level_info.current_level)
      }
    }) as any,
    { successMessage: '删除成功', errorMessage: '删除失败' }
  )
  loadFingerprintList()
}

const handleRename = async (item: UserBrowserInfo) => {
  const browserId = getBrowserId(item)
  let newName: string
  try {
    const result = await ElMessageBox.prompt('请输入新的名称', '重命名', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputValue: item.custom_name || '',
      type: 'info',
      lockScroll: false
    })
    newName = result.value
  } catch {
    return // 用户取消
  }

  await businessHandler(
    浏览器指纹管理Service.renameFingerprintRouterApiV1RpaBrowserRenameFingerprintPost({
      body: { custom_name: newName },
      query: { browser_id: String(browserId) },
      headers: {
        'x-bili-mid': userNavStore.user_nav.uid,
        'x-bili-level': String(userNavStore.user_nav.level_info.current_level)
      }
    }) as any,
    { successMessage: '重命名成功', errorMessage: '重命名失败' }
  )
  loadFingerprintList()
}

const handleOpenStream = (item: UserBrowserInfo) => {
  const browserId = getBrowserId(item)
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
  const browserId = getBrowserId(item)?.toString() || 'N/A'

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
    width: '500px',
    lockScroll: false
  })
}

const handleCreateFingerprint = () => {
  router.push({
    name: RouteName.RPA_BROWSER_CREATE
  })
}

const handleEdit = (item: UserBrowserInfo) => {
  router.push({
    name: 'RPA_BROWSER_EDIT',
    params: { browserId: String(getBrowserId(item)) }
  })
}

onMounted(() => {
  loadFingerprintList()
})
</script>

<template>
  <FlexContainer>
    <BiliPageHeader title="浏览器指纹管理" description="管理你的浏览器指纹列表" tag-text="浏览器指纹">
      <template #extra>
        <div class="flex items-center gap-2">
          <el-button :icon="SetUp" @click="router.push({ name: RouteName.RPA_BROWSER_WORKFLOW_MANAGEMENT })">
            工作流管理
          </el-button>
          <el-button type="primary" :icon="Plus" @click="handleCreateFingerprint">
            创建指纹
          </el-button>
        </div>
      </template>
    </BiliPageHeader>

    <FlexContainer class="mt-4 bg-bg rounded-2xl p-4">
      <div v-if="loading" class="w-full">
        <div class="grid gap-4" style="grid-template-columns: repeat(auto-fill, minmax(350px, 1fr))">
          <div v-for="i in 6" :key="i" class="rounded-xl  p-5 border border-border-light">
            <el-skeleton :rows="4" animated></el-skeleton>
          </div>
        </div>
      </div>

      <div v-else-if="fingerprintList.length > 0" class="w-full flex flex-col flex-1">
        <div class="grid gap-6" style="grid-template-columns: repeat(auto-fill, minmax(380px, 1fr))">
          <FingerprintCard v-for="item in fingerprintList" :key="item.browser_id_str || item.browser_id" :item="item"
            @open="handleOpenStream" @detail="showBrowserIdDetail" @rename="handleRename" @edit="handleEdit"
            @remove="handleDelete" />
        </div>

        <el-pagination class="flex justify-center mt-auto" v-model:current-page="currentPage" :page-size="pageSize"
          :total="total" layout="prev, pager, next, total" @current-change="handlePageChange" />
      </div>

      <CenteredContainer v-else class="py-20">
        <el-empty description="暂无浏览器指纹">
          <el-button type="primary" @click="handleCreateFingerprint">创建第一个指纹</el-button>
        </el-empty>
      </CenteredContainer>
    </FlexContainer>
  </FlexContainer>
</template>
