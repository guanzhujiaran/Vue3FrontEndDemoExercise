<template>
  <el-dialog
    v-model="visible"
    class="moment-favorite-dialog"
    :title="bizTypeNum !== InteractionBizTypeEnum.DYNAMIC ? '收藏到收藏夹' : '收藏动态'"
    width="420px"
    align-center
    :lock-scroll="false"
  >
    <div class="moment-favorite-dialog__body">
      <!-- 收藏夹列表 -->
      <div
        v-loading="loading"
        class="moment-favorite-dialog__folders flex flex-col gap-1 max-h-[50vh] overflow-y-auto"
      >
        <button
          v-for="folder in folders"
          :key="folder.folderId"
          class="moment-favorite-dialog__folder-item flex items-center gap-3 p-2.5 rounded-lg border border-border-light hover:border-primary/60 cursor-pointer transition-colors text-left disabled:cursor-not-allowed disabled:opacity-70"
          :disabled="togglingFolderId !== ''"
          @click="toggleFolder(folder)"
        >
          <!-- 封面（无封面 / 封面审核未通过时展示默认图片兜底） -->
          <div
            class="moment-favorite-dialog__cover shrink-0 w-12 h-12 rounded-lg bg-bg-page flex items-center justify-center overflow-hidden"
          >
            <img
              class="w-full h-full object-cover"
              :src="folder.coverUrl || DEFAULT_FOLDER_COVER"
              :alt="folder.name"
            />
          </div>
          <!-- 信息 -->
          <div class="moment-favorite-dialog__info flex-1 min-w-0">
            <div class="moment-favorite-dialog__name flex items-center gap-1">
              <span class="text-sm font-medium truncate">{{ folder.name }}</span>
              <el-tag v-if="folder.isDefault" type="info" class="ml-1! shrink-0">默认</el-tag>
              <!-- 收藏夹可见性（2026-10-08 逐夹 is_public）：公开 / 隐藏 -->
              <el-tag
                class="moment-favorite-dialog__visibility shrink-0"
                :type="folder.isPublic ? 'success' : 'info'"
                effect="plain"
              >{{ folder.isPublic ? '公开' : '隐藏' }}</el-tag>
            </div>
            <div v-if="folder.description" class="text-xs text-text-placeholder truncate">{{ folder.description }}</div>
          </div>
          <!-- 状态 -->
          <el-icon
            :size="18"
            class="moment-favorite-dialog__check shrink-0"
            :class="isFavInFolder(folder.folderId_str ?? '') ? 'text-primary' : 'text-text-placeholder/40'"
          >
            <Select :class="isFavInFolder(folder.folderId_str ?? '') ? '' : 'opacity-0'" />
          </el-icon>
        </button>

        <el-empty
          v-if="!loading && folders.length === 0"
          description="还没有收藏夹，先创建一个吧"
          :image-size="60"
        />
      </div>

      <!-- 新建收藏夹 -->
      <el-collapse-transition>
        <div v-if="showCreate" class="moment-favorite-dialog__create mt-3 pt-3 border-t border-border-light flex flex-col gap-2">
          <el-input
            v-model="createForm.name"
            class="moment-favorite-dialog__create-name"
            placeholder="收藏夹名称"
            maxlength="100"
            clearable
          />
          <el-input
            v-model="createForm.description"
            class="moment-favorite-dialog__create-desc"
            placeholder="描述（选填）"
            maxlength="500"
            clearable
          />
          <el-input
            v-model="createForm.coverUrl"
            class="moment-favorite-dialog__create-cover"
            placeholder="封面图片链接（选填，仅存链接）"
            maxlength="1000"
            clearable
          />
          <div class="flex justify-end gap-2">
            <el-button class="moment-favorite-dialog__create-cancel" size="default" @click="showCreate = false">取消</el-button>
            <el-button
              class="moment-favorite-dialog__create-submit"
              type="primary"
              size="default"
              :loading="creating"
              :disabled="!createForm.name.trim()"
              @click="handleCreate"
            >
              创建并收藏
            </el-button>
          </div>
        </div>
      </el-collapse-transition>

      <div v-if="!showCreate" class="moment-favorite-dialog__create-entry mt-3 pt-3 border-t border-border-light">
        <el-button
          class="moment-favorite-dialog__create-entry-btn"
          size="default"
          text
          @click="showCreate = true"
        >
          <el-icon class="mr-1"><Plus /></el-icon>新建收藏夹
        </el-button>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Select, Plus } from '@element-plus/icons-vue'

// 收藏夹默认封面：封面为空 / 封面审核未通过时前端兜底展示的默认图片
const DEFAULT_FOLDER_COVER =
  'https://i0.hdslb.com/bfs/vc/b8eb9637fec90527a6dc9737acdc3577e275c7b5.png'
import {
  InteractionBizTypeEnum,
  fetchFavoriteFolders,
  createFavoriteFolder,
  addFavorite,
  removeFavorite,
  fetchDynFavoriteFolders,
} from '@/api/notify/moment-api'
import type { FavoriteFolderResp } from '@/api/notify/moment-api'
import type { FavoriteChangedPayload } from '@/utils/interaction/favoriteSync'
import { toFavoriteChanged } from '@/utils/interaction/favoriteSync'
import biliMessage from '@/utils/message'

const props = defineProps<{
  modelValue: boolean
  dynId: string
  /** 支持数字枚举或字符串（如 "rpa_workflow"），统一归一为数字枚举 */
  bizType?: InteractionBizTypeEnum | string
  bizId?: string
}>()
const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  /** 收藏态变化：上抛最新收藏夹集合与收藏数，父组件据此同步按钮态（不再整页重查） */
  (e: 'changed', payload: FavoriteChangedPayload): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

/** bizType 归一为数字枚举（后端契约用数字）；无 bizType 时回退动态 DYNAMIC=1 */
function toBizTypeNum(v: InteractionBizTypeEnum | string | undefined): InteractionBizTypeEnum {
  if (v == null) return InteractionBizTypeEnum.DYNAMIC
  if (typeof v === 'number') return v
  const num = InteractionBizTypeEnum[
    String(v).toUpperCase() as keyof typeof InteractionBizTypeEnum
  ]
  return typeof num === 'number' ? (num as InteractionBizTypeEnum) : InteractionBizTypeEnum.DYNAMIC
}

const bizTypeNum = computed(() => toBizTypeNum(props.bizType))

const folders = ref<FavoriteFolderResp[]>([])
const loading = ref(false)
/** 正在提交变更的收藏夹 id（串行化收藏/取消收藏请求，空串表示无请求在途） */
const togglingFolderId = ref('')
const showCreate = ref(false)
const creating = ref(false)
const createForm = ref({ name: '', description: '', coverUrl: '' })

/** 已收藏该资源的收藏夹 id 集合（整体替换而非原地增删，保证响应式可追踪） */
const favFolderIds = ref<Set<string>>(new Set())

function isFavInFolder(folderId: string): boolean {
  return favFolderIds.value.has(folderId)
}

/**
 * 写入最新收藏夹集合并上抛同步载荷。
 * 用新 Set 整体替换，避免 Set 原地增删在部分场景下被依赖引用相等判断的逻辑漏掉。
 */
function commitFavoriteSet(folderIds: string[], favoriteCount?: number) {
  const payload = toFavoriteChanged(folderIds, favoriteCount)
  favFolderIds.value = new Set(payload.folderIds)
  emit('changed', payload)
}

function favOptions(): { bizType?: InteractionBizTypeEnum; bizId?: string } {
  // 非动态资源时显式传归一后的数字 bizType/bizId；动态资源走默认（bizType=dynamic）
  if (bizTypeNum.value !== InteractionBizTypeEnum.DYNAMIC) {
    return { bizType: bizTypeNum.value, bizId: props.bizId ?? props.dynId }
  }
  return {}
}

async function load() {
  loading.value = true
  try {
    const [folderList, dynFav] = await Promise.all([
      fetchFavoriteFolders(),
      fetchDynFavoriteFolders(props.dynId, favOptions()),
    ])
    folders.value = folderList
    favFolderIds.value = new Set(dynFav?.folderIds ?? [])
  } catch {
    folders.value = []
    favFolderIds.value = new Set()
  } finally {
    loading.value = false
  }
}

async function toggleFolder(folder: FavoriteFolderResp) {
  const folderId = folder.folderId_str ?? ''
  if (togglingFolderId.value) return // 串行化：避免并发点击导致夹内状态与实际不一致
  const already = isFavInFolder(folderId)
  togglingFolderId.value = folderId
  try {
    const resp = already
      ? await removeFavorite(props.dynId, folderId, favOptions())
      : await addFavorite(props.dynId, folderId, favOptions())
    if (!resp) return // 失败提示已由统一封装按后端响应弹出
    const next = already
      ? [...favFolderIds.value].filter((id) => id !== folderId)
      : [...favFolderIds.value, folderId]
    commitFavoriteSet(next, resp.favoriteCount)
  } finally {
    togglingFolderId.value = ''
  }
}

async function handleCreate() {
  if (!createForm.value.name.trim()) return
  creating.value = true
  try {
    const folder = await createFavoriteFolder({
      name: createForm.value.name.trim(),
      description: createForm.value.description || undefined,
      coverUrl: createForm.value.coverUrl || undefined,
    })
    if (folder) {
      const resp = await addFavorite(props.dynId, folder.folderId_str ?? '', favOptions())
      if (resp) {
        folders.value.push(folder)
        commitFavoriteSet(
          [...favFolderIds.value, folder.folderId_str ?? ''],
          resp.favoriteCount
        )
        biliMessage.success('已收藏')
        showCreate.value = false
        createForm.value = { name: '', description: '', coverUrl: '' }
      }
    }
  } finally {
    creating.value = false
  }
}

watch(
  () => props.modelValue,
  (v) => {
    if (v) {
      showCreate.value = false
      createForm.value = { name: '', description: '', coverUrl: '' }
      load()
    }
  }
)
</script>
