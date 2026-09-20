<template>
  <!-- 最末端的菜单（无子菜单）：标题渲染成带真实 href 的 <a>，便于搜索引擎抓取站内链接；
       点击时只拦掉浏览器整页跳转，事件继续冒泡到 el-menu-item，由菜单逻辑统一跳转 -->
  <el-menu-item
    v-if="!item.children || item.children.length === 0"
    :index="item.path"
    @click="handleMenuItemClick"
  >
    <a
      class="header-nav__link header-nav__link--leaf no-underline text-inherit"
      :href="resolvedHref"
      @click="preventLinkDefault"
    >
      <span class="text-lg">{{ item.i18nKey ? t(item.i18nKey) : item.title }}</span>
    </a>
  </el-menu-item>
  <!-- 中间层子菜单：标题同样是真实链接；点击交给 el-sub-menu 既有逻辑（桌面端跳转、移动端双击跳转） -->
  <el-sub-menu v-else :index="item.path" @click="handleSubMenuClick">
    <template #title>
      <a
        class="header-nav__link header-nav__link--submenu no-underline text-inherit"
        :href="resolvedHref"
        @click="preventLinkDefault"
      >
        <span class="text-lg">{{ item.i18nKey ? t(item.i18nKey) : item.title }}</span>
      </a>
    </template>
    <template v-for="(child, idx) in item.children" :key="child.path">
      <MenuItem :item="child" :is-first="idx === 0" />
    </template>
  </el-sub-menu>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMenuItem, ElSubMenu } from 'element-plus'
import { useRouter } from 'vue-router'
import { preventLinkDefault } from '@/utils/PageOpen/spaLink.ts'

const { t } = useI18n()

interface MenuItem {
  path: string
  title: string
  i18nKey?: string
  requiresLogin?: boolean
  children?: MenuItem[]
}

interface Props {
  item: MenuItem
  // 是否为所在子菜单的第一项（移动端下首项需双击跳转，避免展开后误触）
  isFirst?: boolean
  // 是否为顶层（直接渲染在 header 菜单中）的菜单项
  isTopLevel?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isFirst: false,
  isTopLevel: false
})
const router = useRouter()

// 菜单项的真实 href（带上 router base），爬虫据此发现站内页面
const resolvedHref = computed(() => router.resolve(props.item.path).href)

// 移动端直接根据 UA 判断（不再依赖屏幕宽度），用于决定子菜单/顶层叶子项是否需双击跳转
const isMobile = computed(() => {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Windows Phone/i.test(ua)
})

// 公共的路由跳转逻辑（需要登录的页面会自行校验并展示未授权提示）
const navigate = async () => {
  try {
    await router.push(props.item.path)
  } catch (error) {
    // 忽略导航重复错误和取消错误
    if ((error as Error).name !== 'NavigationDuplicated' &&
        !(error as Error).message?.includes('Avoided redundant navigation')) {
      console.error('路由导航错误:', error)
    }
  }
}

// 最末端菜单（无子菜单）：单击即跳转（桌面端、移动端一致），不再依赖不可靠的 dblclick
const handleMenuItemClick = () => {
  navigate()
}

// 是否为子菜单标题区域的点击（排除展开后的弹层内容）
const isTitleClick = (e: Event) => {
  const target = e.target as HTMLElement | null
  return !!target?.closest('.el-sub-menu__title')
}

// 记录子菜单标题上一次被点击的时间，用于移动端手动识别“双击”。
// 不依赖浏览器 dblclick：移动端双击常被浏览器当作缩放手势而吞掉，导致跳转失效。
const lastSubMenuTapTime = ref(0)
const DOUBLE_TAP_THRESHOLD = 300

// 子菜单标题点击：
// - 桌面端：单击即跳转到该菜单自身路由（同时也由 Element Plus 展开/收起）
// - 移动端：单击仅展开子菜单；快速再次单击（双击）则跳转到该菜单自身路由
const handleSubMenuClick = (e: Event) => {
  if (!isTitleClick(e)) return
  if (!isMobile.value) {
    navigate()
    return
  }
  const now = Date.now()
  if (now - lastSubMenuTapTime.value < DOUBLE_TAP_THRESHOLD) {
    lastSubMenuTapTime.value = 0
    navigate()
  } else {
    lastSubMenuTapTime.value = now
  }
}
</script>
