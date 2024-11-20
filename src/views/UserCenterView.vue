<!--
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-04-01 13:10:35
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-11-01 22:13:39
 * @FilePath: \BiliLottery\src\views\UserCenterView.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<script setup lang="ts">
import { isLogin } from '@/api/user/utils';
import RightPannelTopBar from '@/components/CommonCompo/RightPannelTopBar.vue';
import router from '@/router';
import emitter from '@/utils/mitt'
import { computed, nextTick, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue';
import LeftPannel from '@/components/opus-detail/LeftPannel/PannelItem.vue';
import RightPannel from '@/components/opus-detail/RightPannel/PannelItem.vue';
import accountApi from '@/api/account/account_api';
import UserConfig from '@/components/opus-detail/RightPannel/PannelItems/SettingComponent/UserConfig.vue'
import Placeholder from '@/components/opus-detail/RightPannel/PannelItems/Placeholder.vue';
import { useRoute } from 'vue-router';
import type { PageShowModel } from '@/models/account/page/model.ts'
import { account_left_pannel_reload_key } from '@/models/inject/inject_type';

const route = useRoute();

let AccountInfos = ref<PageShowModel[]>([])

const placeholder_is_show = computed(() => (route.name === '账号详情' || route.name === '用户中心') && !AccountInfos.value.some(el => el.is_show))
const placeholder_inner_text = ref('')
const placeholder_model = computed<{ inner_text: string, is_show: boolean }>(() => {
  return {
    is_show: placeholder_is_show.value,
    inner_text: placeholder_inner_text.value ? placeholder_inner_text.value : `选择一个账号康康`
  }
})


onMounted(async () => {
  if (await isLogin().then(resp => {
    if (resp[0]) {
      return false
    }
    router.push(`/`)
    return true
  })) { return }
  await handle_left_pannel_accounts()
  handle_route_change(route);
  placeholder_inner_text.value && emitter.emit('toast', { t: placeholder_inner_text.value })
})
const handle_left_pannel_accounts = async () => {
  await accountApi.GetAllAccounts().then(resp => {
    if (resp.code) {
      placeholder_inner_text.value = `获取账号信息失败！${resp.msg}`
      return
    }
    AccountInfos.value = resp.data.map(el => {
      return {
        info: el,
        is_show: false,
        actived: false
      }
    });
    // AccountInfos.value.sort((a,b)=>{
    //   return a.info.account_name.localeCompare(b.info.account_name);
    // });
    if (resp.data.length === 0) {
      placeholder_inner_text.value = "您还没有添加账号，请先添加账号";
      return
    }
  })
}
/**
 * 
 * @param el route
 */
const handle_route_change = (el: any) => {
  AccountInfos.value.map(e => e.is_show = false);
  AccountInfos.value.filter(e => e.info.account_name === el.params.account_name).map(e => {
    e.is_show = true;
    e.actived = true;
  });
}


watch(route, handle_route_change)

provide(account_left_pannel_reload_key, () => {
  nextTick(async () => {
    await handle_left_pannel_accounts()
  })
})
const isSmallScreen = ref(false);
const updateScreenSize = () => {
  isSmallScreen.value = window.innerWidth < 620;
};

// 初始化时调用
updateScreenSize();

// 添加窗口大小变化事件监听器
window.addEventListener('resize', updateScreenSize);

// 在组件销毁时移除监听器
onBeforeUnmount(() => {
  window.removeEventListener('resize', updateScreenSize);
});
const drawer = ref(false);
const handle_open_drawer = () => {
  drawer.value = true;
}
</script>

<template>
  <div class="container">
    <div class="space-left">
      <div class="drawer-wrap" v-if="isSmallScreen">
        <el-button class="open-drawer" @click="handle_open_drawer" type="primary"></el-button>
        <el-drawer v-model="drawer" direction="ltr">
          <LeftPannel v-model="AccountInfos" :side_bar_tittle="`我的账号`">
          </LeftPannel>
        </el-drawer>
      </div>
      <LeftPannel v-else v-model="AccountInfos" :side_bar_tittle="`我的账号`">
      </LeftPannel>
    </div>
    <div class="space-right">
      <RightPannelTopBar
        :title="$route.params.account_name ? `账号【${$route.params.account_name}】` : `${$route.name?.toString()}`">
      </RightPannelTopBar>
      <div class="space-right-bottom ps">
        <Placeholder v-model="placeholder_model"></Placeholder>
        <RightPannel v-for="(account_info, idx) in AccountInfos" :key="idx" v-show="account_info.is_show"
          v-model="AccountInfos[idx]">
        </RightPannel>
        <div v-show="$route.name === '用户设置'" class="user-config-wrap">
          <UserConfig></UserConfig>
        </div>

      </div>
    </div>


  </div>
</template>
<style scoped>
@media screen and (max-width:620px) {
  .space-left {
    width: 15px;
    min-width: 0;
    padding: 0;
  }

  .space-left .el-drawer {
    width: 20rem;
    min-width: 15rem;
    background-color: #fff;
    padding: 12px;
    overflow-y: scroll;
  }

  .space-left .drawer-wrap,
  .space-left .drawer-wrap .open-drawer {
    width: 100%;
    height: 100%;
  }



}
</style>