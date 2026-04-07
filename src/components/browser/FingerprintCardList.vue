<!--
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-12-15 00:00:00
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-12-24 00:00:00
 * @FilePath: \Vue3FrontEndDemoExercise\src\components\browser\FingerprintCardList.vue
 * @Description: 浏览器指纹卡片列表组件
-->
<template>
  <div class="fingerprint-card-list">
    <!-- 操作栏 -->
    <div class="action-bar">
      <el-button type="primary" @click="handleCreateFingerprint">
        <el-icon><Plus /></el-icon>
        新建指纹
      </el-button>
      <el-button @click="refreshList">
        <el-icon><Refresh /></el-icon>
        刷新
      </el-button>
      <div class="search-input">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索指纹ID或浏览器类型"
          prefix-icon="Search"
          clearable
          @input="handleSearch"
        />
      </div>
    </div>

    <!-- 指纹卡片列表 -->
    <div class="card-container">
      <div
        v-for="fingerprint in filteredFingerprints"
        :key="fingerprint.id"
        class="fingerprint-card"
        @click="handleCardClick(fingerprint)"
      >
        <div class="card-header">
          <div class="browser-icon">
            <el-icon v-if="fingerprint.fingerprint_browser === 'chrome'"><ChromeFilled /></el-icon>
            <el-icon v-else-if="fingerprint.fingerprint_browser === 'Edge'"><Monitor /></el-icon>
            <el-icon v-else-if="fingerprint.fingerprint_browser === 'Opera'"><ChromeFilled /></el-icon>
            <el-icon v-else-if="fingerprint.fingerprint_browser === 'Vivaldi'"><ChromeFilled /></el-icon>
            <el-icon v-else><Monitor /></el-icon>
          </div>
          <div class="card-title">
            <div class="fingerprint-id">{{ fingerprint.id_str || fingerprint.id }}</div>
            <div class="browser-info">
              {{ getBrowserDisplayName(fingerprint.fingerprint_browser) }} • {{ getPlatformDisplayName(fingerprint.fingerprint_platform) }}
            </div>
          </div>
          <div class="card-status">
            <el-tag :type="getStatusType(fingerprint)" size="small">
              {{ getStatusText(fingerprint) }}
            </el-tag>
          </div>
        </div>
        
        <div class="card-content">
          <div class="info-item">
            <span class="label">版本:</span>
            <span class="value">{{ fingerprint.fingerprint_brand_version || '未知' }}</span>
          </div>
          <div class="info-item">
            <span class="label">CPU:</span>
            <span class="value">{{ fingerprint.fingerprint_hardware_concurrency || 4 }}核</span>
          </div>
          <div class="info-item">
            <span class="label">语言:</span>
            <span class="value">{{ fingerprint.lang || 'zh-CN' }}</span>
          </div>
          <div class="info-item">
            <span class="label">时区:</span>
            <span class="value">{{ fingerprint.timezone || 'Asia/Shanghai' }}</span>
          </div>
        </div>

        <div class="card-footer">
          <div class="create-time">
            创建时间: {{ formatCreateTime(fingerprint.created_at) }}
          </div>
          <div class="card-actions">
            <el-button
              size="small"
              type="primary"
              link
              @click.stop="handleEdit(fingerprint)"
            >
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
            <el-button
              size="small"
              type="danger"
              link
              @click.stop="handleDelete(fingerprint)"
            >
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
            <el-button
              size="small"
              type="success"
              link
              @click.stop="handleConfigNotify(fingerprint)"
            >
              <el-icon><Setting /></el-icon>
              通知
            </el-button>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="!loading && filteredFingerprints.length === 0" class="empty-state">
        <el-empty description="暂无浏览器指纹" />
      </div>
    </div>

    <!-- 分页 -->
    <div v-if="filteredFingerprints.length > 0" class="pagination-container">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="totalCount"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="5" animated />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessageBox } from '@/utils/message'
import { useDebounceFn } from '@vueuse/core'
import {
  Plus,
  Refresh,
  Edit,
  Delete,
  Setting,
  ChromeFilled,
  Monitor,
  Search
} from '@element-plus/icons-vue'
import browserApi from '@/api/browser/browser_api'
import { businessHandler } from '@/utils/businessHandler'
import type { UserBrowserInfoReadResp } from '@/types/browser-automation-api'

interface Props {
  fingerprints: UserBrowserInfoReadResp[]
  loading?: boolean
}

interface Emits {
  (e: 'refresh'): void
  (e: 'edit', fingerprint: UserBrowserInfoReadResp): void
  (e: 'delete', fingerprint: UserBrowserInfoReadResp): void
  (e: 'quickStart', fingerprint: UserBrowserInfoReadResp): void
  (e: 'configNotify', fingerprint: UserBrowserInfoReadResp): void
  (e: 'create'): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<Emits>()

const searchKeyword = ref('')
const currentPage = ref(1)
const pageSize = ref(20)
const totalCount = ref(0)

// 过滤后的指纹列表
const filteredFingerprints = computed(() => {
  if (!searchKeyword.value) {
    return props.fingerprints
  }
  
  const keyword = searchKeyword.value.toLowerCase()
  return props.fingerprints.filter(fingerprint => {
    const id = (fingerprint.id_str || fingerprint.id || '').toString().toLowerCase()
    const browser = (fingerprint.fingerprint_browser || '').toLowerCase()
    const platform = (fingerprint.fingerprint_platform || '').toLowerCase()
    
    return id.includes(keyword) || browser.includes(keyword) || platform.includes(keyword)
  })
})

// 浏览器显示名称映射
const browserDisplayNames: Record<string, string> = {
  chrome: 'Chrome',
  Edge: 'Edge',
  Opera: 'Opera',
  Vivaldi: 'Vivaldi'
}

// 平台显示名称映射
const platformDisplayNames = {
  windows: 'Windows',
  linux: 'Linux',
  macos: 'macOS'
}

// 获取浏览器显示名称
const getBrowserDisplayName = (browser: string | null) => {
  if (!browser) return '未知浏览器'
  return browserDisplayNames[browser] || browser
}

// 获取平台显示名称
const getPlatformDisplayName = (platform: string | null) => {
  if (!platform) return '未知系统'
  return platformDisplayNames[platform as keyof typeof platformDisplayNames] || platform
}

// 获取状态类型
const getStatusType = (fingerprint: UserBrowserInfoReadResp): 'success' | 'info' | 'warning' | 'danger' => {
  // 这里可以根据实际状态返回不同的类型
  return 'success'
}

// 获取状态文本
const getStatusText = (fingerprint: UserBrowserInfoReadResp) => {
  // 这里可以根据实际状态返回不同的文本
  return '就绪'
}

// 格式化创建时间
const formatCreateTime = (timestamp: string | undefined) => {
  if (!timestamp) return '未知'
  return new Date(timestamp).toLocaleString('zh-CN')
}

// 处理搜索
const handleSearch = useDebounceFn(() => {
  currentPage.value = 1
}, 300)

// 处理卡片点击（快速启动）
const handleCardClick = (fingerprint: UserBrowserInfoReadResp) => {
  emit('quickStart', fingerprint)
}

// 处理编辑
const handleEdit = (fingerprint: UserBrowserInfoReadResp) => {
  emit('edit', fingerprint)
}

// 处理删除
const handleDelete = async (fingerprint: UserBrowserInfoReadResp) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除指纹 "${fingerprint.id_str || fingerprint.id}" 吗？此操作不可恢复。`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    emit('delete', fingerprint)
  } catch {
    // 用户取消删除
  }
}

// 处理配置通知
const handleConfigNotify = (fingerprint: UserBrowserInfoReadResp) => {
  emit('configNotify', fingerprint)
}

// 处理新建指纹
const handleCreateFingerprint = () => {
  emit('create')
}

// 刷新列表
const refreshList = () => {
  emit('refresh')
}

// 分页大小改变
const handleSizeChange = (size: number) => {
  pageSize.value = size
  currentPage.value = 1
  refreshList()
}

// 当前页改变
const handleCurrentChange = (page: number) => {
  currentPage.value = page
  refreshList()
}
</script>

<style scoped>
.fingerprint-card-list {
  width: 100%;
}

.action-bar {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.search-input {
  flex: 1;
  min-width: 200px;
  max-width: 300px;
}

.card-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.fingerprint-card {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.fingerprint-card:hover {
  border-color: var(--el-color-primary);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.browser-icon {
  font-size: 24px;
  color: var(--el-color-primary);
}

.card-title {
  flex: 1;
}

.fingerprint-id {
  font-weight: 600;
  font-size: 14px;
  color: var(--el-text-color-primary);
  margin-bottom: 2px;
}

.browser-info {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.card-status {
  flex-shrink: 0;
}

.card-content {
  margin-bottom: 12px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  font-size: 12px;
}

.info-item .label {
  color: var(--el-text-color-secondary);
}

.info-item .value {
  color: var(--el-text-color-primary);
  font-weight: 500;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid var(--el-border-color-light);
}

.create-time {
  font-size: 11px;
  color: var(--el-text-color-placeholder);
}

.card-actions {
  display: flex;
  gap: 4px;
}

.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 40px 0;
}

.loading-container {
  grid-column: 1 / -1;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

@media (max-width: 768px) {
  .card-container {
    grid-template-columns: 1fr;
  }
  
  .action-bar {
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-input {
    max-width: none;
  }
}
</style>