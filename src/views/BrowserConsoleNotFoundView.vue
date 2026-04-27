<!--
 * @FilePath: \Vue3FrontEndDemoExercise\src\views\BrowserConsoleNotFoundView.vue
 * @Description: RPA浏览器控制台 - 指纹不存在或不属于当前账号
-->
<template>
  <FlexContainer class="h-screen">
    <!-- 控制台子导航栏 -->
    <header
      class="bg-bg flex shrink-0 items-center gap-4 border-b border-(--el-border-color-lighter) px-5 py-3"
    >
      <el-button size="default" plain :icon="ArrowLeft" @click="goBack" round>返回列表</el-button>
      <el-divider direction="vertical" class="mx-1!" />
      <el-icon class="text-primary" :size="20"><Monitor /></el-icon>
      <span class="text-base font-semibold">浏览器控制台</span>
    </header>

    <!-- 内容区 -->
    <FlexContainer>
      <div
        class="flex flex-1 flex-col items-center justify-center gap-4 text-[var(--el-text-color-secondary)]"
      >
        <el-icon :size="48" class="text-[var(--el-color-warning)]"><WarningFilled /></el-icon>
        <p class="text-base font-medium">找不到该浏览器指纹</p>
        <p class="text-sm">该指纹不存在或不属于当前账号，请检查链接是否正确</p>
        <el-button type="primary" @click="goBack" round>返回列表</el-button>
      </div>
    </FlexContainer>
  </FlexContainer>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Monitor, ArrowLeft, WarningFilled } from '@element-plus/icons-vue'
import { RouteName } from '@/models/router/index'

const router = useRouter()

const goBack = () => {
  router.push({ name: RouteName.BROWSER_MANAGEMENT })
}
</script>


