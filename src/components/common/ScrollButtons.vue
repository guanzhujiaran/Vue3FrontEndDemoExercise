<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Top, Bottom } from '@element-plus/icons-vue'

// 定义组件属性
const props = defineProps({
  // 显示回到顶部按钮的滚动阈值
  topThreshold: {
    type: Number,
    default: 300
  },
  // 显示滚动到底部按钮的距离阈值
  bottomThreshold: {
    type: Number,
    default: 100
  }
})

// 状态变量
const showBackToTop = ref(false)
const showScrollToBottom = ref(false)

// 监听滚动事件，控制按钮的显示
const handleScroll = () => {
  const scrollY = window.scrollY
  const windowHeight = window.innerHeight
  const documentHeight = document.documentElement.scrollHeight

  // 当滚动超过设定阈值时显示回到顶部按钮
  showBackToTop.value = scrollY > props.topThreshold

  // 当没有滚动到底部时显示一键到底按钮（距离底部设定阈值以上）
  showScrollToBottom.value = documentHeight - (scrollY + windowHeight) > props.bottomThreshold
}

// 回到顶部
const scrollToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
}

// 滚动到底部
const scrollToBottom = () => {
  window.scrollTo({
    top: document.documentElement.scrollHeight,
    behavior: 'smooth'
  })
}

onMounted(() => {
  // 添加滚动事件监听
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  // 移除滚动事件监听
  window.removeEventListener('scroll', handleScroll)
})

// 暴露方法给父组件
defineExpose({
  scrollToTop,
  scrollToBottom
})
</script>

<template>
  <div class="scroll-buttons">
    <!-- 回到顶部按钮 -->
    <el-button
      v-show="showBackToTop"
      class="back-to-top-btn"
      circle
      type="info"
      @click="scrollToTop"
    >
      <el-icon><Top /></el-icon>
    </el-button>

    <!-- 滚动到底部按钮 -->
    <el-button
      v-show="showScrollToBottom"
      class="scroll-to-bottom-btn"
      circle
      type="primary"
      @click="scrollToBottom"
    >
      <el-icon><Bottom /></el-icon>
    </el-button>
  </div>
</template>

<style scoped>
.scroll-buttons {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: flex-end;
}

.back-to-top-btn,
.scroll-to-bottom-btn {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}
</style>
