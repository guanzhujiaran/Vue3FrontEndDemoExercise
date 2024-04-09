<!--
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-04-02 20:06:47
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-04-04 16:06:49
 * @FilePath: \BiliLottery\src\components\opus-detail\RightPannel\AccountFuncDetail.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { type TAccountDetail } from '../type'
import Placeholder from './PannelItems/Placeholder.vue'
import AccountHolder from './PannelItems/AccountHolder.vue'
import AccountSetting from './PannelItems/AccountSetting.vue'
import { useRoute } from 'vue-router'
const route = useRoute()
const API_get_account_detail = async (account_name: string): Promise<TAccountDetail> => {
  if (!account_name) {
    return {}
  }
  // 发起ajax请求，获取账号详情
  if (account_name == '1') {
    return {
      account_name: account_name,
      lottery_setting: { 1: 2, 3: 4, 5: 6, 7: 8 }
    }
  }
  let lottery_setting = {}
  if (Object.keys(lottery_setting).length == 0) {
    return {
      account_name: account_name
    }
  } else {
    return {
      account_name: account_name,
      lottery_setting: lottery_setting
    }
  }
}

watchEffect(() => {
  let route_account_name = route.params.account_name ? route.params.account_name : ''
  API_get_account_detail(route_account_name as string).then((el) => (account_detail.value = el))
})
const account_detail = ref<TAccountDetail>({
  account_name: ''
}) //TODO 通过api，使用传递过来的account_info发起ajax请求，获取到账号详情
</script>

<template>
  <div class="space-right-bottom ps">
    <Placeholder v-if="Object.keys(account_detail).length <= 1"></Placeholder>
    <div v-else class="space-right-bottom ps">
      <AccountHolder></AccountHolder>
      <AccountSetting :account_name="account_detail.account_name"></AccountSetting>
    </div>
  </div>
</template>
