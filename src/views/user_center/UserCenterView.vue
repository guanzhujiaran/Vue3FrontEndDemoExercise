<!--
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-04-01 13:10:35
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-06-08 18:24:46
 * @FilePath: \BiliLottery\src\views\UserCenterView.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<script setup lang="ts">
import left_pannel from '@/components/opus-detail/LeftPannel/PannelItem.vue'
import { onMounted, ref } from 'vue'
import router from '@/router'
import { isLogin } from '@/api/user/utils'
import type { AccountInfoModel } from '@/models/account/account_model'
import accountApi from '@/api/account/account_api'
import GlobalToast from '@/components/CommonCompo/GlobalToast.vue'
import RightPannelTopBar from '@/components/CommonCompo/RightPannelTopBar.vue'
import Placeholder from '@/components/opus-detail/RightPannel/PannelItems/Placeholder.vue'
import { useRoute } from 'vue-router'
const route = useRoute()
const toast = ref<InstanceType<typeof GlobalToast> | null>(null)
const placeholder_props = ref<{
  is_show: boolean;
  inner_text: string;
}>({
  is_show: false,
  inner_text: "选一个账号查看吧"
})
let AccountInfos = ref<Array<AccountInfoModel>>([])
onMounted(async () => {
  let islogin = (await isLogin())[0];
  if (islogin && ((placeholder_props.value.is_show = route.name === '用户中心') || AccountInfos.value.length === 0)) {
    accountApi.GetAllAccounts().then(resp => {
      if (resp.code) {
        let ___ = `获取账号信息失败！${resp.msg}`
        placeholder_props.value.is_show = true
        placeholder_props.value.inner_text = ___;
        return
      }
      AccountInfos.value = resp.data;
      if (resp.data.length === 0) {
        placeholder_props.value.is_show = true
        let ___ = "您还没有添加账号，请先添加账号"
        placeholder_props.value.inner_text = ___;
        return
      }
    })
    placeholder_props.value.is_show && toast.value!.info(placeholder_props.value.inner_text)
  }
  else {
    !islogin && (toast.value!.info(`请先登录！`), router.push(`/`))
  }
})

</script>

<template>
  <GlobalToast ref="toast"></GlobalToast>
  <div class="container">
    <div class="space-left">
      <left_pannel :account_info_list="AccountInfos" :side_bar_tittle="`我的账号`">
      </left_pannel>
    </div>
    <div class="space-right">
      <RightPannelTopBar
        :title="$route.params.account_name ? `账号【${$route.params.account_name}】` : `${$route.name?.toString()}`">
      </RightPannelTopBar>
      <div class="space-right-bottom ps">
        <Placeholder v-if="$route.name === '用户中心'" v-model="placeholder_props" />
        <RouterView />

      </div>
    </div>
  </div>
  <div>{{ placeholder_props }}</div>
</template>
