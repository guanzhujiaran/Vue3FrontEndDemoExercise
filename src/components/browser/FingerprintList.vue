<!--
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-12-24 00:00:00
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-12-24 00:00:00
 * @FilePath: \Vue3FrontEndDemoExercise\src\components\browser\FingerprintList.vue
 * @Description: 指纹列表组件
-->
<template>
  <div class="flex-1">
    <!-- 操作栏 -->
    <div class="mb-5 flex flex-wrap items-center justify-between gap-4">
      <div class="flex gap-2">
        <el-button type="primary" @click="$emit('create')">
          <el-icon>
            <Plus />
          </el-icon>
          创建指纹
        </el-button>

        <el-button @click="$emit('refresh')">
          <el-icon>
            <RefreshRight />
          </el-icon>
          刷新
        </el-button>
      </div>

      <!-- 过滤器和搜索 -->
      <div class="flex flex-wrap items-center gap-2">
        <el-select
          v-model="filterBrowser"
          placeholder="筛选浏览器"
          style="width: 150px"
          clearable
          @change="
            $emit('filter-change', {
              browser: filterBrowser,
              platform: filterPlatform,
              keyword: searchKeyword
            })
          "
        >
          <el-option label="全部浏览器" value="" />
          <el-option label="Chrome" value="chrome" />
          <el-option label="Edge" value="Edge" />
          <el-option label="Opera" value="Opera" />
          <el-option label="Vivaldi" value="Vivaldi" />
        </el-select>

        <el-select
          v-model="filterPlatform"
          placeholder="筛选平台"
          style="width: 150px"
          clearable
          @change="
            $emit('filter-change', {
              browser: filterBrowser,
              platform: filterPlatform,
              keyword: searchKeyword
            })
          "
        >
          <el-option label="全部平台" value="" />
          <el-option label="Windows" value="windows" />
          <el-option label="Linux" value="linux" />
          <el-option label="macOS" value="macos" />
        </el-select>

        <el-input
          v-model="searchKeyword"
          placeholder="搜索用户ID"
          style="width: 200px"
          clearable
          @clear="handleSearch"
          @keyup.enter="handleSearch"
        >
          <template #prefix>
            <el-icon>
              <Search />
            </el-icon>
          </template>
        </el-input>
      </div>
    </div>

    <!-- 统计面板 -->
    <StatsPanel :stats="stats" />

    <!-- 指纹列表 -->
    <div class="min-h-120">
      <div v-if="loading" class="w-full">
        <div
          class="grid gap-4"
          style="grid-template-columns: repeat(auto-fill, minmax(300px, 1fr))"
        >
          <div
            v-for="i in 6"
            :key="i"
            class="bg-bg/50 border-border-light/30 rounded-xl border p-5 backdrop-blur-sm"
          >
            <el-skeleton :rows="4" animated></el-skeleton>
          </div>
        </div>
      </div>
      <div
        v-else-if="filteredFingerprints.length > 0"
        class="grid gap-4"
        style="grid-template-columns: repeat(auto-fill, minmax(300px, 1fr))"
      >
        <FingerprintCard
          v-for="fingerprint in filteredFingerprints"
          :key="fingerprint.id_str || fingerprint.id"
          :fingerprint="fingerprint"
          @click="$emit('card-click', fingerprint)"
          @view="$emit('view', fingerprint)"
          @edit="$emit('edit', fingerprint)"
          @delete="$emit('delete', fingerprint)"
          @start="$emit('start', fingerprint)"
        />
      </div>

      <!-- 空状态 -->
      <el-empty
        v-if="filteredFingerprints.length === 0 && !loading"
        description="暂无浏览器指纹数据"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Plus, RefreshRight, Search } from '@element-plus/icons-vue'
import StatsPanel from './StatsPanel.vue'
import FingerprintCard from './FingerprintCard.vue'
import type { UserBrowserInfoReadResp } from '@/types/browser-automation-api'

// 定义Props
interface Props {
  fingerprints: UserBrowserInfoReadResp[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

// 定义Emit
const emit = defineEmits<{
  create: []
  refresh: []
  'filter-change': [filter: { browser: string; platform: string; keyword: string }]
  'card-click': [fingerprint: UserBrowserInfoReadResp]
  view: [fingerprint: UserBrowserInfoReadResp]
  edit: [fingerprint: UserBrowserInfoReadResp]
  delete: [fingerprint: UserBrowserInfoReadResp]
  start: [fingerprint: UserBrowserInfoReadResp]
}>()

// 过滤条件
const filterBrowser = ref('')
const filterPlatform = ref('')
const searchKeyword = ref('')

// 统计数据
const stats = computed(() => {
  const total = props.fingerprints.length
  const chrome = props.fingerprints.filter((item) => item.fingerprint_browser === 'chrome').length
  const edge = props.fingerprints.filter((item) => item.fingerprint_browser === 'Edge').length
  const windows = props.fingerprints.filter(
    (item) => item.fingerprint_platform === 'windows'
  ).length

  return {
    total,
    chrome,
    edge,
    windows
  }
})

// 过滤后的指纹列表
const filteredFingerprints = computed(() => {
  let result = props.fingerprints

  // 按浏览器类型过滤
  if (filterBrowser.value) {
    result = result.filter((item) => item.fingerprint_browser === filterBrowser.value)
  }

  // 按平台过滤
  if (filterPlatform.value) {
    result = result.filter((item) => item.fingerprint_platform === filterPlatform.value)
  }

  // 按用户ID搜索
  if (searchKeyword.value) {
    result = result.filter((item) =>
      item.mid.toLowerCase().includes(searchKeyword.value.toLowerCase())
    )
  }

  return result
})

// 方法
const handleSearch = () => {
  emit('filter-change', {
    browser: filterBrowser.value,
    platform: filterPlatform.value,
    keyword: searchKeyword.value
  })
}

// 监听搜索关键词变化
watch(searchKeyword, (newVal) => {
  if (newVal === '') {
    handleSearch()
  }
})
</script>
