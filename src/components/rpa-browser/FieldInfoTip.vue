<script setup lang="ts">
import HelpIcon from '@/assets/svgs/space/help.svg?component'

/**
 * 表单字段标签旁的说明图标（info icon）。
 *
 * 用来替代原先铺在表单项底部的整段灰字说明：文案收进 tooltip，版面只留一个小图标。
 * 图标取自 `assets/svgs/`（已归一化为 width/height=100% + fill=currentColor），
 * 尺寸与颜色全部由外部 class 控制，不使用 Element Plus 内置图标（见 icons 规范）。
 */
withDefaults(
  defineProps<{
    /** 悬浮 / 聚焦时展示的说明文案 */
    content: string
    /** normal=灰（普通说明）；warning=琥珀（当前配置不生效等需要提醒的情况） */
    tone?: 'normal' | 'warning'
  }>(),
  { tone: 'normal' }
)
</script>

<template>
  <el-tooltip placement="top" :show-after="80">
    <component
      :is="HelpIcon"
      class="rpa-field-info__icon ml-1 inline-block h-3.5 w-3.5 cursor-help align-text-bottom"
      :class="tone === 'warning' ? 'text-amber-400' : 'text-text-placeholder'"
    />
    <template #content>
      <div class="rpa-field-info__tooltip max-w-xs leading-relaxed">{{ content }}</div>
    </template>
  </el-tooltip>
</template>
