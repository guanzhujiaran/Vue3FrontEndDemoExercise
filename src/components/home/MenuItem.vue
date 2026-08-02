<template>
  <!-- 最末端的菜单（无子菜单）：整个菜单项（含边框/留白）单击即可跳转；
       移动端下若为某个子菜单的首项或顶层叶子项，则单击不跳转、需双击跳转以防误触 -->
  <el-menu-item
    v-if="!item.children || item.children.length === 0"
    :index="item.path"
    @click="handleMenuItemClick"
  >
    <span class="text-lg">{{ item.title }}</span>
  </el-menu-item>
  <!-- 中间层子菜单：桌面端单击标题跳转；移动端单击展开，双击（两次快速点击）跳转 -->
  <el-sub-menu v-else :index="item.path" @click="handleSubMenuClick">
    <template #title><span class="text-lg">{{ item.title }}</span></template>
    <template v-for="(child, idx) in item.children" :key="child.path">
      <MenuItem :item="child" :is-first="idx === 0" />
    </template>
  </el-sub-menu>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMenuItem, ElSubMenu } from 'element-plus'
import { useRouter } from 'vue-router'

interface MenuItem {
  path: string
  title: string
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