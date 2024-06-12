<!--
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-05-29 23:52:55
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-06-12 14:47:00
 * @FilePath: \Vue3FrontEndDemoExercise\src\components\opus-detail\RightPannel\PannelItems\AccountSetting.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<!--
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-05-29 23:52:55
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-06-04 14:36:43
 * @FilePath: \Vue3FrontEndDemoExercise\src\components\opus-detail\RightPannel\PannelItems\AccountSetting.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<script setup lang="ts">
import LotterySettingModule from './SettingComponent/LotterySettingModule.vue'
import { ref } from 'vue';
import type { ElDialog } from 'element-plus';

defineProps<{
  account_name: string
}>()



const dialogVisible = ref(false)
</script>

<template>
    <div class="el-btn-wrap">
      <el-button plain @click="dialogVisible = true">
        打开账号设置面板
      </el-button>
    </div>
    <el-dialog v-model="dialogVisible" width="85%" draggable :show-close="false" :close-delay="100"
      :center="true">
      <template #header="{  titleClass }">
        <div class="lottery-setting-header">
          <h4 :class="titleClass">账号【{{account_name}}】的设置</h4>
        </div>
      </template>
      <LotterySettingModule :account_name="account_name" @close_setting_modal="dialogVisible =false">
      </LotterySettingModule>
    </el-dialog>
</template>
<style>
.lottery-setting-header{
  background-color:#F1F2F3;
  opacity: 1;
  border-radius: 6px;
}
.el-btn-wrap {
  padding: 16px;
  display: flex;
}

.el-btn-wrap button {
  width: 100%
}
</style>