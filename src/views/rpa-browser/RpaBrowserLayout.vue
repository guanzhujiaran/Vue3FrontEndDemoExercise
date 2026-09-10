<template>
  <div class="rpa-browser-layout flex flex-col flex-1">
    <!-- 注意：本组件是「顶层路由组件」，必须保持单根。
         App.vue 的外层 <RouterView> 用了 <transition mode="out-in"> + <keep-alive>，其状态机
         依赖子组件是单根元素。若模板出现多个根节点（如 v-if/v-else 并列，或根层有注释节点），
         组件会被编译成 fragment，导致 keep-alive 缓存的布局 vnode 丢失/残留 —— 表现为从
         /app/rpa-browser 切回 /app/admin 时 bili-side-nav 整块消失、或内容重复渲染。
         因此注释必须放在根元素「内部」。 -->
    <!-- 未登录时显示未授权提示页，倒计时自动返回首页 -->
    <BiliErrorRouteTo v-if="!isLoggedIn" :detail="BiliErrorRouteToTxt.rpa_browser_login_required" />
    <router-view v-else v-slot="{ Component }">
      <transition
        enter-active-class="transition-opacity duration-300 ease-in-out"
        leave-active-class="transition-opacity duration-300 ease-in-out"
        enter-from-class="opacity-0"
        leave-to-class="opacity-0"
        mode="out-in"
      >
        <component :is="Component" />
      </transition>
    </router-view>
  </div>
</template>

<script setup lang="ts">
import { computed, type Ref } from 'vue'
import { useInject, KeysEnum } from '@/models/base/provide_model.ts'
import type { UserNavModel } from '@/models/user/user_model.ts'
import BiliErrorRouteTo from '@/components/CommonCompo/Bili-Feedback-Compo/BiliErrorRouteTo.vue'
import { BiliErrorRouteToTxt } from '@/assets/text/BiliErrorTxt.ts'

const biliUser = useInject(KeysEnum.BiliUser) as Ref<UserNavModel>
const isLoggedIn = computed(() => !!biliUser.value.uid)
</script>
