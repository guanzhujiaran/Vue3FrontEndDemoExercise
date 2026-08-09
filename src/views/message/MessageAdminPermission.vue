<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search } from '@element-plus/icons-vue'
import { BiliImg } from '@/assets/img/BiliImg.ts'
import {
  listAdminsApiV1MessageAdminListGet,
  grantAdminApiV1MessageAdminGrantPost,
  revokeAdminApiV1MessageAdminRevokePost
} from '@/api/notify/hey-api'
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
const loading = ref(false)
const submitting = ref(false)

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
    ElMessage.error('查找用户失败：' + (e?.message || e))
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
    ElMessage.error('加载更多失败：' + (e?.message || e))
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

async function fetchList() {
  loading.value = true
  try {
    const res = await listAdminsApiV1MessageAdminListGet({
      query: { page_num: page.value, page_size: pageSize.value }
    })
    if (res) {
      const data = res as unknown as MessageAdminListResp
      admins.value = data.items ?? []
      total.value = Number(data.total ?? 0)
    } else {
      ElMessage.error('获取管理员列表失败')
    }
  } catch {
    ElMessage.error('获取管理员列表失败')
  } finally {
    loading.value = false
  }
}

function onPageChange(p: number) {
  page.value = p
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
  const mid = Number(grantForm.mid)
  if (!mid || mid <= 0) {
    ElMessage.warning('请输入有效的用户 Mid')
    return
  }
  submitting.value = true
  try {
    const res = await grantAdminApiV1MessageAdminGrantPost({
      body: {
        mid,
        permissions: grantForm.permissions,
        note: grantForm.note || null
      }
    })
    if (res) {
      ElMessage.success('已授予 / 更新权限')
      grantVisible.value = false
      await fetchList()
    } else {
      ElMessage.error('授予失败')
    }
  } catch {
    ElMessage.error('授予失败')
  } finally {
    submitting.value = false
  }
}

async function onRevoke(row: MessageAdminItem) {
  try {
    await ElMessageBox.confirm(
      `确定撤销 Mid ${row.mid} 的消息管理端权限吗？该操作不可恢复。`,
      '撤销权限',
      { type: 'warning', confirmButtonText: '撤销', cancelButtonText: '取消' }
    )
  } catch {
    return
  }
  submitting.value = true
  try {
    const res = await revokeAdminApiV1MessageAdminRevokePost({ body: { mid: row.mid } })
    if (res) {
      ElMessage.success('已撤销权限')
      await fetchList()
    } else {
      ElMessage.error('撤销失败')
    }
  } catch {
    ElMessage.error('撤销失败')
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
    <div class="message-admin-permission__toolbar flex items-center justify-between bg-msg-card px-4 py-3 rounded-lg">
      <div class="flex flex-col gap-1">
        <el-text class="text-msg-text-active font-medium">消息管理端权限（细粒度授权）</el-text>
        <span class="text-msg-muted text-xs">
          仅 root 可授予 / 撤销。root 专属权限（明文 / 过审判定）会自动从授予列表中剔除。
        </span>
      </div>
      <el-button v-if="isRoot" type="primary" :icon="Plus" @click="openGrant">
        授予权限
      </el-button>
    </div>

    <div class="message-admin-permission__table bg-msg-card rounded-lg p-4" v-loading="loading">
      <el-table
        :data="admins"
        row-key="mid"
        size="large"
        class="message-admin-permission__el-table"
        empty-text="暂无管理员"
      >
        <el-table-column prop="mid" label="用户 Mid" width="150" />
        <el-table-column prop="granted_by" label="授予人 Mid" width="150" />
        <el-table-column label="权限" min-width="260">
          <template #default="{ row }">
            <template v-if="row.permissions && row.permissions.length">
              <el-tag
                v-for="perm in row.permissions"
                :key="perm"
                type="success"
                effect="plain"
                class="message-admin-permission__tag mr-2 mb-1"
              >
                {{ permissionLabel(perm) }}
              </el-tag>
            </template>
            <el-text v-else type="info">无</el-text>
          </template>
        </el-table-column>
        <el-table-column prop="note" label="备注" min-width="160" show-overflow-tooltip />
        <el-table-column prop="created_at" label="创建时间" min-width="180" show-overflow-tooltip />
        <el-table-column label="操作" width="110" align="right">
          <template #default="{ row }">
            <el-button v-if="isRoot" link type="danger" :disabled="submitting" @click="onRevoke(row)">
              撤销
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="message-admin-permission__pager flex justify-end mt-4">
        <el-pagination
          :current-page="page"
          :page-size="pageSize"
          :total="total"
          layout="total, prev, pager, next"
          @current-change="onPageChange"
        />
      </div>
    </div>

    <el-dialog v-model="grantVisible" title="授予消息管理端权限" width="520px" :close-on-click-modal="false">
      <el-form :model="grantForm" label-width="88px" @submit.prevent>
        <div class="user-search mb-2">
          <el-input
            v-model="searchKeyword"
            class="user-search__input"
            placeholder="输入用户名或 mid 查找用户"
            clearable
            :prefix-icon="Search"
            :disabled="submitting"
            @keyup.enter="onSearchUser"
          >
            <template #append>
              <el-button :loading="searching" :disabled="submitting" @click="onSearchUser">查找</el-button>
            </template>
          </el-input>

          <div
            v-if="selectedSearchUser"
            class="user-search__selected mt-2 flex items-center gap-2 rounded-lg bg-msg-main p-2"
          >
            <el-avatar :size="28" :src="selectedSearchUser.avatar || ''" />
            <span class="font-medium text-msg-text-active">{{ selectedSearchUser.user_name || '未命名' }}</span>
            <el-tag class="user-search__level" type="info" effect="plain" disable-transitions>
              Lv.{{ selectedSearchUser.level_info?.current_level ?? 0 }}
            </el-tag>
            <el-tag
              v-if="vipLabel(selectedSearchUser.vip)"
              class="user-search__vip"
              type="danger"
              effect="plain"
              disable-transitions
            >
              {{ vipLabel(selectedSearchUser.vip) }}
            </el-tag>
            <span class="text-sm text-msg-muted">mid: {{ selectedSearchUser.mid }}</span>
            <el-button class="ml-auto" text type="info" @click="clearSelectedUser">清除</el-button>
          </div>

          <ul
            v-if="searchResults.length"
            class="user-search__list mt-2 max-h-60 overflow-auto rounded-lg border border-msg-border bg-msg-card"
            @scroll="onSearchScroll"
          >
            <li
              v-for="u in searchResults"
              :key="u.uid"
              class="user-search__item flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-msg-card-hover"
              @click="onPickUser(u)"
            >
              <el-avatar :size="32" :src="u.avatar || BiliImg.face.noface" />
              <div class="user-search__item-info min-w-0 flex-1">
                <div class="user-search__item-title flex items-center gap-2">
                  <span class="truncate text-msg-text-active">{{ u.user_name || '未命名' }}</span>
                  <el-tag class="user-search__level" type="info" effect="plain" disable-transitions>
                    Lv.{{ u.level_info?.current_level ?? 0 }}
                  </el-tag>
                  <el-tag
                    v-if="vipLabel(u.vip)"
                    class="user-search__vip"
                    type="danger"
                    effect="plain"
                    disable-transitions
                  >
                    {{ vipLabel(u.vip) }}
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
                <div class="user-search__item-sub flex flex-wrap items-center gap-x-3 text-xs text-msg-muted">
                  <span>mid: {{ u.mid }}</span>
                  <span>经验: {{ u.level_info?.current_exp ?? 0 }} / {{ u.level_info?.next_exp ?? '--' }}</span>
                  <span v-if="vipDueDateText(u.vip)">会员到期: {{ vipDueDateText(u.vip) }}</span>
                  <span v-if="u.email">{{ u.email }}</span>
                </div>
              </div>
            </li>
          </ul>

          <div
            v-if="searchResults.length"
            class="user-search__more mt-2 flex items-center justify-center py-1 text-xs text-msg-muted"
          >
            <span v-if="loadingMore">加载中…</span>
            <span v-else-if="!hasMore">没有更多了</span>
          </div>

          <p
            v-if="searched && searchKeyword && !searchResults.length && !searching"
            class="user-search__empty mt-2 text-sm text-msg-muted"
          >
            未找到匹配的用户
          </p>
        </div>

        <el-form-item label="用户 Mid" required>
          <el-input
            v-model="grantForm.mid"
            type="number"
            placeholder="输入被授予权限的用户 Mid"
            :disabled="submitting"
          />
        </el-form-item>
        <el-form-item label="权限">
          <el-checkbox-group v-model="grantForm.permissions" :disabled="submitting">
            <el-checkbox
              v-for="p in GRANTABLE_PERMISSIONS"
              :key="p.value"
              :value="p.value"
              class="message-admin-permission__check block"
            >
              <div class="flex flex-col leading-tight">
                <span class="text-msg-text-active">{{ p.label }}</span>
                <span class="text-msg-muted text-xs">{{ p.desc }}</span>
              </div>
            </el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="grantForm.note"
            type="textarea"
            :rows="3"
            placeholder="可选，记录授权原因"
            :disabled="submitting"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button :disabled="submitting" @click="grantVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="onGrant">确认授予</el-button>
      </template>
    </el-dialog>
  </div>
</template>
