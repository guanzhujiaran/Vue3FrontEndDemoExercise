<template>
  <div class="topic-square h-full flex flex-col">
    <!-- 筛选栏 -->
    <div class="topic-square__toolbar flex items-center justify-between gap-4 mb-4">
      <div class="topic-square__filters flex items-center gap-2">
        <el-radio-group v-model="viewMode" size="default" @change="onViewChange">
          <el-radio-button value="all">全部话题</el-radio-button>
          <el-radio-button value="hot">热门话题</el-radio-button>
          <el-radio-button v-if="isLoggedIn" value="mine">我创建的</el-radio-button>
        </el-radio-group>
      </div>
      <div class="topic-square__toolbar-right flex items-center gap-2">
        <!-- 话题搜索（仅全部/热门模式下可用；动态流与「我创建的」不搜索） -->
        <el-input
          v-if="showSearch"
          v-model="keyword"
          class="topic-square__search w-56"
          placeholder="搜索话题"
          clearable
          :prefix-icon="Search"
          @keyup.enter="onSearch"
          @clear="onKeywordClear"
        >
          <template #append>
            <el-button :icon="Search" @click="onSearch" />
          </template>
        </el-input>
        <el-button
          v-if="isLoggedIn"
          class="topic-square__create-btn"
          type="primary"
          size="default"
          :icon="Plus"
          @click="openCreateDialog"
        >
          创建话题
        </el-button>
      </div>
    </div>

    <!-- 我创建的（分页） -->
    <LoadingWrap
      v-if="isMineMode"
      :loading="loading"
      class="topic-square__content flex-1 min-h-0 overflow-y-auto"
    >
      <EmptyState v-if="!loading && items.length === 0" :text="emptyText" />
      <div v-else class="topic-square__grid grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <div
          v-for="item in items"
          :key="item.topicId"
          class="topic-square__card bg-bg-overlay hover:bg-fill-light rounded-lg border border-border-light p-4 transition-colors cursor-pointer"
          @click="openTopic(item)"
        >
          <div class="topic-square__cover aspect-video rounded-md overflow-hidden mb-3 bg-bg">
            <img
              v-if="item.topicCover"
              :src="item.topicCover"
              class="w-full h-full object-cover"
              loading="lazy"
              :alt="item.topicName"
            />
            <div v-else class="w-full h-full flex items-center justify-center text-text-placeholder text-2xl">#</div>
          </div>
          <div class="topic-square__info">
            <div class="flex items-center gap-2">
              <span class="topic-square__name text-sm font-bold text-text-primary truncate">#{{ item.topicName }}#</span>
              <el-tag v-if="isMineMode" size="default" :type="auditTagType(item)" effect="light">{{ auditTagText(item) }}</el-tag>
              <el-tag v-else-if="item.isHot" size="default" type="danger">热门</el-tag>
            </div>
            <div class="topic-square__meta flex items-center gap-3 mt-2 text-xs text-text-placeholder">
              <span>{{ formatNum(item.dynCount) }} 条动态</span>
              <span>{{ formatNum(item.viewCount) }} 浏览</span>
            </div>
            <el-text
              v-if="isMineMode && getAuditStatus(item) === 'rejected' && getAuditRejectReason(item)"
              class="topic-square__reject-reason mt-1 block text-xs text-danger"
              tag="p"
            >驳回原因：{{ getAuditRejectReason(item) }}</el-text>
          </div>
        </div>
      </div>
      <div class="topic-square__pagination flex justify-center py-4">
        <el-pagination
          v-if="total > pageSize"
          layout="prev, pager, next"
          :total="total"
          :page-size="pageSize"
          :current-page="page"
          size="default"
          @current-change="onPageChange"
        />
      </div>
    </LoadingWrap>

    <!-- 全部/热门话题（推荐流：无限滚动，last_showlist 去重，对齐动态广场 feed） -->
    <LoadingMoreContainer
      v-else
      :key="squareLoadKey"
      class="topic-square__content flex-1 min-h-0 overflow-y-auto mb-0!"
      fill-parent
      :handle-load="handleSquareLoad"
      v-model:is-more="isMore"
      v-model:is-loading="loading"
      v-model:is-error="isError"
      :show-end-text="items.length > 0"
    >
      <template #content>
        <EmptyState v-if="!loading && !isError && items.length === 0" :text="emptyText" />
        <div v-else class="topic-square__grid grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div
            v-for="item in items"
            :key="item.topicId"
            class="topic-square__card bg-bg-overlay hover:bg-fill-light rounded-lg border border-border-light p-4 transition-colors cursor-pointer"
            @click="openTopic(item)"
          >
            <div class="topic-square__cover aspect-video rounded-md overflow-hidden mb-3 bg-bg">
              <img
                v-if="item.topicCover"
                :src="item.topicCover"
                class="w-full h-full object-cover"
                loading="lazy"
                :alt="item.topicName"
              />
              <div v-else class="w-full h-full flex items-center justify-center text-text-placeholder text-2xl">#</div>
            </div>
            <div class="topic-square__info">
              <div class="flex items-center gap-2">
                <span class="topic-square__name text-sm font-bold text-text-primary truncate">#{{ item.topicName }}#</span>
                <el-tag v-if="item.isHot" size="default" type="danger">热门</el-tag>
              </div>
              <div class="topic-square__meta flex items-center gap-3 mt-2 text-xs text-text-placeholder">
                <span>{{ formatNum(item.dynCount) }} 条动态</span>
                <span>{{ formatNum(item.viewCount) }} 浏览</span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </LoadingMoreContainer>

    <!-- 创建话题弹窗 -->
    <el-dialog
      v-model="createVisible"
      class="topic-create-dialog"
      title="创建话题"
      width="480"
      :close-on-click-modal="false"
      :lock-scroll="false"
    >
      <el-form
        class="topic-create-dialog__form"
        label-position="top"
        :model="createForm"
        :rules="createRules"
        ref="createFormRef"
      >
        <el-form-item label="话题名称" prop="topicName">
          <el-input
            v-model="createForm.topicName"
            class="topic-create-dialog__name"
            maxlength="30"
            show-word-limit
            placeholder="请输入 1-30 字话题名称"
          />
        </el-form-item>
        <el-form-item label="话题描述" prop="topicDesc">
          <el-input
            v-model="createForm.topicDesc"
            class="topic-create-dialog__desc"
            type="textarea"
            :rows="3"
            maxlength="200"
            show-word-limit
            placeholder="请输入话题描述（选填，≤200 字）"
          />
        </el-form-item>
        <el-form-item label="封面图 URL" prop="topicCover">
          <el-input
            v-model="createForm.topicCover"
            class="topic-create-dialog__cover"
            placeholder="请输入图片 http/https 链接（选填）"
          />
        </el-form-item>
        <el-text class="topic-create-dialog__tip text-xs text-text-placeholder" tag="p">
          创建后将进入审核，审核通过后才会公开展示。
        </el-text>
      </el-form>
      <template #footer>
        <div class="topic-create-dialog__footer flex justify-end gap-2">
          <el-button size="default" @click="createVisible = false">取消</el-button>
          <el-button type="primary" size="default" :loading="createSubmitting" @click="submitCreate">
            提交
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useUserNavStore } from '@/stores/user_nav'
import { Plus, Search } from '@element-plus/icons-vue'
import {
  fetchTopicSquare,
  fetchMyTopics,
  createTopic,
} from '@/api/notify/moment-api'
import type { MomentTopicInfo, MomentTopicMineItem } from '@/api/notify/moment-api'
import LoadingWrap from '@/components/message/LoadingWrap.vue'
import LoadingMoreContainer from '@/components/CommonCompo/Bili-Container-Compo/LoadingMoreContainer.vue'
import EmptyState from '@/components/message/EmptyState.vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'

const router = useRouter()

// 登录态：未登录时隐藏「我创建的」与「创建话题」（这两个接口需登录）；
// 话题广场 / 热门话题本身已对匿名开放（后端 OptionalUser，无需登录即可浏览）
const { user_nav } = storeToRefs(useUserNavStore())
const isLoggedIn = computed(() => !!user_nav.value.uid)

type MineItem = MomentTopicMineItem & { isHot?: number; dynCount?: number; viewCount?: number }

type ViewMode = 'all' | 'hot' | 'mine'
const viewMode = ref<ViewMode>('all')
const keyword = ref('') // 输入框当前值（受控，逐字符更新）
const appliedKeyword = ref('') // 已应用搜索词（回车/按钮/清空时更新，触发加载）

const items = ref<Array<MomentTopicInfo | MineItem>>([])
const loading = ref(false)
const isMore = ref(true)
const isError = ref(false)
const showlist = ref<number[]>([]) // 推荐流已展示 topicId（去重，上限 100）

// 我创建的：分页
const page = ref(1)
const total = ref(0)
const pageSize = 20

// 推荐流加载 key：模式或已应用关键词变化 → 重挂载 LoadingMoreContainer 触发首屏加载
const squareLoadKey = computed(() => `${viewMode.value}::${appliedKeyword.value}`)

const isMineMode = computed(() => viewMode.value === 'mine')
const showSearch = computed(() => viewMode.value === 'all' || viewMode.value === 'hot')
const emptyText = computed(() => {
  if (isMineMode.value) return '你还没有创建过话题'
  if (appliedKeyword.value) return '没有找到相关话题'
  return '暂无话题'
})

// 推荐流：首屏 + 触底均追加，以 showlist 去重（对齐动态广场 feed）
async function handleSquareLoad() {
  isError.value = false
  loading.value = true
  try {
    const res = await fetchTopicSquare({
      page_size: 20,
      last_showlist: showlist.value,
      keyword: appliedKeyword.value || undefined,
      hot_only: viewMode.value === 'hot',
    })
    const newItems = res.items || []
    if (items.value.length === 0) items.value = newItems
    else items.value.push(...newItems)
    for (const it of newItems) showlist.value.push(it.topicId)
    if (showlist.value.length > 100) showlist.value = showlist.value.slice(-100)
    isMore.value = res.hasMore ?? false
    if (items.value.length > 0 && newItems.length === 0) isMore.value = false
  } catch (e) {
    console.error('加载话题失败:', e)
    isError.value = true
  } finally {
    loading.value = false
  }
}

// 模式 / 已应用关键词变化：重置推荐流状态并触发首屏加载
// （LoadingMoreContainer 仅在滚动触底时回调，不在挂载/重挂载时自动首屏；
//  故对齐动态广场 MomentFeedList 的 onMounted(handleLoad)，此处显式触发）
watch(squareLoadKey, () => {
  if (isMineMode.value) return // 「我创建的」由 onViewChange → loadMineList 处理，不在此加载
  items.value = []
  showlist.value = []
  isMore.value = true
  isError.value = false
  void handleSquareLoad()
})

onMounted(() => {
  // 进入/刷新页面首屏加载（默认全部话题）
  if (!isMineMode.value) void handleSquareLoad()
})

// 我创建的：分页加载
async function loadMineList(p: number) {
  page.value = p
  loading.value = true
  try {
    const res = await fetchMyTopics({ page: p, page_size: pageSize })
    items.value = res.items || []
    total.value = (res as any).total ?? 0
  } finally {
    loading.value = false
  }
}

function onViewChange() {
  if (isMineMode.value) {
    page.value = 1
    void loadMineList(1)
  }
  // all/hot 由 :key 重挂载触发首屏
}

function onSearch() {
  // 仅更新已应用词，触发 squareLoadKey 变化 → 重挂载重载（避免逐字符请求）
  appliedKeyword.value = keyword.value.trim()
}

function onKeywordClear() {
  keyword.value = ''
  appliedKeyword.value = ''
}

function onPageChange(p: number) {
  loadMineList(p)
}

function openTopic(item: MomentTopicInfo | MineItem) {
  if (isMineMode.value && getAuditStatus(item) !== 'normal') return
  router.push({
    name: 'MOMENT_TOPIC_FEED',
    params: { topicId: String(item.topicId) },
    query: { topicName: item.topicName },
  })
}

function formatNum(n?: number | null): string {
  if (n == null) return '0'
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w'
  return String(n)
}

// 话题 mine item 才带 auditStatus / auditRejectReason，广场 item 不带；用 in 收窄供 mine 模式使用
function getAuditStatus(item: MomentTopicInfo | MineItem): string | undefined {
  return 'auditStatus' in item ? item.auditStatus : undefined
}

function getAuditRejectReason(item: MomentTopicInfo | MineItem): string | null | undefined {
  return 'auditRejectReason' in item ? item.auditRejectReason : undefined
}

function auditTagType(item: MomentTopicInfo | MineItem) {
  const s = getAuditStatus(item)
  if (s === 'normal') return 'success'
  if (s === 'rejected') return 'danger'
  return 'warning'
}

function auditTagText(item: MomentTopicInfo | MineItem) {
  const s = getAuditStatus(item)
  if (s === 'normal') return '已通过'
  if (s === 'rejected') return '已驳回'
  return '待审核'
}

const createVisible = ref(false)
const createSubmitting = ref(false)
const createFormRef = ref<FormInstance>()
const createForm = reactive({ topicName: '', topicDesc: '', topicCover: '' })
const createRules: FormRules = {
  topicName: [{ required: true, message: '请输入话题名称', trigger: 'blur' }],
}

function openCreateDialog() {
  createForm.topicName = ''
  createForm.topicDesc = ''
  createForm.topicCover = ''
  createVisible.value = true
}

async function submitCreate() {
  await createFormRef.value?.validate()
  createSubmitting.value = true
  try {
    const res = await createTopic({
      topicName: createForm.topicName,
      topicDesc: createForm.topicDesc || undefined,
      topicCover: createForm.topicCover || undefined,
    })
    createSubmitting.value = false
    if (res) {
      createVisible.value = false
      ElMessage.success('话题已提交审核，通过后公开展示')
      if (viewMode.value === 'mine') loadMineList(1)
    }
  } catch {
    createSubmitting.value = false
  }
}
</script>
