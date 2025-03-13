<script setup lang="ts">
import BiliDialog from '@/components/CommonCompo/Bili-Feedback-Compo/BiliDialog.vue'
import type { User_base_info_config_form } from '@/models/user/user_setting/user_base_info_config_model.ts'
import { computed, onMounted, ref } from 'vue'
import ConfigItem from '@/components/opus-detail/RightPannel/PannelItems/SettingComponent/ConfigItem.vue'
import BlueBtn from '@/components/CommonCompo/Bili-Interact-Compo/Blue-Btn.vue'
import type { AccountSettingConfigItemModel } from '@/models/account/account_setting/account_setting_type_model.ts'
import { BaseSettingType } from '@/models/base/base_setting_model.ts'
import user_api from '@/api/user/user_api.ts'
import emitter from '@/utils/mitt.ts'

const user_base_info_data = ref<User_base_info_config_form>({
  uname: '',
  usersign: '',
  sex: '',
  birthday: '',
  userid: ''
})
const origin_user_base_info_data = ref<User_base_info_config_form>({
  uname: '',
  usersign: '',
  sex: '',
  birthday: '',
  userid: ''
})
const is_loading = ref(false)
const show_update_dialog = ref(false)
const handle_get_user_base_info = () => {
  // 获取用户基本信息
  is_loading.value = true
  user_api.UserInfo().then((resp) => {
    console.log(resp)
    resp.code === 0
      ? ((user_base_info_data.value = resp.data),
        (origin_user_base_info_data.value = resp.data),
        (is_loading.value = false))
      : emitter.emit('toast', {
          t: resp.msg,
          e: 'error'
        })
  })
}
onMounted(() => {
  handle_get_user_base_info()
})
const save_info_btn_props = ref({
  btn_text: '保存',
  is_active: true,
  is_show: true
})
const handle_update_user_info = () => {
  let { uname, usersign, sex, birthday } = user_base_info_data.value
  user_api
    .UpdateUserInfo({
      uname,
      usersign,
      sex,
      birthday: birthday.slice(0, 10)
    })
    .then((resp) => {
      resp.code === 0
        ? (emitter.emit('toast', {
            e: 'info',
            t: '更新成功！'
          }),
          (origin_user_base_info_data.value = user_base_info_data.value),
          (show_update_dialog.value = true))
        : ((user_base_info_data.value = origin_user_base_info_data.value),
          emitter.emit('toast', {
            e: 'error',
            t: resp.msg
          }))
    })
}

const computedUname = computed({
  get: () => user_base_info_data.value.uname,
  set: (value: string) => {
    if (
      user_base_info_data.value.uname === value &&
      uname_config.value.setting_content.value === value
    )
      return
    user_base_info_data.value.uname = value
    uname_config.value.setting_content.value = value // 同步到配置对象中
  }
})
const computedUserid = computed(() => user_base_info_data.value.userid)
const userid_config = ref<AccountSettingConfigItemModel>({
  name: 'userid_config', // 按钮的设置属性名
  setting_content: {
    type: BaseSettingType.Text,
    value: computedUserid,
    text_props: [
      {
        readonly: true,
        label: '用户名（不可修改）：',
        placeholder: ''
      }
    ]
  } // 写各种不同的设置类型
})
const uname_config = ref<AccountSettingConfigItemModel>({
  name: 'uname_config', // 按钮的设置属性名
  tips: '注：修改一次昵称一个硬币都不需要',
  setting_content: {
    type: BaseSettingType.Text,
    value: computedUname,
    text_props: [
      {
        readonly: false,
        label: '昵称：',
        placeholder: '你的昵称'
      }
    ]
  } // 写各种不同的设置类型
})
const computedUsersign = computed({
  get: () => user_base_info_data.value.usersign,
  set: (value: string) => {
    if (
      user_base_info_data.value.usersign === value &&
      usersign_config.value.setting_content.value === value
    )
      return
    user_base_info_data.value.usersign = value
    usersign_config.value.setting_content.value = value // 同步到配置对象中
  }
})
const usersign_config = ref<AccountSettingConfigItemModel>({
  name: 'usersign_config', // 按钮的设置属性名
  setting_content: {
    type: BaseSettingType.Text,
    value: computedUsersign,
    text_props: [
      {
        readonly: false,
        label: '我的签名：',
        placeholder: '设置您的签名- ( ゜- ゜)つロ'
      }
    ]
  } // 写各种不同的设置类型
})
const computedSex = computed({
  get: () => user_base_info_data.value.sex,
  set: (value: string) => {
    if (user_base_info_data.value.sex === value && sex_config.value.setting_content.value === value)
      return
    user_base_info_data.value.sex = value
    sex_config.value.setting_content.value = value // 同步到配置对象中
  }
})
const sex_config = ref<AccountSettingConfigItemModel>({
  name: 'sex_config', // 按钮的设置属性名
  setting_content: {
    type: BaseSettingType.Radio,
    value: computedSex,
    radio_props: [
      {
        value: '男',
        content: '男',
        label: '性别：'
      },
      {
        value: '女',
        content: '女'
      },
      {
        value: '保密',
        content: '保密'
      },
      {
        value: '武装直升机',
        content: '武装直升机'
      },
      {
        value: '永雏塔菲',
        content: '永雏塔菲'
      }
    ]
  } // 写各种不同的设置类型
})
const computedBirthday = computed({
  get: () => user_base_info_data.value.birthday,
  set: (value: string) => {
    if (
      user_base_info_data.value.birthday === value &&
      birthday_config.value.setting_content.value === value
    )
      return
    user_base_info_data.value.birthday = value
    birthday_config.value.setting_content.value = value // 同步到配置对象中
  }
})
const birthday_config = ref<AccountSettingConfigItemModel>({
  name: 'birthday_config', // 按钮的设置属性名
  setting_content: {
    type: BaseSettingType.Date,
    value: computedBirthday,
    date_props: { format: 'YYYY-MM-DD', label: '出生日期：', disabled_date: Date.now() }
  } // 写各种不同的设置类型
})
</script>

<template>
  <div class="config" v-loading="is_loading">
    <ConfigItem v-model="uname_config"></ConfigItem>
    <ConfigItem v-model="userid_config"></ConfigItem>
    <ConfigItem v-model="usersign_config"></ConfigItem>
    <ConfigItem v-model="sex_config"></ConfigItem>
    <ConfigItem v-model="birthday_config"></ConfigItem>
    <div class="padding-dom"></div>
    <div class="user-my-btn-warp">
      <BlueBtn v-model="save_info_btn_props" @click="handle_update_user_info"></BlueBtn>
    </div>
    <BiliDialog
      v-model:dialogVisible="show_update_dialog"
      title="提示"
      content="已经成功更新你的资料"
    />
  </div>
</template>

<style scoped>
.padding-dom {
  height: 39px;
  border-bottom: 1px solid #e5e9ef;
  margin-bottom: 40px;
}

.user-my-btn-warp {
  width: fit-content;
  height: 36px;
  position: relative;
  margin: auto auto 3rem;
}

.config {
  width: auto;
  padding: 20px 20px 0;
}

.config :deep(.config-item) {
  padding: 10px 16px;
}

.config :deep(.text) {
  line-height: 19px;
}
</style>
