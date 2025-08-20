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
  font-weight: 500;
  position: relative;
  cursor: pointer;
  display: inline-block;
  margin: 0 auto;
  font-size: 16px; /* 增加基础字体大小 */
  min-width: 120px; /* 设置最小宽度 */
  padding: 0 5px; /* 增加内边距 */
}

.hall-area-content .area-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between; /* 改为两端对齐 */
  color: #c9ccd0;
  white-space: nowrap; /* 防止文字换行 */
  overflow: hidden; /* 隐藏溢出内容 */
  text-overflow: ellipsis; /* 显示省略号 */
}

.hall-area-content .type-content {
  position: absolute;
  background-color: #1c1f2f;
  border: 1px solid #2f3446;
  box-sizing: border-box;
  color: #8d8f97;
  z-index: 10; /* 提高层级 */
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  width: 100%; /* 设置宽度 */
  min-width: 150px; /* 最小宽度 */
  top: 100%; /* 定位在按钮下方 */
  left: 0;
  margin-top: 5px; /* 与按钮的间距 */
  border-radius: 4px; /* 圆角 */
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3); /* 添加阴影 */
  padding: 5px; /* 内边距 */
}

.hall-area-content .type-content .text {
  background-color: #333645;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 12px; /* 增加内边距 */
  margin: 3px; /* 增加外边距 */
  border-radius: 4px; /* 圆角 */
  width: calc(100% - 6px); /* 宽度计算 */
  font-size: 14px; /* 字体大小 */
  transition: all 0.2s ease; /* 过渡效果 */
  cursor: pointer; /* 鼠标指针 */
}

.hall-area-content .type-content .selected {
  background-color: #494c59;
  color: #fff;
  font-weight: 500; /* 加粗 */
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2); /* 添加阴影 */
}

/* 添加悬停效果 */
.hall-area-content .type-content .text:hover:not(.selected) {
  background-color: #3d4055;
  color: #e0e0e0;
}

.hall-area-content .area-btn .arrow {
  margin-left: 5px; /* 与文字的间距 */
  font-size: 14px; /* 图标大小 */
  transition: all 0.3s ease; /* 过渡效果 */
}

.hall-area-content .area-btn .arrow-top {
  transform: rotate(180deg); /* 旋转方向修正 */
  transition: all 0.3s ease;
}

.hall-area-content .area-btn .arrow-bottom {
  transform: rotate(0deg); /* 旋转方向修正 */
  transition: all 0.3s ease;
}

.area-btn {
  font-weight: 500;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #c9ccd0;
  padding: 8px 12px; /* 增加内边距 */
  margin: 0;
  font-size: 16px; /* 增加字体大小 */
  border-radius: 4px; /* 添加圆角 */
  transition: all 0.2s ease; /* 添加过渡效果 */
  height: auto; /* 自适应高度 */
  line-height: 1.5; /* 增加行高 */
}

:deep(.el-button.is-text:not(.is-disabled):hover) {
  background-color: rgba(255, 255, 255, 0.05); /* 轻微背景变化 */
  color: #ffffff; /* 文字颜色变亮 */
}
</style>
