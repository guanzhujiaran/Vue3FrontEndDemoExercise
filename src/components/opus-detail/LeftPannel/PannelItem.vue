
<script setup lang="ts">
import { onMounted, ref, watchEffect, type ComputedRef } from 'vue'
import avatar from './SingleUserInfo.vue'
import router from '@/router'
import { useRoute } from 'vue-router'
import type { AccountInfoModel } from '@/models/account/account_model';
import type { PageShowModel } from '@/models/account/page/model.ts'
const route = useRoute()


const props = defineModel<PageShowModel[]>()

defineProps<{
  side_bar_tittle: string
}>()
const active_account_name = ref('')
const handleAccountAvatarClick = (account_name: string) => {
  if (active_account_name.value !== account_name) {
    active_account_name.value = account_name
    router.push({
      path: '/user-center/account_detail/account_name'.concat(account_name)
    },
    )
  }
}
</script>
<template>
  <div class="side-bar" v-if="props">
    <div class="title">
      {{ side_bar_tittle }}
    </div>
    <ul class="list">
      <li v-for="account_info of props" :key="account_info.info.account_name"
        @click="handleAccountAvatarClick(account_info.info.account_name)">
        <avatar :account_info="account_info.info" :class="{ active: account_info.is_show }"
          :style="account_info.info.info?.face ? { backgroundImage: `url(${account_info.info.info.face})` } : {}" />
      </li>

    </ul>

    <div class="divided-line"></div>
    <div class="setting item">
      <router-link to="/user-center/config" title="全局设置">
        <svg viewBox="2 3 16 15" class="setting-icon css-1dtzbno">
          <path
            d="M9.28219976,16.9928072 C9.00196705,16.9830213 8.62828086,16.9699719 8.35130844,16.8668237 C7.88746873,16.7570586 7.61700372,16.4670393 7.44318203,16.0868457 C7.27595707,15.5198389 7.00875552,15.1363662 6.55144084,14.8397489 C6.09417835,14.5432065 5.63033546,14.4335326 5.06659151,14.5073223 C4.68964249,14.5877082 4.22580215,14.4779613 3.95860061,14.0944886 C3.60124172,13.6144096 3.24712805,13.0408765 3.08316847,12.3803615 C2.90934424,12.0002409 3.01909171,11.5363823 3.30911036,11.2659356 C3.69910878,10.8118636 3.90228894,10.3513408 3.92186337,9.79080239 C3.94143589,9.23031872 3.77087767,8.75667164 3.41350053,8.27659204 C3.1430544,7.98655515 3.06593077,7.51618914 3.26585065,7.14902862 C3.56567348,6.59834978 3.86547872,6.04765205 4.25872173,5.50014418 C4.55202145,5.13626282 5.02238491,5.05921217 5.39281081,5.16562383 C5.95003165,5.27863158 6.42039765,5.20150795 6.89723266,4.93756668 C7.37412178,4.67364558 7.76085674,4.31302704 7.87379151,3.75580366 C8.07371138,3.38864313 8.3670111,3.02476177 8.83411428,3.04107337 C9.491296,2.97047349 10.0517797,2.99004602 10.7024357,3.1063166 C11.1695389,3.1226282 11.4367228,3.50608208 11.6104892,3.88629202 C11.7777871,4.45330134 12.044971,4.83675523 12.5022335,5.13329763 C12.9595684,5.42986082 13.4234087,5.53960766 13.9871552,5.46574495 C14.3640834,5.38543147 14.8278716,5.49510341 15.0951285,5.87855984 C15.4524295,6.35872812 15.8065249,6.93226056 15.9705606,7.59268687 C16.144327,7.9728968 16.0345801,8.43673714 15.7412798,8.80063675 C15.3545656,9.16118294 15.1514559,9.62178124 15.1318834,10.1822649 C15.1123089,10.7428033 15.2827967,11.2163749 15.6401524,11.696545 C15.9106174,11.9865643 15.9877404,12.4569486 15.7846156,12.917455 C15.4848079,13.4682257 15.1849296,14.0189209 14.7917446,14.5663395 C14.5016523,14.8368019 14.031341,14.9139275 13.6609359,14.8074435 C13.1970748,14.697769 12.6333491,14.7715593 12.1564417,15.0354798 C11.6796048,15.2994758 11.2896272,15.7534755 11.1798797,16.2173341 C11.0733957,16.5877392 10.6867331,16.9483785 10.2196299,16.9320669 C9.93611866,17.0156426 9.56245072,17.0025938 9.28219976,16.9928072 Z M9.5264564,12.7907616 C11.0220027,12.7907616 12.2372185,11.575637 12.2372185,9.9865255 C12.2372185,8.39748699 11.0220027,7.1823442 9.5264564,7.1823442 C8.03083705,7.1823442 6.81571251,8.39748699 6.81571251,9.9865255 C6.81571251,11.575637 8.03083705,12.7907616 9.5264564,12.7907616 Z">
          </path>
        </svg>全局设置
      </router-link>
    </div>

  </div>

</template>
<style>
.setting a {
  display: inline-block;
  position: relative;
  top: 2px;
  margin-right: 6px;
}

.setting,
.title {
  padding-left: 20px;
  position: relative;
}

.css-1dtzbno {
  fill: currentcolor;
  width: 1em;
  height: 1em;
}

svg:not(:root) {
  overflow-clip-margin: content-box;
  overflow: hidden;
}

* {
  margin: 0;
  padding: 0;
}

.item:hover,
.item:hover {
  color: #2faee3;
}

a,
img {
  -webkit-touch-callout: none;
  color: inherit;
  border: 0;
  outline: 0;
  text-decoration: none;
}

a,
button,
input,
textarea,
select {
  -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1);
  outline: 0;
  padding: 0;
  margin: 0;
  border: 0;
  background-color: transparent;
}
</style>
