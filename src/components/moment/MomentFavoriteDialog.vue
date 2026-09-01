<template>
  <el-dialog
    v-model="visible"
    class="moment-favorite-dialog"
    :title="props.bizType && props.bizType !== InteractionBizTypeEnum.DYNAMIC ? '收藏到收藏夹' : '收藏动态'"
    width="420px"
    align-center
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
          class="moment-favorite-dialog__folder-item flex items-center gap-3 p-2.5 rounded-lg border border-border-light hover:border-primary/60 cursor-pointer transition-colors text-left"
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
              <el-tag v-if="folder.isDefault" size="small" type="info" class="ml-1! shrink-0">默认</el-tag>
            </div>
            <div v-if="folder.description" class="text-xs text-text-placeholder truncate">{{ folder.description }}</div>
          </div>
          <!-- 状态 -->
          <el-icon
            :size="18"
            class="moment-favorite-dialog__check shrink-0"
            :class="isFavInFolder(folder.folderId) ? 'text-primary' : 'text-text-placeholder/40'"
          >
            <Select :class="isFavInFolder(folder.folderId) ? '' : 'opacity-0'" />
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
  fetchFavoriteFolders,
  createFavoriteFolder,
  addFavorite,
  removeFavorite,
  fetchDynFavoriteFolders,
} from '@/api/notify/moment-api'
import type {
  FavoriteFolderResp,
  InteractionBizTypeEnum,
} from '@/api/notify/moment-api'
import biliMessage from '@/utils/message'

const props = defineProps<{
  modelValue: boolean
  dynId: string
  bizType?: InteractionBizTypeEnum
  bizId?: string
}>()
const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'changed'): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const folders = ref<FavoriteFolderResp[]>([])
const favFolderIds = ref<Set<string>>(new Set())
const loading = ref(false)
const showCreate = ref(false)
const creating = ref(false)
const createForm = ref({ name: '', description: '', coverUrl: '' })

function isFavInFolder(folderId: string): boolean {
  return favFolderIds.value.has(folderId)
}

function favOptions(): { bizType?: InteractionBizTypeEnum; bizId?: string } {
  // 非动态资源时显式传 bizType/bizId；动态资源走默认（bizType=dynamic）
  if (props.bizType && props.bizType !== InteractionBizTypeEnum.DYNAMIC) {
    return { bizType: props.bizType, bizId: props.bizId ?? props.dynId }
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
  const already = isFavInFolder(folder.folderId)
  const ok = already
    ? await removeFavorite(props.dynId, folder.folderId, favOptions())
    : await addFavorite(props.dynId, folder.folderId, favOptions())
  if (!ok) return // 失败提示已由统一封装按后端响应弹出
  if (already) favFolderIds.value.delete(folder.folderId)
  else favFolderIds.value.add(folder.folderId)
  emit('changed')
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
      const ok = await addFavorite(props.dynId, folder.folderId, favOptions())
      if (ok) {
        favFolderIds.value.add(folder.folderId)
        folders.value.push(folder)
        emit('changed')
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
