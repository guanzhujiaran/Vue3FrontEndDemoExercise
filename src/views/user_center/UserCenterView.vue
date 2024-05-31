<!--
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-04-01 13:10:35
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-05-31 14:08:35
 * @FilePath: \BiliLottery\src\views\UserCenterView.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<script setup lang="ts">
import left_pannel from '@/components/opus-detail/LeftPannel/PannelItem.vue'
import { ref } from 'vue'
import { type TAccountInfo } from '@/components/opus-detail/type'
import right_pannel from '@/components/opus-detail/RightPannel/PannelItem.vue'
import router from '@/router'
import { isLogin } from '@/api/user/utils'
let islogin = (await isLogin())[0];
islogin?router.push(`/user-center/`):router.push(`/`)

//TODO 判断是否登录
let test_AccountInfo = ref<Array<TAccountInfo>>([
  {
    account_name: '1',
    uid: '2',
    uname: '3',
    Vip: '4',
    Level: 114514
  },
  {
    account_name: 'cookie1',
    uid: '4237378',
    uname: '后藤波奇',
    Vip: '十年大会员',
    Level: 6
  }
])
</script>

<template>
  <div class="container">
    <div class="space-left">
      <left_pannel :account_info_list="test_AccountInfo" :side_bar_tittle="`我的账号`">
      </left_pannel>
    </div>
    <div class="space-right">
      <right_pannel></right_pannel>
    </div>
  </div>
</template>
