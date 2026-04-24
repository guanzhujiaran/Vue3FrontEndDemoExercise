<script setup lang="ts">
import { ClickOutside as vClickOutside } from 'element-plus'
import { ref } from 'vue'
import type { PartitionParamsInfo, RankingPartition } from '@/models/api/lottery/lotdata.ts'
import { ArrowDown } from '@element-plus/icons-vue'

const isPopup = ref<boolean>(false)
const partition = defineModel<RankingPartition>('partition', { required: true })
const activeName = ref(
  partition.value.params.find((el) => el.paramValue === partition.value.activeValue)?.displayName ??
    '选择分区'
)
const handlePopup = () => {
  isPopup.value = !isPopup.value
}
const handlePartitionChange = (param: PartitionParamsInfo) => {
  if (partition.value.activeValue !== param.paramValue) emit('handlePartitionChange')
  partition.value.activeValue = param.paramValue
  activeName.value = param.displayName
  isPopup.value = false
}
const emit = defineEmits(['handlePartitionChange'])
</script>

<template>
  <div
    class="relative mr-4"
    v-click-outside="
      () => {
        isPopup = false
      }
    "
  >
    <el-button class="text-white border-primary/50 hover:bg-primary/10 hover:border-primary transition-all duration-300 text-sm px-4 py-2 rounded-md" @click="handlePopup" text>
      <span>{{ activeName }}</span>
      <el-icon class="ml-2 transition-transform duration-300" :class="{ 'rotate-180': isPopup }">
        <ArrowDown />
      </el-icon>
    </el-button>
    <div class="absolute top-full left-0 mt-2 bg-gray-900 border border-gray-700 rounded-md shadow-lg z-50 min-w-[120px] max-w-[200px] overflow-hidden" v-if="isPopup">
      <div
        v-for="param in partition.params"
        class="px-4 py-3 cursor-pointer text-sm text-gray-300 hover:bg-gray-800 hover:text-primary transition-colors duration-200"
        :class="{ 'text-primary font-medium bg-primary/10 border-l-4 border-primary': partition.activeValue === param.paramValue }"
        @click="handlePartitionChange(param)"
      >
        <span>
          {{ param.displayName }}
        </span>
      </div>
    </div>
  </div>
</template>
