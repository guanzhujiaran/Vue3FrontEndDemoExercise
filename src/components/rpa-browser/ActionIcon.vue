<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { resolveActionIconUrl } from '@/utils/rpa/actionIcon'

/**
 * 动作图标渲染器
 *
 * 只做一件事：`(series, id)` → 图标 URL → `<img>`。
 * 图标本体是项目根 `action-icons/` 下的静态资源（不参与打包，站点根绝对路径引用）。
 *
 * 未命中清单（`series/id` 为 0、编号不存在、清单为空）**或图片加载失败（404）**时，
 * 都渲染 `fallback` 插槽，避免界面上出现破图；**不使用 Element Plus 图标兜底**。
 */
defineOptions({ inheritAttrs: false })

interface Props {
  /** 图标系列编号（后端 `icon_series`） */
  series?: number | null
  /** 系列内编号（后端 `icon_id`） */
  id?: number | null
}

const props = defineProps<Props>()

const url = computed(() => resolveActionIconUrl(props.series, props.id))

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
