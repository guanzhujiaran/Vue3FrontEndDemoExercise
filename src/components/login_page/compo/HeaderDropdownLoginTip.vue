<script setup lang="ts">
import { openGlobalLoginModalKey } from '@/models/inject/inject_type.ts'
import { inject } from 'vue'
import loginTip1Url from '@/assets/svgs/login_tip_1.svg?component'
import loginTip2Url from '@/assets/svgs/login_tip_2.svg?component'
import loginTip3Url from '@/assets/svgs/login_tip_3.svg?component'
import loginTip4Url from '@/assets/svgs/login_tip_4.svg?component'

const openGlobalLoginModal = inject(openGlobalLoginModalKey)
</script>

<template>
  <div class="login-panel-popover p-3 flex flex-col gap-6 size-max">
    <p class="title text-base font-medium text-text-primary">登录后你并不可以：</p>
    <div class="login-tip-content grid grid-cols-2 gap-x-40 gap-y-6">
      <div class="login-tip-content-item flex items-center gap-1">
        <el-icon size="28" class="svg-icon fill-primary">
          <loginTip1Url />
        </el-icon>
        <span class="lt-text text-sm text-text-regular">免费看高清视频</span>
      </div>
      <div class="login-tip-content-item flex items-center gap-1">
        <el-icon size="28" class="svg-icon fill-primary">
          <loginTip2Url />
        </el-icon>
        <span class="lt-text text-sm text-text-regular">多端同步播放记录</span>
      </div>
      <div class="login-tip-content-item flex items-center gap-1">
        <el-icon size="28" class="svg-icon fill-primary">
          <loginTip3Url />
        </el-icon>
        <span class="lt-text text-sm text-text-regular">发表弹幕/评论</span>
      </div>
      <div class="login-tip-content-item flex items-center gap-1">
        <el-icon size="28" class="svg-icon fill-primary">
          <loginTip4Url />
        </el-icon>
        <span class="lt-text text-sm text-text-regular">热门番剧影视看不停</span>
      </div>
    </div>
    <el-button type="primary" @click="openGlobalLoginModal" class="login-btn mt-2">立即登录</el-button>
    <div class="register-tip text-center text-sm text-text-secondary">
      首次使用？ <span class="register-exper text-primary cursor-pointer hover:underline" @click="openGlobalLoginModal">
        点我注册 </span>
    </div>
  </div>
</template>
