<template>
  <div class="rpa-browser-layout">
    <!-- 注意：本组件是「顶层路由组件」，必须保持单根。
         App.vue 的外层 <RouterView> 用了 <transition mode="out-in"> + <keep-alive>，其状态机
         依赖子组件是单根元素。若模板出现多个根节点（如 v-if/v-else 并列，或根层有注释节点），
         组件会被编译成 fragment，导致 keep-alive 缓存的布局 vnode 丢失/残留 —— 表现为从
         /app/rpa-browser 切回 /app/admin 时 bili-side-nav 整块消失、或内容重复渲染。
         因此注释必须放在根元素「内部」。 -->
    <!-- 与消息中心布局对齐：BiliSideNavLayout 侧边导航（内置 AutoHeightContainer）承载子页面；
         meta.hideSideNav 的子路由（Stream 控制台等沉浸式页面）不走侧边导航 -->
    <template v-if="isDev">
      <RpaMobileTip v-if="isLoggedIn && !hideSideNav" class="rpa-browser-layout__mobile-tip mb-2" />
      <BiliErrorRouteTo v-if="!isLoggedIn" :detail="BiliErrorRouteToTxt.rpa_browser_login_required" />
      <BiliSideNavLayout v-else-if="!hideSideNav" :nav-groups="navGroups">
        <template #default>
          <router-view v-slot="{ Component }">
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
      </BiliSideNavLayout>
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
  </div>
</template>

<script setup lang="ts">
import { computed, type Component, type Ref } from 'vue'
import { useRoute } from 'vue-router'
import {
  Monitor,
  Share,
  DataAnalysis,
  Setting,
  Stamp,
  Coin
} from '@element-plus/icons-vue'
import { useInject, KeysEnum } from '@/models/base/provide_model.ts'
import type { UserNavModel } from '@/models/user/user_model.ts'
import BiliErrorRouteTo from '@/components/CommonCompo/Bili-Feedback-Compo/BiliErrorRouteTo.vue'
import BiliSideNavLayout, {
  type BiliSideNavGroup
} from '@/components/CommonCompo/Bili-Container-Compo/BiliSideNavLayout.vue'
import RpaMobileTip from '@/components/rpa-browser/RpaMobileTip.vue'
import { BiliErrorRouteToTxt } from '@/assets/text/BiliErrorTxt.ts'
import { RouteName } from '@/models/router'
import WarningIcon from '@/assets/svgs/space/warning.svg?component'
import CenteredContainer from '@/components/CommonCompo/Bili-Container-Compo/CenteredContainer.vue'
import { useHydrated } from '@/composables/useHydrated'

defineOptions({ name: 'RpaBrowserLayout' })

// 仅开发环境（VITE_BILI_ENV=dev）允许正常进入 RPA 模块，生产等环境统一展示施工提示
const isDev = import.meta.env.VITE_BILI_ENV === 'dev'

const biliUser = useInject(KeysEnum.BiliUser) as Ref<UserNavModel>
// 登录态取自 persist(localStorage)，SSR/预渲染阶段恒为空；用 isHydrated 让两端首帧都按
// 「未登录」渲染，挂载后再切到真实登录态，避免布局整体互换导致的水合不匹配。
const isHydrated = useHydrated()
const isLoggedIn = computed(() => isHydrated.value && !!biliUser.value.uid)

// meta.hideSideNav 的子路由（Stream 控制台）不渲染侧边导航，独占内容区
const route = useRoute()
const hideSideNav = computed(() => route.meta.hideSideNav === true)

// 侧边导航分组（与消息中心 / 管理后台同款交互）：item.name 对应子路由 RouteName。
// Stream（浏览器控制台）与创建/编辑指纹由列表页进入，不出现在导航中。
const navGroups = computed<BiliSideNavGroup[]>(() => [
  {
    title: '浏览器',
    items: [
      {
        name: RouteName.RPA_BROWSER_FINGERPRINT_LIST,
        title: '浏览器指纹列表',
        icon: Monitor as Component
      },
      {
        name: RouteName.RPA_BROWSER_COMMUNITY,
        title: RouteName.RPA_BROWSER_COMMUNITY,
        icon: Share as Component
      }
    ]
  },
  {
    title: '自动化',
    items: [
      {
        name: RouteName.RPA_BROWSER_ACTION_MANAGEMENT,
        title: RouteName.RPA_BROWSER_ACTION_MANAGEMENT,
        icon: Setting as Component
      },
      {
        name: RouteName.RPA_BROWSER_WORKFLOW_MANAGEMENT,
        title: RouteName.RPA_BROWSER_WORKFLOW_MANAGEMENT,
        icon: DataAnalysis as Component
      },
      {
        name: RouteName.RPA_BROWSER_ACTION_LOG,
        title: RouteName.RPA_BROWSER_ACTION_LOG,
        icon: DataAnalysis as Component
      }
    ]
  },
  {
    title: '权益',
    items: [
      {
        name: RouteName.RPA_BROWSER_MEMBERSHIP,
        title: RouteName.RPA_BROWSER_MEMBERSHIP,
        icon: Coin as Component
      }
    ]
  },
  {
    title: '协作',
    items: [
      {
        name: 'RPA_BROWSER_APPROVAL_CENTER',
        title: '审批中心',
        icon: Stamp as Component
      }
    ]
  }
])
</script>
