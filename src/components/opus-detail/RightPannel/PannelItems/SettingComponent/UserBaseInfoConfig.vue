<template>
  <div class="user-base-info-config">
    <div class="config-section">
      <h3>个人信息</h3>
      <div class="config-item">
        <label>用户名</label>
        <el-input 
          v-model="userName" 
          placeholder="请输入用户名（2-24个字符）" 
          :maxlength="24"
          show-word-limit
        />
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
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
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

// 设置项
const userName = ref('')
const userSign = ref('')
const sex = ref('保密')
const birthday = ref('')
const saving = ref(false)

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
  if (birthday.value && isNaN(Date.parse(birthday.value))) {
    ElMessage.error('生日必须是有效日期')
    return
  }
  
  try {
    saving.value = true
    const userInfo: Omit<User_base_info_config_form, 'userid'> = {
      uname: userName.value,
      usersign: userSign.value,
      sex: sex.value,
      birthday: birthday.value || '' // 如果没有选择生日，则发送空字符串
    }
    
    const response = await userApi.UpdateUserInfo(userInfo)
    if (response.code === 0) {
      ElMessage.success('用户信息已更新')
    } else {
      ElMessage.error(response.msg || '保存失败')
    }
  } catch (error) {
    ElMessage.error('保存设置时出错')
    console.error('保存设置时出错:', error)
  } finally {
    saving.value = false
  }
}

// 加载用户信息
const loadUserInfo = async () => {
  try {
    const response = await userApi.UserInfo()
    if (response.code === 0 && response.data) {
      userName.value = response.data.uname.toString()
      userSign.value = response.data.usersign
      sex.value = response.data.sex
      birthday.value = response.data.birthday
    } else {
      ElMessage.error(response.msg || '加载用户信息失败')
    }
  } catch (error) {
    ElMessage.error('加载用户信息时出错')
    console.error('加载用户信息时出错:', error)
  }
}

// 组件挂载时加载用户信息
onMounted(() => {
  loadUserInfo()
})
</script>

<style>
@import '@/assets/components/user/user-base-info-config-tailwind.css';
</style>