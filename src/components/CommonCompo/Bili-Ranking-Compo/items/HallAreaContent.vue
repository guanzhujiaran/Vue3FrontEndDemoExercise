<script setup lang="ts">
import { ClickOutside as vClickOutside } from 'element-plus'
import { ref } from 'vue'
import type { PartitionParamsInfo, RankingPartition } from '@/models/api/lottery/lotdata.ts'

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
    class="hall-area-content"
    v-click-outside="
      () => {
        isPopup = false
      }
    "
  >
    <el-button class="area-btn" @click="handlePopup" text>
      <span>{{ activeName }}</span>
      <el-icon class="arrow" :class="{ 'arrow-top': isPopup, 'arrow-bottom': !isPopup }">
        <ArrowDown />
      </el-icon>
    </el-button>
    <div class="type-content" v-if="isPopup">
      <div
        v-for="param in partition.params"
        class="text"
        :class="{ selected: partition.activeValue === param.paramValue }"
        @click="handlePartitionChange(param)"
      >
        <span>
          {{ param.displayName }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import '@/assets/components/ranking/hall-area-content-tailwind.css';
</style>
