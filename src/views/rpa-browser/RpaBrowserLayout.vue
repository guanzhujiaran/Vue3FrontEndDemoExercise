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
    <RpaMobileTip v-if="isLoggedIn && !hideSideNav" class="rpa-browser-layout__mobile-tip mb-2" />
    <BiliSideNavLayout v-if="showSideNav" :nav-groups="navGroups">
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
    <!-- 游客可浏览的公开页面（社区广场）直接渲染内容，不渲染侧边导航 -->
    <BiliErrorRouteTo
      v-else-if="!isLoggedIn && !isPublicAccess"
      :detail="BiliErrorRouteToTxt.rpa_browser_login_required"
    />
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
import { computed, watch, type Component, type Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Monitor,
  Share,
  DataAnalysis,
  Files,
  Setting,
  Stamp,
  Coin,
  Document,
  Connection,
  ChatDotRound
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
import { useHydrated } from '@/composables/useHydrated'

defineOptions({ name: 'RpaBrowserLayout' })

// RPA 模块对全部登录用户开放；页面内的管理类子页面由路由 meta 与后端接口权限独立校验。

const biliUser = useInject(KeysEnum.BiliUser) as Ref<UserNavModel>
// 登录态取自 persist(localStorage)，SSR/预渲染阶段恒为空；用 isHydrated 让两端首帧都按
// 「未登录」渲染，挂载后再切到真实登录态，避免布局整体互换导致的水合不匹配。
const isHydrated = useHydrated()
const isLoggedIn = computed(() => isHydrated.value && !!biliUser.value.uid)

// meta.hideSideNav 的子路由（Stream 控制台）不渲染侧边导航，独占内容区
const route = useRoute()
const router = useRouter()
const hideSideNav = computed(() => route.meta.hideSideNav === true)
/** 侧边导航只在登录后渲染：游客进入公开页面时独占内容区 */
const showSideNav = computed(() => isLoggedIn.value && !hideSideNav.value)
/** 游客可浏览的公开子路由（社区广场）：meta.publicAccess */
const isPublicAccess = computed(() => route.meta.publicAccess === true)

// 游客访问 RPA 的非公开页面（含 /app/rpa-browser 默认跳转的指纹列表）时，
// 统一落到对游客开放的社区广场，避免点顶部导航只看到登录提示。
watch(
  [isHydrated, isLoggedIn, isPublicAccess],
  ([hydrated, loggedIn, publicAccess]) => {
    if (!hydrated || loggedIn || publicAccess) return
    void router.replace({ name: RouteName.RPA_BROWSER_COMMUNITY })
  },
  { immediate: true }
)

// 侧边导航分组（与消息中心 / 管理后台同款交互）：item.name 对应子路由 RouteName。
// Stream（浏览器控制台）与创建/编辑指纹由列表页进入，不出现在导航中。
// 反馈入口统一走「协作」分组里的导航项（hideSideNav 的 Stream 控制台在页头提供入口），
// 不再渲染右下角悬浮按钮。

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
        name: RouteName.RPA_BROWSER_RESOURCE_RECORD,
        title: RouteName.RPA_BROWSER_RESOURCE_RECORD,
        icon: Files as Component
      },
      {
        name: RouteName.RPA_BROWSER_ACTION_LOG,
        title: RouteName.RPA_BROWSER_ACTION_LOG,
        icon: Document as Component
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
      },
      {
        name: RouteName.RPA_BROWSER_MCP_CONFIG,
        title: RouteName.RPA_BROWSER_MCP_CONFIG,
        icon: Connection as Component
      },
      {
        name: RouteName.RPA_BROWSER_FEEDBACK,
        title: RouteName.RPA_BROWSER_FEEDBACK,
        icon: ChatDotRound as Component
      }
    ]
  }
])
</script>
