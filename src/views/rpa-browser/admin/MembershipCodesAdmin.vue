<template>
  <div class="membership-codes-admin flex flex-col flex-1 min-h-0 p-4 gap-4 overflow-auto">
    <!-- ============ 生成兑换码 ============ -->
    <div class="membership-codes-admin__generate flex flex-col gap-3 rounded-xl border border-border-light p-4">
      <span class="membership-codes-admin__generate-title text-base font-semibold text-text-primary">批量生成兑换码</span>

      <div class="membership-codes-admin__generate-form flex flex-wrap items-center gap-3">
        <el-select v-model="form.codeType" class="membership-codes-admin__field-type" placeholder="码类型">
          <el-option label="时长卡（直加余额）" value="duration" />
          <el-option label="月卡（定时任务免扣）" value="month_card" />
        </el-select>
        <el-input-number
          v-model="form.count"
          class="membership-codes-admin__field-count"
          :min="1"
          :max="500"
          placeholder="数量"
        />
        <el-input-number
          v-model="form.maxUses"
          class="membership-codes-admin__field-max-uses"
          :min="1"
          :max="10000"
          placeholder="每码可兑次数"
        />
        <el-input-number
          v-if="form.codeType === 'duration'"
          v-model="form.durationMinutes"
          class="membership-codes-admin__field-duration"
          :min="1"
          :max="1000000"
          placeholder="面值（分钟）"
        />
        <el-input-number
          v-if="form.codeType === 'month_card'"
          v-model="form.cardDays"
          class="membership-codes-admin__field-days"
          :min="1"
          :max="3650"
          placeholder="月卡天数（一个月=31天）"
        />
        <el-date-picker
          v-model="form.expireAt"
          class="membership-codes-admin__field-expire"
          type="datetime"
          placeholder="兑换码有效期（可选）"
          value-format="YYYY-MM-DD HH:mm:ss"
        />
        <el-input
          v-model="form.remark"
          class="membership-codes-admin__field-remark"
          placeholder="备注（可选）"
          clearable
        />
        <el-button
          type="primary"
          class="membership-codes-admin__generate-btn"
          :loading="generating"
          @click="handleGenerate"
        >
          生成
        </el-button>
      </div>
      <span class="membership-codes-admin__generate-hint text-xs text-text-secondary">
        生成动作会写入管理员操作审计日志；兑换码请妥善保管，仅发放给目标用户。
      </span>
    </div>

    <!-- ============ 兑换码列表 ============ -->
    <div class="membership-codes-admin__list flex flex-col gap-3 rounded-xl border border-border-light p-4">
      <div class="membership-codes-admin__list-header flex items-center gap-2 flex-wrap">
        <span class="membership-codes-admin__list-title text-base font-semibold text-text-primary">兑换码列表</span>
        <el-input
          v-model="batchNoFilter"
          class="membership-codes-admin__filter-batch"
          placeholder="按批次号筛选"
          clearable
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        />
        <el-select
          v-model="codeTypeFilter"
          class="membership-codes-admin__filter-type"
          placeholder="码类型"
          clearable
          @change="handleSearch"
        >
          <el-option label="时长卡" value="duration" />
          <el-option label="月卡" value="month_card" />
        </el-select>
        <el-button class="membership-codes-admin__search-btn" @click="handleSearch">查询</el-button>
      </div>

      <div v-if="listLoading" class="membership-codes-admin__list-skeleton w-full">
        <el-skeleton :rows="5" animated />
      </div>
      <el-empty v-else-if="codeItems.length === 0" description="暂无兑换码" />

      <el-table v-else :data="codeItems" class="membership-codes-admin__table w-full" border>
        <el-table-column prop="code" label="兑换码" min-width="180" />
        <el-table-column label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="row.code_type === 'month_card' ? 'warning' : 'success'">
              {{ row.code_type === 'month_card' ? '月卡' : '时长卡' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="面值" min-width="120">
          <template #default="{ row }">
            {{ row.code_type === 'month_card' ? `${row.card_days} 天` : formatSeconds(row.duration_seconds) }}
          </template>
        </el-table-column>
        <el-table-column label="已兑/上限" width="110">
          <template #default="{ row }">{{ row.used_count }} / {{ row.max_uses }}</template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.is_enabled ? 'success' : 'info'">
              {{ row.is_enabled ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="有效期" min-width="160">
          <template #default="{ row }">
            {{ row.expire_at ? formatDateTime(row.expire_at) : '永久' }}
          </template>
        </el-table-column>
        <el-table-column prop="batch_no" label="批次号" min-width="140" />
        <el-table-column label="创建时间" min-width="160">
          <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
        </el-table-column>
      </el-table>

      <PaginationBar
        class="membership-codes-admin__pagination"
        :total="listTotal"
        :page-size="listPageSize"
        :current-page="listPage"
        @update:current-page="handlePageChange"
        @update:page-size="handlePageSizeChange"
      />
    </div>

    <!-- 生成结果弹窗 -->
    <el-dialog
      v-model="resultVisible"
      title="生成成功"
      width="560px"
      class="membership-codes-admin__result-dialog"
      :lock-scroll="false"
    >
      <div class="membership-codes-admin__result flex flex-col gap-3">
        <span class="membership-codes-admin__result-batch text-sm text-text-secondary">
          批次号：{{ lastBatchNo }}（共 {{ lastCodes.length }} 个）
        </span>
        <el-input
          class="membership-codes-admin__result-codes"
          type="textarea"
          :model-value="lastCodes.join('\n')"
          :rows="Math.min(12, Math.max(4, lastCodes.length))"
          readonly
        />
      </div>
      <template #footer>
        <el-button class="membership-codes-admin__result-copy" type="primary" @click="copyCodes">复制全部</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import membershipApi from '@/api/browser/membership_api'
import type { RedemptionCodeItem } from '@/api/browser/membership_api'
import biliMessage from '@/utils/message'
import { formatDateTime } from '@/utils/dateFormat'
import PaginationBar from '@/components/message/PaginationBar.vue'

// ============ 生成 ============
const form = ref({
  codeType: 'duration',
  count: 10,
  maxUses: 1,
  durationMinutes: 60,
  cardDays: 31,
  expireAt: '',
  remark: ''
})
const generating = ref(false)
const resultVisible = ref(false)
const lastBatchNo = ref('')
const lastCodes = ref<string[]>([])

async function handleGenerate() {
  generating.value = true
  try {
    const isMonthCard = form.value.codeType === 'month_card'
    const result = await membershipApi.GenerateCodes({
      code_type: form.value.codeType,
      count: String(form.value.count),
      max_uses: String(form.value.maxUses),
      duration_seconds: isMonthCard ? '0' : String(form.value.durationMinutes * 60),
      card_days: isMonthCard ? String(form.value.cardDays) : '0',
      expire_at: form.value.expireAt || null,
      remark: form.value.remark
    })
    if (result.success && result.data) {
      lastBatchNo.value = result.data.batch_no
      lastCodes.value = result.data.codes
      resultVisible.value = true
      await loadList(1)
    }
  } finally {
    generating.value = false
  }
}

async function copyCodes() {
  try {
    await navigator.clipboard.writeText(lastCodes.value.join('\n'))
    biliMessage.success('已复制到剪贴板')
  } catch {
    biliMessage.error('复制失败，请手动选择复制')
  }
}

// ============ 列表 ============
const codeItems = ref<RedemptionCodeItem[]>([])
const listLoading = ref(false)
const listPage = ref(1)
const listPageSize = ref(20)
const listTotal = ref(0)
const batchNoFilter = ref('')
const codeTypeFilter = ref('')

async function loadList(page = listPage.value) {
  listLoading.value = true
  try {
    const result = await membershipApi.ListCodes(
      page,
      listPageSize.value,
      batchNoFilter.value.trim(),
      codeTypeFilter.value
    )
    if (result.success && result.data) {
      codeItems.value = result.data.items
      listTotal.value = result.data.total
      listPage.value = page
    }
  } finally {
    listLoading.value = false
  }
}

function handleSearch() {
  loadList(1)
}

function handlePageChange(page: number) {
  loadList(page)
}

function handlePageSizeChange(size: number) {
  listPageSize.value = size
  loadList(1)
}

// ============ 工具 ============
function formatSeconds(raw: string | number): string {
  const total = Math.max(0, Math.floor(Number(raw) || 0))
  if (total < 60) return `${total} 秒`
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  if (hours <= 0) return `${minutes} 分钟`
  return minutes > 0 ? `${hours} 小时 ${minutes} 分钟` : `${hours} 小时`
}

onMounted(() => {
  loadList(1)
})
</script>
