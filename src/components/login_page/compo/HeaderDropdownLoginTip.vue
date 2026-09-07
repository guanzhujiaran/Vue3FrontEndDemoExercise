<script setup lang="ts">
import { openGlobalLoginModalKey } from '@/models/inject/inject_type.ts'
import { inject } from 'vue'
import { useI18n } from 'vue-i18n'
import loginTip1Url from '@/assets/svgs/login_tip_1.svg?component'
import loginTip2Url from '@/assets/svgs/login_tip_2.svg?component'
import loginTip3Url from '@/assets/svgs/login_tip_3.svg?component'
import loginTip4Url from '@/assets/svgs/login_tip_4.svg?component'

const openGlobalLoginModal = inject(openGlobalLoginModalKey)
const { t } = useI18n()
</script>

<template>
  <div class="login-panel-popover p-3 flex flex-col gap-6 size-max">
    <p class="title text-base font-medium text-text-primary">{{ t('common.loginTipTitle') }}</p>
    <div class="login-tip-content grid grid-cols-2 gap-x-40 gap-y-6">
      <div class="login-tip-content-item flex items-center gap-1">
        <el-icon size="28" class="svg-icon fill-primary">
          <loginTip1Url />
        </el-icon>
        <span class="lt-text text-sm text-text-regular">{{ t('common.loginTipFreeVideo') }}</span>
      </div>
      <div class="login-tip-content-item flex items-center gap-1">
        <el-icon size="28" class="svg-icon fill-primary">
          <loginTip2Url />
        </el-icon>
        <span class="lt-text text-sm text-text-regular">{{ t('common.loginTipSync') }}</span>
      </div>
      <div class="login-tip-content-item flex items-center gap-1">
        <el-icon size="28" class="svg-icon fill-primary">
          <loginTip3Url />
        </el-icon>
        <span class="lt-text text-sm text-text-regular">{{ t('common.loginTipComment') }}</span>
      </div>
      <div class="login-tip-content-item flex items-center gap-1">
        <el-icon size="28" class="svg-icon fill-primary">
          <loginTip4Url />
        </el-icon>
        <span class="lt-text text-sm text-text-regular">{{ t('common.loginTipDrama') }}</span>
      </div>
    </div>
    <el-button type="primary" @click="openGlobalLoginModal" class="login-btn mt-2">{{ t('common.loginNow') }}</el-button>
    <div class="register-tip text-center text-sm text-text-secondary">
      {{ t('common.registerTip') }} <span class="register-exper text-primary cursor-pointer hover:underline" @click="openGlobalLoginModal">
        {{ t('common.registerNow') }} </span>
    </div>
  </div>
</template>
