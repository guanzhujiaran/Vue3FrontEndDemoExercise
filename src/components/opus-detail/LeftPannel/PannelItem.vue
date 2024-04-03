<!--
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-04-01 15:41:21
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-04-03 13:21:52
 * @FilePath: \BiliLottery\src\components\opus-detail\LeftPannel\PannelItem.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<!--
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-04-01 15:41:21
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-04-02 22:33:31
 * @FilePath: \BiliLottery\src\components\opus-detail\LeftPannel\PannelItem.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->

<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { type TAccountInfo } from '../type'
import avatar from './SingleUserInfo.vue'
import router from '@/router'
import { useRoute } from 'vue-router'
const route = useRoute()
//TODO 发一个ajax获取一下所有的用户列表
const isActive_by_account_name = ref<string>(
  route.params.account_name ? route.params.account_name.toString() : ''
)
watchEffect(() => {
  // 当 route.params.account_name 变化时，isActive_by_account_name 的值会自动更新
  isActive_by_account_name.value = route.params.account_name
    ? route.params.account_name.toString()
    : ''
})
const handleAccountAvatarClick = (account_name: string) => {
  if (account_name) {
    router.push(`/user-center/account_detail_${account_name}`)
  }
}

defineProps<{
  side_bar_tittle: string
  account_info_list: TAccountInfo[]
}>()
</script>
<template>
  <div class="side-bar">
    <div class="title">
      {{ side_bar_tittle }}
    </div>
    <ul class="list">
      <li
        v-for="account_info of account_info_list"
        :key="account_info.account_name"
        @click="handleAccountAvatarClick(account_info.account_name)"
      >
        <avatar
          :account_info="account_info"
          :class="{ active: isActive_by_account_name === account_info.account_name }"
          :style="account_info.face ? { backgroundImage: `url(${account_info.face})` } : {}"
        />
      </li>
    </ul>
    <div class="divided-line"></div>
    <div class="setting item"></div>
  </div>
</template>
