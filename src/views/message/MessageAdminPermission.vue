<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type Column } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { Plus, Search, Refresh } from '@element-plus/icons-vue'
import { BiliImg } from '@/assets/img/BiliImg.ts'
import LoadingWrap from '@/components/message/LoadingWrap.vue'
import EmptyState from '@/components/message/EmptyState.vue'
import BiliError from '@/components/CommonCompo/Bili-Feedback-Compo/BiliError.vue'
import PaginationBar from '@/components/message/PaginationBar.vue'

const { t } = useI18n()
import { MessageAdminService } from '@/api/community/hey-api'
import { useMessageAdminStore } from '@/stores/message_admin'
import {
  type MessageAdminItem,
  type MessageAdminListResp,
  GRANTABLE_PERMISSIONS,
  permissionLabel,
  searchPptrUser,
  vipLabel,
  vipDueDateText,
  type PptrUserSearchItem
} from './messageAdmin'

const adminStore = useMessageAdminStore()

const admins = ref<MessageAdminItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const pageSizes = [10, 20, 50, 100]
const loading = ref(false)
const isError = ref(false)
const submitting = ref(false)

// el-table-v2 列定义（与 CommentAdminView 保持同构；权限列自动分配剩余宽度，操作列固定右侧）
const permColumns: Column<MessageAdminItem>[] = [
  { key: 'mid', title: t('message.colMid'), width: 150, dataKey: 'mid' },
  { key: 'granted_by', title: t('message.colGrantedBy'), width: 150, dataKey: 'granted_by' },
  { key: 'permissions', title: t('message.permLabel'), width: 320, minWidth: 260, flexGrow: 1 },
  { key: 'note', title: t('message.colNote'), width: 200, minWidth: 160, dataKey: 'note' },
  { key: 'created_at', title: t('message.colCreatedAt'), width: 200, minWidth: 180, dataKey: 'created_at' },
  { key: 'action', title: t('message.colAction'), width: 110, fixed: 'right' }
]

const searchKeyword = ref('')
const searchResults = ref<PptrUserSearchItem[]>([])
const searching = ref(false)
const loadingMore = ref(false)
const searched = ref(false)
const hasMore = ref(false)
const searchOffset = ref(0)
const selectedSearchUser = ref<PptrUserSearchItem | null>(null)

const SEARCH_PAGE_SIZE = 20

async function onSearchUser() {
  const kw = searchKeyword.value.trim()
  if (!kw) return
  searching.value = true
  searched.value = true
  searchOffset.value = 0
  hasMore.value = true
  selectedSearchUser.value = null
  try {
    const { items, has_more } = await searchPptrUser(kw, 0, SEARCH_PAGE_SIZE)
    searchResults.value = items
    searchOffset.value = items.length
    hasMore.value = has_more
  } catch (e: any) {
    ElMessage.error(t('message.findUserFailed') + (e?.message || e))
    searchResults.value = []
    hasMore.value = false
  } finally {
    searching.value = false
  }
}

async function loadMoreUsers() {
  const kw = searchKeyword.value.trim()
  if (!kw || loadingMore.value || !hasMore.value) return
  loadingMore.value = true
  try {
    const { items, has_more } = await searchPptrUser(kw, searchOffset.value, SEARCH_PAGE_SIZE)
    searchResults.value.push(...items)
    searchOffset.value += items.length
    hasMore.value = has_more
  } catch (e: any) {
    ElMessage.error(t('message.loadMoreFailed') + (e?.message || e))
  } finally {
    loadingMore.value = false
  }
}

function onSearchScroll(e: Event) {
  const target = e.target as HTMLElement
  const { scrollTop, scrollHeight, clientHeight } = target
  if (scrollHeight - scrollTop - clientHeight < 60 && hasMore.value && !loadingMore.value) {
    loadMoreUsers()
  }
}

function onPickUser(u: PptrUserSearchItem) {
  grantForm.mid = u.mid ? String(u.mid) : ''
  selectedSearchUser.value = u
  searchResults.value = []
}

function clearSelectedUser() {
  selectedSearchUser.value = null
}

const isRoot = computed(() => adminStore.status.is_root)

const grantVisible = ref(false)
const grantForm = reactive<{ mid: string; permissions: string[]; note: string }>({
  mid: '',
  permissions: [],
  note: ''
})

// 表格高度自适应：数据不满一屏时收缩到内容实际高度，底部滚动条紧跟最后一行数据
const TABLE_HEADER_H = 44
const TABLE_ROW_H = 56
const TABLE_FOOTER_H = 64
function fitTableHeight(avail: number): number {
  const footerH = total.value > pageSize.value ? TABLE_FOOTER_H : 0
  const contentH = TABLE_HEADER_H + admins.value.length * TABLE_ROW_H + footerH
  return Math.min(avail, Math.max(contentH, TABLE_HEADER_H + TABLE_ROW_H + footerH))
}

async function fetchList() {
  loading.value = true
  try {
    const res = await MessageAdminService.listAdminsApiV1MessageAdminListGet({
      query: { page_num: page.value, page_size: pageSize.value }
    })
    if (res) {
      const data = res as unknown as MessageAdminListResp
      admins.value = data.items ?? []
      total.value = Number(data.total ?? 0)
      isError.value = false
    } else {
      // 后端返回空响应：等同加载失败，交给 <BiliError> 特殊展示
      isError.value = true
    }
  } catch {
    // 后端接口报错：交给 <BiliError> 做特殊展示，点击重试重新拉取
    isError.value = true
  } finally {
    loading.value = false
  }
}

function onPageChange(p: number) {
  page.value = p
  fetchList()
}

function onPageSizeChange(size: number) {
  pageSize.value = size
  page.value = 1
  fetchList()
}

function openGrant() {
  grantForm.mid = ''
  grantForm.permissions = []
  grantForm.note = ''
  searchKeyword.value = ''
  searchResults.value = []
  searching.value = false
  loadingMore.value = false
  searched.value = false
  hasMore.value = false
  searchOffset.value = 0
  selectedSearchUser.value = null
  grantVisible.value = true
}

async function onGrant() {
  const mid = grantForm.mid
  if (!mid || mid <= 0) {
    ElMessage.warning(t('message.invalidMid'))
    return
  }
  submitting.value = true
  try {
    const res = await MessageAdminService.grantAdminApiV1MessageAdminGrantPost({
      body: {
        mid,
        permissions: grantForm.permissions,
        note: grantForm.note || null
      }
    })
    if (res) {
      ElMessage.success(t('message.grantSuccess'))
      grantVisible.value = false
      await fetchList()
    } else {
      ElMessage.error(t('message.grantFailed'))
    }
  } catch {
    ElMessage.error(t('message.grantFailed'))
  } finally {
    submitting.value = false
  }
}

async function onRevoke(row: MessageAdminItem) {
  try {
    await ElMessageBox.confirm(
      t('message.revokeConfirm', { mid: row.mid }),
      t('message.revokeConfirmTitle'),
      { type: 'warning', confirmButtonText: t('message.revokePermission'), cancelButtonText: t('message.cancel') }
    )
  } catch {
    return
  }
  submitting.value = true
  try {
    const res = await MessageAdminService.revokeAdminApiV1MessageAdminRevokePost({ body: { mid: row.mid } })
    if (res) {
      ElMessage.success(t('message.revokeSuccess'))
      await fetchList()
    } else {
      ElMessage.error(t('message.revokeFailed'))
    }
  } catch {
    ElMessage.error(t('message.revokeFailed'))
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  if (!adminStore.loaded) {
    adminStore.fetchStatus()
  }
  fetchList()
})
</script>

<template>
  <div class="message-admin-permission flex flex-col gap-4">
    <div class="message-admin-permission__toolbar flex items-center justify-between bg-bg-overlay px-4 py-3 rounded-lg">
      <div class="flex flex-col gap-1">
        <el-text class="text-text-primary font-medium">{{ t('message.permTitle') }}</el-text>
        <span class="text-text-placeholder text-xs">
          {{ t('message.permSubtitle') }}
        </span>
      </div>
      <el-button v-if="isRoot" type="primary" :icon="Plus" @click="openGrant">
        {{ t('message.grantPermission') }}
      </el-button>
    </div>

    <div class="message-admin-permission__table-bar mb-2 flex items-center justify-end">
      <el-button
        class="message-admin-permission__refresh-btn"
        size="default"
        :icon="Refresh"
        :loading="loading"
        @click="fetchList"
      >
        {{ t('message.refresh') }}
      </el-button>
    </div>

    <BiliError v-if="isError" :txt="t('message.listLoadFailed')" @click-retry="fetchList" />
    <LoadingWrap v-else :loading="loading" :rows="6">
      <EmptyState v-if="admins.length === 0" :text="t('message.emptyAdmin')" />
      <!-- 父容器固定高度，由 AutoResizer 自动测量并传给表格 width/height；滚动条落在表格内部，不依赖外侧布局滚动 -->
      <div v-else class="message-admin-permission__table h-[calc(100vh-320px)] min-h-105">
        <el-auto-resizer>
          <template #default="{ height, width }">
            <el-table-v2
              :columns="permColumns"
              :data="admins"
              :width="width"
              :height="height"
              :row-height="56"
              :header-height="44"
              :footer-height="total > pageSize ? 64 : 0"
              row-key="mid"
              fixed
            >
              <template #header-cell="{ column }">
                <span class="message-admin-permission__th">{{ column.title }}</span>
              </template>

              <template #cell="{ column, rowData }">
                <!-- 权限标签 -->
                <template v-if="column.key === 'permissions'">
                  <template v-if="rowData.permissions && rowData.permissions.length">
                    <el-tag
                      v-for="perm in rowData.permissions"
                      :key="perm"
                      type="success"
                      effect="plain"
                      class="message-admin-permission__tag mr-2 mb-1"
                    >
                      {{ t(permissionLabel(perm)) }}
                    </el-tag>
                  </template>
                  <el-text v-else type="info">{{ t('message.none') }}</el-text>
                </template>

                <!-- 操作 -->
                <template v-else-if="column.key === 'action'">
                  <el-button v-if="isRoot" link type="danger" :disabled="submitting" @click="onRevoke(rowData)">
                    {{ t('message.revokePermission') }}
                  </el-button>
                </template>

                <!-- 其余简单列（mid / granted_by / note / created_at） -->
                <template v-else>
                  <span class="text-sm text-text-primary">
                    {{ column.dataKey ? rowData[column.dataKey as keyof MessageAdminItem] : '-' }}
                  </span>
                </template>
              </template>

              <template #empty>
                <div class="flex h-full items-center justify-center">
                  <el-empty :description="t('message.emptyAdmin')" :image-size="80" />
                </div>
              </template>

              <template #footer>
                <PaginationBar
                  class="message-admin-permission__pagination"
                  :total="total"
                  :page-size="pageSize"
                  :page-sizes="pageSizes"
                  :current-page="page"
                  @update:current-page="onPageChange"
                  @update:page-size="onPageSizeChange"
                />
              </template>
            </el-table-v2>
          </template>
        </el-auto-resizer>
      </div>
    </LoadingWrap>

    <el-dialog v-model="grantVisible" :title="t('message.grantDialogTitle')" width="520px" :close-on-click-modal="false">
      <el-form :model="grantForm" label-width="88px" @submit.prevent>
        <div class="user-search mb-2">
          <el-input
            v-model="searchKeyword"
            class="user-search__input"
            :placeholder="t('message.searchPlaceholder')"
            clearable
            :prefix-icon="Search"
            :disabled="submitting"
            @keyup.enter="onSearchUser"
          >
            <template #append>
              <el-button :loading="searching" :disabled="submitting" @click="onSearchUser">{{ t('message.searchBtn') }}</el-button>
            </template>
          </el-input>

          <div
            v-if="selectedSearchUser"
            class="user-search__selected mt-2 flex items-center gap-2 rounded-lg bg-bg-page p-2"
          >
            <el-avatar :size="28" :src="selectedSearchUser.avatar || BiliImg.face.noface" referrerpolicy="no-referrer" />
            <span class="font-medium text-text-primary">{{ selectedSearchUser.user_name || t('message.unnamed') }}</span>
            <el-tag class="user-search__level" type="info" effect="plain" disable-transitions>
              Lv.{{ selectedSearchUser.level_info?.current_level ?? 0 }}
            </el-tag>
            <el-tag
              v-if="t(vipLabel(selectedSearchUser.vip))"
              class="user-search__vip"
              type="danger"
              effect="plain"
              disable-transitions
            >
              {{ t(vipLabel(selectedSearchUser.vip)) }}
            </el-tag>
            <span class="text-sm text-text-placeholder">mid: {{ selectedSearchUser.mid }}</span>
            <el-button class="ml-auto" text type="info" @click="clearSelectedUser">{{ t('message.clearUser') }}</el-button>
          </div>

          <ul
            v-if="searchResults.length"
            class="user-search__list mt-2 max-h-60 overflow-auto rounded-lg border border-border-light bg-bg-overlay"
            @scroll="onSearchScroll"
          >
            <li
              v-for="u in searchResults"
              :key="u.uid"
              class="user-search__item flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-fill-light"
              @click="onPickUser(u)"
            >
              <el-avatar :size="32" :src="u.avatar || BiliImg.face.noface" referrerpolicy="no-referrer" />
              <div class="user-search__item-info min-w-0 flex-1">
                <div class="user-search__item-title flex items-center gap-2">
                  <span class="truncate text-text-primary">{{ u.user_name || t('message.unnamed') }}</span>
                  <el-tag class="user-search__level" type="info" effect="plain" disable-transitions>
                    Lv.{{ u.level_info?.current_level ?? 0 }}
                  </el-tag>
                  <el-tag
                    v-if="t(vipLabel(u.vip))"
                    class="user-search__vip"
                    type="danger"
                    effect="plain"
                    disable-transitions
                  >
                    {{ t(vipLabel(u.vip)) }}
                  </el-tag>
                  <el-tag
                    v-if="u.role_info?.role_name"
                    class="user-search__role"
                    type="warning"
                    effect="plain"
                    disable-transitions
                  >
                    {{ u.role_info.role_name }}
                  </el-tag>
                </div>
                <div class="user-search__item-sub flex flex-wrap items-center gap-x-3 text-xs text-text-placeholder">
                  <span>mid: {{ u.mid }}</span>
                  <span>{{ t('message.expLabel') }}: {{ u.level_info?.current_exp ?? 0 }} / {{ u.level_info?.next_exp ?? '--' }}</span>
                  <span v-if="vipDueDateText(u.vip)">{{ t('message.ucVipExpire') }}{{ vipDueDateText(u.vip) }}</span>
                  <span v-if="u.email">{{ u.email }}</span>
                </div>
              </div>
            </li>
          </ul>

          <div
            v-if="searchResults.length"
            class="user-search__more mt-2 flex items-center justify-center py-1 text-xs text-text-placeholder"
          >
            <span v-if="loadingMore">{{ t('message.loadingMore') }}</span>
            <span v-else-if="!hasMore">{{ t('message.noMore') }}</span>
          </div>

          <p
            v-if="searched && searchKeyword && !searchResults.length && !searching"
            class="user-search__empty mt-2 text-sm text-text-placeholder"
          >
            {{ t('message.noMatchUser') }}
          </p>
        </div>

        <el-form-item :label="t('message.userMidLabel')" required>
          <el-input
            v-model="grantForm.mid"
            type="number"
            :placeholder="t('message.userMidPlaceholder')"
            :disabled="submitting"
          />
        </el-form-item>
        <el-form-item :label="t('message.permLabel')">
          <el-checkbox-group v-model="grantForm.permissions" :disabled="submitting">
            <el-checkbox
              v-for="p in GRANTABLE_PERMISSIONS"
              :key="p.value"
              :value="p.value"
              class="message-admin-permission__check block"
            >
              <div class="flex flex-col leading-tight">
                <span class="text-text-primary">{{ t(p.label) }}</span>
                <span class="text-text-placeholder text-xs">{{ t(p.desc) }}</span>
              </div>
            </el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item :label="t('message.noteLabel')">
          <el-input
            v-model="grantForm.note"
            type="textarea"
            :rows="3"
            :placeholder="t('message.notePlaceholder')"
            :disabled="submitting"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button :disabled="submitting" @click="grantVisible = false">{{ t('message.cancel') }}</el-button>
        <el-button type="primary" :loading="submitting" @click="onGrant">{{ t('message.confirmGrant') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>
