<!--
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-05-29 23:52:55
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-06-04 14:36:43
 * @FilePath: \Vue3FrontEndDemoExercise\src\components\opus-detail\RightPannel\PannelItems\AccountSetting.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<script setup lang="ts">
//TODO 这边需要ajax获取一下账号的设置，然后保存的时候再上传回去
import LoadingCard from '@/components/CommonCompo/LoadingCard.vue'
import LotterySettingModule from './SettingComponent/LotterySettingModule.vue'
import { onMounted, ref } from 'vue';
import type { AccountSettingModel } from '@/models/account/account_model';
import accountApi from '@/api/account/account_api';

const lottery_setting = ref<AccountSettingModel>()
const is_loading_setting = ref<boolean>()
const props = defineProps<{
  account_name: string
}>()

onMounted(
  async () => {
    //TODO 通过API获取账号设置
    is_loading_setting.value = true;
    let lot_setting_resp = await accountApi.GetAccountLotterySettingByAccountName(props.account_name)
    lottery_setting.value = typeof lot_setting_resp.data !== 'string' ? lot_setting_resp.data : undefined
    is_loading_setting.value = false;
  }
)
</script>

<template>
  <div class="config"> 
    <!-- 做成控制台 -->
    
    <LotterySettingModule :title="`账号【${account_name}】设置`"></LotterySettingModule>
  </div>
  <LoadingCard v-show="is_loading_setting" />
</template>
