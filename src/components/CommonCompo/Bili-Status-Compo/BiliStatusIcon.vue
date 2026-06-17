<script setup lang="ts">
import type { Component } from 'vue'
import { CircleCheckFilled, WarningFilled, CircleCloseFilled, InfoFilled } from '@element-plus/icons-vue'

const IconColorMap = {
  success: 'text-success',
  primary: 'text-primary',
  warning: 'text-warning',
  error: 'text-error',
  info: 'text-info'
} as const

const IconComponentMap: Record<keyof typeof IconColorMap, Component> = {
  success: CircleCheckFilled,
  primary: InfoFilled,
  warning: WarningFilled,
  error: CircleCloseFilled,
  info: InfoFilled
}

type ResultProps = {
  icon: 'info' | 'success' | 'error' | 'primary' | 'warning'
  popover_text?: string
}
const props = defineProps<ResultProps>()

const resultIcon = computed(() => {
  const icon = props.icon
  const colorClass = icon && IconColorMap[icon] ? IconColorMap[icon] : IconColorMap.info
  const iconComponent = IconComponentMap[icon] || IconComponentMap.info

  return {
    colorClass,
    component: iconComponent
  }
})
</script>

<template>
  <div class="flex flex-row items-center justify-center text-center box-border p-0">
    <el-popover :content="props.popover_text" :disabled="!props.popover_text" placement="top">
      <template #reference>
        <div class="flex">
          <slot name="icon">
            <component
              :is="resultIcon.component"
              v-if="resultIcon.component"
              :class="resultIcon.colorClass"
              class="size-5"
            />
          </slot>
        </div>
      </template>
    </el-popover>
  </div>
</template>
