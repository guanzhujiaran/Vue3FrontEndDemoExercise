<template>
  <div class="moment-space-fav-tab w-full max-w-4xl mx-auto flex gap-6 items-start">
    <!-- 左栏：收藏夹列表（列表本体由布局壳持有，本组件只做展示与选中态） -->
    <aside class="moment-space-fav-tab__side w-60 shrink-0 sticky top-4">
      <div class="moment-space-fav-tab__side-head flex flex-col gap-1.5 mb-3 px-2">
        <span class="moment-space-fav-tab__side-title text-sm font-bold text-text-primary whitespace-nowrap">
          我创建的收藏夹
        </span>
        <el-button
          v-if="isOwnSpace"
          class="moment-space-fav-tab__create self-start"
          size="default"
          text
          type="primary"
          @click="openCreateFolder"
        >
          <el-icon :size="16"><Plus /></el-icon>
          <span class="ml-1 whitespace-nowrap">新建收藏夹</span>
        </el-button>
      </div>
      <ul class="moment-space-fav-tab__list flex flex-col gap-0.5">
        <li
          v-for="folder in favFolders"
          :key="folder.folderId_str ?? ''"
          class="moment-space-fav-tab__item group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors"
          :class="activeFolderId === (folder.folderId_str ?? '') ? 'bg-primary text-white' : 'hover:bg-bg-overlay'"
          :data-folder-id="folder.folderId_str ?? ''"
          @click="selectFolder(folder)"
        >
          <el-icon :size="14" class="shrink-0"><Folder /></el-icon>
          <span class="flex-1 text-sm truncate">{{ folder.name }}</span>
          <!-- 本人视角：标出各夹公开 / 隐藏（切换入口在编辑弹窗内） -->
          <el-icon
            v-if="isOwnSpace"
            class="moment-space-fav-tab__item-visibility shrink-0 opacity-70"
            :size="13"
            :title="folder.isPublic ? '公开' : '隐藏'"
          >
            <View v-if="folder.isPublic" />
            <Hide v-else />
          </el-icon>
          <span class="text-xs opacity-70 shrink-0">{{ favCountOf(folder.folderId_str ?? '') }}</span>
          <!-- 自己的收藏夹均可编辑（含默认夹：可改可见性 / 描述）；默认收藏夹禁止删除 -->
          <template v-if="isOwnSpace">
            <el-icon
              class="moment-space-fav-tab__item-edit opacity-0 group-hover:opacity-100 shrink-0"
              :size="13"
              @click.stop="openEditFolder(folder)"
            ><EditPen /></el-icon>
            <el-icon
              v-if="!folder.isDefault"
              class="moment-space-fav-tab__item-del opacity-0 group-hover:opacity-100 shrink-0"
              :size="13"
              @click.stop="removeFolder(folder)"
            ><Delete /></el-icon>
          </template>
        </li>
        <li v-if="favFolders.length === 0" class="px-2 py-1.5 text-sm text-text-placeholder">
          暂无收藏夹
        </li>
      </ul>
    </aside>

    <!-- 右栏：当前收藏夹内容 -->
    <section class="moment-space-fav-tab__main flex-1 min-w-0">
      <header
        v-if="activeFolder"
        class="moment-space-fav-tab__head mb-4 pb-3 border-b border-border-lighter flex items-center gap-4"
      >
        <el-avatar
          :size="64"
          :src="activeFolder.coverUrl || undefined"
          shape="square"
          class="moment-space-fav-tab__head-cover shrink-0 rounded-lg"
        />
        <div class="moment-space-fav-tab__head-info flex flex-col gap-1 min-w-0 flex-1">
          <div class="moment-space-fav-tab__head-title-row flex items-center gap-2 min-w-0">
            <span class="text-lg font-bold text-text-primary truncate">{{ activeFolder.name }}</span>
            <el-tag
              v-if="activeFolder.isDefault"
              class="moment-space-fav-tab__head-default shrink-0"
              type="info"
              effect="plain"
            >默认</el-tag>
          </div>
          <span class="text-sm text-text-placeholder truncate">
            {{ activeFolder.isPublic ? '公开' : '隐藏' }} · 共 {{ activeFolderCount }} 条
          </span>
        </div>
        <!-- 本人视角：默认收藏夹也能改（可见性 / 描述），入口放在头部更显眼 -->
        <el-button
          v-if="isOwnSpace"
          class="moment-space-fav-tab__head-edit shrink-0"
          size="default"
          type="primary"
          plain
          @click="openEditFolder(activeFolder)"
        >
          <el-icon :size="16"><EditPen /></el-icon>
          <span class="ml-1">编辑</span>
        </el-button>
      </header>

      <LoadingWrap :loading="favLoading">
        <EmptyState v-if="!favLoading && visibleFavItems.length === 0" text="还没有收藏的动态 ~" />
        <div v-else class="moment-space-fav-tab__items flex flex-col gap-4">
          <MomentCard
            v-for="item in visibleFavItems"
            :key="item.dynId_str ?? ''"
            :item="item"
            :status="statusOf(item.dynId_str ?? '')"
            @click="openDetail(item)"
            @status-change="onCardStatusChangeOf(item)"
          />
          <div v-if="favHasMore" class="flex justify-center py-4">
            <el-button size="default" :loading="favLoading" @click="loadMoreFavorites">加载更多</el-button>
          </div>
          <div v-else-if="favDynIds.length > 0" class="text-center text-sm text-text-placeholder py-4">
            — 没有更多了 —
          </div>
        </div>
      </LoadingWrap>
    </section>

    <!-- 新建 / 编辑收藏夹弹窗 -->
    <el-dialog
      v-model="folderDialogVisible"
      class="moment-space-fav-tab__folder-dialog"
      :title="folderDialogMode === 'create' ? '新建收藏夹' : '编辑收藏夹信息'"
      width="440px"
    >
      <div class="moment-space-fav-tab__folder-form flex flex-col gap-3">
        <label class="flex flex-col gap-1">
          <span class="text-sm text-text-secondary">收藏夹名称</span>
          <el-input
            v-model="folderForm.name"
            placeholder="给收藏夹起个名字"
            size="large"
            maxlength="40"
            show-word-limit
          />
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-sm text-text-secondary">简介（选填）</span>
          <el-input
            v-model="folderForm.description"
            type="textarea"
            :rows="3"
            placeholder="介绍一下这个收藏夹"
            size="large"
            maxlength="200"
            show-word-limit
          />
        </label>
        <div class="moment-space-fav-tab__visibility flex items-center justify-between gap-3">
          <div class="min-w-0">
            <div class="text-sm text-text-secondary">公开该收藏夹</div>
            <div class="text-xs text-text-placeholder mt-0.5">
              {{ folderForm.isPublic ? '任何访问你主页的人都能看到' : '仅你自己可见' }}
            </div>
          </div>
          <el-switch
            v-model="folderForm.isPublic"
            class="moment-space-fav-tab__visibility-switch"
          />
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <el-button size="large" @click="folderDialogVisible = false">取消</el-button>
          <el-button
            class="moment-space-fav-tab__folder-submit"
            type="primary"
            size="large"
            :loading="folderSubmitting"
            @click="submitFolder"
          >
            {{ folderDialogMode === 'create' ? '创建' : '保存' }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  fetchMomentDetail,
  fetchFavoriteDynIds,
  fetchUserFavoriteDynIds,
  createFavoriteFolder,
  updateFavoriteFolder,
  deleteFavoriteFolder,
  InteractionBizTypeEnum,
} from '@/api/notify/moment-api'
import type { MomentFeedItem, FavoriteFolderResp } from '@/api/notify/moment-api'
import type { FavoriteChangedPayload } from '@/utils/interaction/favoriteSync'
import { useInteractionStatusMap } from '@/composables/useInteractionStatusMap'
import LoadingWrap from '@/components/message/LoadingWrap.vue'
import EmptyState from '@/components/message/EmptyState.vue'
import MomentCard from '@/components/moment/MomentCard.vue'
import { useMomentSpace } from '@/views/moment/tabs/spaceContext'

/**
 * 个人空间「收藏」tab（`/app/space/:mid/favlist?fid=xxx&ftype=create`，对齐 B 站）。
 * 收藏夹列表由布局壳持有（唯一副本），本组件只负责：选中态（走 query）+ 夹内内容 +
 * 增删改后请求父级 refreshFavorites() 重新拉取，不在本地改副本。
 */
const { spaceMid, isOwnSpace, favFolders, refreshFavorites, ensureProfileLoaded } = useMomentSpace()
const route = useRoute()
const router = useRouter()

const activeFolderId = ref<string>('')

/** 夹内动态的互动态（收藏数 / 是否已收藏）：与其它列表页共用同一套同步仓库 */
const { statusOf, ensure: ensureStatus, applyFavorite, clear: clearStatus } = useInteractionStatusMap()

/** 卡片内收藏变更（取消收藏等）：浅合并进互动态仓库，按钮即时响应 */
function onCardStatusChangeOf(item: MomentFeedItem) {
  return (_dynId: string, payload: FavoriteChangedPayload) =>
    applyFavorite(item.dynId_str ?? '', payload)
}
const favDynIds = ref<string[]>([])
const favItemsMap = ref<Record<string, MomentFeedItem>>({})
const favLoading = ref(false)
const favHasMore = ref(false)
let favPage = 1
/** 各收藏夹已加载条目数（左侧列表展示数量） */
const favCountMap = ref<Record<string, number>>({})

/** 收藏 tab 实际渲染项（过滤掉详情加载失败的 dynId） */
const visibleFavItems = computed(() =>
  favDynIds.value.map((id) => favItemsMap.value[id]).filter((x): x is MomentFeedItem => Boolean(x))
)
const activeFolder = computed(
  () => favFolders.value.find((f) => (f.folderId_str ?? '') === activeFolderId.value) ?? null
)
/** 某收藏夹下已加载的条目数 */
function favCountOf(folderId: string): number {
  if (!folderId) return 0
  return folderId === activeFolderId.value ? favDynIds.value.length : (favCountMap.value[folderId] ?? 0)
}
const activeFolderCount = computed(() => favCountOf(activeFolderId.value))

/** 可见条目变化 → 批量补齐互动态（收藏数 / 是否已收藏），弱依赖不影响夹内内容 */
watch(
  visibleFavItems,
  (list) => {
    void ensureStatus(list.map((i) => i.dynId_str ?? ''))
  },
  { immediate: true }
)

/** query 中的 fid（分享链接可能带上已被删除的夹；重复 query 取第一个） */
const queryFid = computed(() => {
  const fid = route.query.fid
  if (Array.isArray(fid)) return fid[0] ? String(fid[0]) : ''
  return fid ? String(fid) : ''
})

/** 选中某个收藏夹：写回 query（ftype=create 表示我创建的），并加载夹内内容 */
function selectFolder(folder: FavoriteFolderResp) {
  const fid = folder.folderId_str ?? ''
  if (activeFolderId.value === fid) return
  activeFolderId.value = fid
  router.replace({ query: { ...route.query, fid, ftype: 'create' } })
  void loadFavoriteDyns(fid, true)
}

/** 进入页面无 / 已失效的 fid：默认选中 isDefault 的夹并回填 query */
function ensureSelection() {
  const folders = favFolders.value
  if (!folders.length) {
    activeFolderId.value = ''
    favDynIds.value = []
    favItemsMap.value = {}
    return
  }
  if (folders.some((f) => (f.folderId_str ?? '') === activeFolderId.value)) return
  const target = folders.find((f) => f.isDefault) ?? folders.at(0)
  if (!target) return
  const fid = target.folderId_str ?? ''
  activeFolderId.value = fid
  if (queryFid.value !== fid) {
    router.replace({ query: { ...route.query, fid, ftype: 'create' } })
  }
  void loadFavoriteDyns(fid, true)
}

/** 加载某收藏夹下动态 id（并批量拉详情；自身空间读本人，他人空间读主人公开） */
async function loadFavoriteDyns(folderId: string, reset = false) {
  if (!folderId) return
  if (reset) {
    favPage = 1
    favDynIds.value = []
    clearStatus()
  }
  favLoading.value = true
  try {
    const res = isOwnSpace.value
      ? await fetchFavoriteDynIds(folderId, { page: favPage, pageSize: 20 })
      : await fetchUserFavoriteDynIds(spaceMid.value, folderId, { page: favPage, pageSize: 20 })
    if (res === null) {
      // 非公开夹 / 夹不存在：收藏内容置空（他人视角 tab 显隐由布局壳按「有无公开夹」决定）
      favDynIds.value = []
      favHasMore.value = false
      return
    }
    // 2.55.0 后端收藏夹通用化：返回 items（bizType+bizId 对），本空间仅展示动态资源
    const newIds = (res.items ?? [])
      .filter((it) => it.bizType === InteractionBizTypeEnum.DYNAMIC)
      .map((it) => it.bizId_str ?? '')
    favDynIds.value = reset ? newIds : [...favDynIds.value, ...newIds]
    // 记录该夹数量，供左侧列表展示
    if (folderId) favCountMap.value[folderId] = favDynIds.value.length
    favHasMore.value = favPage * 20 < (res.total || 0)
    // 逐个拉取收藏动态详情（用于 MomentCard 渲染）
    const freshItems: Record<string, MomentFeedItem> = { ...favItemsMap.value }
    await Promise.all(
      newIds.map(async (id) => {
        if (freshItems[id]) return
        try {
          const detail = await fetchMomentDetail(id)
          if (detail) freshItems[id] = detail
        } catch {
          // 动态已删除等：跳过，不渲染
        }
      })
    )
    favItemsMap.value = freshItems
  } catch {
    favHasMore.value = false
  } finally {
    favLoading.value = false
  }
}

function loadMoreFavorites() {
  if (favLoading.value || !favHasMore.value) return
  favPage += 1
  void loadFavoriteDyns(activeFolderId.value)
}

function openDetail(item: MomentFeedItem) {
  router.push({ name: 'MOMENT_DETAIL', params: { momentId: item.dynId_str } })
}

onMounted(async () => {
  await ensureProfileLoaded()
  // 分享链接直接带了 fid：优先按 query 选中，随后 ensureSelection 兜底修正失效的 fid
  if (queryFid.value) {
    activeFolderId.value = queryFid.value
    void loadFavoriteDyns(queryFid.value, true)
  }
  ensureSelection()
})

// query 变化（收藏夹切换 / 分享链接跳转）→ 切换右栏内容
watch(queryFid, (fid) => {
  if (!fid || fid === activeFolderId.value) return
  activeFolderId.value = fid
  void loadFavoriteDyns(fid, true)
})

// 收藏夹列表变化（布局壳刷新 / 新建成功 / 被删除）→ 修正失效选中态
watch(
  () => favFolders.value.map((f) => f.folderId_str ?? '').join(','),
  () => {
    ensureSelection()
  }
)

/* ---------------- 收藏夹增删改：请求布局壳重新拉取，本地不保留副本 ---------------- */

const folderDialogVisible = ref(false)
const folderDialogMode = ref<'create' | 'edit'>('create')
const folderForm = ref<{ name: string; description: string; isPublic: boolean }>({
  name: '',
  description: '',
  isPublic: true,
})
const folderSubmitting = ref(false)

function openCreateFolder() {
  folderDialogMode.value = 'create'
  // 新建默认公开（对齐 B 站：新建收藏夹默认可见）
  folderForm.value = { name: '', description: '', isPublic: true }
  folderDialogVisible.value = true
}

function openEditFolder(folder: {
  name: string
  description?: string | null
  isPublic?: boolean
}) {
  folderDialogMode.value = 'edit'
  folderForm.value = {
    name: folder.name,
    description: folder.description ?? '',
    isPublic: folder.isPublic ?? true,
  }
  folderDialogVisible.value = true
}

async function submitFolder() {
  const name = folderForm.value.name.trim()
  if (!name) {
    ElMessage.warning('请填写收藏夹名称')
    return
  }
  folderSubmitting.value = true
  try {
    if (folderDialogMode.value === 'create') {
      const created = await createFavoriteFolder({
        name,
        description: folderForm.value.description,
        isPublic: folderForm.value.isPublic,
      })
      if (created) {
        await refreshFavorites()
        // 列表唯一副本在布局壳：刷新后定位到新建的收藏夹（选不中时由 ensureSelection 兜底到默认夹）
        const newFolder = favFolders.value.find(
          (f) => (f.folderId_str ?? '') === (created.folderId_str ?? '')
        )
        if (newFolder) selectFolder(newFolder)
        ElMessage.success('收藏夹已创建')
      }
    } else {
      const folderId = activeFolderId.value
      if (folderId) {
        await updateFavoriteFolder({
          folderId,
          name,
          description: folderForm.value.description,
          isPublic: folderForm.value.isPublic,
        })
        await refreshFavorites()
        ElMessage.success('收藏夹信息已更新')
      }
    }
    folderDialogVisible.value = false
  } finally {
    folderSubmitting.value = false
  }
}

/** 删除收藏夹（二次确认；删除后由 ensureSelection 归位到默认夹） */
async function removeFolder(folder: { folderId_str?: string | null; name: string }) {
  const folderId = folder.folderId_str ?? ''
  if (!folderId) return
  try {
    await ElMessageBox.confirm(`确定删除收藏夹「${folder.name}」吗？夹内内容不会被删除。`, '删除收藏夹', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  await deleteFavoriteFolder(folderId)
  delete favCountMap.value[folderId]
  favItemsMap.value = {}
  favDynIds.value = []
  // 先清空选中态，refreshFavorites 后的 watch → ensureSelection 会归位到默认夹
  if (activeFolderId.value === folderId) activeFolderId.value = ''
  await refreshFavorites()
  ElMessage.success('收藏夹已删除')
}
</script>
