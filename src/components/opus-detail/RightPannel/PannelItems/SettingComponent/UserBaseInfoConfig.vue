<script setup lang="ts">
import type { User_base_info_config_form } from '@/models/user/user_setting/user_base_info_config_model.ts'
import { computed, onMounted, ref } from 'vue'
import ConfigItem from '@/components/opus-detail/RightPannel/PannelItems/SettingComponent/ConfigItem.vue'
import BlueBtn from '@/components/CommonCompo/Bili-Interact-Compo/Blue-Btn.vue'
import type { AccountSettingConfigItemModel } from '@/models/account/account_setting/account_setting_type_model.ts'
import { BaseSettingType } from '@/models/base/base_setting_model.ts'

const user_base_info_data = ref<User_base_info_config_form>({
  uname: '',
  usersign: '',
  sex: '',
  birthday: '',
  userid: ''
})

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
const userid_config = ref<AccountSettingConfigItemModel>({
  name: 'userid_config', // 按钮的设置属性名
  setting_content: {
    type: BaseSettingType.Text,
    value: computedUname,
    text_props: [
      {
        readonly: true,
        label: '用户名：',
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
  get: () => user_base_info_data.value.sex,
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
    date_props: { format: 'YYYY-MM-DD', label: '出生日期：' }
  } // 写各种不同的设置类型
})

const handle_get_user_base_info = () => {
  // 获取用户基本信息
  console.log('加载用户信息')
  Object.assign(user_base_info_data.value, {
    userid: 'zhangsan',
    uname: '张三',
    usersign: '我是张三',
    sex: '男',
    birthday: '1990-01-01'
  })
}
onMounted(() => {
  handle_get_user_base_info()
})
</script>

<template>
  <div class="config">
    <ConfigItem v-model="uname_config"></ConfigItem>
    <ConfigItem v-model="userid_config"></ConfigItem>
    <ConfigItem v-model="usersign_config"></ConfigItem>
    <ConfigItem v-model="sex_config"></ConfigItem>
    <ConfigItem v-model="birthday_config"></ConfigItem>
    <BlueBtn></BlueBtn>
  </div>
</template>

<style scoped>
.config :deep(.config-item) {
  padding: 10px 16px;
}

.config :deep(.text) {
  line-height: 19px;
}
</style>
