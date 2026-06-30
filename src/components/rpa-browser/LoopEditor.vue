<script setup lang="ts">
import { computed } from 'vue'
import { Plus, Delete } from '@element-plus/icons-vue'
import type { LoopConfig, LoopParamMapping, ConditionRule } from './debugbox-types'
import { defaultLoopConfig } from './debugbox-types'
import ConditionEditor from './ConditionEditor.vue'
import { useThemeStore } from '@/stores/theme'

const themeStore = useThemeStore()

/**
 * LoopEditor —— 循环参数配置编辑器
 *
 * 功能：
 *   1. 循环来源选择（固定次数 / 变量引用）
 *   2. 循环变量命名（loop_item / loop_index）
 *   3. 参数映射（将循环项的字段映射到循环体内步骤的参数）
 */

const props = defineProps<{
  modelValue: LoopConfig
}>()

const emit = defineEmits<{
  'update:modelValue': [value: LoopConfig]
}>()

const config = computed({
  get: () => props.modelValue || defaultLoopConfig(),
  set: (val) => emit('update:modelValue', val),
})

const sourceOptions = [
  { value: 'fixed_count' as const, label: '固定次数' },
  { value: 'variable' as const, label: '从变量获取列表' },
  { value: 'json_list' as const, label: '直接输入JSON列表' },
]

function setSource(source: LoopConfig['loopSource']) {
  config.value = { ...config.value, loopSource: source }
}

function setCount(val: number | string) {
  const num = Number(val)
  if (num >= 1 && num <= 10000) {
    config.value = { ...config.value, count: num }
  }
}

function setLoopItemsVar(val: string) {
  config.value = { ...config.value, loopItemsVar: val }
}

function setLoopItemVar(val: string) {
  config.value = { ...config.value, loopItemVar: val }
}

function setLoopIndexVar(val: string) {
  config.value = { ...config.value, loopIndexVar: val }
}

function setLoopItemsJson(val: string) {
  config.value = { ...config.value, loopItemsJson: val }
}

function setBreakCondition(val: ConditionRule | null) {
  config.value = { ...config.value, breakCondition: val }
}

function setContinueCondition(val: ConditionRule | null) {
  config.value = { ...config.value, continueCondition: val }
}

/** JSON 列表的预览文本：解析成功后显示项数和摘要 */
const jsonListPreview = computed(() => {
  const raw = config.value.loopItemsJson?.trim()
  if (!raw) return ''
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return '⚠ 不是有效的 JSON 数组'
    if (parsed.length === 0) return '数组为空'
    const sample = parsed.slice(0, 3).map((item: unknown) =>
      typeof item === 'object' ? JSON.stringify(item).slice(0, 60) + (JSON.stringify(item).length > 60 ? '…' : '') : String(item)
    ).join(', ')
    return `✓ ${parsed.length} 项: [${sample}${parsed.length > 3 ? ', …' : ''}]`
  } catch {
    return '⚠ JSON 格式无效'
  }
})

function addMapping() {
  config.value = {
    ...config.value,
    paramMapping: [
      ...(config.value.paramMapping || []),
      { targetParam: '', sourcePath: '' },
    ],
  }
}

function removeMapping(index: number) {
  const list = [...(config.value.paramMapping || [])]
  list.splice(index, 1)
  config.value = { ...config.value, paramMapping: list }
}

function updateMapping(index: number, field: keyof LoopParamMapping, val: string) {
  const list = [...(config.value.paramMapping || [])]
  list[index] = { ...list[index], [field]: val }
  config.value = { ...config.value, paramMapping: list }
}
</script>

<template>
  <div class="loop-editor space-y-3">
    <!-- 循环来源 -->
    <div>
      <label class="text-xs font-medium text-(--el-text-color-regular) mb-1.5 block">循环来源</label>
      <el-radio-group :model-value="config.loopSource" @update:model-value="setSource" size="small">
        <el-radio-button v-for="opt in sourceOptions" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </el-radio-button>
      </el-radio-group>
    </div>

    <!-- 固定次数 -->
    <div v-if="config.loopSource === 'fixed_count'">
      <label class="text-xs font-medium text-(--el-text-color-regular) mb-1.5 block">循环次数</label>
      <el-input-number
        :model-value="config.count"
        @update:model-value="setCount"
        :min="1"
        :max="10000"
        size="small"
        controls-position="right"
        class="w-full"
      />
    </div>

    <!-- 从变量获取列表 -->
    <div v-else-if="config.loopSource === 'variable'">
      <label class="text-xs font-medium text-(--el-text-color-regular) mb-1.5 block">列表变量</label>
      <el-input
        :model-value="config.loopItemsVar"
        @update:model-value="setLoopItemsVar"
        size="small"
        placeholder="如：previous_output.items"
      >
        <template #prepend>scope.</template>
      </el-input>
      <span class="text-xs text-(--el-text-color-secondary) mt-1 block">引用 scope 中已有的列表变量，将遍历其中每一项</span>
    </div>

    <!-- 直接输入JSON列表 -->
    <div v-else-if="config.loopSource === 'json_list'">
      <label class="text-xs font-medium text-(--el-text-color-regular) mb-1.5 block">JSON 列表</label>
      <el-input
        :model-value="config.loopItemsJson"
        @update:model-value="setLoopItemsJson"
        type="textarea"
        :rows="4"
        size="small"
        placeholder='[{"name": "item1", "url": "https://..."}, {"name": "item2", "url": "https://..."}]'
      />
      <span v-if="jsonListPreview" class="text-xs mt-1 block">
        <el-tag size="small" :type="jsonListPreview.startsWith('✓') ? 'success' : 'danger'" effect="plain">{{ jsonListPreview }}</el-tag>
      </span>
      <span v-else class="text-xs text-(--el-text-color-secondary) mt-1 block">直接粘贴 JSON 数组，循环将遍历其中每一项</span>
    </div>

    <!-- 表达式（fallback） -->
    <div v-else>
      <label class="text-xs font-medium text-(--el-text-color-regular) mb-1.5 block">列表变量</label>
      <el-input
        :model-value="config.loopItemsVar"
        @update:model-value="setLoopItemsVar"
        size="small"
        placeholder="如：previous_output.items"
      >
        <template #prepend>scope.</template>
      </el-input>
      <span class="text-xs text-(--el-text-color-secondary) mt-1 block">引用 scope 中已有的列表变量，将遍历其中每一项</span>
    </div>

    <!-- break / continue 条件（使用 ConditionEditor，与 if_else 一致） -->
    <div>
      <el-tabs type="border-card" class="break-continue-tabs">
        <el-tab-pane>
          <template #label>
            <span class="text-xs font-medium text-(--el-color-danger)">
              Break 条件
              <span class="text-(--el-text-color-placeholder) font-normal">（可选）</span>
            </span>
          </template>
          <div class="p-2">
            <span class="text-xs text-(--el-text-color-secondary) mb-2 block">每次迭代开始前评估，为真时终止整个循环</span>
            <ConditionEditor
              :model-value="config.breakCondition"
              @update:model-value="setBreakCondition"
            />
          </div>
        </el-tab-pane>
        <el-tab-pane>
          <template #label>
            <span class="text-xs font-medium text-(--el-color-warning)">
              Continue 条件
              <span class="text-(--el-text-color-placeholder) font-normal">（可选）</span>
            </span>
          </template>
          <div class="p-2">
            <span class="text-xs text-(--el-text-color-secondary) mb-2 block">每次迭代开始前评估，为真时跳过当前迭代</span>
            <ConditionEditor
              :model-value="config.continueCondition"
              @update:model-value="setContinueCondition"
            />
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 循环变量命名 -->
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="text-xs font-medium text-(--el-text-color-regular) mb-1.5 block">循环项变量名</label>
        <el-input :model-value="config.loopItemVar" @update:model-value="setLoopItemVar" size="small" placeholder="loop_item" />
        <span class="text-xs text-(--el-text-color-secondary) mt-0.5 block">循环体内引用当前项的变量名</span>
      </div>
      <div>
        <label class="text-xs font-medium text-(--el-text-color-regular) mb-1.5 block">索引变量名</label>
        <el-input :model-value="config.loopIndexVar" @update:model-value="setLoopIndexVar" size="small" placeholder="loop_index" />
        <span class="text-xs text-(--el-text-color-secondary) mt-0.5 block">当前迭代索引（从 0 开始）</span>
      </div>
    </div>

    <!-- 参数映射（可选） -->
    <div class="param-mapping-section">
      <!-- 标题栏 -->
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <span class="text-xs font-semibold text-(--el-text-color-primary)">参数映射</span>
          <el-tag v-if="(config.paramMapping || []).length > 0" size="small" round type="primary" effect="plain">
            {{ config.paramMapping.length }} 项
          </el-tag>
          <el-tag v-else size="small" round type="info" effect="plain">可选</el-tag>
        </div>
        <el-button size="small" :icon="Plus" type="primary" plain @click="addMapping">
          添加映射
        </el-button>
      </div>

      <!-- 简要说明 -->
      <el-alert type="info" :effect="themeStore.themeEffectString" class="mb-3">
        <template #title>
          <span class="text-xs">映射说明</span>
        </template>
        <span class="text-xs text-text-primary">
          将循环项的字段值<strong>自动注入</strong>到循环体内步骤的参数中。例如
          <el-tag size="small" type="primary" effect="plain">loop_item.name</el-tag>
          <el-tag size="small" type="success" effect="plain" class="mx-0.5">→</el-tag>
          <el-tag size="small" type="primary" effect="plain">selector</el-tag>
          表示把当前项的 name 赋给子步骤的 selector 参数。
        </span>
      </el-alert>

      <!-- 映射卡片列表 -->
      <div v-if="(config.paramMapping || []).length > 0" class="space-y-2">
        <el-card
          v-for="(mapping, mi) in config.paramMapping"
          :key="mi"
          shadow="never"
          class="group"
        >
          <!-- 卡片头部：编号 + 删除 -->
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <el-tag size="small" :type="mi % 2 === 0 ? 'primary' : 'success'" effect="dark" round>
                  {{ mi + 1 }}
                </el-tag>
                <span class="text-xs font-medium">映射 {{ mi + 1 }}</span>
                <el-tag v-if="mapping.targetParam && mapping.sourcePath" size="small" type="success" effect="plain">已配置</el-tag>
                <el-tag v-else size="small" type="warning" effect="plain">配置中</el-tag>
              </div>
              <el-button size="small" :icon="Delete" text type="danger" @click="removeMapping(mi)" class="opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </template>

          <!-- 卡片主体：映射关系 visual -->
          <div class="flex items-center gap-3">
            <!-- 源路径 -->
            <div class="flex-1">
              <label class="text-xxs text-(--el-text-color-secondary) mb-1 block font-medium">源字段路径</label>
              <el-input
                :model-value="mapping.sourcePath"
                @update:model-value="(v: string) => updateMapping(mi, 'sourcePath', v)"
                size="small"
                placeholder="如 loop_item.name"
              >
                <template #prefix>
                  <span class="text-xxs text-(--el-text-color-placeholder)">引用 </span>
                </template>
              </el-input>
              <span class="text-xxs text-(--el-text-color-placeholder) mt-0.5 block">基于当前循环项 {{ config.loopItemVar || 'loop_item' }} 的字段路径，支持点分隔嵌套</span>
            </div>

            <!-- 箭头连接 -->
            <div class="shrink-0 flex flex-col items-center gap-0.5 pt-5">
              <el-tag size="small" type="primary" effect="plain">→</el-tag>
              <el-tag size="small" type="primary" effect="dark">映射为</el-tag>
            </div>

            <!-- 目标参数 -->
            <div class="flex-1">
              <label class="text-xxs text-(--el-text-color-secondary) mb-1 block font-medium">目标参数名</label>
              <el-input
                :model-value="mapping.targetParam"
                @update:model-value="(v: string) => updateMapping(mi, 'targetParam', v)"
                size="small"
                placeholder="如 selector"
              >
                <template #prefix>
                  <span class="text-xxs text-(--el-text-color-placeholder)">参数 </span>
                </template>
              </el-input>
              <span class="text-xxs text-(--el-text-color-placeholder) mt-0.5 block">循环体内子步骤要接收的参数名称</span>
            </div>
          </div>

          <!-- 映射效果预览 -->
          <el-alert
            v-if="mapping.sourcePath && mapping.targetParam"
            type="info"
            :effect="themeStore.themeEffectString"
            :closable="false"
            class="mt-3"
          >
            <span class="text-xxs">
              映射效果：
              <strong>{{ config.loopItemVar || 'loop_item' }}.{{ mapping.sourcePath.startsWith((config.loopItemVar || 'loop_item') + '.') ? mapping.sourcePath.slice((config.loopItemVar || 'loop_item').length + 1) : mapping.sourcePath }}</strong>
              <el-tag size="small" type="success" effect="plain" class="mx-1">→</el-tag>
              注入到子步骤参数 <strong>{{ mapping.targetParam }}</strong>
            </span>
          </el-alert>
        </el-card>
      </div>

      <!-- 空状态 -->
      <el-card v-else shadow="never" class="text-center cursor-pointer" @click="addMapping" body-style="padding: 24px">
        <el-empty description="暂无参数映射" :image-size="48">
          <template #description>
            <p class="text-xs text-(--el-text-color-secondary)">暂无参数映射</p>
          </template>
          <template #default>
            <div class="text-xxs text-(--el-text-color-placeholder) space-y-0.5">
              <p>点击此处或上方"添加映射"按钮创建映射规则</p>
              <p>未配置时，循环项整体以变量名
                <el-tag size="small" type="primary" effect="plain">{{ config.loopItemVar || 'loop_item' }}</el-tag>
                注入循环体
              </p>
            </div>
          </template>
        </el-empty>
      </el-card>
    </div>
  </div>
</template>
