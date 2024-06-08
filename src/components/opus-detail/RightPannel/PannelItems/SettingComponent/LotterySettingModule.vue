<!--
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-05-29 23:52:55
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-06-08 21:24:59
 * @FilePath: \Vue3FrontEndDemoExercise\src\components\opus-detail\RightPannel\PannelItems\SettingComponent\ClickBar.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<template>
  <div class="title">
    <span> {{ title }}</span>
  </div>
  <el-collapse v-model="activeNames">
    <el-collapse-item title="Consistency" name="1">
      </el-collapse-item>
  </el-collapse>

</template>

<script setup lang="ts">
import type { AccountSettingModel } from '@/models/account/account_model';
import { ref } from 'vue';
defineProps<{
  title: string
}>()


const props = defineModel<{
  account_lottery_setting: AccountSettingModel
}>()
const activeNames = ref([])


</script>
<style>
.title{
    padding: 20px;
    position: relative;
}
.el-collapse-item button{
  background-color: #fb7299;
  opacity: 0.7;
  border-radius: 6px;
  height: 24px;
}
.el-collapse-item .is-active{
  opacity: 1;
}
</style>
