<script setup lang="ts">
import { RouterLink } from 'vue-router'
import GlobalToast from '@/components/CommonCompo/GlobalToast.vue'
import { inject, onMounted, onUnmounted } from 'vue'
import router from '@/router'
import { ScreenTypeEnum } from '@/models/global_var/global_var_model.ts'
import { useInject, KeysEnum } from '@/models/base/provide_model.ts'

const globalVars = useInject(KeysEnum.globalVars)
const checkScreenSize = () => {
  const width = window.innerWidth
  if (width < 480) {
    globalVars.value.screen_size = ScreenTypeEnum.small // 小屏
  } else if (width < 620) {
    globalVars.value.screen_size = ScreenTypeEnum.medium // 中屏
  } else {
    globalVars.value.screen_size = ScreenTypeEnum.large // 大屏
  }
}
// 监听窗口大小变化
onMounted(() => {
  window.addEventListener('resize', checkScreenSize)
  // 初始化检查一次屏幕尺寸
  checkScreenSize()
})
// 组件销毁时移除监听器
onUnmounted(() => {
  window.removeEventListener('resize', checkScreenSize)
})
//好看的粉色#fb7299
</script>
<template>
  <div id="bili-header">
    <GlobalToast />
    <div class="el-mini-header" style="margin-bottom: 0.5rem">
      <el-menu :default-active="$route.path" mode="horizontal" router>
        <el-menu-item index="/">主页</el-menu-item>
        <el-menu-item index="/app/user-center">用户中心</el-menu-item>
        <el-menu-item index="/app/lot-data">抽奖数据</el-menu-item>
        <el-menu-item index="/samsclub/info">山姆数据</el-menu-item>
        <el-menu-item index="/app/Feedback">反馈区</el-menu-item>
      </el-menu>
    </div>
  </div>
</template>
<style scoped></style>
