<!--
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-06-06 11:08:35
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-06-10 00:01:19
 * @FilePath: \Vue3FrontEndDemoExercise\src\components\opus-detail\RightPannel\PannelItems\SettingComponent\ConfigItem.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<template>
  <div v-if="props.setting_content" class="config-item">
    <div class="text" v-if="props.title || props.tips">
      <span>{{ props.title }}</span>
      <span class="tip">{{ props.tips }}</span>
    </div>
    <RadioList
      v-if="props.setting_content.type === BaseSettingType.Radio"
      v-model="props.setting_content as BaseSettingRadioList"
    >
    </RadioList>
    <TextList
      v-if="props.setting_content.type === BaseSettingType.Text"
      v-model="props.setting_content as BaseSettingTextList"
    ></TextList>
    <DatePicker
      v-if="props.setting_content.type === BaseSettingType.Date"
      v-model="props.setting_content as BaseSettingDatePicker"
    ></DatePicker>
  </div>
</template>
<script setup lang="ts">
import TextList from '@/components/CommonCompo/Bili-Interact-Compo/Text-List.vue'
import RadioList from '@/components/CommonCompo/Bili-Interact-Compo/Radio-List.vue'
import DatePicker from '@/components/CommonCompo/Bili-Interact-Compo/Date-Picker.vue'
import type { AccountSettingConfigItemModel } from '@/models/account/account_setting/account_setting_type_model'
import {
  BaseSettingType,
  type BaseSettingRadioList,
  type BaseSettingTextList,
  type BaseSettingDatePicker
} from '@/models/base/base_setting_model'

const props = defineModel<AccountSettingConfigItemModel>({
  required: true
})
</script>
<style scoped>
.text {
  text-align: left;
}
</style>
