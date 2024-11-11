<!--
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-05-29 23:52:55
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-10-19 23:25:45
 * @FilePath: \Vue3FrontEndDemoExercise\src\components\opus-detail\LeftPannel\SingleUserInfo.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<script setup lang="ts">
import type { AccountInfoModel } from '@/models/account/account_model';

defineProps<{
  account_info: AccountInfoModel
}>()
</script>
<template>
  <div class="list-item">
    <div class="avatar" :title="account_info.account_name" ></div>
    <div class="name-box">
      <div class="name" :title="account_info.account_name">
        <div class="name-value">{{ account_info.account_name }}</div>
      </div>
      <div class="last-word" :title="`UID：` + account_info.info?.uid">UID：{{ account_info.info?.uid }}</div>
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
