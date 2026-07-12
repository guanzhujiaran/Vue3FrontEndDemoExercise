<template>
  <!-- 最末端的菜单（无子菜单）：整个菜单项（含边框/留白）单击即可跳转；
       移动端下若为某个子菜单的首项或顶层叶子项，则单击不跳转、需双击跳转以防误触 -->
  <el-menu-item
    v-if="!item.children || item.children.length === 0"
    :index="item.path"
    @click="handleMenuItemClick"
    @dblclick="handleMenuItemDblClick"
  >
    <span class="text-lg">{{ item.title }}</span>
  </el-menu-item>
  <!-- 中间层子菜单：桌面端单击标题（含边框）跳转；移动端单击仅展开，需双击跳转 -->
  <el-sub-menu v-else :index="item.path" @click="handleSubMenuClick" @dblclick="handleSubMenuDblClick">
    <template #title><span class="text-lg">{{ item.title }}</span></template>
    <template v-for="(child, idx) in item.children" :key="child.path">
      <MenuItem :item="child" :is-first="idx === 0" />
    </template>
  </el-sub-menu>
</template>

<script setup lang="ts">
import { inject, type Ref, computed } from 'vue'
import { ElMenuItem, ElSubMenu } from 'element-plus'
import { useRouter } from 'vue-router'
import { KeysEnum, useInject } from '@/models/base/provide_model.ts'
import type { UserNavModel } from '@/models/user/user_model.ts'

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
const bili_user = useInject(KeysEnum.BiliUser) as Ref<UserNavModel>
// 获取父组件的处理方法
const headerBarView: any = inject('headerBarView', null)
const router = useRouter()

// 移动端直接根据 UA 判断（不再依赖屏幕宽度），用于决定子菜单/顶层叶子项是否需双击跳转
const isMobile = computed(() => {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Windows Phone/i.test(ua)
})

// 公共的登录校验 + 路由跳转逻辑
const navigate = async () => {
  // 如果路由需要登录但用户未登录，则不跳转，显示登录提示
  if (props.item.requiresLogin && !bili_user.value?.uid) {
    if (headerBarView && headerBarView.handleProtectedRouteClick) {
      headerBarView.handleProtectedRouteClick(props.item.title)
      return
    }
  }
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

// 最末端菜单单击跳转；移动端下若为子菜单首项或顶层叶子项，则单击不跳转（需双击）
const handleMenuItemClick = () => {
  if (isMobile.value && (props.isFirst || props.isTopLevel)) return
  navigate()
}

// 最末端菜单双击跳转；仅移动端下子菜单首项或顶层叶子项生效
const handleMenuItemDblClick = () => {
  if (isMobile.value && (props.isFirst || props.isTopLevel)) {
    navigate()
  }
}

// 是否为子菜单标题区域的点击（排除展开后的弹层内容）
const isTitleClick = (e: Event) => {
  const target = e.target as HTMLElement | null
  return !!target?.closest('.el-sub-menu__title')
}

// 子菜单单击：桌面端跳转（含边框）；移动端仅展开，不跳转
const handleSubMenuClick = (e: Event) => {
  if (!isTitleClick(e)) return
  if (isMobile.value) return
  navigate()
}

// 子菜单双击：移动端跳转；桌面端单击已处理，无需重复跳转
const handleSubMenuDblClick = (e: Event) => {
  if (!isTitleClick(e)) return
  if (!isMobile.value) return
  navigate()
}
</script>