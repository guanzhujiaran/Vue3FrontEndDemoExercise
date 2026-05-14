<!--
 * @FilePath: \Vue3FrontEndDemoExercise\src\components\browser\community\SharingSection.vue
 * @Description: 共享与发布区域 - 用于创建/编辑表单底部
-->
<template>
  <el-divider content-position="left">
    <span class="flex items-center gap-1.5">
      <el-icon><Share /></el-icon>
      共享与发布
    </span>
  </el-divider>

  <div class="flex items-center justify-between p-3 rounded-lg bg-[var(--el-fill-color-lighter)]">
    <div>
      <div class="text-sm font-medium flex items-center gap-2">
        设为公开共享
        <el-tag v-if="modelValue" size="small" type="success" effect="plain">🌍 公开</el-tag>
        <el-tag v-else size="small" type="info" effect="plain">🔒 私有</el-tag>
      </div>
      <p class="text-xs text-[var(--el-text-color-secondary)] mt-1">
        {{ modelValue
          ? '公开后，全平台用户可查看、运行和克隆此资源'
          : '私有资源仅自己可见，拥有完全控制权'
        }}
      </p>
    </div>
    <el-switch
      :model-value="modelValue"
      @change="handleToggle"
      active-text="公开"
      inactive-text="私有"
      :loading="toggling"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Share } from '@element-plus/icons-vue'
import { useCommunity } from '@/composables/useCommunity'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const { confirmVisibilityChange } = useCommunity()
const toggling = ref(false)

const handleToggle = async (val: boolean) => {
  // 从公开→私有需要二次确认
  if (props.modelValue && !val) {
    const ok = await confirmVisibilityChange(true)
    if (!ok) return
  }
  emit('update:modelValue', val)
}
</script>
