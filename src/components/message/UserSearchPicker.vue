<template>
  <el-select
    :model-value="props.modelValue || undefined"
    class="w-full"
    filterable
    remote
    clearable
    reserve-keyword
    :remote-method="onRemoteSearch"
    :loading="searching"
    :loading-text="t('userSearch.loadingMore')"
    :disabled="disabled"
    :placeholder="t('userSearch.placeholder')"
    @change="onChange"
    @clear="onClear"
  >
    <!-- 选中项常驻（remote 搜索会刷新 options，保证选中项 label 不丢） -->
    <el-option
      v-if="selected && !options.some((u) => String(u.mid) === String(selected!.mid))"
      :key="`selected-${selected.mid}`"
      :label="optionLabel(selected)"
      :value="String(selected.mid)"
    >
      <div class="flex items-center gap-2">
        <el-avatar :size="24" :src="selected.avatar || BiliImg.face.noface" referrerpolicy="no-referrer" />
        <span class="truncate text-text-primary">{{ selected.user_name || t('userSearch.unnamed') }}</span>
        <el-tag type="info" effect="plain" size="small" disable-transitions>
          Lv.{{ selected.level_info?.current_level ?? 0 }}
        </el-tag>
        <span class="text-xs text-text-placeholder">mid: {{ selected.mid }}</span>
      </div>
    </el-option>

    <el-option
      v-for="u in options"
      :key="u.uid"
      :label="optionLabel(u)"
      :value="String(u.mid)"
    >
      <div class="flex items-center gap-2">
        <el-avatar :size="24" :src="u.avatar || BiliImg.face.noface" referrerpolicy="no-referrer" />
        <span class="truncate text-text-primary">{{ u.user_name || t('userSearch.unnamed') }}</span>
        <el-tag type="info" effect="plain" size="small" disable-transitions>
          Lv.{{ u.level_info?.current_level ?? 0 }}
        </el-tag>
        <el-tag
          v-if="t(vipLabel(u.vip))"
          type="danger"
          effect="plain"
          size="small"
          disable-transitions
        >
          {{ t(vipLabel(u.vip)) }}
        </el-tag>
        <span class="text-xs text-text-placeholder">mid: {{ u.mid }}</span>
      </div>
    </el-option>

    <!-- 分页：下拉底部「加载更多」（change 时拦截该哨兵值，不作为真实选中项） -->
    <el-option v-if="hasMore && options.length" key="__load_more__" :value="'__load_more__'">
      <el-button
        link
        type="primary"
        size="small"
        :loading="loadingMore"
        class="w-full"
        @click.stop="loadMore"
      >
        {{ t('userSearch.loadMore') }}
      </el-button>
    </el-option>

    <template #empty>
      <p class="py-2 text-xs text-text-placeholder">
        {{ searched && !searching ? t('userSearch.noMatch') : t('userSearch.placeholder') }}
      </p>
    </template>
  </el-select>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { useDebounceFn } from '@vueuse/core'
import { BiliImg } from '@/assets/img/BiliImg.ts'
import {
  searchPptrUser,
  vipLabel,
  type PptrUserSearchItem
} from '@/views/message/messageAdmin'

/**
 * 用户搜索选择器（公共组件，el-select 远程搜索形态）：
 * 输入关键字 → 节流远程搜索候选 → 下拉点选 → 回填 mid（v-model）。
 * 选中 / 清空时同步 emit `select`（完整档案对象），供父级展示或进一步使用。
 */
const props = withDefaults(
  defineProps<{ modelValue?: string; disabled?: boolean }>(),
  { modelValue: '', disabled: false }
)
const emit = defineEmits<{
  'update:modelValue': [mid: string]
  select: [user: PptrUserSearchItem | null]
}>()

const { t } = useI18n()

const options = ref<PptrUserSearchItem[]>([])
const searching = ref(false)
const loadingMore = ref(false)
const searched = ref(false)
const hasMore = ref(false)
const searchOffset = ref(0)
const selected = ref<PptrUserSearchItem | null>(null)

/** 最近一次搜索关键字（供「加载更多」续页使用） */
const lastKeyword = ref('')

const SEARCH_PAGE_SIZE = 20
const LOAD_MORE_SENTINEL = '__load_more__'

function optionLabel(u: PptrUserSearchItem): string {
  return `${u.user_name || t('userSearch.unnamed')} (${u.mid})`
}

async function doSearch(kw: string, offset: number) {
  const { items = [], has_more } = await searchPptrUser(kw, offset, SEARCH_PAGE_SIZE)
  if (offset === 0) {
    options.value = items
  } else {
    options.value.push(...items)
  }
  searchOffset.value = offset + items.length
  hasMore.value = has_more ?? false
}

/** el-select remote-method：套 300ms 节流，避免每敲一个字符就打一次接口 */
const onRemoteSearch = useDebounceFn((raw: string) => {
  const kw = String(raw ?? '').trim()
  searched.value = true
  lastKeyword.value = kw
  if (!kw) {
    options.value = []
    hasMore.value = false
    return
  }
  searching.value = true
  doSearch(kw, 0)
    .catch((e: any) => {
      ElMessage.error(t('userSearch.findUserFailed') + (e?.message || e))
      options.value = []
      hasMore.value = false
    })
    .finally(() => {
      searching.value = false
    })
}, 300)

async function loadMore() {
  const kw = lastKeyword.value
  if (!kw || loadingMore.value || !hasMore.value) return
  loadingMore.value = true
  try {
    await doSearch(kw, searchOffset.value)
  } catch (e: any) {
    ElMessage.error(t('userSearch.loadMoreFailed') + (e?.message || e))
  } finally {
    loadingMore.value = false
  }
}

function onChange(v: unknown) {
  const mid = String(v ?? '')
  // 「加载更多」哨兵值：不作为选中项（受控 model-value 未变，显示会自动校正）
  if (!mid || mid === LOAD_MORE_SENTINEL) return
  const user = options.value.find((u) => String(u.mid) === mid) ?? selected.value
  selected.value = user
  emit('update:modelValue', mid)
  emit('select', user ?? null)
}

function onClear() {
  selected.value = null
  emit('update:modelValue', '')
  emit('select', null)
}
</script>
