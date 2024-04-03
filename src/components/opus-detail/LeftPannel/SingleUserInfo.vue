<script setup lang="ts">
import { type TAccountInfo } from '../type'
defineProps<{
  account_info: TAccountInfo
}>()
</script>
<template>
  <div class="list-item">
    <div class="avatar" :title="account_info.account_name" ></div>
    <div class="name-box">
      <div class="name" :title="account_info.account_name">
        <div class="name-value">{{ account_info.account_name }}</div>
      </div>
      <div class="last-word" :title="`UID：` + account_info.uid">UID：{{ account_info.uid }}</div>
      <div class="last-word" :title="`用户名：` + account_info.uname">
        用户名：{{ account_info.uname }}
      </div>
      <div class="last-word" :title="`等级：` + account_info.Level">
        等级：{{ account_info.Level }}
      </div>
      <div class="last-word" :title="`大会员：` + account_info.Vip">
        大会员：{{ account_info.Vip }}
      </div>
    </div>
  </div>
</template>
