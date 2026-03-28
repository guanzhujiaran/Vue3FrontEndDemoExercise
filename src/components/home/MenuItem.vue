<template>
  <el-menu-item v-if="!item.children || item.children.length === 0" :index="item.path">
    <span @click="handleMenuItemClick">{{ item.title }}</span>
  </el-menu-item>
  <el-sub-menu v-else :index="item.path">
    <template #title
      ><span @click="handleSubMenuClick">{{ item.title }}</span></template
    >
    <template v-for="child in item.children" :key="child.path">
      <MenuItem :item="child" />
    </template>
  </el-sub-menu>
</template>

<script setup lang="ts">
import { inject, type Ref } from 'vue'
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
}

const props = defineProps<Props>()
const bili_user = useInject(KeysEnum.BiliUser) as Ref<UserNavModel>
// 获取父组件的处理方法
const headerBarView: any = inject('headerBarView', null)
const router = useRouter()

const handleMenuItemClick = (e: Event) => {
  // 如果路由需要登录但用户未登录，则不跳转，显示登录提示
  if (props.item.requiresLogin && !bili_user.value?.uid) {
    // 调用父组件的方法处理需要登录的路由点击
    if (headerBarView && headerBarView.handleProtectedRouteClick) {
      headerBarView.handleProtectedRouteClick(props.item.title)
      return
    }
  }
  // 正常路由跳转
  router.push(props.item.path)
}

// 处理子菜单点击事件
const handleSubMenuClick = (e: Event) => {
  // 如果路由需要登录但用户未登录，则不跳转，显示登录提示
  if (props.item.requiresLogin && !bili_user.value?.uid) {
    // 调用父组件的方法处理需要登录的路由点击
    if (headerBarView && headerBarView.handleProtectedRouteClick) {
      headerBarView.handleProtectedRouteClick(props.item.title)
      return
    }
  }
  if (e.target === e.currentTarget) {
    router.push(props.item.path)
  }
}
</script>
