<template>
  <div class="browser-quota-view flex flex-col gap-4">
    <el-empty v-if="!isRoot" description="无权限访问，仅消息管理端 root 可修改浏览器配额" />

    <template v-else>
      <div class="browser-quota-view__header flex flex-wrap items-start justify-between gap-3">
        <div class="browser-quota-view__title-box space-y-1">
          <h2 class="browser-quota-view__title m-0 text-lg font-semibold text-text-primary">浏览器配额</h2>
          <p class="browser-quota-view__desc m-0 text-sm text-text-secondary">
            按用户等级设置可创建的浏览器指纹数量上限；保存后写入配置文件并<strong>立即生效</strong>（无需重启）。
          </p>
        </div>
        <div class="browser-quota-view__actions flex flex-wrap items-center gap-3">
          <el-button :disabled="loading || saving" @click="load">刷新</el-button>
          <el-button :disabled="loading || saving || !dirty" @click="resetDraft">撤销修改</el-button>
          <el-button type="primary" :loading="saving" :disabled="loading || !dirty" @click="save">
            保存
          </el-button>
          <el-button
            class="browser-quota-view__reset-btn"
            type="danger"
            plain
            :disabled="loading || saving"
            @click="resetAll"
          >
            恢复默认
          </el-button>
        </div>
      </div>

      <el-alert
        v-if="configFile"
        class="browser-quota-view__file-alert"
        :title="`配置文件：${configFile}`"
        type="info"
        :closable="false"
        show-icon
      />

      <el-alert
        class="browser-quota-view__tip-alert"
        title="超出上限后，该等级用户创建 / 更新浏览器指纹会被拒绝（业务码 2008）。0 表示该等级不允许创建；root 档不受等级限制。"
        type="warning"
        :closable="false"
        show-icon
      />

      <LoadingWrap :loading="loading" :rows="6">
        <el-table
          class="browser-quota-view__table"
          :data="rows"
          row-key="level_name"
          border
          stripe
        >
          <el-table-column label="等级" min-width="140">
            <template #default="{ row }">
              <span class="browser-quota-view__level-name font-medium text-text-primary">
                {{ row.level_name }}
              </span>
            </template>
          </el-table-column>

          <el-table-column label="等级值" width="110">
            <template #default="{ row }">
              <span class="browser-quota-view__level-value text-text-secondary">{{ row.level_value }}</span>
            </template>
          </el-table-column>

          <el-table-column label="功能权限位（只读）" min-width="200">
            <template #default="{ row }">
              <span class="browser-quota-view__perm-text text-text-secondary">
                {{ permissionText(row as PermissionLevelConfig) }}
              </span>
            </template>
          </el-table-column>

          <el-table-column label="最大指纹数量" width="220">
            <template #default="{ row }">
              <el-input-number
                v-model="draft[row.level_name]"
                class="browser-quota-view__quota-input"
                :min="0"
                :step="1"
                :precision="0"
                controls-position="right"
              />
            </template>
          </el-table-column>

          <el-table-column label="说明" min-width="220">
            <template #default="{ row }">
              <span class="browser-quota-view__hint text-text-placeholder">{{
                quotaText(row as PermissionLevelConfig)
              }}</span>
            </template>
          </el-table-column>
        </el-table>
      </LoadingWrap>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessageBox } from 'element-plus'
import { useMessageAdminStore } from '@/stores/message_admin'
import PermissionApi from '@/api/browser/permission_api'
import type {
  PermissionLevelConfig,
  PermissionLevelQuotaUpdate,
  PermissionQuotaResp
} from '@/api/browser/hey-api'
import biliMessage from '@/utils/message'
import LoadingWrap from '@/components/message/LoadingWrap.vue'

/** root 档位的「不受限制」阈值（与后端 PermissionConfigService.DEFAULT_CONFIG 一致） */
const ROOT_UNLIMITED_FINGERPRINTS = 999999

/** 生成类型里 max_fingerprints 为可选（后端带默认值），统一按 0 兜底参与比较与展示 */
function quotaOf(level: PermissionLevelConfig): number {
  return level.max_fingerprints ?? 0
}

const adminStore = useMessageAdminStore()

/** 仅消息管理端 root 可见可改（后端 require_root 强制校验） */
const isRoot = computed(() => Boolean(adminStore.status.is_root))

const loading = ref(false)
const saving = ref(false)
/** 服务端现值（保存 / 撤销的基准） */
const rows = ref<PermissionLevelConfig[]>([])
/** 配置文件实际读写路径（后端返回，便于运维定位） */
const configFile = ref('')
/** 编辑中的配额：level_name -> max_fingerprints */
const draft = ref<Record<string, number>>({})

/** 是否有未保存的改动 */
const dirty = computed(() =>
  rows.value.some((row) => draft.value[row.level_name] !== quotaOf(row))
)

/** 把服务端响应同步为「现值 + 草稿」 */
function applyResp(resp: PermissionQuotaResp) {
  rows.value = resp.levels
  configFile.value = resp.config_file
  draft.value = Object.fromEntries(
    resp.levels.map((level) => [level.level_name, quotaOf(level)])
  )
}

async function load() {
  loading.value = true
  const res = await PermissionApi.Levels()
  loading.value = false
  if (res.success && res.data) applyResp(res.data)
}

/** 撤销未保存的修改，回到服务端现值 */
function resetDraft() {
  draft.value = Object.fromEntries(
    rows.value.map((row) => [row.level_name, quotaOf(row)])
  )
}

/** 只提交被改动的等级；后端按 level_name 合并写回 */
async function save() {
  const changed: PermissionLevelQuotaUpdate[] = []
  for (const row of rows.value) {
    const value = draft.value[row.level_name]
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      biliMessage.error(`「${row.level_name}」的最大指纹数量必须是不小于 0 的整数`)
      return
    }
    const normalized = Math.trunc(value)
    if (normalized !== quotaOf(row)) {
      changed.push({ level_name: row.level_name, max_fingerprints: normalized })
    }
  }
  if (!changed.length) {
    biliMessage.info('没有需要保存的修改')
    return
  }
  saving.value = true
  const res = await PermissionApi.Update({ levels: changed })
  saving.value = false
  if (res.success && res.data) applyResp(res.data)
}

/** 恢复为后端代码内默认配额（破坏性操作，需二次确认；成功后以服务端返回刷新） */
async function resetAll() {
  try {
    await ElMessageBox.confirm(
      '将把各等级的最大指纹数量恢复为代码内置的默认值，并立即写回配置文件（未保存的修改会一并丢弃）。确定继续吗？',
      '恢复默认配额',
      {
        confirmButtonText: '恢复默认',
        cancelButtonText: '取消',
        type: 'warning',
        lockScroll: false
      }
    )
  } catch {
    return
  }
  saving.value = true
  const res = await PermissionApi.Reset()
  saving.value = false
  if (res.success && res.data) applyResp(res.data)
}

/** 功能权限位只读展示文本 */
function permissionText(row: PermissionLevelConfig): string {
  if (row.level_name === 'root') return '不受限制'
  return row.permissions.length ? row.permissions.join(' / ') : '无'
}

/** 每一行的人类可读说明 */
function quotaText(row: PermissionLevelConfig): string {
  const value = draft.value[row.level_name]
  if (row.level_name === 'root') return 'root 恒不受等级限制（仅作兜底展示）'
  if (value === 0) return '不允许创建浏览器指纹'
  if (value === undefined) return '-'
  if (value >= ROOT_UNLIMITED_FINGERPRINTS) return '视作不受限制'
  return `最多可保存 ${value} 个浏览器指纹`
}

onMounted(async () => {
  await adminStore.fetchStatus()
  if (isRoot.value) await load()
})
</script>
