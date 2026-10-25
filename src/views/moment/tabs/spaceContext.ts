import { inject, provide, type ComputedRef, type InjectionKey, type Ref } from 'vue'
import type { FavoriteFolderResp, SpaceInfoResp } from '@/api/notify/moment-api'

/**
 * 个人空间（`/app/space/:mid`）布局壳与各 tab 之间的共享契约。
 *
 * 设计约束（见 docs/个人空间tab路由化方案.md）：
 * - 布局壳 `MomentSpaceView.vue` 是唯一数据源：空间资料、黑名单受限态、收藏可见性、收藏夹列表都在父级持有；
 * - 各 tab 组件只读共享状态，需要变更时调用父级暴露的方法（刷新收藏 / 切换收藏可见性）；
 * - 父级不感知子组件内部列表，只用 `profileVersion` 这类版本号通知子组件「该重新拉数据了」。
 *
 * 空间页不放「发布动态」入口（个人空间只承载资料 / 关系 / 行为记录），因此契约里没有发布弹窗相关能力。
 */
export interface MomentSpaceContext {
  /** 路由 mid 存在 → 他人空间；不存在 → 自身空间 */
  isOwnSpace: ComputedRef<boolean>
  /** 当前空间 mid（字符串，避免雪花 id 精度丢失） */
  spaceMid: ComputedRef<string>
  /** 空间主人资料 */
  targetUser: Ref<SpaceInfoResp>
  /** 主人个性签名 */
  userBio: Ref<string>
  /** 黑名单互访拒绝：true 时所有 tab 只显示受限提示 */
  blocked: Ref<boolean>
  /** 受限方向：是否是我主动拉黑了对方（决定受限文案与「解除拉黑」文案） */
  iBlocked: Ref<boolean>
  /** 收藏夹列表（唯一副本在父级，子组件增删改后调用 refreshFavorites 重新拉取） */
  favFolders: Ref<FavoriteFolderResp[]>
  /**
   * 空间资料版本号：资料重载（切换 mid / 解除拉黑）后自增。
   * 子 tab 记录自己已加载的版本号，版本变化时重新拉取自身数据。
   */
  profileVersion: Ref<number>
  /** 等待空间资料首次加载完成（子 tab 挂载时调用，避免与父级首屏请求竞态） */
  ensureProfileLoaded: () => Promise<void>
  /** 重新拉取收藏夹列表（本人全量 / 他人仅公开夹；收藏夹增删改后调用） */
  refreshFavorites: () => Promise<void>
  /** 强制重载空间资料（隐私开关保存后调用，让主页按新开关重新渲染） */
  reloadProfile: () => Promise<void>
  /**
   * 视角预览态（自己的空间里模拟他人视角，B 站「预览」）：
   * - `owner`：本人视角；
   * - `visitor`：访客（未关注）视角；
   * - `fan`：粉丝（已关注）视角。
   *
   * 子组件（右栏资料卡）据此按 `privacy_flags` 过滤本人可见、他人不可见的字段。
   */
  previewMode: Ref<SpacePreviewMode>
  /** 预览态（非本人视角）中为 true */
  isPreviewing: ComputedRef<boolean>
}

/** 视角预览模式：owner=本人 / visitor=访客（未关注）/ fan=粉丝（已关注） */
export type SpacePreviewMode = 'owner' | 'visitor' | 'fan'

export const MOMENT_SPACE_CONTEXT: InjectionKey<MomentSpaceContext> = Symbol('MOMENT_SPACE_CONTEXT')

/** 布局壳调用：向下游 tab 注入共享状态 */
export function provideMomentSpace(ctx: MomentSpaceContext): void {
  provide(MOMENT_SPACE_CONTEXT, ctx)
}

/** tab 组件调用：必须在布局壳（父路由组件）内部使用 */
export function useMomentSpace(): MomentSpaceContext {
  const ctx = inject(MOMENT_SPACE_CONTEXT, null)
  if (!ctx) {
    throw new Error('useMomentSpace 必须在 MomentSpaceView（个人空间布局壳）内部调用')
  }
  return ctx
}

/**
 * 关系页（`/app/space/:mid/relation/*`）布局壳与子页面的共享契约（2026-10-09）。
 *
 * 左侧 menu 由布局壳 `SpaceRelationLayout` 持有（切换关注 / 粉丝 + 选关注分组），
 * 子页面（关注 / 粉丝列表）只读当前选中的分组；状态放布局壳，切子路由不会丢。
 */
export interface MomentSpaceRelationContext {
  /** 当前选中的关注分组（null = 全部关注；粉丝页恒为 null） */
  activeTagId: Ref<number | null>
  /** 当前选中分组的名称（用于右栏大标题，对齐 B 站） */
  activeTagName: Ref<string>
}

export const MOMENT_SPACE_RELATION_CONTEXT: InjectionKey<MomentSpaceRelationContext> = Symbol(
  'MOMENT_SPACE_RELATION_CONTEXT'
)

/** 布局壳调用：向子页面注入关系页上下文 */
export function provideMomentSpaceRelation(ctx: MomentSpaceRelationContext): void {
  provide(MOMENT_SPACE_RELATION_CONTEXT, ctx)
}

/** 子页面调用：必须在关系页布局壳（父路由组件）内部使用 */
export function useMomentSpaceRelation(): MomentSpaceRelationContext {
  const ctx = inject(MOMENT_SPACE_RELATION_CONTEXT, null)
  if (!ctx) {
    throw new Error('useMomentSpaceRelation 必须在 SpaceRelationLayout（关系页布局壳）内部调用')
  }
  return ctx
}
