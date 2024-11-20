<!--
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-04-02 21:17:47
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-06-07 19:10:00
 * @FilePath: \BiliLottery\src\components\LoginCompo.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import Toast from '@/components/CommonCompo/GlobalToast.vue'
import userApi from '@/api/user/user_api';
import { isLogin } from '@/api/user/utils'
import { useRouter } from 'vue-router';
import { useJwtStore } from '@/stores/jwt_token';
//输入框禁止输入空格

const vNoSpace = {
  updated(el: any, binding: any, vnode: any, prevVnode: any) {
    if (el.value.includes(' ')) { //输入空格就替换全部表单内容！
      tab__form.value = Object.fromEntries(Object.entries(tab__form.value).map(el => [el[0], el[1].replaceAll(" ", "")])) as { user_name: string; pwd: string; reg_user_name: string; reg_pwd: string; }
    }
  },
}

const tab__form = ref({
  user_name: "",
  pwd: "",
  reg_user_name: "",
  reg_pwd: ""
})



const show_pwd = ref<boolean>(false)
const showForgetTips = ref<boolean>(false)
const router = useRouter();
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
const toastRef = ref<InstanceType<typeof Toast>>();
/**
 *
 * @param t pwd 或者 reg 用于切换tab
 */
const tabChange = (t: string) => {
  login_info.value.checked !== t && (login_info.value.checked = t)
}
const handleLoginBtn = async () => {
  if (tab__form.value.user_name.length * tab__form.value.pwd.length == 0) {
    toastRef.value!.info(`请输入账号和密码！`);
    return
  }
  await userApi.Login(tab__form.value.user_name, tab__form.value.pwd).then(resp => {
    if (resp.code) {
      toastRef.value!.info(`登录失败！原因：${resp.msg}`)
      return
    }
    const JwtStore = useJwtStore()
    JwtStore.save_jwt_token(resp.data.jwt_token)
    toastRef.value!.info(`登录成功！`)
    router.push('/app/user-center')
  }).catch(e => {
    toastRef.value!.info(`登录失败！原因：${e}`)
    return
  });
}
const handleRegBtn = async () => {
  if (tab__form.value.reg_user_name.length * tab__form.value.reg_pwd.length == 0) {
    toastRef.value!.info(`请输入账号和密码！`);
    return
  }
  await userApi.Reg(tab__form.value.reg_user_name, tab__form.value.reg_pwd).then(resp => {
    if (resp.code) {
      toastRef.value!.info(`注册失败！原因：${resp.msg}`)
      return
    }
    toastRef.value!.info(`注册成功！请登录`);
    router.go(0);
  }).catch(e => {
    toastRef.value!.info(`注册失败！原因：${e}`)
    return
  });
}
const clickSpaceArea = (t: any) => {
  var r = document.getElementsByClassName('forget-tip')[0]
  showForgetTips.value && t && !r.contains(t.target) && (showForgetTips.value = !1)
}
const check_login = () => {
  const JwtStore = useJwtStore()
  isLogin().then(res => {
    if (res[0]) {
      toastRef.value!.info('账号已登录，等待跳转！');
      router.push('/app/user-center')
    } else {
      JwtStore.jwt ?
        toastRef.value!.info(res[1]) : null
    }
  }
  ).catch(e => {
    toastRef.value!.error(e)
    setTimeout(check_login, 2e3)
  })
}
onMounted(() => {
  check_login()
  document.addEventListener('click', clickSpaceArea, !0)
})

</script>

<template>
  <Toast ref="toastRef"></Toast>
  <div class="main__right">
    <div class="tabs_wp">
      <div :class="{ tab_active: login_info.checked === 'pwd' }" @click="tabChange('pwd')">
        密码登录
      </div>
      <div></div>
      <div :class="{ tab_active: login_info.checked === 'reg' }" @click="tabChange('reg')">
        账号注册
      </div>
    </div>
    <div class="login-pwd" v-if="login_info.checked === 'pwd'">
      <div class="tab__form">
        <div class="form__item">
          <div>账号</div>
          <input autocomplete="on" maxlength="32" oninput="value=value.replace(/\s+/g, '')" placeholder="请输入账号"
            type="text" v-model.trim="tab__form.user_name" v-no-space />
        </div>
        <div class="form__separator-line"></div>
        <div class="form__item">
          <div>密码</div>
          <input autocomplete="on" maxlength="32" oninput="value=value.replace(/\s+/g, '')" placeholder="请输入密码"
            :type="show_pwd ? `text` : `password`" v-model.trim="tab__form.pwd" v-no-space />
          <div class="eye-btn">
            <svg v-if="show_pwd" width="20" height="20" viewBox="0 0 20 20" fill="none"
              xmlns="http://www.w3.org/2000/svg" @click="show_pwd = !show_pwd">
              <path fill-rule="evenodd" clip-rule="evenodd"
                d="M17.5753 6.85456C17.7122 6.71896 17.8939 6.63806 18.0866 6.63806C18.7321 6.63806 19.0436 7.42626 18.5748 7.87006C18.1144 8.30554 17.457 8.69885 16.6478 9.03168L18.1457 10.5296C18.2101 10.5941 18.2613 10.6706 18.2962 10.7548C18.331 10.839 18.349 10.9293 18.349 11.0204C18.349 11.1116 18.331 11.2019 18.2962 11.2861C18.2613 11.3703 18.2101 11.4468 18.1457 11.5113C18.0812 11.5757 18.0047 11.6269 17.9205 11.6618C17.8363 11.6967 17.746 11.7146 17.6548 11.7146C17.5637 11.7146 17.4734 11.6967 17.3892 11.6618C17.305 11.6269 17.2284 11.5757 17.164 11.5113L15.3409 9.68819C15.2898 9.63708 15.247 9.57838 15.2141 9.51428C14.4874 9.71293 13.6876 9.87122 12.8344 9.98119C12.8363 9.99011 12.8381 9.99908 12.8397 10.0081L13.2874 12.5472C13.315 12.7266 13.2713 12.9098 13.1656 13.0573C13.0598 13.2049 12.9005 13.3052 12.7217 13.3367C12.5429 13.3683 12.3589 13.3285 12.2091 13.2259C12.0592 13.1234 11.9555 12.9663 11.9202 12.7882L11.4725 10.2491C11.4645 10.2039 11.4611 10.1581 11.4621 10.1125C10.9858 10.1428 10.4976 10.1586 10.0002 10.1586C9.57059 10.1586 9.14778 10.1468 8.73362 10.1241C8.73477 10.1656 8.7322 10.2074 8.72578 10.249L8.27808 12.7881C8.24612 12.9694 8.14345 13.1306 7.99265 13.2362C7.84186 13.3418 7.65528 13.3831 7.47398 13.3512C7.29268 13.3192 7.1315 13.2166 7.0259 13.0658C6.9203 12.915 6.87892 12.7284 6.91088 12.5471L7.35858 10.008C7.35877 10.007 7.35896 10.0061 7.35915 10.0052C6.50085 9.90284 5.6941 9.75191 4.95838 9.56025C4.93012 9.60634 4.89634 9.64933 4.85748 9.68819L3.03438 11.5113C2.96992 11.5757 2.8934 11.6269 2.80918 11.6618C2.72496 11.6967 2.63469 11.7146 2.54353 11.7146C2.45237 11.7146 2.36211 11.6967 2.27789 11.6618C2.19367 11.6269 2.11714 11.5757 2.05268 11.5113C1.98822 11.4468 1.93709 11.3703 1.90221 11.2861C1.86732 11.2019 1.84937 11.1116 1.84937 11.0204C1.84937 10.9293 1.86732 10.839 1.90221 10.7548C1.93709 10.6706 1.98822 10.5941 2.05268 10.5296L3.49373 9.08855C2.6197 8.744 1.91247 8.33062 1.42559 7.87006C0.956591 7.42636 1.26799 6.63816 1.91359 6.63816C2.10629 6.63816 2.28789 6.71896 2.42489 6.85456C2.70009 7.12696 3.19529 7.45886 3.98459 7.77796C5.54429 8.40856 7.73699 8.77016 10.0001 8.77016C12.2632 8.77016 14.4558 8.40856 16.0156 7.77796C16.8049 7.45886 17.3001 7.12696 17.5753 6.85456Z"
                fill="#9499A0"></path>
            </svg>
            <svg v-else width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"
              @click="show_pwd = !show_pwd">
              <path fill-rule="evenodd" clip-rule="evenodd"
                d="M2.11069 9.43732C3.21647 7.77542 5.87904 4.58331 9.89458 4.58331C13.8801 4.58331 16.6483 7.72502 17.8345 9.4049C18.0905 9.76747 18.0905 10.2325 17.8345 10.5951C16.6483 12.2749 13.8801 15.4166 9.89458 15.4166C5.87904 15.4166 3.21647 12.2245 2.11069 10.5626C1.88009 10.2161 1.88009 9.7839 2.11069 9.43732ZM9.89458 3.33331C5.19832 3.33331 2.20919 7.03277 1.07001 8.74489C0.560324 9.51091 0.560323 10.4891 1.07001 11.2551C2.20919 12.9672 5.19832 16.6666 9.89458 16.6666C14.5412 16.6666 17.6368 13.0422 18.8556 11.3161C19.4168 10.5213 19.4168 9.4787 18.8556 8.68391C17.6368 6.95774 14.5412 3.33331 9.89458 3.33331ZM7.29165 9.99998C7.29165 8.50421 8.50421 7.29165 9.99998 7.29165C11.4958 7.29165 12.7083 8.50421 12.7083 9.99998C12.7083 11.4958 11.4958 12.7083 9.99998 12.7083C8.50421 12.7083 7.29165 11.4958 7.29165 9.99998ZM9.99998 6.04165C7.81385 6.04165 6.04165 7.81385 6.04165 9.99998C6.04165 12.1861 7.81385 13.9583 9.99998 13.9583C12.1861 13.9583 13.9583 12.1861 13.9583 9.99998C13.9583 7.81385 12.1861 6.04165 9.99998 6.04165Z"
                fill="#9499A0"></path>
            </svg>
          </div>
          <div class="clickable" @click="showForgetTips = true">忘记密码？</div>
        </div>
      </div>
      <div class="btn_wp">
        <div class="btn_other" @click="tabChange('reg')">没有账号立即注册</div>
        <div class="btn_primary" :class="login_able" @click="handleLoginBtn">登录</div>
      </div>
      <div class="forget-tip" v-show="showForgetTips" @click="showForgetTips = !showForgetTips">
        <img src="//s1.hdslb.com/bfs/static/jinkela/passport-pc/assets/forget_arrow.png" alt="" class="arrow" />
        <div class="forget-tip-line">
          <p class="title">发送短信快速登录</p>
          <p class="desc">未注册或绑定哔哩哔哩的手机号，将帮你注册新账号</p>
        </div>
        <div class="forget-tip-line">
          <p class="title">去找回密码</p>
          <p class="desc">通过绑定的手机号/邮箱重置密码</p>
        </div>
      </div>
    </div>
    <div class="tab-sms" v-if="login_info.checked === 'reg'">
      <div class="tab__form">
        <div class="form__item">
          <input autocomplete="off" maxlength="32" oninput="value=value.replace(/\s+/g, '')" placeholder="请输入需要注册的账号名"
            v-model.trim="tab__form.reg_user_name" v-no-space />
        </div>
        <div class="form__separator-line"></div>
        <div class="form__item">
          <input autocomplete="off" type="text" placeholder="请输入注册密码" maxlength="32"
            oninput="value=value.replace(/\s+/g, '')" v-model.trim="tab__form.reg_pwd" v-no-space />
        </div>
      </div>
      <div class="btn_wp" style="justify-content: center">
        <!---->
        <div class="btn_primary" style="width: 400px" :class="reg_able" @click="handleRegBtn">
          账号注册
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped>
.forget-tip {
  z-index: 100;
  box-sizing: border-box;
  width: 332px;
  height: 120px;
  background: #fff;
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.21);
  border-radius: 5px;
}

.forget-tip .arrow {
  position: absolute;
  width: 34px;
  left: 135px;
  top: -14px;
}

.forget-tip .forget-tip-line {
  padding: 11px 0 11px 18px;
  cursor: pointer;
}

.forget-tip .forget-tip-line:first-child {
  padding-bottom: 10px;
  border-bottom: 1px solid #e7e7e7;
}

.forget-tip .title {
  font-size: 14px;
  line-height: 18px;
  color: #212121;
}

.forget-tip .desc {
  font-size: 12px;
  color: #999;
  line-height: 18px;
}

.login-pwd {
  position: relative;
}

.login-pwd .forget-tip {
  position: absolute;
  top: 110px;
  left: 205px;
}

.tab-sms,
.tab-sms__cid {
  position: relative;
}

.tab-sms__cid {
  width: 42px;
  cursor: pointer;
}

.tab-sms__cid img {
  position: absolute;
  top: 5px;
  left: 42px;
  width: 12px;
}

.tab-sms__vertical-line {
  width: 1px;
  height: 26px;
  border-left: 1px solid #e3e5e7;
}

.tab-sms .area-code-select {
  position: absolute;
  top: 46px;
}

.third-party-login-wrapper {
  margin-top: 24px;
}

.third-party-login-wrapper .title {
  font-size: 13px;
  line-height: 16px;
  text-align: center;
  color: #999;
  margin-bottom: 12px;
}

.third-party-login-wrapper .sns {
  display: flex;
  justify-content: center;
}

.third-party-login-wrapper .sns .btn {
  margin-right: 30px;
  cursor: pointer;
  font-size: 12px;
}

.third-party-login-wrapper .sns .wechat {
  display: flex;
  align-items: center;
}

.third-party-login-wrapper .sns .wechat:before {
  display: inline-block;
  content: '';
  width: 28px;
  height: 28px;
  margin-right: 8px;
  background: url(//s1.hdslb.com/bfs/static/jinkela/passport-pc/assets/wechat.png) no-repeat;
  background-size: cover;
}

.third-party-login-wrapper .sns .weibo {
  display: flex;
  align-items: center;
}

.third-party-login-wrapper .sns .weibo:before {
  display: inline-block;
  content: '';
  width: 28px;
  height: 28px;
  margin-right: 8px;
  background: url(//s1.hdslb.com/bfs/static/jinkela/passport-pc/assets/weibo.png) no-repeat;
  background-size: cover;
}

.third-party-login-wrapper .sns .qq {
  display: flex;
  align-items: center;
}

.third-party-login-wrapper .sns .qq:before {
  display: inline-block;
  content: '';
  width: 28px;
  height: 28px;
  margin-right: 8px;
  background: url(//s1.hdslb.com/bfs/static/jinkela/passport-pc/assets/qq.png) no-repeat;
  background-size: cover;
}
</style>
