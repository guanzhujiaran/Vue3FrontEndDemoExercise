<template>
    <flex-container class="bili-side-nav-layout">
        <!-- 场景高度由公共组件统一计算（窗口高 - 顶部导航 - el-main 偏移），内部才能独立滚动 -->
        <AutoHeightContainer
            class="bili-side-nav-layout__body flex-auto flex min-w-0 items-stretch gap-3 p-3">
            <el-aside width="auto" class="bili-side-nav-layout__aside h-full overflow-hidden">
                <el-scrollbar class="bili-side-nav-layout__nav-scroll h-full" view-class="h-full">
                    <el-menu :default-active="activeIndex" :collapse="collapsed" :collapse-transition="false"
                        :popper-class="collapsed ? 'bili-side-nav-layout__popper--hidden' : ''"
                        class="bili-side-nav-layout__nav min-h-full overflow-x-hidden border-r bg-bg/50 rounded-lg! py-4 origin-left will-change-[width,transform] transition-[width] duration-420 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
                        :class="[
                            collapsed ? 'w-16' : 'w-52',
                            { 'animate-sidenav-jelly': isCollapsing }
                        ]" @select="handleSelect" @animationend="onJellyEnd">
                        <!-- 折叠/展开切换：逻辑内置，按钮内容分两个具名插槽（展开态具体内容 / 折叠态 icon） -->
                        <div v-if="collapsible"
                            class="bili-side-nav-layout__collapse-row flex justify-center pb-3 cursor-pointer"
                            :class="{ 'animate-sidenav-wobble': isWobbling }" title="折叠 / 展开菜单" @click="toggleCollapse"
                            @animationend="onWobbleEnd">
                            <slot v-if="!collapsed" name="collapse-expanded" :collapsed="false">
                                <el-button class="bili-side-nav-layout__collapse-btn" text :icon="Fold" title="收起菜单" />
                            </slot>
                            <slot v-else name="collapse-collapsed" :collapsed="true">
                                <el-button class="bili-side-nav-layout__collapse-btn" text :icon="Expand"
                                    title="展开菜单" />
                            </slot>
                        </div>
                        <template v-for="group in navGroups" :key="group.title">
                            <div v-if="group.title"
                                class="bili-side-nav-layout__group-title px-4 py-2 text-xs text-text-placeholder"
                                :class="{ 'bili-side-nav-layout__group-title--collapsed text-center px-0': collapsed }">
                                {{ collapsed ? (group.shortTitle ?? group.title) : group.title }}
                            </div>
                            <el-menu-item v-for="item in group.items" :key="item.name" :index="item.name"
                                class="bili-side-nav-layout__nav-item mb-3 last:mb-0"
                                :class="collapsed
                                    ? 'bili-side-nav-layout__nav-item--collapsed flex-col justify-center'
                                    : 'bili-side-nav-layout__nav-item--expanded h-7 text-lg'">
                                <!-- 折叠态（小图标模式）悬浮显示菜单项完整标题；展开态禁用 tooltip（标题已横排展示）。
                                    注意：el-tooltip 只包裹图标，不能包裹 el-menu-item 本身——后者渲染为 <li>，
                                    被 el-tooltip 的 <span> 包裹会导致浏览器把 <li> 移出触发器，破坏菜单结构。 -->
                                <el-tooltip :content="item.title" placement="right" :disabled="!collapsed"
                                    :show-after="150" popper-class="bili-side-nav-layout__tooltip">
                                    <el-icon>
                                        <component :is="item.icon" />
                                    </el-icon>
                                </el-tooltip>
                                <template #title>
                                    <div v-if="!collapsed" class="flex w-full items-center">
                                        <span class="bili-side-nav-layout__nav-text flex-1 truncate text-lg">{{
                                            item.title
                                            }}</span>
                                        <el-badge v-if="item.badge && (item.badgeValue ?? 0) > 0"
                                            :value="item.badgeValue ?? 0" :max="99" type="danger" class="mr-8" />
                                    </div>
                                </template>
                            </el-menu-item>
                        </template>
                    </el-menu>
                </el-scrollbar>
            </el-aside>


            <!-- 右侧主区：与左侧菜单同步做「布丁」弹性动画（origin-right 锚定右边缘，形变只发生在靠侧边栏的一侧） -->
            <el-container
                class="bili-side-nav-layout__main bg-bg rounded-lg origin-right will-change-transform"
                :class="{ 'animate-sidenav-content-jelly': isContentSettling }"
                @animationend="onContentJellyEnd">
                <el-header
                    class="bili-side-nav-layout__header flex items-center justify-between rounded-lg px-6 py-0 shrink-0">
                    <h1 class="bili-side-nav-layout__title text-base font-bold">{{ pageTitle }}</h1>
                    <slot name="header-extra" />
                </el-header>
                <el-main class="bili-side-nav-layout__main-body p-3 overflow-hidden">
                    <el-scrollbar class="bili-side-nav-layout__content h-full" view-class="h-full"
                        wrap-style="overflow-x: hidden;" @scroll="onContentScroll">
                        <slot />
                        <ScrollButtons :scroll-top="contentScrollTop" :top-threshold="100" :bottom-threshold="100" />
                    </el-scrollbar>
                </el-main>
            </el-container>
        </AutoHeightContainer>
    </flex-container>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, type Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Fold, Expand } from '@element-plus/icons-vue'
import AutoHeightContainer from './AutoHeightContainer.vue'

export interface BiliSideNavItem {
    name: string
    title: string
    icon?: Component
    badge?: boolean
    badgeValue?: number
}

export interface BiliSideNavGroup {
    title?: string
    shortTitle?: string
    items: BiliSideNavItem[]
}

const props = withDefaults(
    defineProps<{
        navGroups: BiliSideNavGroup[]
        collapsible?: boolean
    }>(),
    {
        collapsible: true
    }
)

const route = useRoute()
const router = useRouter()
const collapsed = ref(false)
// 布丁弹性动画触发标记：折叠/展开时侧边栏果冻摇摆、按钮图标摇晃
const isCollapsing = ref(false)
const isWobbling = ref(false)
// 右侧主区布丁弹性联动标记（与左侧果冻同一时机触发、同一时长）
const isContentSettling = ref(false)

const activeIndex = computed(() => (route.name ? String(route.name) : ''))
const pageTitle = computed(() => String(route.meta?.title ?? ''))

// 窄屏阈值：低于该宽度视为窄屏，侧边栏默认收起（w-52 展开态会挤压内容区）
const NARROW_SCREEN_WIDTH = 1080

function isNarrowScreen() {
    return window.innerWidth < NARROW_SCREEN_WIDTH
}

onMounted(() => {
    // 窄屏首屏直接收起侧边栏（初始化不走果冻动画，避免入场抖动）
    collapsed.value = props.collapsible && isNarrowScreen()
})

// ===== 内容区滚动：记录 el-scrollbar 的滚动位置，传给 ScrollButtons 控制按钮显隐 =====
const contentScrollTop = ref(0)
function onContentScroll(payload: { scrollTop: number; scrollLeft: number }) {
    contentScrollTop.value = payload.scrollTop
}

function handleSelect(index: string) {
    // 防御：菜单项 name 必须对应已注册的路由 name，否则 router.push 会抛 "No match" 并触发 Vue 未捕获错误
    if (!router.hasRoute(index)) {
        console.warn(`[BiliSideNavLayout] 点击了未注册路由的菜单项：${index}`)
        return
    }
    router.push({ name: index })
}

function toggleCollapse() {
    collapsed.value = !collapsed.value
    isCollapsing.value = true
    isWobbling.value = true
    isContentSettling.value = true
}

function onJellyEnd(e: AnimationEvent) {
    if ((e.target as HTMLElement)?.classList?.contains('bili-side-nav-layout__nav')) {
        isCollapsing.value = false
    }
}

// 右侧主区弹性结束：单独清理，避免与左侧果冻的 animationend 互相提前打断
function onContentJellyEnd(e: AnimationEvent) {
    if ((e.target as HTMLElement)?.classList?.contains('bili-side-nav-layout__main')) {
        isContentSettling.value = false
    }
}

function onWobbleEnd(e: AnimationEvent) {
    if ((e.target as HTMLElement)?.classList?.contains('animate-sidenav-wobble')) {
        isWobbling.value = false
    }
}
</script>
