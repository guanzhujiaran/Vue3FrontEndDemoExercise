<!--
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-03-31 23:36:42
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-04-03 00:12:51
 * @FilePath: \BiliLottery\src\App.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<script setup lang="ts">
import { RouterView } from 'vue-router'
import HeaderView from '@/components/header-bar/HeaderBarView.vue'
</script>

<template>
  <HeaderView />
  <RouterView />
</template>
