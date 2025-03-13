<script setup lang="ts">
import { ref } from 'vue'
import avatar from './SingleUserInfo.vue'
import type { PageShowModel } from '@/models/account/page/model.ts'
import { SVG } from '@/assets/svgs.ts'
const user_setting_route_model = ref([
  {
    to: '/app/user-center/account-global-config',
    path: 'account-global-config',
    title: '用户全局设置',
    show_name: '用户全局设置',
    svg: SVG.setting.path
  },
  {
    to: '/app/user-center/account-base-info-config',
    path: 'account-base-info-config',
    title: '用户基本信息设置（设置昵称、性别等）',
    show_name: '用户基本信息设置',
    svg: SVG.setting.path
  }
])
const props = defineModel<PageShowModel[]>()

defineProps<{
  side_bar_tittle: string
}>()

const active_account_name = ref('')
const handleAccountAvatarClick = (account_name: string) => {
  if (active_account_name.value !== account_name) {
    active_account_name.value = account_name
  }
}
</script>
<template>
  <div class="side-bar" v-if="props">
    <div class="title">
      {{ side_bar_tittle }}
    </div>
    <div class="divided-line"></div>
    <div class="list">
      <router-link
        :to="{
          path: '/app/user-center/account_detail/account_name'.concat(
            account_info.info.account_name
          )
        }"
        v-for="account_info of props"
        :key="account_info.info.account_name"
        @click="handleAccountAvatarClick(account_info.info.account_name)"
      >
        <avatar :account_info="account_info.info" :class="{ active: account_info.is_show }" />
      </router-link>
    </div>
    <div class="divided-line"></div>
    <div class="setting">
      <router-link
        v-for="(da, idx) in user_setting_route_model"
        :to="da.to"
        :title="da.title"
        class="item"
      >
        <svg viewBox="2 3 16 15" class="setting-icon css-1dtzbno">
          <path :d="da.svg"></path>
        </svg>
        {{ da.show_name }}
      </router-link>
    </div>
  </div>
</template>
<style scoped>
.setting a {
  display: block;
  position: relative;
  top: 2px;
  margin: 0.1rem;
}

.title {
  height: 36px;
  -ms-flex-negative: 0;
  flex-shrink: 0;
  display: -webkit-box;
  display: -ms-flexbox;
  display: flex;
  -webkit-box-pack: center;
  -ms-flex-pack: center;
  justify-content: center;
  -webkit-box-align: center;
  -ms-flex-align: center;
  align-items: center;
  border-bottom: 1px solid #e9eaec;
  position: relative;
  text-align: center;
  color: #333;
}

.title span {
  font-size: 14px;
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
