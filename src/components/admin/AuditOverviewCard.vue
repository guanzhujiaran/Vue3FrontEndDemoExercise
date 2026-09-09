<template>
  <el-card class="audit-overview-card" shadow="never" :body-style="{ padding: '16px' }">
    <template #header>
      <div class="flex items-center justify-between">
        <span class="font-bold">审核总览</span>
        <span class="text-sm text-text-secondary">{{ totalLabel }}：{{ statistics?.total ?? 0 }}</span>
      </div>
    </template>
    <div class="flex flex-wrap gap-3 mb-3">
      <el-tag
        v-for="(count, key) in statistics?.byStatus ?? {}"
        :key="key"
        :type="statusTagType(String(key))"
        effect="light"
      >
        {{ statusLabels[key] ?? key }} {{ count }}
      </el-tag>
      <el-tag v-if="!statistics?.byStatus || Object.keys(statistics.byStatus).length === 0" type="info" effect="light">
        暂无数据
      </el-tag>
    </div>
    <el-table v-if="typeColumns.length" :data="statistics?.byType ?? []" size="small" border>
      <el-table-column prop="type" :label="typeLabel" width="140" />
      <el-table-column
        v-for="key in typeColumns"
        :key="key"
        :prop="key"
        :label="statusLabels[key] ?? key"
      />
      <el-table-column prop="total" label="合计" />
    </el-table>
  </el-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'

/** 通用审核统计响应（后端 /audit/statistics 统一结构） */
export interface AuditStatisticsData {
  total: number
  byStatus: Record<string, number>
  byType?: Array<Record<string, unknown>>
}

const props = withDefaults(
  defineProps<{
    statistics: AuditStatisticsData | null
    /** 状态键 → 中文标签（各业务域状态名自洽，如 auditing/normal 或 pending/resolved） */
    statusLabels?: Record<string, string>
    /** byType 明细表首列列名（动态=动态类型、评论=评论区类型、举报=来源类型…） */
    typeLabel?: string
    totalLabel?: string
  }>(),
  {
    statusLabels: () => ({
      auditing: '审核中',
      normal: '已过审',
      rejected: '已驳回',
      hidden: '已下架',
      pending: '待处理',
      resolved: '已成立',
    }),
    typeLabel: '类型',
    totalLabel: '总数',
  }
)

const STATUS_TAG_TYPES: Record<string, 'warning' | 'success' | 'danger' | 'info'> = {
  auditing: 'warning',
  pending: 'warning',
  normal: 'success',
  resolved: 'success',
  rejected: 'danger',
  hidden: 'info',
  deleted: 'info',
}

const statusTagType = (key: string) => STATUS_TAG_TYPES[key] ?? 'info'

/** byType 明细表的动态状态列（除 type / total 外的所有键） */
const typeColumns = computed(() => {
  const first = props.statistics?.byType?.[0]
  if (!first) return []
  return Object.keys(first).filter((k) => k !== 'type' && k !== 'total')
})
</script>
