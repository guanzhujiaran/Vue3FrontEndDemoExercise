<script setup lang="ts">
import { computed } from 'vue'
import { resolveActionIcon } from '@/utils/rpa/actionIcon'

/**
 * 动作图标渲染器
 *
 * 只做一件事：`(series, id)` → 图标组件 → `<component :is>`。
 * 图标本体是 `public/action-icons/` 下的静态资源（不参与打包），注册表按清单拼出 URL，
 * 统一以 `<img>` 渲染；因此不再支持 `currentColor` 染色（需染色的用内置图标）。
 *
 * 无对应资源时渲染 `fallback` 插槽（可留空），**不使用 Element Plus 图标兜底**。
 */
defineOptions({ inheritAttrs: false })

interface Props {
  /** 图标系列编号（后端 `icon_series`） */
  series?: number | null
  /** 系列内编号（后端 `icon_id`） */
  id?: number | null
}

const props = defineProps<Props>()

const icon = computed(() => resolveActionIcon(props.series, props.id))
</script>

<template>
  <component v-if="icon" :is="icon" v-bind="$attrs" class="action-icon" />
  <slot v-else name="fallback" />
</template>
