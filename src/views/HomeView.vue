<!--
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-05-29 23:52:55
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-05-31 14:10:04
 * @FilePath: \Vue3FrontEndDemoExercise\src\views\HomeView.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<script setup lang="ts">
import LoginCompo from '@/components/login_page/compo/LoginCompo.vue'
import { showGlobalLoading, hideGlobalLoading, withGlobalLoading } from '@/utils/globalLoading'
import '@/assets/mobile-login.css'
import { ElContainer } from 'element-plus'

// 测试基本加载功能
const testBasicLoading = async () => {
  showGlobalLoading('测试加载中...')
  setTimeout(() => {
    hideGlobalLoading()
  }, 2000)
}

// 测试包装器功能
const testWrapperLoading = async () => {
  const asyncOperation = async () => {
    await new Promise(resolve => setTimeout(resolve, 3000))
    return '操作完成'
  }
  
  const operationWithLoading = withGlobalLoading(asyncOperation, '包装器测试中...')
  const result = await operationWithLoading()
  console.log('结果:', result)
}

// 测试长时间加载
const testLongLoading = async () => {
  showGlobalLoading('长时间操作中...')
  setTimeout(() => {
    hideGlobalLoading()
  }, 5000)
}
const isTest = import.meta.env.VITE_BILI_ENV === 'dev'
</script>

<template>
  <ElContainer class="home-container">
    <LoginCompo />
  </ElContainer>
</template>

<style scoped>
.home-container {
  display: flex;
  justify-content: center;
  align-items: center;
  }
</style>
