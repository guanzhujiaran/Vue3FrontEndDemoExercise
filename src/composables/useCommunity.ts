/**
 * 社区互动 composable - 点赞、举报、权限判断
 */
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import customActionsApi from '@/api/browser/custom_actions_api'
import type { CommunityResourceMixin, CommunityFilter, CommunitySortBy, ReportRequest } from '@/types/browser-automation-api'

// 当前用户 mid (从 JWT 解析)
const currentMid = ref<number | null>(null)

export function useCommunity() {
  // 判断是否为资源拥有者
  const isOwner = (item: Partial<CommunityResourceMixin>): boolean => {
    if (!currentMid.value || !item.mid) return false
    return item.mid === currentMid.value
  }

  // 可见性图标映射
  const visibilityIcon = (item: Partial<CommunityResourceMixin>): string => {
    return item.is_public ? '🌍' : '🔒'
  }

  // 可见性标签
  const visibilityLabel = (item: Partial<CommunityResourceMixin>): string => {
    if (!item.is_public) return '私有'
    if (isOwner(item)) return '我的公开'
    return '社区'
  }

  // 可见性 el-tag type
  const visibilityTagType = (item: Partial<CommunityResourceMixin>): '' | 'success' | 'warning' | 'info' | 'danger' => {
    if (!item.is_public) return 'info'
    if (isOwner(item)) return 'success'
    return 'warning'
  }

  // 是否显示认证徽章
  const showVerifiedBadge = (item: Partial<CommunityResourceMixin>): boolean => {
    return !!(item.is_verified && item.is_public)
  }

  // 格式化点赞数 (128 → 128, 5200 → 5.2k)
  const formatLikesCount = (count: number | undefined): string => {
    if (!count) return '0'
    if (count >= 10000) return `${(count / 10000).toFixed(1)}w`
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`
    return String(count)
  }

  // 点赞操作
  const toggleLike = async (
    type: 'action' | 'workflow',
    id: number,
    browserId: string
  ): Promise<LikeResponse | null> => {
    try {
      let res
      if (type === 'action') {
        res = await customActionsApi.likeAction(id)
      } else {
        res = await workflowsApiLike(id, browserId)
      }
      if (res.code === 0 && res.data) {
        return res.data
      }
    } catch (error: any) {
      ElMessage.error(error.message || '操作失败')
    }
    return null
  }

  // 举报
  const reportResource = async (params: ReportRequest): Promise<boolean> => {
    try {
      const { value: reason } = await ElMessageBox.prompt('请填写举报理由', '举报资源', {
        confirmButtonText: '提交',
        cancelButtonText: '取消',
        inputPlaceholder: '例: 恶意代码、虚假描述...',
        inputValidator: (val) => val?.trim() ? true : '请填写举报理由'
      })

      const req: ReportRequest = {
        ...params,
        reason: reason.trim()
      }

      let res
      if (params.resource_type === 'action') {
        res = await customActionsApi.reportAction(req)
      } else {
        // workflow 走 workflowsApi (需要 browser_id, 但简化处理)
        res = await customActionsApi.reportAction(req)
      }

      if (res.code === 0) {
        ElMessage.success('举报已提交，感谢您的反馈')
        return true
      } else {
        ElMessage.error(res.msg || '举报失败')
        return false
      }
    } catch {
      return false
    }
  }

  // 克隆
  const cloneAction = async (id: number) => {
    try {
      const res = await customActionsApi.cloneAction(id)
      if (res.code === 0) {
        ElMessage.success('已克隆到我的空间')
        return true
      } else {
        ElMessage.error(res.msg || '克隆失败')
        return false
      }
    } catch (error: any) {
      ElMessage.error(error.message || '克隆失败')
      return false
    }
  }

  // 公开/私有切换确认
  const confirmVisibilityChange = async (fromPublic: boolean): Promise<boolean> => {
    if (fromPublic) {
      try {
        await ElMessageBox.confirm(
          '取消公开可能导致其他用户的工作流执行失败，是否继续？',
          '确认切换为私有',
          { confirmButtonText: '继续', cancelButtonText: '取消', type: 'warning' }
        )
        return true
      } catch {
        return false
      }
    }
    return true
  }

  // 筛选选项
  const filterOptions: { label: string; value: CommunityFilter }[] = [
    { label: '全部', value: 'all' },
    { label: '🔒 我的私有', value: 'private' },
    { label: '🌍 我的公开', value: 'public' },
    { label: '🌐 社区公开', value: 'community' },
    { label: '✅ 已认证', value: 'verified' }
  ]

  // 排序选项
  const sortOptions: { label: string; value: CommunitySortBy }[] = [
    { label: '最近更新', value: 'updated_at' },
    { label: '最多点赞', value: 'likes_count' },
    { label: '最近创建', value: 'created_at' },
    { label: '名称排序', value: 'name' }
  ]

  return {
    currentMid,
    isOwner,
    visibilityIcon,
    visibilityLabel,
    visibilityTagType,
    showVerifiedBadge,
    formatLikesCount,
    toggleLike,
    reportResource,
    cloneAction,
    confirmVisibilityChange,
    filterOptions,
    sortOptions
  }
}

// 辅助：workflow 点赞 (暂走 custom_actions 代理)
async function workflowsApiLike(id: number, browserId: string) {
  const { default: workflowsApi } = await import('@/api/browser/workflows_api')
  return workflowsApi.likeWorkflow({ browser_id: browserId, workflow_id: id })
}
