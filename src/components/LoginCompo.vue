<!--
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-04-02 21:17:47
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-04-09 17:55:36
 * @FilePath: \BiliLottery\src\components\LoginCompo.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import Toast from './CommonCompo/Toast.vue'
const user_name = ref<string>('')
const pwd = ref<string>('')
const reg_user_name = ref<string>()
const reg_pwd = ref<string>()
const show_pwd = ref<boolean>(false)
const showForgetTips = ref<boolean>(false)
const login_able = computed(() => ({
  enable: user_name.value && pwd.value,
  disabled: !(user_name.value && pwd.value)
}))
const reg_able = computed(() => ({
  enable: reg_user_name.value && reg_pwd.value,
  disabled: !(reg_user_name.value && reg_pwd.value)
}))
const login_info = ref({
  source: 'main_web',
  go_url: '',
  spm_id_from: '',
  checked: 'pwd',
  isSmsFocus: !1,
  captcha: void 0
})
const toast = ref<any>(null)
/**
 *
 * @param t pwd 或者 reg 用于切换tab
 */
const tabChange = (t: string) => {
  login_info.value.checked !== t && (login_info.value.checked = t)
}
const handleLoginBtn = async () => {
  toast.value.info(`账号：${user_name.value}\t密码：${pwd.value}`)
}
const handleRegBtn = async () => {
  toast.value.info(`注册账号：${reg_user_name.value}\t注册密码：${reg_pwd.value}`)
}
const clickSpaceArea = (t: any) => {
  var r = document.getElementsByClassName('forget-tip')[0]
  showForgetTips.value && t && !r.contains(t.target) && (showForgetTips.value = !1)
}
onMounted(() => {
  document.addEventListener('click', clickSpaceArea, !0)
})
</script>

<template>
  <Toast ref="toast"></Toast>
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
          <input
            autocomplete="on"
            maxlength="32"
            oninput="value=value.replace(/\s+/g, '')"
            placeholder="请输入账号"
            type="text"
            v-model="user_name"
          />
        </div>
        <div class="form__separator-line"></div>
        <div class="form__item">
          <div>密码</div>
          <input
            autocomplete="on"
            maxlength="32"
            oninput="value=value.replace(/\s+/g, '')"
            placeholder="请输入密码"
            type="password"
            v-model="pwd"
          />
          <div class="eye-btn" @click="show_pwd = !show_pwd">
            <svg
              v-if="show_pwd"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M17.5753 6.85456C17.7122 6.71896 17.8939 6.63806 18.0866 6.63806C18.7321 6.63806 19.0436 7.42626 18.5748 7.87006C18.1144 8.30554 17.457 8.69885 16.6478 9.03168L18.1457 10.5296C18.2101 10.5941 18.2613 10.6706 18.2962 10.7548C18.331 10.839 18.349 10.9293 18.349 11.0204C18.349 11.1116 18.331 11.2019 18.2962 11.2861C18.2613 11.3703 18.2101 11.4468 18.1457 11.5113C18.0812 11.5757 18.0047 11.6269 17.9205 11.6618C17.8363 11.6967 17.746 11.7146 17.6548 11.7146C17.5637 11.7146 17.4734 11.6967 17.3892 11.6618C17.305 11.6269 17.2284 11.5757 17.164 11.5113L15.3409 9.68819C15.2898 9.63708 15.247 9.57838 15.2141 9.51428C14.4874 9.71293 13.6876 9.87122 12.8344 9.98119C12.8363 9.99011 12.8381 9.99908 12.8397 10.0081L13.2874 12.5472C13.315 12.7266 13.2713 12.9098 13.1656 13.0573C13.0598 13.2049 12.9005 13.3052 12.7217 13.3367C12.5429 13.3683 12.3589 13.3285 12.2091 13.2259C12.0592 13.1234 11.9555 12.9663 11.9202 12.7882L11.4725 10.2491C11.4645 10.2039 11.4611 10.1581 11.4621 10.1125C10.9858 10.1428 10.4976 10.1586 10.0002 10.1586C9.57059 10.1586 9.14778 10.1468 8.73362 10.1241C8.73477 10.1656 8.7322 10.2074 8.72578 10.249L8.27808 12.7881C8.24612 12.9694 8.14345 13.1306 7.99265 13.2362C7.84186 13.3418 7.65528 13.3831 7.47398 13.3512C7.29268 13.3192 7.1315 13.2166 7.0259 13.0658C6.9203 12.915 6.87892 12.7284 6.91088 12.5471L7.35858 10.008C7.35877 10.007 7.35896 10.0061 7.35915 10.0052C6.50085 9.90284 5.6941 9.75191 4.95838 9.56025C4.93012 9.60634 4.89634 9.64933 4.85748 9.68819L3.03438 11.5113C2.96992 11.5757 2.8934 11.6269 2.80918 11.6618C2.72496 11.6967 2.63469 11.7146 2.54353 11.7146C2.45237 11.7146 2.36211 11.6967 2.27789 11.6618C2.19367 11.6269 2.11714 11.5757 2.05268 11.5113C1.98822 11.4468 1.93709 11.3703 1.90221 11.2861C1.86732 11.2019 1.84937 11.1116 1.84937 11.0204C1.84937 10.9293 1.86732 10.839 1.90221 10.7548C1.93709 10.6706 1.98822 10.5941 2.05268 10.5296L3.49373 9.08855C2.6197 8.744 1.91247 8.33062 1.42559 7.87006C0.956591 7.42636 1.26799 6.63816 1.91359 6.63816C2.10629 6.63816 2.28789 6.71896 2.42489 6.85456C2.70009 7.12696 3.19529 7.45886 3.98459 7.77796C5.54429 8.40856 7.73699 8.77016 10.0001 8.77016C12.2632 8.77016 14.4558 8.40856 16.0156 7.77796C16.8049 7.45886 17.3001 7.12696 17.5753 6.85456Z"
                fill="#9499A0"
              ></path>
            </svg>
            <svg
              v-else
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M2.11069 9.43732C3.21647 7.77542 5.87904 4.58331 9.89458 4.58331C13.8801 4.58331 16.6483 7.72502 17.8345 9.4049C18.0905 9.76747 18.0905 10.2325 17.8345 10.5951C16.6483 12.2749 13.8801 15.4166 9.89458 15.4166C5.87904 15.4166 3.21647 12.2245 2.11069 10.5626C1.88009 10.2161 1.88009 9.7839 2.11069 9.43732ZM9.89458 3.33331C5.19832 3.33331 2.20919 7.03277 1.07001 8.74489C0.560324 9.51091 0.560323 10.4891 1.07001 11.2551C2.20919 12.9672 5.19832 16.6666 9.89458 16.6666C14.5412 16.6666 17.6368 13.0422 18.8556 11.3161C19.4168 10.5213 19.4168 9.4787 18.8556 8.68391C17.6368 6.95774 14.5412 3.33331 9.89458 3.33331ZM7.29165 9.99998C7.29165 8.50421 8.50421 7.29165 9.99998 7.29165C11.4958 7.29165 12.7083 8.50421 12.7083 9.99998C12.7083 11.4958 11.4958 12.7083 9.99998 12.7083C8.50421 12.7083 7.29165 11.4958 7.29165 9.99998ZM9.99998 6.04165C7.81385 6.04165 6.04165 7.81385 6.04165 9.99998C6.04165 12.1861 7.81385 13.9583 9.99998 13.9583C12.1861 13.9583 13.9583 12.1861 13.9583 9.99998C13.9583 7.81385 12.1861 6.04165 9.99998 6.04165Z"
                fill="#9499A0"
              ></path>
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
        <img
          src="//s1.hdslb.com/bfs/static/jinkela/passport-pc/assets/forget_arrow.png"
          alt=""
          class="arrow"
        />
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
          <input
            autocomplete="off"
            maxlength="32"
            oninput="value=value.replace(/[^\d]/g, '')"
            placeholder="请输入需要注册的账号名"
            v-model="reg_user_name"
          />
        </div>
        <div class="form__separator-line"></div>
        <div class="form__item">
          <input
            autocomplete="off"
            placeholder="请输入注册密码"
            maxlength="32"
            oninput="value=value.replace(/[^\d]/g, '')"
            v-model="reg_pwd"
          />
        </div>
      </div>
      <div class="btn_wp" style="justify-content: center">
        <!---->
        <div class="btn_primary" style="width: 400px" :class="reg_able" @click="handleRegBtn">
          账号注册
        </div>
      </div>
      <div class="area-code-select" style="display: none">
        <div class="option checked"><span>中国大陆</span> <span>+86</span></div>
        <div class="option"><span>中国香港特别行政区</span> <span>+852</span></div>
        <div class="option"><span>中国澳门特别行政区</span> <span>+853</span></div>
        <div class="option"><span>中国台湾</span> <span>+886</span></div>
        <div class="option"><span>美国</span> <span>+1</span></div>
        <div class="option"><span>比利时</span> <span>+32</span></div>
        <div class="option"><span>澳大利亚</span> <span>+61</span></div>
        <div class="option"><span>法国</span> <span>+33</span></div>
        <div class="option"><span>加拿大</span> <span>+1</span></div>
        <div class="option"><span>日本</span> <span>+81</span></div>
        <div class="option"><span>新加坡</span> <span>+65</span></div>
        <div class="option"><span>韩国</span> <span>+82</span></div>
        <div class="option"><span>马来西亚</span> <span>+60</span></div>
        <div class="option"><span>英国</span> <span>+44</span></div>
        <div class="option"><span>意大利</span> <span>+39</span></div>
        <div class="option"><span>德国</span> <span>+49</span></div>
        <div class="option"><span>俄罗斯</span> <span>+7</span></div>
        <div class="option"><span>瓦利斯群岛和富图纳群岛</span> <span>+1681</span></div>
        <div class="option"><span>葡萄牙</span> <span>+351</span></div>
        <div class="option"><span>帕劳</span> <span>+680</span></div>
        <div class="option"><span>诺福克岛</span> <span>+672</span></div>
        <div class="option"><span>挪威</span> <span>+47</span></div>
        <div class="option"><span>纽埃岛</span> <span>+683</span></div>
        <div class="option"><span>尼日利亚</span> <span>+234</span></div>
        <div class="option"><span>尼日尔</span> <span>+227</span></div>
        <div class="option"><span>尼加拉瓜</span> <span>+505</span></div>
        <div class="option"><span>尼泊尔</span> <span>+977</span></div>
        <div class="option"><span>瑙鲁</span> <span>+674</span></div>
        <div class="option"><span>格鲁吉亚</span> <span>+995</span></div>
        <div class="option"><span>瑞典</span> <span>+46</span></div>
        <div class="option"><span>沙特阿拉伯</span> <span>+966</span></div>
        <div class="option"><span>桑给巴尔岛</span> <span>+259</span></div>
        <div class="option"><span>塞舌尔共和国</span> <span>+248</span></div>
        <div class="option"><span>塞浦路斯</span> <span>+357</span></div>
        <div class="option"><span>塞内加尔</span> <span>+221</span></div>
        <div class="option"><span>塞拉利昂</span> <span>+232</span></div>
        <div class="option"><span>萨摩亚，东部</span> <span>+684</span></div>
        <div class="option"><span>萨摩亚，西部</span> <span>+685</span></div>
        <div class="option"><span>萨尔瓦多</span> <span>+503</span></div>
        <div class="option"><span>瑞士</span> <span>+41</span></div>
        <div class="option"><span>圣多美和普林西比</span> <span>+239</span></div>
        <div class="option"><span>南斯拉夫</span> <span>+381</span></div>
        <div class="option"><span>南非</span> <span>+27</span></div>
        <div class="option"><span>毛里塔尼亚</span> <span>+222</span></div>
        <div class="option"><span>毛里求斯</span> <span>+230</span></div>
        <div class="option"><span>马歇尔岛</span> <span>+692</span></div>
        <div class="option"><span>马提尼克岛</span> <span>+596</span></div>
        <div class="option"><span>马其顿</span> <span>+389</span></div>
        <div class="option"><span>马里亚纳岛</span> <span>+1670</span></div>
        <div class="option"><span>马里</span> <span>+223</span></div>
        <div class="option"><span>马拉维</span> <span>+265</span></div>
        <div class="option"><span>马耳他</span> <span>+356</span></div>
        <div class="option"><span>马尔代夫</span> <span>+960</span></div>
        <div class="option"><span>蒙古</span> <span>+976</span></div>
        <div class="option"><span>蒙特塞拉特岛</span> <span>+1664</span></div>
        <div class="option"><span>纳米比亚</span> <span>+264</span></div>
        <div class="option"><span>墨西哥</span> <span>+52</span></div>
        <div class="option"><span>莫桑比克</span> <span>+258</span></div>
        <div class="option"><span>摩纳哥</span> <span>+377</span></div>
        <div class="option"><span>摩洛哥</span> <span>+212</span></div>
        <div class="option"><span>摩尔多瓦</span> <span>+373</span></div>
        <div class="option"><span>缅甸</span> <span>+95</span></div>
        <div class="option"><span>密克罗尼西亚</span> <span>+691</span></div>
        <div class="option"><span>秘鲁</span> <span>+51</span></div>
        <div class="option"><span>孟加拉国</span> <span>+880</span></div>
        <div class="option"><span>马达加斯加</span> <span>+261</span></div>
        <div class="option"><span>圣卢西亚</span> <span>+1784</span></div>
        <div class="option"><span>智利</span> <span>+56</span></div>
        <div class="option"><span>牙买加</span> <span>+1876</span></div>
        <div class="option"><span>叙利亚</span> <span>+963</span></div>
        <div class="option"><span>匈牙利</span> <span>+36</span></div>
        <div class="option"><span>科特迪瓦</span> <span>+225</span></div>
        <div class="option"><span>希腊</span> <span>+30</span></div>
        <div class="option"><span>西班牙</span> <span>+34</span></div>
        <div class="option"><span>乌兹别克斯坦</span> <span>+998</span></div>
        <div class="option"><span>乌拉圭</span> <span>+598</span></div>
        <div class="option"><span>乌克兰</span> <span>+380</span></div>
        <div class="option"><span>乌干达</span> <span>+256</span></div>
        <div class="option"><span>亚美尼亚</span> <span>+374</span></div>
        <div class="option"><span>也门</span> <span>+967</span></div>
        <div class="option"><span>直布罗陀</span> <span>+350</span></div>
        <div class="option"><span>乍得</span> <span>+235</span></div>
        <div class="option"><span>赞比亚</span> <span>+260</span></div>
        <div class="option"><span>越南</span> <span>+84</span></div>
        <div class="option"><span>约旦</span> <span>+962</span></div>
        <div class="option"><span>印尼</span> <span>+62</span></div>
        <div class="option"><span>印度</span> <span>+91</span></div>
        <div class="option"><span>以色列</span> <span>+972</span></div>
        <div class="option"><span>伊朗</span> <span>+98</span></div>
        <div class="option"><span>伊拉克</span> <span>+964</span></div>
        <div class="option"><span>文莱</span> <span>+673</span></div>
        <div class="option"><span>委内瑞拉</span> <span>+58</span></div>
        <div class="option"><span>维珍群岛(英属)</span> <span>+1284</span></div>
        <div class="option"><span>泰国</span> <span>+66</span></div>
        <div class="option"><span>索马里</span> <span>+252</span></div>
        <div class="option"><span>所罗门群岛</span> <span>+677</span></div>
        <div class="option"><span>苏里南</span> <span>+597</span></div>
        <div class="option"><span>苏丹</span> <span>+249</span></div>
        <div class="option"><span>斯威士兰</span> <span>+268</span></div>
        <div class="option"><span>斯洛文尼亚</span> <span>+386</span></div>
        <div class="option"><span>斯洛伐克</span> <span>+421</span></div>
        <div class="option"><span>斯里兰卡</span> <span>+94</span></div>
        <div class="option"><span>圣皮埃尔和密克隆群岛</span> <span>+508</span></div>
        <div class="option"><span>坦桑尼亚</span> <span>+255</span></div>
        <div class="option"><span>汤加</span> <span>+676</span></div>
        <div class="option"><span>维珍群岛(美属)</span> <span>+1340</span></div>
        <div class="option"><span>瓦努阿图</span> <span>+678</span></div>
        <div class="option"><span>托克劳岛</span> <span>+690</span></div>
        <div class="option"><span>土库曼斯坦</span> <span>+993</span></div>
        <div class="option"><span>土耳其</span> <span>+90</span></div>
        <div class="option"><span>图瓦卢</span> <span>+688</span></div>
        <div class="option"><span>突尼斯</span> <span>+216</span></div>
        <div class="option"><span>阿森松岛</span> <span>+247</span></div>
        <div class="option"><span>特立尼达和多巴哥</span> <span>+1868</span></div>
        <div class="option"><span>特克斯和凯科斯</span> <span>+1649</span></div>
        <div class="option"><span>圣马力诺</span> <span>+378</span></div>
        <div class="option"><span>法属圭亚那</span> <span>+594</span></div>
        <div class="option"><span>不丹</span> <span>+975</span></div>
        <div class="option"><span>博茨瓦纳</span> <span>+267</span></div>
        <div class="option"><span>伯利兹</span> <span>+501</span></div>
        <div class="option"><span>玻利维亚</span> <span>+591</span></div>
        <div class="option"><span>波兰</span> <span>+48</span></div>
        <div class="option"><span>波黑</span> <span>+387</span></div>
        <div class="option"><span>波多黎各</span> <span>+1787</span></div>
        <div class="option"><span>冰岛</span> <span>+354</span></div>
        <div class="option"><span>贝宁</span> <span>+229</span></div>
        <div class="option"><span>保加利亚</span> <span>+359</span></div>
        <div class="option"><span>布基纳法索</span> <span>+226</span></div>
        <div class="option"><span>布隆迪</span> <span>+257</span></div>
        <div class="option"><span>法属波利尼西亚</span> <span>+689</span></div>
        <div class="option"><span>法罗岛</span> <span>+298</span></div>
        <div class="option"><span>厄立特里亚</span> <span>+291</span></div>
        <div class="option"><span>厄瓜多尔</span> <span>+593</span></div>
        <div class="option"><span>多米尼加代表</span> <span>+1809</span></div>
        <div class="option"><span>多米尼加</span> <span>+1767</span></div>
        <div class="option"><span>多哥</span> <span>+228</span></div>
        <div class="option"><span>迪戈加西亚岛</span> <span>+246</span></div>
        <div class="option"><span>丹麦</span> <span>+45</span></div>
        <div class="option"><span>赤道几内亚</span> <span>+240</span></div>
        <div class="option"><span>百慕大群岛</span> <span>+1441</span></div>
        <div class="option"><span>白俄罗斯</span> <span>+375</span></div>
        <div class="option"><span>巴西</span> <span>+55</span></div>
        <div class="option"><span>爱尔兰</span> <span>+353</span></div>
        <div class="option"><span>埃塞俄比亚</span> <span>+251</span></div>
        <div class="option"><span>埃及</span> <span>+20</span></div>
        <div class="option"><span>阿塞拜疆</span> <span>+994</span></div>
        <div class="option"><span>阿曼</span> <span>+968</span></div>
        <div class="option"><span>阿联酋</span> <span>+971</span></div>
        <div class="option"><span>阿根廷</span> <span>+54</span></div>
        <div class="option"><span>阿富汗</span> <span>+93</span></div>
        <div class="option"><span>阿尔及利亚</span> <span>+213</span></div>
        <div class="option"><span>阿尔巴尼亚</span> <span>+355</span></div>
        <div class="option"><span>爱沙尼亚</span> <span>+372</span></div>
        <div class="option"><span>安道尔</span> <span>+376</span></div>
        <div class="option"><span>巴拿马</span> <span>+507</span></div>
        <div class="option"><span>巴林</span> <span>+973</span></div>
        <div class="option"><span>巴拉圭</span> <span>+595</span></div>
        <div class="option"><span>巴基斯坦</span> <span>+92</span></div>
        <div class="option"><span>巴哈马群岛</span> <span>+1242</span></div>
        <div class="option"><span>巴布亚新几内亚</span> <span>+675</span></div>
        <div class="option"><span>巴巴多斯</span> <span>+1246</span></div>
        <div class="option"><span>奥地利</span> <span>+43</span></div>
        <div class="option"><span>安提瓜岛和巴布达</span> <span>+1268</span></div>
        <div class="option"><span>安哥拉</span> <span>+244</span></div>
        <div class="option"><span>新西兰</span> <span>+64</span></div>
        <div class="option"><span>非洲中部</span> <span>+236</span></div>
        <div class="option"><span>罗马尼亚</span> <span>+40</span></div>
        <div class="option"><span>科威特</span> <span>+965</span></div>
        <div class="option"><span>科摩罗</span> <span>+269</span></div>
        <div class="option"><span>开曼群岛</span> <span>+1345</span></div>
        <div class="option"><span>卡塔尔</span> <span>+974</span></div>
        <div class="option"><span>喀麦隆</span> <span>+237</span></div>
        <div class="option"><span>聚会岛</span> <span>+262</span></div>
        <div class="option"><span>津巴布韦</span> <span>+263</span></div>
        <div class="option"><span>捷克</span> <span>+420</span></div>
        <div class="option"><span>柬埔寨</span> <span>+855</span></div>
        <div class="option"><span>加蓬</span> <span>+241</span></div>
        <div class="option"><span>克罗地亚</span> <span>+385</span></div>
        <div class="option"><span>肯尼亚</span> <span>+254</span></div>
        <div class="option"><span>卢旺达</span> <span>+250</span></div>
        <div class="option"><span>卢森堡</span> <span>+352</span></div>
        <div class="option"><span>利比亚</span> <span>+218</span></div>
        <div class="option"><span>利比里亚</span> <span>+231</span></div>
        <div class="option"><span>立陶宛</span> <span>+370</span></div>
        <div class="option"><span>黎巴嫩</span> <span>+961</span></div>
        <div class="option"><span>老挝</span> <span>+856</span></div>
        <div class="option"><span>莱索托</span> <span>+266</span></div>
        <div class="option"><span>拉脱维亚</span> <span>+371</span></div>
        <div class="option"><span>库克岛</span> <span>+682</span></div>
        <div class="option"><span>加纳</span> <span>+233</span></div>
        <div class="option"><span>几内亚比绍</span> <span>+245</span></div>
        <div class="option"><span>几内亚</span> <span>+224</span></div>
        <div class="option"><span>格林纳达</span> <span>+1473</span></div>
        <div class="option"><span>哥斯达黎加</span> <span>+506</span></div>
        <div class="option"><span>哥伦比亚</span> <span>+57</span></div>
        <div class="option"><span>刚果(金)</span> <span>+243</span></div>
        <div class="option"><span>刚果</span> <span>+242</span></div>
        <div class="option"><span>冈比亚</span> <span>+220</span></div>
        <div class="option"><span>福克兰岛</span> <span>+500</span></div>
        <div class="option"><span>佛得角</span> <span>+238</span></div>
        <div class="option"><span>芬兰</span> <span>+358</span></div>
        <div class="option"><span>斐济</span> <span>+679</span></div>
        <div class="option"><span>格陵兰岛</span> <span>+299</span></div>
        <div class="option"><span>古巴</span> <span>+53</span></div>
        <div class="option"><span>吉尔吉斯斯坦</span> <span>+996</span></div>
        <div class="option"><span>吉布提</span> <span>+253</span></div>
        <div class="option"><span>基里巴斯</span> <span>+686</span></div>
        <div class="option"><span>维克岛</span> <span>+1808</span></div>
        <div class="option"><span>洪都拉斯</span> <span>+504</span></div>
        <div class="option"><span>荷兰</span> <span>+31</span></div>
        <div class="option"><span>朝鲜</span> <span>+850</span></div>
        <div class="option"><span>海地</span> <span>+509</span></div>
        <div class="option"><span>关岛</span> <span>+1671</span></div>
        <div class="option"><span>瓜德罗普岛</span> <span>+590</span></div>
        <div class="option"><span>菲律宾</span> <span>+63</span></div>
      </div>
    </div>
    <div class="third-party-login-wrapper">
      <div class="title">其他方式登录</div>
      <div class="sns">
        <span class="btn wechat">微信登录</span>
        <span class="btn weibo">微博登录</span>
        <span class="btn qq">QQ登录</span>
      </div>
    </div>
  </div>
</template>
<style>
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
