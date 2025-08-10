/*
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-12-19 10:00:00
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-12-19 10:00:00
 * @FilePath: \Vue3FrontEndDemoExercise\docs\examples\global-loading-example.ts
 * @Description: 全局加载遮罩使用示例
 */

import { showGlobalLoading, hideGlobalLoading, withGlobalLoading } from '@/utils/globalLoading'
import accountApi from '@/api/account/account_api'

// 示例1: 基本使用
export const basicUsageExample = async () => {
  try {
    showGlobalLoading('获取账户信息中...')
    const result = await accountApi.GetAllAccounts()
    console.log('账户信息:', result)
  } catch (error) {
    console.error('获取账户信息失败:', error)
  } finally {
    hideGlobalLoading()
  }
}

// 示例2: 使用包装器函数
export const wrapperUsageExample = async () => {
  // 包装API调用
  const getAllAccountsWithLoading = withGlobalLoading(
    accountApi.GetAllAccounts,
    '获取账户信息中...'
  )
  
  try {
    const result = await getAllAccountsWithLoading()
    console.log('账户信息:', result)
  } catch (error) {
    console.error('获取账户信息失败:', error)
  }
}

// 示例3: 在Vue组件中使用
export const vueComponentExample = `
<script setup lang="ts">
import { ref } from 'vue'
import { showGlobalLoading, hideGlobalLoading } from '@/utils/globalLoading'
import accountApi from '@/api/account/account_api'

const accounts = ref([])

const loadAccounts = async () => {
  try {
    showGlobalLoading('加载账户列表...')
    const result = await accountApi.GetAllAccounts()
    accounts.value = result.data || []
  } catch (error) {
    console.error('加载账户失败:', error)
  } finally {
    hideGlobalLoading()
  }
}

const addAccount = async (accountName: string) => {
  try {
    showGlobalLoading('添加账户中...')
    await accountApi.AddAccount(accountName)
    await loadAccounts() // 重新加载列表
  } catch (error) {
    console.error('添加账户失败:', error)
  } finally {
    hideGlobalLoading()
  }
}
</script>

<template>
  <div>
    <button @click="loadAccounts">加载账户</button>
    <button @click="addAccount('新账户')">添加账户</button>
    
    <div v-for="account in accounts" :key="account.account_name">
      {{ account.account_name }}
    </div>
  </div>
</template>
`

// 示例4: 复杂异步操作
export const complexAsyncExample = async () => {
  const complexOperation = async () => {
    // 模拟复杂的异步操作
    await new Promise(resolve => setTimeout(resolve, 2000))
    return '操作完成'
  }
  
  const operationWithLoading = withGlobalLoading(
    complexOperation,
    '处理复杂操作中...'
  )
  
  try {
    const result = await operationWithLoading()
    console.log('操作结果:', result)
  } catch (error) {
    console.error('操作失败:', error)
  }
}

// 示例5: 多个并发操作
export const concurrentOperationsExample = async () => {
  const operations = [
    () => accountApi.GetAllAccounts(),
    () => accountApi.GetAccountInfoByAccountName('test'),
    () => accountApi.GetAccountRunningStatus('test')
  ]
  
  try {
    showGlobalLoading('执行多个操作中...')
    
    // 并发执行多个操作
    const results = await Promise.all(
      operations.map(op => op())
    )
    
    console.log('所有操作完成:', results)
  } catch (error) {
    console.error('操作失败:', error)
  } finally {
    hideGlobalLoading()
  }
}
