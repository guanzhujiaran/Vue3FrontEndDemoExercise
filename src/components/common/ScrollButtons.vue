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
  <div class="fixed right-[var(--spacing-16)] bottom-[var(--spacing-16)] z-[1000] flex flex-col gap-[var(--spacing-8)] items-end">
    <!-- 回到顶部按钮 -->
    <el-button
      v-show="showBackToTop"
      class="[box-shadow:0_1px_2px_rgba(0,0,0,0.1)]"
      circle
      type="info"
      @click="scrollToTop"
      :icon="Top"
    >
    </el-button>

    <!-- 滚动到底部按钮 -->
    <el-button
      v-show="showScrollToBottom"
      class="[box-shadow:0_1px_2px_rgba(0,0,0,0.1)]"
      circle
      type="primary"
      @click="scrollToBottom"
      :icon="Bottom"
    >
    </el-button>
  </div>
</template>
