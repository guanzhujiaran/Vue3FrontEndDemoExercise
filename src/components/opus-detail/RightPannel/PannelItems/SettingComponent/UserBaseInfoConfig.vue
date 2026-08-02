<template>
  <div class="user-base-info-config flex flex-col gap-4 p-4">
    <div class="config-section flex flex-col gap-3">
      <h3 class="text-lg font-medium text-text-primary">个人信息</h3>
      <div class="config-item flex flex-col gap-1">
        <label class="text-sm text-text-regular">昵称</label>
        <el-input
          v-model="userName"
          placeholder="请输入用户名（2-24个字符）"
          :maxlength="24"
          show-word-limit
        />
      </div>
      <div class="config-item flex flex-col gap-1">
        <label class="text-sm text-text-regular">用户名</label>
        <span class="userinfo-descript text-sm text-text-secondary">{{ userid }}</span>
      </div>
      <div class="config-item flex flex-col gap-1">
        <label class="text-sm text-text-regular">个性签名</label>
        <el-input
          v-model="userSign"
          placeholder="请输入个性签名（最多70个字符）"
          type="textarea"
          :maxlength="70"
          show-word-limit
          :rows="3"
        />
      </div>

      <div class="config-item flex flex-col gap-1">
        <label class="text-sm text-text-regular">性别</label>
        <el-select v-model="sex" placeholder="请选择性别">
          <el-option label="男" value="男" />
          <el-option label="女" value="女" />
          <el-option label="保密" value="保密" />
          <el-option label="武装直升机" value="武装直升机" />
          <el-option label="永雏塔菲" value="永雏塔菲" />
        </el-select>
      </div>

      <div class="config-item flex flex-col gap-1">
        <label class="text-sm text-text-regular">生日</label>
        <el-date-picker
          v-model="birthday"
          type="date"
          placeholder="请选择生日"
          format="YYYY/MM/DD"
          value-format="YYYY/MM/DD"
        />
      </div>
    </div>

    <div v-if="isCurrentRoot" class="config-section admin-grant-section flex flex-col gap-3">
      <h3 class="admin-grant-section__title text-lg font-medium text-text-primary">赋予用户管理员权限</h3>
      <el-text class="admin-grant-section__tip text-sm text-text-secondary" tag="p">
        仅系统管理员可操作。请填写目标用户 UID 并选择要授予的角色，root 为最高管理员权限。
      </el-text>
      <div class="admin-grant-section__form flex flex-col gap-3">
        <div class="config-item flex flex-col gap-1">
          <label class="text-sm text-text-regular">目标用户 UID</label>
          <el-input
            v-model="grantTargetUid"
            class="admin-grant-section__uid"
            placeholder="请输入目标用户的 UID"
            clearable
          />
        </div>
        <div class="config-item flex flex-col gap-1">
          <label class="text-sm text-text-regular">授予角色</label>
          <el-select v-model="grantRole" class="admin-grant-section__role" placeholder="请选择角色">
            <el-option
              v-for="item in grantableRoles"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </div>
        <div class="admin-grant-section__actions flex gap-2">
          <el-button
            type="danger"
            class="admin-grant-section__submit"
            :loading="granting"
            @click="submitGrantRole"
          >
            确认设置角色
          </el-button>
        </div>
      </div>
    </div>

    <div class="config-actions flex gap-2">
      <el-button type="primary" @click="saveSettings" :loading="saving">保存设置</el-button>
      <el-button @click="loadUserInfo">重新加载</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, type Ref } from 'vue'
import biliMessage from '@/utils/message'
import userApi from '@/api/user/user_api.ts'
import type { User_base_info_config_form } from '@/models/user/user_setting/user_base_info_config_model.ts'
import { businessHandler } from '@/utils/businessHandler'
import { useInject } from '@/models/base/provide_model.ts'
import { KeysEnum } from '@/models/base/provide_model.ts'
import { isRootRole, ROLE_DESCRIPTIONS, type UserRole } from '@/models/user/user_model'

// 当前登录用户信息（含 role）
const currentUser = useInject(KeysEnum.BiliUser) as Ref<{ role?: string; uid?: string; user_name?: string }>
const currentRole = computed(() => currentUser.value?.role ?? 'level0')
const isCurrentRoot = computed(() => isRootRole(currentRole.value))

// 管理员角色授予面板状态
const grantTargetUid = ref<string>('')
const grantRole = ref<UserRole>('root')
const granting = ref(false)
// 可授予的角色选项（管理员可赋予 root，也可降级为某个等级角色）
const grantableRoles = computed(() =>
  (Object.keys(ROLE_DESCRIPTIONS) as UserRole[]).map((role) => ({
    value: role,
    label: `${ROLE_DESCRIPTIONS[role].name}（${role}）`,
  }))
)

const submitGrantRole = () => {
  const targetUid = grantTargetUid.value.trim()
  if (!targetUid) {
    biliMessage.error('请输入目标用户 UID')
    return
  }
  if (String(targetUid) === String(currentUser.value?.uid)) {
    biliMessage.error('不能修改自己的角色')
    return
  }
  granting.value = true
  businessHandler(
    userApi.SetUserRole({ target_uid: targetUid, role: grantRole.value }),
    {
      successMessage: '角色设置成功',
      errorMessage: '设置失败',
      showSuccessToast: true,
      showErrorToast: true,
      autoHandleError: true,
    }
  ).finally(() => {
    granting.value = false
  })
}

// 设置项
const userName = ref('')
const userSign = ref('')
const sex = ref('保密')
const birthday = ref<string>()
const saving = ref(false)
const userid = ref('')
// 保存设置
const saveSettings = async () => {
  // 验证用户名长度
  if (userName.value.length < 2) {
    biliMessage.error('用户名不能少于2个字符')
    return
  }
  
  if (userName.value.length > 24) {
    biliMessage.error('用户名不能超过24个字符')
    return
  }
  
  // 验证签名长度
  if (userSign.value.length > 70) {
    biliMessage.error('个性签名不能超过70个字符')
    return
  }
  
  // 验证性别选项
  const validSexOptions = ['男', '女', '保密', '武装直升机', '永雏塔菲']
  if (!validSexOptions.includes(sex.value)) {
    biliMessage.error('性别选项不正确')
    return
  }
  
  // 验证生日
  if (birthday.value && isNaN(Date.parse(birthday.value.toString()))) {
    biliMessage.error('生日必须是有效日期')
    return
  }
  
  saving.value = true
  const userInfo: Omit<User_base_info_config_form, 'userid'> = {
    uname: userName.value,
    usersign: userSign.value,
    sex: sex.value,
    birthday: birthday.value || ''
  }
  
  businessHandler(
    userApi.UpdateUserInfo(userInfo),
    {
      successMessage: '用户信息已更新',
      errorMessage: '保存失败',
      showSuccessToast: true,
      showErrorToast: true,
      autoHandleError: true
    }
  ).finally(() => {
    saving.value = false
  })
}

// 加载用户信息
const loadUserInfo = () => {
  businessHandler(
    userApi.UserInfo(),
    {
      successMessage: '',
      errorMessage: '加载用户信息失败',
      showSuccessToast: false,
      showErrorToast: true,
      autoHandleError: true
    },
    [
      (result) => {
        if (result.success && result.data) {
          console.log((new Date(result.data.birthday)).toISOString())
          userName.value = result.data.uname
          userSign.value = result.data.usersign
          sex.value = result.data.sex
          // 将 UTC 日期转换为本地时区日期
          const localDate = new Date(result.data.birthday)
          birthday.value = `${localDate.getFullYear()}/${String(localDate.getMonth() + 1).padStart(2, '0')}/${String(localDate.getDate()).padStart(2, '0')}`
          userid.value = result.data.userid
        }
      }
    ]
  )
}

// 组件挂载时加载用户信息
onMounted(() => {
  loadUserInfo()
})
</script>


