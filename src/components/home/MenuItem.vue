<template>
  <el-menu-item
    v-if="!item.children || item.children.length === 0"
    :index="item.path"
    @click="handleMenuItemClick"
  >
    {{ item.title }}
  </el-menu-item>
  <el-sub-menu v-else :index="item.path">
    <template #title>{{ item.title }}</template>
    <template v-for="child in item.children" :key="child.path">
      <MenuItem :item="child" />
    </template>
  </el-sub-menu>
</template>

<script setup lang="ts">
import { inject } from 'vue'
import { ElMenuItem, ElSubMenu } from 'element-plus'

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

// 获取父组件的处理方法
const headerBarView: any = inject('headerBarView', null)

const handleMenuItemClick = () => {
  // 如果路由需要登录但用户未登录，则不跳转，显示登录提示
  if (props.item.requiresLogin) {
    // 调用父组件的方法处理需要登录的路由点击
    if (headerBarView && headerBarView.handleProtectedRouteClick) {
      headerBarView.handleProtectedRouteClick(props.item.title)
      return
    }
  }
}
</script>
