<template>
  <div class="rpa-browser-layout flex flex-col flex-1 min-h-0">
    <!-- 注意：本组件是「顶层路由组件」，必须保持单根。
         App.vue 的外层 <RouterView> 用了 <transition mode="out-in"> + <keep-alive>，其状态机
         依赖子组件是单根元素。若模板出现多个根节点（如 v-if/v-else 并列，或根层有注释节点），
         组件会被编译成 fragment，导致 keep-alive 缓存的布局 vnode 丢失/残留 —— 表现为从
         /app/rpa-browser 切回 /app/admin 时 bili-side-nav 整块消失、或内容重复渲染。
         因此注释必须放在根元素「内部」。 -->
    <!-- 与侧边导航布局共用 AutoHeightContainer：由它算出「窗口高 - 顶部导航 - el-main 偏移」的
         确定高度，子页面才能可靠地按 100% 高度布局（h-full / flex-1），不再依赖 min-h-[70vh] 兜底 -->
    <AutoHeightContainer class="rpa-browser-layout__body flex shrink-0 flex-col min-h-0">
      <!-- 仅开发环境允许正常访问 RPA 模块；其余环境统一展示「施工中」提示，隐藏所有子页面 -->
      <template v-if="isDev">
        <!-- 移动端提示：本模块依赖实时画面与拖拽操控，PC 端体验更好（用户关闭后不再提示） -->
        <RpaMobileTip class="rpa-browser-layout__mobile-tip mb-2" />
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
      </template>
      <centered-container
        v-else
        class="rpa-browser-layout__construction flex flex-col items-center justify-center min-h-[60vh] py-10 px-5 text-center"
      >
        <WarningIcon class="rpa-browser-layout__construction-icon w-20 h-20 text-warning mb-6 animate-float" />
        <h2 class="rpa-browser-layout__construction-title text-3xl font-semibold text-text-primary m-0 mb-3 tracking-wide">
          前方施工中
        </h2>
        <p class="rpa-browser-layout__construction-desc text-base text-text-secondary m-0 mb-8 leading-relaxed">
          该功能正在施工中，暂时不开放，敬请期待。
        </p>
        <router-link :to="{ name: RouteName.HOME }">
          <el-button type="primary" size="large" round>返回首页</el-button>
        </router-link>
      </centered-container>
    </AutoHeightContainer>
  </div>
</template>

<script setup lang="ts">
import { computed, type Ref } from 'vue'
import { useInject, KeysEnum } from '@/models/base/provide_model.ts'
import type { UserNavModel } from '@/models/user/user_model.ts'
import AutoHeightContainer from '@/components/CommonCompo/Bili-Container-Compo/AutoHeightContainer.vue'
import BiliErrorRouteTo from '@/components/CommonCompo/Bili-Feedback-Compo/BiliErrorRouteTo.vue'
import RpaMobileTip from '@/components/rpa-browser/RpaMobileTip.vue'
import { BiliErrorRouteToTxt } from '@/assets/text/BiliErrorTxt.ts'
import { RouteName } from '@/models/router'
import WarningIcon from '@/assets/svgs/space/warning.svg?component'

// 仅开发环境（VITE_BILI_ENV=dev）允许正常进入 RPA 模块，生产等环境统一展示施工提示
const isDev = import.meta.env.VITE_BILI_ENV === 'dev'

const biliUser = useInject(KeysEnum.BiliUser) as Ref<UserNavModel>
const isLoggedIn = computed(() => !!biliUser.value.uid)
</script>
