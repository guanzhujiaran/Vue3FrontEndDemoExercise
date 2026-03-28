<template>
  <div class="user-base-info-config">
    <div class="config-section">
      <h3>个人信息</h3>
      <div class="config-item">
        <label>昵称</label>
        <el-input 
          v-model="userName" 
          placeholder="请输入用户名（2-24个字符）" 
          :maxlength="24"
          show-word-limit
        />
      </div>
      <div class="config-item">
        <label>用户名</label>
        <span class="userinfo-descript">{{ userid }}</span>
      </div>
      <div class="config-item">
        <label>个性签名</label>
        <el-input 
          v-model="userSign" 
          placeholder="请输入个性签名（最多70个字符）" 
          type="textarea"
          :maxlength="70"
          show-word-limit
          :rows="3"
        />
      </div>
      
      <div class="config-item">
        <label>性别</label>
        <el-select v-model="sex" placeholder="请选择性别">
          <el-option label="男" value="男" />
          <el-option label="女" value="女" />
          <el-option label="保密" value="保密" />
          <el-option label="武装直升机" value="武装直升机" />
          <el-option label="永雏塔菲" value="永雏塔菲" />
        </el-select>
      </div>
      
      <div class="config-item">
        <label>生日</label>
        <el-date-picker
          v-model="birthday"
          type="date"
          placeholder="请选择生日"
          format="YYYY/MM/DD"
          value-format="YYYY/MM/DD"
        />
      </div>
    </div>
    
    <div class="config-actions">
      <el-button type="primary" @click="saveSettings" :loading="saving">保存设置</el-button>
      <el-button @click="loadUserInfo">重新加载</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import userApi from '@/api/user/user_api.ts'
import type { User_base_info_config_form } from '@/models/user/user_setting/user_base_info_config_model.ts'
import '@/assets/components/user/user-base-info-config-tailwind.css'
import { businessHandler } from '@/utils/businessHandler'

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
    ElMessage.error('用户名不能少于2个字符')
    return
  }
  
  if (userName.value.length > 24) {
    ElMessage.error('用户名不能超过24个字符')
    return
  }
  
  // 验证签名长度
  if (userSign.value.length > 70) {
    ElMessage.error('个性签名不能超过70个字符')
    return
  }
  
  // 验证性别选项
  const validSexOptions = ['男', '女', '保密', '武装直升机', '永雏塔菲']
  if (!validSexOptions.includes(sex.value)) {
    ElMessage.error('性别选项不正确')
    return
  }
  
  // 验证生日
  if (birthday.value && isNaN(Date.parse(birthday.value.toString()))) {
    ElMessage.error('生日必须是有效日期')
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

<style>
@import '@/assets/components/user/user-base-info-config-tailwind.css';
</style>