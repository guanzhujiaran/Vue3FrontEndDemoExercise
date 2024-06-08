<!--
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-04-02 20:06:47
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-06-07 09:52:18
 * @FilePath: \BiliLottery\src\components\opus-detail\RightPannel\AccountFuncDetail.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import Placeholder from '@/components/opus-detail/RightPannel/PannelItems/Placeholder.vue'
import AccountHolder from '@/components/opus-detail/RightPannel/PannelItems/AccountHolder.vue'
import AccountSetting from '@/components/opus-detail/RightPannel/PannelItems/AccountSetting.vue'
import { useRoute } from 'vue-router'
import type { AccountInfoModel } from '@/models/account/account_model'
import accountApi from '@/api/account/account_api'
const route = useRoute()
const default_account_info_model: AccountInfoModel = {
  account_name: '',
  uid: '',
}
/**
 * 通过账号名获取账号设置详情
 * @param account_name 
 */
const API_get_account_detail = async (account_name: string): Promise<AccountInfoModel> => {
  let account_info_resp = account_name ? await accountApi.GetAccountInfoByAccountName(account_name) : null;
  return account_info_resp && account_info_resp.code ? default_account_info_model : account_info_resp!.data as AccountInfoModel
}


watchEffect(() => {
  let route_account_name = route.params.account_name ? route.params.account_name : ''
  API_get_account_detail(route_account_name as string).then((el) => (account_detail.value = el))
})
const account_detail = ref<AccountInfoModel>(default_account_info_model) //TODO 通过api，使用传递过来的account_info发起ajax请求，获取到账号详情
</script>

<template>

    <Placeholder v-if="!account_detail.account_name"
      :inner_text="route.params.account_name ? `没有当前账号【${route.params.account_name} 】的信息！！( ゜- ゜)つロ` : `快选一个账号康康吧 ( ゜- ゜)つロ`">
    </Placeholder>
    <div class="dialog" v-else>
      <AccountHolder></AccountHolder>
      <AccountSetting :account_name="account_detail.account_name"></AccountSetting>
    </div>
</template>
