<template>
  <div class="crawler-push-switch flex flex-col gap-4">
    <div class="crawler-push-switch__header flex flex-wrap items-start justify-between gap-3">
      <div class="flex flex-col gap-1">
        <el-text class="text-xl font-bold">爬虫推送开关</el-text>
        <el-text class="text-text-regular">
          只控制「开始 / 结束」通知推送，不影响爬虫本身的执行；文件配置优先于环境变量，保存后立即生效、重启后保留。
        </el-text>
      </div>
      <div class="flex items-center gap-2">
        <el-button id="crawler-push-refresh" :loading="loading" @click="fetchState">
          <el-icon><Refresh /></el-icon>
          <span class="ml-1">刷新</span>
        </el-button>
      </div>
    </div>

    <el-empty v-if="!isAdmin" description="只有管理员可以查看与修改爬虫推送开关" />

    <template v-else>
      <el-alert type="info" :closable="false" show-icon title="当前生效来源">
        <template #default>
          <div class="flex flex-col gap-1 text-xs">
            <span>环境变量：开始 = {{ envStart || '（空）' }}，结束 = {{ envEnd || '（空）' }}</span>
            <span>开关文件：{{ stateFile || '（未返回）' }}</span>
            <span>最近保存：{{ formatTime(state.updated_at) }}</span>
          </div>
        </template>
      </el-alert>

      <el-skeleton v-if="loading && !rows.length" :rows="4" animated />

      <el-table
        v-else
        :data="rows"
        row-key="crawler_name"
        class="crawler-push-switch__table"
        empty-text="后端未返回任何爬虫"
      >
        <el-table-column label="爬虫" min-width="260">
          <template #default="{ row }">
            <div class="crawler-push-row flex flex-wrap items-center gap-2">
              <span class="font-mono font-bold">{{ row.crawler_name }}</span>
              <el-tag v-if="row.source === 'file'" type="success">文件配置</el-tag>
              <el-tag v-else type="info">环境变量</el-tag>
              <el-tag v-if="dirty.has(row.crawler_name)" type="warning">待保存</el-tag>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="开始" width="120">
          <template #default="{ row }">
            <el-switch
              :id="`crawler-push-${row.crawler_name}-start`"
              v-model="row.start"
              class="crawler-push-switch__start"
              @change="onToggle(row.crawler_name)"
            />
          </template>
        </el-table-column>

        <el-table-column label="结束" width="120">
          <template #default="{ row }">
            <el-switch
              :id="`crawler-push-${row.crawler_name}-end`"
              v-model="row.end"
              class="crawler-push-switch__end"
              @change="onToggle(row.crawler_name)"
            />
          </template>
        </el-table-column>

        <el-table-column label="当前生效" width="160">
          <template #default="{ row }">
            <span class="text-xs text-text-secondary">
              开始 {{ row.start ? '开' : '关' }} / 结束 {{ row.end ? '开' : '关' }}
            </span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              :loading="resetting === row.crawler_name"
              :disabled="row.source !== 'file'"
              @click="resetToEnv(row.crawler_name)"
            >
              跟随环境变量
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="crawler-push-switch__footer flex flex-wrap items-center gap-3">
        <el-button
          id="crawler-push-save"
          type="primary"
          :loading="saving"
          :disabled="!dirty.size"
          @click="save"
        >
          保存
        </el-button>
        <el-button
          id="crawler-push-reset-all"
          :loading="resettingAll"
          :disabled="!fileItemCount"
          @click="resetAllToEnv"
        >
          全部恢复为环境变量
        </el-button>
        <span class="text-xs text-text-secondary">
          「跟随环境变量」= 删除该爬虫的文件配置，此后按环境变量取值；不改环境变量时默认关闭。
        </span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import crawlerPushApi from '@/api/lottery_data/bili/crawler_push_api'
import type {
  CrawlerPushEffectiveItem,
  CrawlerPushState
} from '@/models/admin/crawler_push_model'
import { useMessageAdminStore } from '@/stores/message_admin'

const adminStore = useMessageAdminStore()
const isAdmin = computed(
  () => Boolean(adminStore.status?.is_admin || adminStore.status?.is_root)
)

/** 表格行：直接复用后端返回的生效状态，本地就地编辑 */
type CrawlerPushRow = CrawlerPushEffectiveItem

const rows = ref<CrawlerPushRow[]>([])
const state = ref<CrawlerPushState>({ items: [], updated_at: null })
const envStart = ref('')
const envEnd = ref('')
const stateFile = ref('')
const dirty = ref<Set<string>>(new Set())

const loading = ref(false)
const saving = ref(false)
const resetting = ref('')
const resettingAll = ref(false)

const fileItemCount = computed(() => state.value.items?.length || 0)

function formatTime(ts: number | null | undefined): string {
  if (!ts) return '—'
  return new Date(ts * 1000).toLocaleString()
}

function onToggle(crawlerName: string) {
  dirty.value.add(crawlerName)
}

async function fetchState() {
  loading.value = true
  try {
    const res = await crawlerPushApi.GetState()
    if (res.code !== 0 || !res.data) {
      ElMessage.error(res.msg || '获取推送开关失败')
      return
    }
    rows.value = (res.data.effective || []).map((item) => ({ ...item }))
    state.value = res.data.state || { items: [], updated_at: null }
    envStart.value = res.data.env_start || ''
    envEnd.value = res.data.env_end || ''
    stateFile.value = res.data.state_file || ''
    dirty.value = new Set()
  } catch {
    ElMessage.error('获取推送开关失败')
  } finally {
    loading.value = false
  }
}

/** 只提交改动过的行：避免把所有爬虫一次性写进文件、让环境变量全部失效 */
async function save() {
  const items = rows.value
    .filter((row) => dirty.value.has(row.crawler_name))
    .map((row) => ({
      crawler_name: row.crawler_name,
      start: row.start,
      end: row.end
    }))
  if (!items.length) return
  saving.value = true
  try {
    const res = await crawlerPushApi.Set({ items })
    if (res.code !== 0) {
      ElMessage.error(res.msg || '保存失败')
      return
    }
    ElMessage.success('已保存，立即生效')
    await fetchState()
  } catch {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

async function resetToEnv(crawlerName: string) {
  resetting.value = crawlerName
  try {
    const res = await crawlerPushApi.Delete(crawlerName)
    if (res.code !== 0) {
      ElMessage.error(res.msg || '恢复失败')
      return
    }
    ElMessage.success('已恢复为环境变量')
    await fetchState()
  } catch {
    ElMessage.error('恢复失败')
  } finally {
    resetting.value = ''
  }
}

async function resetAllToEnv() {
  const names = (state.value.items || []).map((item) => item.crawler_name)
  if (!names.length) return
  resettingAll.value = true
  try {
    for (const name of names) {
      await crawlerPushApi.Delete(name)
    }
    ElMessage.success('已全部恢复为环境变量')
    await fetchState()
  } catch {
    ElMessage.error('恢复失败')
  } finally {
    resettingAll.value = false
  }
}

onMounted(async () => {
  if (!adminStore.loaded) await adminStore.fetchStatus()
  if (isAdmin.value) await fetchState()
})
</script>
