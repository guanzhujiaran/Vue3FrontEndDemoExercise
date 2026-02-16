<script setup lang="ts">
import { useNamespace } from 'element-plus'
import type { Component } from 'vue'
import type { EpPropMergeType } from 'element-plus/es/utils'
import { CircleCheckFilled, WarningFilled, CircleCloseFilled, InfoFilled } from '@element-plus/icons-vue'

const IconMap = {
  success: 'icon-success',
  primary: 'icon-primary',
  warning: 'icon-warning',
  error: 'icon-error',
  info: 'icon-info'
}
const IconComponentMap: Record<(typeof IconMap)[keyof typeof IconMap], Component> = {
  [IconMap.success]: CircleCheckFilled,
  [IconMap.warning]: WarningFilled,
  [IconMap.error]: CircleCloseFilled,
  [IconMap.info]: InfoFilled
}
type ResultProps = {
  icon: EpPropMergeType<StringConstructor, "info" | "success" | "error" | "primary" | "warning", unknown>,
  popover_text?: string
}
const props = defineProps<ResultProps>()
const ns = useNamespace('result')
const resultIcon = computed(() => {
  const icon = props.icon
  const iconClass = icon && IconMap[icon] ? IconMap[icon] : 'icon-info'
  const iconComponent = IconComponentMap[iconClass] || IconComponentMap['icon-info']

  return {
    class: iconClass,
    component: iconComponent
  }
})
</script>

<template>
  <div :class="ns.b()">
    <el-popover :content="props.popover_text" :disabled="!props.popover_text" :placement="'top'">
      <template #reference>
        <div :class="ns.e('icon')">
          <slot name="icon">
            <component
              :is="resultIcon.component"
              v-if="resultIcon.component"
              :class="resultIcon.class"
            />
          </slot>
        </div>
      </template>
    </el-popover>
  </div>
</template>

<style scoped lang="scss">
@import '@/assets/bili-status-icon-tailwind.css';
</style>
