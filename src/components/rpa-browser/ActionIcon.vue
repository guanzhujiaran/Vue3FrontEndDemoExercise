<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { resolveActionIconUrl, resolveDisplayActionIconUrl } from '@/utils/rpa/actionIcon'

/**
 * 动作图标渲染器
 *
 * 只做一件事：`(series, id, seed)` → 图标 URL → `<img>`。
 * 图标本体是项目根 `action-icons/` 下的静态资源（不参与打包，站点根绝对路径引用）。
 *
 * 未手动配置图标时按 `seed` 自动分配图库图标，保证每个 action 都有图标；
 * 图库清单为空**或图片加载失败（404）**时才渲染 `fallback` 插槽，避免破图 / 问号。
 */
defineOptions({ inheritAttrs: false })

interface Props {
  /** 图标系列编号（后端 `icon_series`） */
  series?: number | null
  /** 系列内编号（后端 `icon_id`） */
  id?: number | null
  /** 动作标识，用于未配置图标时稳定分配一张图库图标 */
  seed?: string | number | null
  /** 关闭自动分配（图标选择器自身使用，避免预览格被自动图标覆盖） */
  autoDefault?: boolean
}

const props = withDefaults(defineProps<Props>(), { autoDefault: true })

const url = computed(() =>
  props.autoDefault
    ? resolveDisplayActionIconUrl(props.series, props.id, props.seed)
    : resolveActionIconUrl(props.series, props.id)
)

/** 图片加载失败（资源缺失 / 404）时同样回落 fallback */
const loadFailed = ref(false)
/** 切到另一个图标时重置失败态，否则会一直沿用上一次的回落 */
watch(url, () => {
  loadFailed.value = false
})

const showFallback = computed(() => !url.value || loadFailed.value)
</script>

<template>
  <img
    v-if="!showFallback"
    :src="url || ''"
    alt=""
    class="action-icon"
    v-bind="$attrs"
    @error="loadFailed = true"
  />
  <slot v-else name="fallback" />
</template>
