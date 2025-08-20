import { type RouteRecordRaw } from 'vue-router'
import { type CustomRouteMeta } from '@/router'

/**
 * 处理路由路径，确保格式正确
 * @param parentPath 父级路径
 * @param routePath 当前路由路径
 * @returns 拼接后的完整路径
 */
export const processRoutePath = (parentPath: string, routePath: string): string => {
  if (parentPath === '') {
    return routePath
  } else {
    // 确保路径间只有一个斜杠
    const cleanParentPath = parentPath.endsWith('/') ? parentPath.slice(0, -1) : parentPath
    const cleanRoutePath = routePath.startsWith('/') ? routePath.slice(1) : routePath
    return `${cleanParentPath}/${cleanRoutePath}`
  }
}

/**
 * 递归处理路由项，用于头部导航栏
 * @param routes 路由数组
 * @param parentPath 父级路径
 * @param showAll 是否显示所有路由（忽略登录状态）
 * @returns 处理后的路由项数组
 */
export const processRoutesForHeader = (
  routes: RouteRecordRaw[],
  parentPath = '',
  showAll = true
): any[] => {
  return routes
    .filter(r => {
      // 过滤条件：
      // 1. 必须有 meta 且 isHeaderShow 为 true
      const meta = r.meta as CustomRouteMeta
      return meta?.isHeaderShow
    })
    .map(r => {
      const meta = r.meta as CustomRouteMeta
      // 正确处理路径拼接，避免多余的斜杠
      const fullPath = processRoutePath(parentPath, r.path)
      
      return {
        path: fullPath,
        title: meta?.title || '',
        requiresLogin: meta?.requiresLogin || false,
        children: r.children ? processRoutesForHeader(r.children, fullPath, showAll) : undefined
      }
    })
}

/**
 * 递归处理路由项，用于首页展示
 * @param routes 路由数组
 * @param parentPath 父级路径
 * @returns 处理后的路由项数组
 */
export const processRoutesForHome = (
  routes: RouteRecordRaw[],
  parentPath = ''
): any[] => {
  return routes
    .filter(r => {
      // 过滤条件：
      // 1. 必须有 meta 且 id 和 showInHome 为 true
      // 2. 不显示根路径
      const meta = r.meta as CustomRouteMeta
      return meta?.id && 
             meta?.showInHome && 
             r.path !== '/'
    })
    .map(r => {
      const { path, meta } = r
      const typedMeta = meta as CustomRouteMeta
      const fullPath = processRoutePath(parentPath, path)
      
      const module: CustomRouteMeta & {
        path?: string
        children?: (CustomRouteMeta & { path?: string; order?: number })[]
        order?: number
      } = {
        id: typedMeta.id,
        title: typedMeta.title,
        icon: typedMeta.icon,
        description: typedMeta.description,
        path: fullPath,
        color: typedMeta.color,
        requiresLogin: typedMeta.requiresLogin || false,
        order: typedMeta.order || 0
      }

      // 处理子路由
      if (r.children && r.children.length > 0) {
        const children: (CustomRouteMeta & { path?: string; order?: number })[] = []
        
        const processChildren = (childRoutes: RouteRecordRaw[], currentParentPath: string) => {
          childRoutes.forEach((childRoute) => {
            if (childRoute.meta && (childRoute.meta as CustomRouteMeta).showInHome) {
              const childPath = processRoutePath(currentParentPath, childRoute.path)
              const typedChildMeta = childRoute.meta as CustomRouteMeta
              children.push({
                title: typedChildMeta.title,
                icon: typedChildMeta.icon,
                description: typedChildMeta.description,
                path: childPath,
                color: typedChildMeta.color,
                order: typedChildMeta.order || 0
              })
            }

            // 处理更深层次的子路由
            if (childRoute.children && childRoute.children.length > 0) {
              processChildren(childRoute.children, processRoutePath(currentParentPath, childRoute.path))
            }
          })
        }

        processChildren(r.children, fullPath)

        // 对子路由按order排序
        if (children.length > 0) {
          children.sort((a, b) => (a.order || 0) - (b.order || 0))
          module.children = children
        }
      }

      return module
    })
}