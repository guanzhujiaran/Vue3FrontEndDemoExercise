<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { isMobileDevice } from '@/utils/Browser/useDeviceDetect.ts'
import { useThemeStore } from '@/stores/theme'

/**
 * RpaMobileTip —— RPA 浏览器模块的移动端提示条
 *
 * RPA 控制台依赖 WebRTC 实时画面、浏览器同步操控与动作拖拽编辑，移动端体验明显更差，
 * 因此在移动端 UA 下提示「改用 PC 端体验更好」；用户关闭后记入 localStorage，不再重复打扰。
 */

const DISMISS_STORAGE_KEY = 'rpa_mobile_tip_dismissed'

const { t } = useI18n()
const themeStore = useThemeStore()

function isDismissed() {
  try {
    return localStorage.getItem(DISMISS_STORAGE_KEY) === '1'
  } catch {
    // 隐私模式等场景下 localStorage 不可用：退化为照常提示
    return false
  }
}

// 在 setup 阶段就判定，避免挂载后才插入提示条造成内容跳动（UA 在会话内不会变化）
const visible = ref(isMobileDevice() === 2 && !isDismissed())

function handleClose() {
  visible.value = false
  try {
    localStorage.setItem(DISMISS_STORAGE_KEY, '1')
  } catch {
    // 忽略存储失败
  }
}
</script>

<template>
  <el-alert
    v-if="visible"
    class="rpa-mobile-tip shrink-0"
    type="warning"
    :effect="themeStore.themeEffectString"
    show-icon
    @close="handleClose"
  >
    <template #title>
      <span class="rpa-mobile-tip__title font-medium">{{ t('rpa.mobileTipTitle') }}</span>
    </template>
    <span class="rpa-mobile-tip__desc text-xs leading-relaxed">{{ t('rpa.mobileTipDesc') }}</span>
  </el-alert>
</template>
