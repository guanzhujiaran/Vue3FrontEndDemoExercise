<script setup lang="ts">
import type { Component } from 'vue'
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
  icon: "info" | "success" | "error" | "primary" | "warning",
  popover_text?: string
}
const props = defineProps<ResultProps>()
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
  <div class="flex flex-row items-center justify-center text-center box-border p-0 el-bili-status">
    <el-popover :content="props.popover_text" :disabled="!props.popover_text" :placement="'top'">
      <template #reference>
        <div class="flex el-bili-status__icon">
          <slot name="icon">
            <component
              :is="resultIcon.component"
              v-if="resultIcon.component"
              :class="resultIcon.class"
              class="w-5 h-5"
            />
          </slot>
        </div>
      </template>
    </el-popover>
  </div>
</template>

<style scoped lang="scss">
.el-bili-status {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  text-align: center;
  box-sizing: border-box;
  padding: 0;
}

.el-bili-status__icon {
  display: flex;
}

.el-bili-status__icon svg {
  width: 20px;
  height: 20px;
}

:deep(.icon-success) {
  color: var(--el-color-success);
}

:deep(.icon-primary) {
  color: var(--el-color-primary);
}

:deep(.icon-warning) {
  color: var(--el-color-warning);
}

:deep(.icon-error) {
  color: var(--el-color-error);
}

:deep(.icon-info) {
  color: var(--el-color-info);
}
</style>