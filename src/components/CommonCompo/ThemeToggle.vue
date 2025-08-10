<template>
  <el-tooltip 
    :content="`当前主题：${themeStore.getThemeText()}，点击切换`" 
    placement="bottom"
    :show-after="500"
  >
    <el-button
      :icon="themeStore.getThemeIcon()"
      circle
      size="large"
      @click="themeStore.toggleTheme()"
      class="theme-toggle-btn"
      :class="{ 'is-dark': themeStore.currentTheme === 'dark' }"
    />
  </el-tooltip>
</template>

<script setup lang="ts">
import { useThemeStore } from '@/stores/theme'

const themeStore = useThemeStore()
</script>

<style scoped>
.theme-toggle-btn {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.theme-toggle-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.theme-toggle-btn.is-dark {
  background: var(--el-bg-color-overlay);
  border-color: var(--el-border-color);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
}

/* 移动端适配 */
@media (max-width: 768px) {
  .theme-toggle-btn {
    top: 10px;
    right: 10px;
  }
}

/* 动画效果 */
.theme-toggle-btn {
  animation: fadeIn 0.5s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
