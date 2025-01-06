<!--
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-06-06 00:05:53
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-10-19 23:22:59
 * @FilePath: \Vue3FrontEndDemoExercise\src\components\opus-detail\RightPannel\PannelItems\SettingComponent\UserConfig.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->

<template>
  <div class="config">
    <ConfigItem v-model="create_account_settings"></ConfigItem>
    <div class="btn-wrap">
      <BlueBtn v-model="create_account_btn_ref" @click="create_account" />
    </div>
  </div>
  <div v-if="test_config" class="config">
    <ConfigItem v-model="AUTO_DailyReward" />
  </div>
</template>
<script setup lang="ts">
/**
 * 全局设置
 */
import emitter from '@/utils/mitt'

import ConfigItem from '@/components/opus-detail/RightPannel/PannelItems/SettingComponent/ConfigItem.vue'
import { computed, inject, ref } from 'vue'
import { BaseSettingType } from '@/models/base/base_setting_model'
import type { AccountSettingConfigItemModel } from '@/models/account/account_setting/account_setting_type_model'
import BlueBtn from '@/components/CommonCompo/Bili-Interact-Compo/Blue-Btn.vue'
import accountApi from '@/api/account/account_api'
import { account_left_panel_reload_key } from '@/models/inject/inject_type'

const reload = inject(account_left_panel_reload_key)!

const create_account_settings = ref<AccountSettingConfigItemModel>({
  name: 'create_account_setting', // 按钮的设置属性名
  title: '创建账号',
  tips: '（创建账号，用于登录，需要填写账号名）',
  setting_content: {
    type: BaseSettingType.Text,
    value: '',
    text_props: [
      {
        readonly: false,
        label: '账号名',
        placeholder: '请输入账号名'
      }
    ]
  } // 写各种不同的设置类型
})
const create_account_btn_ref = ref({
  btn_text: computed({
    get: () => {
      return create_account_settings.value.title ?? ''
    },
    set: () => {}
  }),
  is_active: computed({
    get: () => {
      return !!create_account_settings.value.setting_content.value
    },
    set: () => {}
  }),
  is_show: computed({
    get: () => {
      return !!create_account_settings.value.setting_content.value
    },
    set: () => {}
  })
})
const create_account = () => {
  let create_account_name = create_account_settings.value.setting_content.value
  if (!create_account_name) return emitter.emit('toast', { t: '请输入账号名！' })
  accountApi
    .AddAccount(create_account_name)
    .then((resp) => {
      if (resp.code !== 0) {
        return emitter.emit('toast', { t: resp.msg, e: 'error' })
      }

      emitter.emit('toast', { t: '账号创建成功！' })
      reload()
    })
    .catch((e) => {
      emitter.emit('toast', { t: `账号创建请求失败！${e}`, e: 'error' })
    })
}

const lottery_setting_mock = {
  CONFIG: {
    COOKIENAME: '114514', //就是account_name，不允许变更！
    AUTO_DailyReward: true,
    lottery_sep_time_type: 1, //抽奖间隔模式：1为总运行时间，2为等间隔.
    CommonLottery_switch: false, //普通抽奖开关，打开后执行一般抽奖动态id内的动态id
    Only_Comment_Lottery_Switch: false, //只参加评论抽奖
    PersistStore: true, //持久化存储用户信息，启动时自动登录，一般设置为true
    ProfileDir: 'Default', //尽量都用Default，更改userdatadir
    proxy: '',
    LIVE_SEND_DM: true
  }
}
const AUTO_DailyReward = ref<AccountSettingConfigItemModel>({
  name: 'AUTO_DailyReward', // 按钮的设置属性名
  title: '每日奖励',
  tips: '（每天自动投币，领取b币，兑换电池）',
  setting_content: {
    type: BaseSettingType.Radio,
    value: false,
    radio_props: [
      {
        value: true,
        content: '开启'
      },
      {
        value: false,
        content: '关闭'
      }
    ]
  } // 写各种不同的设置类型
})

const test_config = ref(lottery_setting_mock.CONFIG)
</script>
<style scoped>
.config .btn-wrap {
  position: relative;
  padding: 0 16px 16px 16px;
}

.config {
  -webkit-box-shadow: 0 2px 4px 0 rgba(121, 146, 185, 0.54);
  box-shadow: 0 2px 4px 0 rgba(121, 146, 185, 0.54);
  margin-bottom: 10px;
  border-radius: 4px;
  background-color: #fff;
  width: 100%;
  min-height: 100px;
  display: -webkit-box;
  display: -ms-flexbox;
  display: flex;
  color: #333;
  font-size: 14px;
  -webkit-box-orient: vertical;
  -webkit-box-direction: normal;
  -ms-flex-direction: column;
  flex-direction: column;
}

.config .text {
  line-height: 19px;
}

p,
span {
  margin: 0;
  padding: 0;
}

.tip {
  color: #999;
}
</style>
