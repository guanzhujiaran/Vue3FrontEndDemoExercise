<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import { computed, onMounted, ref } from 'vue'
import userApi from '@/api/user/user_api'
import { isLogin } from '@/api/user/utils'
import { useRouter } from 'vue-router'
import { useJwtStore } from '@/stores/jwt_token'
import utils from '@/utils/mixin.ts'
import { ElMessage } from 'element-plus'
import { View, Hide } from '@element-plus/icons-vue'

// 定义props
const props = defineProps({
  isModal: {
    type: Boolean,
    default: false
  }
})

// 定义事件
const emit = defineEmits(['login-success'])

// 输入框禁止输入空格
const pwd_sec = ref<string>()
const vNoSpace = {
  updated(el: Ref<string>, binding: any, vnode: any, prevVnode: any) {
    if (el?.value?.includes(' ')) {
      //输入空格就替换全部表单内容！
      tab__form.value = Object.fromEntries(
        Object.entries(tab__form.value).map((el) => [el[0], el[1].replaceAll(' ', '')])
      ) as {
        user_name: string
        pwd: string
        reg_user_name: string
        reg_pwd: string
        reg_check_pwd: string
      }
    }
  }
}

const tab__form = ref({
  user_name: '',
  pwd: '',
  reg_user_name: '',
  reg_pwd: '',
  reg_check_pwd: ''
})

const show_pwd = ref<boolean>(false)
const show_reg_pwd = ref<boolean>(false)
const show_reg_check_pwd = ref<boolean>(false)
const showForgetTips = ref<boolean>(false)
const router = useRouter()
const login_able = computed(() => ({
  enable: tab__form.value.user_name && tab__form.value.pwd,
  disabled: !(tab__form.value.user_name && tab__form.value.pwd)
}))
const reg_able = computed(() => ({
  enable: tab__form.value.reg_user_name && tab__form.value.reg_pwd,
  disabled: !(tab__form.value.reg_user_name && tab__form.value.reg_pwd)
}))
const login_info = ref({
  source: 'main_web',
  go_url: '',
  spm_id_from: '',
  checked: 'pwd',
  isSmsFocus: !1,
  captcha: void 0
})

/**
 *
 * @param t pwd 或者 reg 用于切换tab
 */
const tabChange = (t: string | number) => {
  const tabName = String(t)
  login_info.value.checked !== tabName && (login_info.value.checked = tabName)
}

const handleLoginBtn = useDebounceFn(async () => {
  if (login_able.value.disabled) return
  if (tab__form.value.user_name.length * tab__form.value.pwd.length == 0) {
    ElMessage.info('请输入账号和密码！')
    return
  }
  if (!pwd_sec.value) {
    ElMessage.error('缺少加密盐！')
    return
  }
  let encrypt_pwd = utils.encrypt_pwd(tab__form.value.pwd, pwd_sec.value)
  await userApi
    .Login(tab__form.value.user_name, encrypt_pwd)
    .then((resp) => {
      if (resp.code) {
        ElMessage.error(`登录失败！原因：${resp.msg}`)
        return
      }
      const JwtStore = useJwtStore()
      JwtStore.save_jwt_token(resp.data.jwt_token)
      ElMessage.success('登录成功！')

      // 发出登录成功事件，让父组件可以关闭模态框
      emit('login-success')

      // 如果是在模态框中登录，不自动跳转，而是刷新当前页面
      if (props.isModal) {
        window.location.reload()
      } else {
        router.push('/app/user-center')
      }
    })
    .catch((e) => {
      ElMessage.error(`登录失败！原因：${e}`)
      return
    })
}, 1e3)

const handleRegBtn = useDebounceFn(async () => {
  if (reg_able.value.disabled) return
  if (tab__form.value.reg_user_name.length * tab__form.value.reg_pwd.length == 0) {
    ElMessage.error('请输入账号和密码！')
    return
  }
  if (tab__form.value.reg_pwd !== tab__form.value.reg_check_pwd) {
    ElMessage.error('两次密码不一致！')
    return
  }
  if (!pwd_sec.value) {
    ElMessage.error('缺少加密盐！')
    return
  }
  let encrypt_pwd = utils.encrypt_pwd(tab__form.value.reg_pwd, pwd_sec.value)
  await userApi
    .Reg(tab__form.value.reg_user_name, encrypt_pwd)
    .then((resp) => {
      if (resp.code) {
        ElMessage.error(`注册失败！原因：${resp.msg}`)
        return
      }
      ElMessage.success('注册成功！请登录')
      login_info.value.checked = 'pwd'
    })
    .catch((e) => {
      ElMessage.error(`注册失败！原因：${e}`)
      return
    })
}, 1e3)

const check_login = () => {
  // 如果是在模态框中，不需要自动检查登录状态
  if (props.isModal) {
    return
  }
  isLogin()
    .then((res) => {
      if (res[0]) {
        ElMessage.info('账号已登录，等待跳转！')
        router.push('/app/user-center')
      } else {
        ElMessage.error(res[1])
      }
    })
    .catch((e) => {
      ElMessage.error(e)
      setTimeout(check_login, 2e3)
    })
}

const get_pwd_sec = () => {
  userApi.PwdSalt().then((resp) => {
    pwd_sec.value = resp.data
  })
}

onMounted(() => {
  get_pwd_sec()
  check_login()
  // 强制隐藏全局加载遮罩
})
</script>

<template>
  <div class="login_wp">
    <div class="login__main">
      <div class="main__right">
        <!-- 使用Element Plus的Tabs组件 -->
        <el-tabs v-model="login_info.checked" @tab-change="tabChange" class="login-tabs">
          <el-tab-pane label="密码登录" name="pwd">
            <div class="login-pwd">
              <div class="tab__form">
                <div class="form__item">
                  <div class="form-label">账号</div>
                  <el-input
                    v-model.trim="tab__form.user_name"
                    placeholder="请输入账号"
                    maxlength="32"
                    clearable
                    @input="(value) => (value = value.replace(/\s+/g, ''))"
                    @keydown.enter="handleLoginBtn"
                    v-no-space
                  />
                </div>
                <div class="form__separator-line"></div>
                <div class="form__item">
                  <div class="form-label">密码</div>
                  <el-input
                    v-model.trim="tab__form.pwd"
                    placeholder="请输入密码"
                    maxlength="32"
                    :type="show_pwd ? 'text' : 'password'"
                    clearable
                    @input="(value) => (value = value.replace(/\s+/g, ''))"
                    @keydown.enter="handleLoginBtn"
                    v-no-space
                  >
                    <template #suffix>
                      <el-icon
                        class="eye-btn"
                        @click="show_pwd = !show_pwd"
                        style="cursor: pointer"
                      >
                        <View v-if="show_pwd" />
                        <Hide v-else />
                      </el-icon>
                    </template>
                  </el-input>
                  <div class="clickable" @click="showForgetTips = true">忘记密码？</div>
                </div>
              </div>
              <div class="btn_wp">
                <el-button type="default" @click="tabChange('reg')" class="btn_other">
                  没有账号立即注册
                </el-button>
                <el-button
                  type="primary"
                  @click="handleLoginBtn"
                  :disabled="login_able.disabled"
                  class="btn_primary"
                >
                  登录
                </el-button>
              </div>

              <el-popover
                v-model:visible="showForgetTips"
                placement="bottom"
                :width="332"
                trigger="click"
                popper-class="forget-tip-popover"
              >
                <template #reference>
                  <div></div>
                </template>
                <!--                <div class="forget-tip-content">-->
                <!--                  <div class="forget-tip-line">-->
                <!--                    <p class="title">发送短信快速登录</p>-->
                <!--                    <p class="desc">未注册或绑定哔哩哔哩的手机号，将帮你注册新账号</p>-->
                <!--                  </div>-->
                <!--                  <div class="forget-tip-line">-->
                <!--                    <p class="title">去找回密码</p>-->
                <!--                    <p class="desc">通过绑定的手机号/邮箱重置密码</p>-->
                <!--                  </div>-->
                <!--                </div>-->
                <div class="forget-tip-line">
                  <p class="title">忘了就忘了吧</p>
                  <p class="desc">重新注册一个就是了，反正也没要求绑邮箱</p>
                </div>
              </el-popover>
            </div>
          </el-tab-pane>

          <el-tab-pane label="账号注册" name="reg">
            <div class="tab-sms">
              <div class="tab__form">
                <div class="form__item">
                  <div class="form-label">注册账号名</div>
                  <el-input
                    v-model.trim="tab__form.reg_user_name"
                    placeholder="请输入需要注册的账号名"
                    maxlength="32"
                    clearable
                    @input="(value) => (value = value.replace(/\s+/g, ''))"
                    v-no-space
                  />
                </div>
                <div class="form__separator-line"></div>
                <div class="form__item">
                  <div class="form-label">注册密码</div>
                  <el-input
                    v-model.trim="tab__form.reg_pwd"
                    placeholder="请输入注册密码"
                    maxlength="32"
                    :type="show_reg_pwd ? 'text' : 'password'"
                    clearable
                    @input="(value) => (value = value.replace(/\s+/g, ''))"
                    v-no-space
                    ><template #suffix>
                      <el-icon
                        class="eye-btn"
                        @click="show_reg_pwd = !show_reg_pwd"
                        style="cursor: pointer"
                      >
                        <View v-if="show_reg_pwd" />
                        <Hide v-else />
                      </el-icon> </template
                  ></el-input>
                </div>
                <div class="form__item">
                  <div class="form-label">确认注册密码</div>
                  <el-input
                    v-model.trim="tab__form.reg_check_pwd"
                    placeholder="请再次输入相同内容，确认注册密码"
                    maxlength="32"
                    :type="show_reg_check_pwd ? 'text' : 'password'"
                    clearable
                    @input="(value) => (value = value.replace(/\s+/g, ''))"
                    v-no-space
                    ><template #suffix>
                      <el-icon
                        class="eye-btn"
                        @click="show_reg_check_pwd = !show_reg_check_pwd"
                        style="cursor: pointer"
                      >
                        <View v-if="show_reg_check_pwd" />
                        <Hide v-else />
                      </el-icon> </template
                  ></el-input>
                </div>
              </div>
              <div class="btn_wp" style="justify-content: center">
                <el-button
                  type="primary"
                  @click="handleRegBtn"
                  :disabled="reg_able.disabled"
                  class="btn_primary"
                  style="width: 400px"
                >
                  账号注册
                </el-button>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 登录表单样式 */
.login-tabs {
  width: 100%;
}

.login-tabs :deep(.el-tabs__header) {
  margin-bottom: 20px;
}

.login-tabs :deep(.el-tabs__nav-wrap) {
  justify-content: center;
}

.login-tabs :deep(.el-tabs__item) {
  font-size: 16px;
  font-weight: 600;
  padding: 0 20px;
}

.form-label {
  font-size: 14px;
  color: var(--el-text-color-primary);
  margin-bottom: 8px;
  font-weight: 500;
}

.form__item {
  margin-bottom: 16px;
}

.form__separator-line {
  height: 1px;
  background-color: var(--el-border-color-light);
  margin: 16px 0;
}

.clickable {
  color: var(--el-color-primary);
  cursor: pointer;
  font-size: 12px;
  margin-top: 8px;
  text-align: right;
}

.clickable:hover {
  text-decoration: underline;
}

.btn_wp {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.btn_primary {
  flex: 1;
  height: 40px;
}

.btn_other {
  flex: 1;
  height: 40px;
}

/* 忘记密码提示样式 */
.forget-tip-content {
  padding: 16px;
}

.forget-tip-line {
  padding: 8px 0;
  cursor: pointer;
  border-bottom: 1px solid var(--el-border-color-light);
}

.forget-tip-line:last-child {
  border-bottom: none;
}

.forget-tip-line:hover {
  background-color: var(--el-fill-color-light);
}

.forget-tip-line .title {
  font-size: 14px;
  color: var(--el-text-color-primary);
  margin: 0 0 4px 0;
  font-weight: 500;
}

.forget-tip-line .desc {
  font-size: 12px;
  color: var(--el-text-color-regular);
  margin: 0;
  line-height: 1.4;
}

/* 响应式适配 */
@media (max-width: 768px) {
  .btn_wp {
    flex-direction: column;
  }

  .btn_primary,
  .btn_other {
    width: 100% !important;
  }

  .login-tabs :deep(.el-tabs__item) {
    font-size: 14px;
    padding: 0 15px;
  }
}
</style>
