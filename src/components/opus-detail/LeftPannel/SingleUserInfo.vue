<script setup lang="ts">
import type { AccountInfoModel } from '@/models/account/account_model'
import { BiliImg } from '@/assets/img/BiliImg.ts'

defineProps<{
  account_info: AccountInfoModel
}>()
</script>
<template>
  <div class="list-item">
    <el-avatar size="large" class="avatar" :title="account_info.account_name">
      <img
        size="32"
        :src="account_info.info?.face ?? BiliImg.face.noface"
        referrerpolicy="no-referrer"
        alt="头像加载失败"
      />
    </el-avatar>
    <div class="name-box">
      <div class="name" :title="account_info.account_name">
        <div class="name-value">{{ account_info.account_name }}</div>
      </div>
      <div class="last-word" :title="`UID：` + account_info.info?.uid">
        UID：{{ account_info.info?.uid }}
      </div>
      <div class="last-word" :title="`用户名：` + account_info.info?.uname">
        用户名：{{ account_info.info?.uname }}
      </div>
      <div class="last-word" :title="`等级：` + account_info.info?.level">
        等级：{{ account_info.info?.level }}
      </div>
      <div class="last-word" :title="`大会员：` + account_info.info?.vip">
        大会员：{{ account_info.info?.vip }}
      </div>
    </div>
  </div>
</template>
