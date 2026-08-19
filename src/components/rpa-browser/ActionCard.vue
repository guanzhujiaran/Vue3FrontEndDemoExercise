<script setup lang="ts">
import { computed, type Component } from 'vue'
import { Mouse, Edit, Top, View, Timer, Camera, Connection, SetUp, RefreshRight, Star, Grid, Cpu, Link, QuestionFilled } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import type { ActionDetail } from './debugbox-types'

const { t } = useI18n()

interface Props {
  action: {
    action_id: string
    json_schema?: {
      title?: string
      description?: string
    }
    name?: string
    description?: string
    /** 后端 action_detail：仅 ca_ 自定义操作有此字段 */
    action_detail?: ActionDetail
  }
  selected?: boolean
  configParams?: Record<string, unknown>
}

const props = defineProps<Props>()

const actionIcon = computed<Component>(() => {
  const iconMap: Record<string, Component> = {
    click: Mouse,
    input: Edit,
    navigation: Top,
    navigate: Top,
    new_page: Top,
    screenshot: Camera,
    wait: Timer,
    scroll: View,
    hover: Mouse,
    evaluate: Cpu,
    select: Grid,
    keyboard: SetUp,
    mouse: Mouse,
    llm: Star,
    loop: RefreshRight,
    if_else: Connection,
    composite: Grid,
    custom: Grid,
    plugin: Link
  }
  return iconMap[props.action.action_id] || QuestionFilled
})

const actionTitle = computed(() => {
  // 优先使用自定义名称
  if (props.action.name) {
    return props.action.name
  }
  
  const titleKeyMap: Record<string, string> = {
    click: 'rpa.actClick',
    input: 'rpa.actInput',
    navigation: 'rpa.actNavigation',
    navigate: 'rpa.actNavigate',
    new_page: 'rpa.actNewPage',
    screenshot: 'rpa.actScreenshot',
    wait: 'rpa.actWait',
    scroll: 'rpa.actScroll',
    hover: 'rpa.actHover',
    evaluate: 'rpa.actEvaluate',
    select: 'rpa.actSelect',
    keyboard: 'rpa.actKeyboard',
    mouse: 'rpa.actMouse',
    llm: 'rpa.actLlm',
    loop: 'rpa.actLoop',
    if_else: 'rpa.actIfElse',
    composite: 'rpa.actComposite',
    custom: 'rpa.actCustom',
    plugin: 'rpa.actPlugin'
  }

  const key = titleKeyMap[props.action.action_id]
  return key ? t(key) : (props.action.json_schema?.title || props.action.action_id)
})

const actionDescription = computed(() => {
  // 优先使用自定义描述
  if (props.action.description) {
    return props.action.description
  }
  
  const desc = props.action.json_schema?.description || ''
  if (desc) return desc
  
  const descKeyMap: Record<string, string> = {
    click: 'rpa.actClickDesc',
    input: 'rpa.actInputDesc',
    navigation: 'rpa.actNavigationDesc',
    navigate: 'rpa.actNavigateDesc',
    new_page: 'rpa.actNewPageDesc',
    screenshot: 'rpa.actScreenshotDesc',
    wait: 'rpa.actWaitDesc',
    scroll: 'rpa.actScrollDesc',
    hover: 'rpa.actHoverDesc',
    evaluate: 'rpa.actEvaluateDesc',
    select: 'rpa.actSelectDesc',
    keyboard: 'rpa.actKeyboardDesc',
    mouse: 'rpa.actMouseDesc',
    llm: 'rpa.actLlmDesc',
    loop: 'rpa.actLoopDesc',
    if_else: 'rpa.actIfElseDesc',
    composite: 'rpa.actCompositeDesc',
    custom: 'rpa.actCustomDesc',
    plugin: 'rpa.actPluginDesc'
  }

  const key = descKeyMap[props.action.action_id]
  return key ? t(key) : ''
})

const configParamsEntries = computed(() => {
  if (!props.configParams || Object.keys(props.configParams).length === 0) {
    return []
  }
  return Object.entries(props.configParams)
    .filter(([_, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => ({ key, value: String(value) }))
})

/** 是否有 action_detail（仅 ca_ 自定义操作） */
const hasActionDetail = computed(() => !!props.action.action_detail)

/** action_detail 中的标签 */
const detailTags = computed(() => {
  const tags = props.action.action_detail?.tags
  return Array.isArray(tags) && tags.length > 0 ? tags : []
})

/** action_detail 中的元信息标记 */
const detailBadges = computed(() => {
  const ad = props.action.action_detail
  if (!ad) return []
  const badges: string[] = []
  if (ad.is_public) badges.push(t('rpa.publicTag'))
  if (ad.is_verified) badges.push(t('rpa.verifiedTag'))
  if (ad.likes_count && ad.likes_count > 0) badges.push(t('rpa.likesCount', { n: ad.likes_count }))
  return badges
})
</script>

<template>
  <div :class="[
    'rounded-lg border cursor-pointer transition-all duration-200',
    selected
      ? 'border-[var(--el-color-primary)] shadow-md'
      : 'border-border hover:border-[var(--el-color-primary)] hover:shadow-sm'
  ]">
    <div class="p-3">
      <div class="flex items-start gap-3">
        <div class="flex items-center justify-center w-8 h-8 rounded-lg shrink-0">
          <el-icon class="text-lg text-[var(--el-text-color-primary)]">
            <component :is="actionIcon" />
          </el-icon>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <span class="font-medium text-sm text-[var(--el-text-color-primary)]">{{ actionTitle }}</span>
            <span class="text-xs text-text-secondary font-mono">{{ action.action_id }}</span>
          </div>
          <div v-if="actionDescription" class="text-xs text-text-secondary leading-relaxed line-clamp-2 mb-1">{{ actionDescription }}</div>

          <!-- action_detail 标签和元信息 -->
          <div v-if="hasActionDetail" class="flex flex-wrap items-center gap-1 mt-1">
            <el-tag v-for="tag in detailTags" :key="tag" size="small" type="info">{{ tag }}</el-tag>
            <span
              v-for="badge in detailBadges"
              :key="badge"
              class="text-xs px-1.5 py-0.5 rounded bg-[var(--el-color-primary-light-9)] text-[var(--el-color-primary)]"
            >{{ badge }}</span>
          </div>
        </div>
      </div>
      
      <!-- 插件配置参数 -->
      <div v-if="configParamsEntries.length > 0" class="mt-2 pt-2 border-t border-[var(--el-border-color-light)] space-y-1">
        <div 
          v-for="param in configParamsEntries" 
          :key="param.key"
          class="flex items-center gap-1 text-xs"
        >
          <span class="text-text-secondary font-medium">{{ param.key }}:</span>
          <span class="text-text-regular truncate">{{ param.value }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
