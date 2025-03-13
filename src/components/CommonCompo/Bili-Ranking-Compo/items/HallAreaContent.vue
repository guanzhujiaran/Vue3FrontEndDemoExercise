<script setup lang="ts">
import { ClickOutside as vClickOutside } from 'element-plus'
import { ArrowDown, ArrowUp } from '@element-plus/icons-vue'
import { ref } from 'vue'
import type { PartitionParamsInfo, RankingPartition } from '@/models/lottery/lotdata.ts'

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
.hall-area-content {
  font-size: 0.426667rem;
  font-weight: 500;
  position: relative;
  cursor: pointer;
  display: inline-block;
  margin: 0 auto;
}

.hall-area-content .area-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #c9ccd0;
}

.hall-area-content .type-content {
  font-size: 0.32rem;
  top: 0.8rem;
  border-radius: 0.16rem;
  padding: 0.266667rem;
  position: absolute;
  right: -1rem;
  background-color: #1c1f2f;
  border: 1px solid #2f3446;
  box-sizing: border-box;
  color: #8d8f97;
  z-index: 2;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.hall-area-content .type-content .text {
  width: 1.92rem;
  height: 0.693333rem;
  line-height: 0.693333rem;
  padding: 0.08rem 0.32rem;
  margin: 0.213333rem 0.186667rem;
  background-color: #333645;
  border-radius: 0.106667rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hall-area-content .type-content .selected {
  background-color: #494c59;
  color: #fff;
}

.hall-area-content .area-btn .arrow {
  margin-left: 0.106667rem;
  width: 0.32rem;
  height: 0.32rem;
}

.hall-area-content .area-btn .arrow .arrow-top {
  transform: rotate(0);
  transition: all 0.3s ease-in 0.1s;
}

.hall-area-content .area-btn .arrow-bottom {
  transform: rotate(-180deg);
  transition: all 0.3s ease-out 0.1s;
}

.area-btn {
  font-size: 0.426667rem;
  font-weight: 500;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #c9ccd0;
  padding: 0;
  margin: 0;
}

:deep(.el-button.is-text:not(.is-disabled):hover) {
  background-color: transparent;
}
</style>
