<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import {
  ACTION_ICON_DIR,
  DEFAULT_ICON_ID,
  DEFAULT_ICON_SERIES,
  formatActionIconSeriesLabel,
  getActionIconCategories,
  getActionIconCategory,
  getActionIconName,
  getActionIconSeries,
  getActionIconSeriesName,
  hasActionIcon,
  isDefaultActionIcon,
} from '@/utils/rpa/actionIcon'
import { DEFAULT_ACTION_ICON } from '@/utils/rpa/actionTypeIcon'
import ActionIcon from './ActionIcon.vue'

/**
 * 动作图标选择器
 *
 * 数据口径：只向后端提交两个 int（`icon_series` / `icon_id`），
 * 前端按 `public/action-icons/{分类}/s_{系列编号}_{系列名称}/i_{图片编号}_{图片名称}.{ext}`
 * 的约定映射为实际图标（`ext` 支持 svg / png / jpg / jpeg / webp / gif）。
 * 图片是静态资源（不参与打包），「编号 → 文件」的映射由 `npm run icons:manifest` 生成的清单提供。
 * 分类层可省略，仅用于组织展示（后端没有该字段，系列编号需全局唯一）。
 *
 * 交互：
 * - 「默认图标」→ `0 / 0`
 * - 系列下拉只切换展示（可搜索；多分类时按分类分组），点击编号才提交
 * - 无任何图标资源时给出明确提示（不伪造图标、不用 Element Plus 图标兜底）
 */
interface Props {
  /** 后端 icon_series */
  series?: number | null
  /** 后端 icon_id */
  id?: number | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:series': [value: number]
  'update:id': [value: number]
}>()

const seriesOptions = computed(() => getActionIconSeries())
const activeSeries = ref<number | null>(null)

/** 分类（来自最外层目录）；多于一个分类时在选择项与标签中带上分类前缀 */
const categories = computed(() => getActionIconCategories())
const multipleCategories = computed(() => categories.value.length > 1)

interface SeriesSelectOption {
  value: number
  label: string
  category: string
}

const seriesSelectOptions = computed<SeriesSelectOption[]>(() =>
  seriesOptions.value.map(o => ({
    value: o.series,
    label: formatActionIconSeriesLabel(
      o.series,
      o.seriesName,
      multipleCategories.value ? o.category : '',
    ),
    category: o.category,
  })),
)

/** 多分类时的分组选项（按分类名分组，未归类归到「未分类」） */
const seriesGroups = computed(() => {
  const groups = new Map<string, SeriesSelectOption[]>()
  for (const option of seriesSelectOptions.value) {
    const key = option.category || '未分类'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(option)
  }
  return [...groups.entries()].map(([category, options]) => ({ category, options }))
})

const isDefaultSelected = computed(() => isDefaultActionIcon(props.series, props.id))

const currentIcons = computed(
  () => seriesOptions.value.find(o => o.series === activeSeries.value)?.icons ?? []
)

/**
 * 默认图标的资源名称
 *
 * 图库不提供 `s_0_*` 默认资源（默认图标由 `@/utils/rpa/actionTypeIcon` 的内置图标充当），
 * 因此没有可展示的名称，`selectedText` 走「默认图标」分支。
 */
const defaultIconName = computed(() => '')

const selectedText = computed(() => {
  if (isDefaultSelected.value) {
    return defaultIconName.value ? `默认图标（${defaultIconName.value}）` : '默认图标'
  }
  const seriesLabel = formatActionIconSeriesLabel(
    props.series as number,
    getActionIconSeriesName(props.series),
    multipleCategories.value ? getActionIconCategory(props.series) : '',
  )
  const name = getActionIconName(props.series, props.id)
  return `${seriesLabel} / #${props.id}${name ? ` · ${name}` : ''}`
})

// 外部值变化时同步当前展示的系列
watch(
  () => [props.series, props.id],
  () => {
    activeSeries.value = isDefaultActionIcon(props.series, props.id)
      ? (seriesOptions.value[0]?.series ?? null)
      : (props.series ?? null)
  },
  { immediate: true }
)

function handleSeriesChange(value: string | number | boolean) {
  activeSeries.value = Number(value)
}

function selectDefault() {
  emit('update:series', DEFAULT_ICON_SERIES)
  emit('update:id', DEFAULT_ICON_ID)
}

function selectIcon(id: number) {
  if (activeSeries.value === null) return
  emit('update:series', activeSeries.value)
  emit('update:id', id)
}

function isSelected(series: number, id: number): boolean {
  return props.series === series && props.id === id
}
</script>

<template>
  <div class="action-icon-picker flex flex-col gap-3">
    <div class="action-icon-picker__header flex items-center justify-between gap-2 flex-wrap">
      <span class="text-xs text-color-secondary">
        资源目录：
        <code class="action-icon-picker__path">{{ ACTION_ICON_DIR }}/s_{系列编号}_{系列名称}/i_{图片编号}_{图片名称}.{svg|png|jpg|webp|gif}</code>
      </span>
      <el-tag :type="isDefaultSelected ? 'info' : 'primary'" effect="plain">当前：{{ selectedText }}</el-tag>
    </div>

    <template v-if="seriesOptions.length > 0">
      <!-- 默认图标 -->
      <div
        class="action-icon-picker__default flex items-center gap-3 p-3 rounded border cursor-pointer transition-colors"
        :class="isDefaultSelected ? 'border-primary bg-primary-light-9' : 'border-border hover:border-primary'"
        @click="selectDefault"
      >
        <el-icon class="action-icon-picker__default-icon text-text-primary" :size="24">
          <component :is="DEFAULT_ACTION_ICON" />
        </el-icon>
        <div class="flex flex-col">
          <span class="text-sm">默认图标（{{ DEFAULT_ICON_SERIES }} / {{ DEFAULT_ICON_ID }}）</span>
          <span class="text-xs text-color-secondary">
            未选图标时沿用动作类型图标（内置默认），无需图库提供资源
          </span>
        </div>
      </div>

      <!-- 系列选择（可搜索；多于一个分类时按分类分组） -->
      <div class="action-icon-picker__series-row flex items-center gap-2">
        <span class="text-xs text-color-secondary shrink-0">系列</span>
        <el-select
          v-model="activeSeries"
          class="action-icon-picker__series flex-1"
          filterable
          placeholder="选择系列"
          @change="handleSeriesChange"
        >
          <template v-if="multipleCategories">
            <el-option-group
              v-for="group in seriesGroups"
              :key="group.category"
              :label="group.category"
            >
              <el-option
                v-for="option in group.options"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-option-group>
          </template>
          <template v-else>
            <el-option
              v-for="option in seriesSelectOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </template>
        </el-select>
        <span class="action-icon-picker__series-count text-xs text-color-secondary shrink-0">
          共 {{ seriesOptions.length }} 个系列
        </span>
      </div>

      <!-- 编号 + 名称网格 -->
      <div class="action-icon-picker__grid h-56 overflow-auto border border-border rounded p-2">
        <div class="flex flex-wrap gap-2">
          <div
            v-for="icon in currentIcons"
            :key="icon.id"
            class="action-icon-picker__cell flex flex-col items-center justify-center gap-1 w-24 h-24 px-1 rounded border cursor-pointer transition-colors"
            :class="
              activeSeries !== null && isSelected(activeSeries, icon.id)
                ? 'border-primary bg-primary-light-9'
                : 'border-border hover:border-primary'
            "
            @click="selectIcon(icon.id)"
          >
            <ActionIcon
              :series="activeSeries"
              :id="icon.id"
              class="action-icon-picker__cell-icon w-6 h-6 text-text-primary"
            />
            <span class="text-xs text-color-secondary">#{{ icon.id }}</span>
            <el-tooltip v-if="icon.name" :content="icon.name" placement="top" :show-after="300">
              <span class="action-icon-picker__cell-name text-xs w-full text-center truncate">{{ icon.name }}</span>
            </el-tooltip>
          </div>
        </div>
      </div>
      <span
        v-if="!isDefaultSelected && !hasActionIcon(props.series, props.id)"
        class="text-xs text-danger"
      >
        当前保存的系列/编号在前端无对应资源，展示时将回落默认图标
      </span>
    </template>

    <el-alert
      v-else
      class="action-icon-picker__empty"
      type="warning"
      :closable="false"
      show-icon
      title="尚未提供任何动作图标资源"
    >
      <template #default>
        <span class="text-xs">
          请在
          <code>{{ ACTION_ICON_DIR }}/</code> 下按
          <code>{分类}/s_{系列编号}_{系列名称}/i_{图片编号}_{图片名称}.{ext}</code> 放置
          （分类层可省略；`ext` 支持 svg / png / jpg / jpeg / webp / gif），
          放置后执行 `npm run icons:manifest` 重建清单即可生效。
          未选图标时展示内置默认图标，无需图库提供默认资源。
        </span>
      </template>
    </el-alert>

    <div class="action-icon-picker__actions flex items-center gap-2">
      <el-button :icon="Refresh" @click="selectDefault">恢复默认图标</el-button>
    </div>
  </div>
</template>
