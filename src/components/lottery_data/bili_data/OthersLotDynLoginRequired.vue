<!--
 * @Description: 第三方抽奖动态未登录提示页，当用户未登录时直接访问该路由展示
-->
<template>
  <BiliErrorRouteTo :props="BiliErrorRouteToTxt.others_lot_dyn_login_required"></BiliErrorRouteTo>
</template>

<script setup lang="ts">
import BiliErrorRouteTo from '@/components/CommonCompo/Bili-Feedback-Compo/BiliErrorRouteTo.vue'
import { BiliErrorRouteToTxt } from '@/assets/text/BiliErrorTxt.ts'
</script>
