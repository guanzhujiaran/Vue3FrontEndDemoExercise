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
  <div class="login-panel-popover">
    <p class="title">登录后你并不可以：</p>
    <div class="login-tip-content">
      <div class="login-tip-content-item">
        <el-icon size="24" color="var(--el-color-primary)" class="svg-icon">
          <loginTip1Url />
        </el-icon>
        <span class="lt-text">免费看高清视频</span>
      </div>
      <div class="login-tip-content-item">
        <el-icon size="24" color="var(--el-color-primary)" class="svg-icon">
          <loginTip2Url />
        </el-icon>
        <span class="lt-text">多端同步播放记录</span>
      </div>
      <div class="login-tip-content-item">
        <el-icon size="24" color="var(--el-color-primary)" class="svg-icon">
          <loginTip3Url />
        </el-icon>
        <span class="lt-text">发表弹幕/评论</span>
      </div>
      <div class="login-tip-content-item">
        <el-icon size="24" color="var(--el-color-primary)" class="svg-icon">
          <loginTip4Url />
        </el-icon>
        <span class="lt-text">热门番剧影视看不停</span>
      </div>
    </div>
    <el-button type="primary" @click="openGlobalLoginModal" class="login-btn">立即登录</el-button>
    <div class="register-tip">
      首次使用？ <span class="register-exper" @click="openGlobalLoginModal"> 点我注册 </span>
    </div>
  </div>
</template>

<style scoped>
@import '@/assets/components/dropdown/header-dropdown-login-tip-tailwind.css';
</style>
