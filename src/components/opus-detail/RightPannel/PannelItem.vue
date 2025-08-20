<!--
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-04-02 20:06:47
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-06-12 22:00:33
 * @FilePath: \BiliLottery\src\components\opus-detail\RightPannel\AccountFuncDetail.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<script setup lang="ts">
import Placeholder from '@/components/opus-detail/RightPannel/PannelItems/Placeholder.vue'
import AccountHolder from '@/components/opus-detail/RightPannel/PannelItems/AccountHolder.vue'
import AccountSetting from '@/components/opus-detail/RightPannel/PannelItems/AccountSetting.vue'
import { useRoute } from 'vue-router';
import DashBoard from '@/components/opus-detail/RightPannel/PannelItems/SettingComponent/DashBoard.vue'
import AccountStatusBoard from '@/components/opus-detail/RightPannel/PannelItems/SettingComponent/AccountStatusBoard.vue'
import type { PageShowModel } from '@/models/account/page/model'
import { ref } from 'vue';

const props = defineModel<PageShowModel>()
const activeName = ref('1')


</script>

<template>
  <Placeholder v-if="!props"
    :inner_text="$router.currentRoute.value.params.account_name ? `没有当前账号【${$router.currentRoute.value.params.account_name} 】的信息！！( ゜- ゜)つロ` : `快选一个账号康康吧 ( ゜- ゜)つロ`">
  </Placeholder>
  <div class="dialog" v-else :class="{ hide: $route.params.account_name !== props.info.account_name }">
    <AccountHolder v-if="props.actived"></AccountHolder>
    <div class="send-box" v-if="props.actived">
      <AccountSetting :account_name="props.info.account_name"></AccountSetting>
      <el-collapse v-model="activeName" accordion >
        <el-collapse-item title="账号运行状况" name="1">
          <AccountStatusBoard v-model="props" style="overflow:scroll;"></AccountStatusBoard>
        </el-collapse-item>
        <el-collapse-item title="账号记录" name="2">
          <DashBoard></DashBoard>
        </el-collapse-item>
    </el-collapse>
  </div>
  </div>
</template>
