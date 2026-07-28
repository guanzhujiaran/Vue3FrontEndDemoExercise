import { computed, type ComputedRef, type MaybeRefOrGetter, toValue } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { TableV2FixedDir, type Column } from 'element-plus'

export interface UseTableV2FixedColumnsOptions {
  /** localStorage 键名，不同表格用不同 key 隔离 */
  storageKey: string
  /** 默认固定的列，如 { id: true, actions: true } */
  defaultFixed?: Record<string, boolean>
  /** 固定时吸附在右侧的列 key（其余固定列都吸附左侧） */
  rightFixedKeys?: string[]
}

/**
 * el-table-v2 固定列偏好管理（持久化到 localStorage）
 *
 * 返回：
 * - columns：合成了 fixed 属性的列定义（直接传给 el-table-v2）
 * - isColumnFixed / toggleColumnFixed：给自定义表头组件使用
 * - resetFixedColumns：恢复默认固定配置
 */
export function useTableV2FixedColumns<T = any>(
  baseColumns: MaybeRefOrGetter<Column<T>[]>,
  options: UseTableV2FixedColumnsOptions
): {
  columns: ComputedRef<Column<T>[]>
  isColumnFixed: (columnKey: PropertyKey | undefined) => boolean
  toggleColumnFixed: (columnKey: PropertyKey | undefined) => void
  resetFixedColumns: () => void
} {
  const { storageKey, defaultFixed = {}, rightFixedKeys = [] } = options

  const fixedColumnPrefs = useLocalStorage<Record<string, boolean>>(
    storageKey,
    { ...defaultFixed },
    { mergeDefaults: true }
  )

  const isColumnFixed = (columnKey: PropertyKey | undefined) =>
    !!fixedColumnPrefs.value[String(columnKey ?? '')]

  const toggleColumnFixed = (columnKey: PropertyKey | undefined) => {
    const key = String(columnKey ?? '')
    if (!key) return
    fixedColumnPrefs.value = { ...fixedColumnPrefs.value, [key]: !fixedColumnPrefs.value[key] }
  }

  const resetFixedColumns = () => {
    fixedColumnPrefs.value = { ...defaultFixed }
  }

  const columns = computed<Column<T>[]>(() =>
    toValue(baseColumns).map((col) => ({
      ...col,
      fixed: isColumnFixed(col.key)
        ? rightFixedKeys.includes(String(col.key ?? ''))
          ? TableV2FixedDir.RIGHT
          : TableV2FixedDir.LEFT
        : undefined
    }))
  )

  return { columns, isColumnFixed, toggleColumnFixed, resetFixedColumns }
}
