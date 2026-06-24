<script setup lang="ts">
import { computed } from 'vue'
import { Plus, Delete } from '@element-plus/icons-vue'
import type { LoopConfig, LoopParamMapping } from './debugbox-types'
import { defaultLoopConfig } from './debugbox-types'

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
      <span class="text-xs text-text-secondary mt-1 block">引用 scope 中已有的列表变量，将遍历其中每一项</span>
    </div>

    <!-- 循环变量命名 -->
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="text-xs font-medium text-(--el-text-color-regular) mb-1.5 block">循环项变量名</label>
        <el-input :model-value="config.loopItemVar" @update:model-value="setLoopItemVar" size="small" placeholder="loop_item" />
        <span class="text-xs text-text-secondary mt-0.5 block">循环体内引用当前项的变量名</span>
      </div>
      <div>
        <label class="text-xs font-medium text-(--el-text-color-regular) mb-1.5 block">索引变量名</label>
        <el-input :model-value="config.loopIndexVar" @update:model-value="setLoopIndexVar" size="small" placeholder="loop_index" />
        <span class="text-xs text-text-secondary mt-0.5 block">当前迭代索引（从 0 开始）</span>
      </div>
    </div>

    <!-- 参数映射（可选） -->
    <div>
      <div class="flex items-center justify-between mb-1.5">
        <div>
          <label class="text-xs font-medium text-(--el-text-color-regular)">参数映射</label>
          <span class="text-xs text-text-secondary ml-1">（可选）</span>
        </div>
        <el-button size="small" :icon="Plus" text type="primary" @click="addMapping">
          添加映射
        </el-button>
      </div>
      <span class="text-xs text-text-secondary mb-2 block">
        将循环项的字段值映射到循环体内步骤的参数上。
        例如 {{ '{"selector": "loop_item.name"}' }} 表示把当前项的 <code class="text-xs bg-fill-light px-1 rounded">name</code> 字段赋给参数 <code class="text-xs bg-fill-light px-1 rounded">selector</code>
      </span>

      <div v-if="(config.paramMapping || []).length > 0" class="border border-border rounded overflow-hidden">
        <div class="grid grid-cols-[1fr,1fr,auto] gap-1 bg-fill-light px-2 py-1.5 border-b border-border text-xs text-text-secondary font-medium">
          <span>目标参数</span>
          <span>源字段路径</span>
          <span class="w-8"></span>
        </div>
        <div
          v-for="(mapping, mi) in config.paramMapping"
          :key="mi"
          class="grid grid-cols-[1fr,1fr,auto] gap-1 px-2 py-1 border-b border-(--el-border-color-lighter) last:border-b-0 items-center"
        >
          <el-input
            :model-value="mapping.targetParam"
            @update:model-value="(v: string) => updateMapping(mi, 'targetParam', v)"
            size="small"
            placeholder="目标参数名"
          />
          <el-input
            :model-value="mapping.sourcePath"
            @update:model-value="(v: string) => updateMapping(mi, 'sourcePath', v)"
            size="small"
            placeholder="如 loop_item.name"
          />
          <el-button size="small" :icon="Delete" text type="danger" @click="removeMapping(mi)" />
        </div>
      </div>
      <div v-else class="text-xs text-text-placeholder italic py-2">暂无参数映射，循环项整体以变量名注入循环体</div>
    </div>
  </div>
</template>
