<template>
  <div class="bili-blocklist flex flex-col gap-4">
    <header class="bili-blocklist__header">
      <h2 class="bili-blocklist__title">黑名单管理</h2>
      <p class="bili-blocklist__desc text-text-secondary">
        将用户加入黑名单后，对方无法关注或查看你，且不再出现在你的粉丝列表中。
      </p>
    </header>

    <section class="bili-blocklist__toolbar flex items-center gap-3">
      <el-input
        v-model="newMid"
        class="bili-blocklist__input w-64"
        placeholder="输入要拉黑的用户 mid"
        clearable
        @keyup.enter="onAdd"
      />
      <el-button type="danger" :disabled="!isValidMid" @click="onAdd">
        加入黑名单
      </el-button>
    </section>

    <section class="bili-blocklist__table">
      <el-table v-loading="loading" :data="list" empty-text="暂无被拉黑的用户">
        <el-table-column prop="mid" label="用户 mid" min-width="140" />
        <el-table-column label="拉黑时间" min-width="200">
          <template #default="{ row }">
            {{ formatTime(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" min-width="120">
          <template #default="{ row }">
            <el-button type="danger" plain @click="onRemove(row.mid)">
              解除拉黑
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <footer class="bili-blocklist__pager flex justify-end">
      <el-pagination
        v-model:current-page="pageNum"
        :page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        @current-change="loadList"
      />
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import userApi from '@/api/user/user_api.ts'
import type { FollowListItem } from '@/models/user/blocklist_model.ts'

defineOptions({ name: 'UserCenterBlocklist' })

const loading = ref(false)
const list = ref<FollowListItem[]>([])
const total = ref(0)
const pageNum = ref(1)
const pageSize = ref(20)
const newMid = ref('')

const isValidMid = computed(() => /^\d+$/.test(newMid.value.trim()))

function formatTime(value: string): string {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString('zh-CN', { hour12: false })
}

async function loadList() {
  loading.value = true
  try {
    const res = await userApi.BlocklistList(pageNum.value, pageSize.value)
    if (res.code === 0 && res.data) {
      list.value = res.data.items ?? []
      total.value = res.data.total ?? 0
      pageNum.value = res.data.page_num ?? pageNum.value
      pageSize.value = res.data.page_size ?? pageSize.value
    } else {
      list.value = []
      total.value = 0
    }
  } finally {
    loading.value = false
  }
}

async function onAdd() {
  if (!isValidMid.value) {
    ElMessage.warning('请输入有效的用户 mid（纯数字）')
    return
  }
  const res = await userApi.BlocklistAdd(Number(newMid.value.trim()))
  if (res.code === 0) {
    ElMessage.success('已加入黑名单')
    newMid.value = ''
    await loadList()
  }
}

async function onRemove(mid: number) {
  const res = await userApi.BlocklistRemove(mid)
  if (res.code === 0) {
    ElMessage.success('已解除拉黑')
    await loadList()
  }
}

onMounted(loadList)
</script>
