/**
 * Moment（动态）统一 API 封装层。
 *
 * 仅在此处调用 hey-api 生成的 SDK，业务视图/组件统一调用本文件的封装函数。
 */
import {
  feedAllApiV1MomentFeedAllGet,
  feedSpaceApiV1MomentFeedSpaceMidGet,
  detailApiV1MomentDetailMomentIdGet,
  createDynamicApiV1MomentCreatePost,
  editDynamicApiV1MomentEditPost,
  removeDynamicApiV1MomentRemovePost,
  adminRemoveDynamicApiV1MomentAdminRemovePost,
  repostDynamicApiV1MomentRepostPost,
  topDynamicApiV1MomentSpaceTopPost,
  untopDynamicApiV1MomentSpaceUntopPost,
  thumbApiV1MomentThumbPost,
  reportApiV1MomentReportPost,
  createReportApiV1ReportPost,
  createCheckApiV1MomentCreateCheckPost,
  topicSquareApiV1MomentTopicSquareGet,
  topicHotSearchApiV1MomentTopicHotSearchGet,
  topicFeedApiV1MomentTopicFeedTopicIdGet,
  topicDetailApiV1MomentTopicDetailTopicIdGet,
  topicCreateApiV1MomentTopicCreatePost,
  topicMineApiV1MomentTopicMineGet,
  topicAuditListApiV1MomentTopicAuditListGet,
  topicAuditApproveApiV1MomentTopicAuditApprovePost,
  topicAuditRejectApiV1MomentTopicAuditRejectPost,
  atListApiV1MomentAtListGet,
  atSearchApiV1MomentAtSearchGet,
  poiNearbyApiV1MomentPoiNearbyGet,
  poiSearchApiV1MomentPoiSearchGet,
  auditListApiV1MomentAuditListGet,
  auditApproveApiV1MomentAuditApprovePost,
  auditRejectApiV1MomentAuditRejectPost,
  auditDetailApiV1MomentAuditDynIdGet,
  auditHistoryApiV1MomentAuditListHistoryGet,
  getStatApiV1MessageFollowStatGet,
  getRelationApiV1MessageFollowRelationGet,
  followUserApiV1MessageFollowDoPost,
  unfollowUserApiV1MessageFollowUndoPost,
  blockUserApiV1MessageFollowBlockPost,
  getUpstatApiV1MomentUpstatGet,
  getMomentLikersApiV1MomentMomentIdLikersGet,
  getMomentForwardsApiV1MomentMomentIdForwardsGet,
  createFolderApiV1FavoriteFolderCreatePost,
  updateFolderApiV1FavoriteFolderUpdatePost,
  deleteFolderApiV1FavoriteFolderDeletePost,
  listFoldersApiV1FavoriteFolderListGet,
  addFavoriteApiV1FavoriteAddPost,
  removeFavoriteApiV1FavoriteRemovePost,
  listFavoritesApiV1FavoriteListGet,
  listFavoriteItemsApiV1FavoriteItemsGet,
  dynFoldersApiV1FavoriteDynFoldersGet,
  getSettingApiV1FavoriteSettingGet,
  setSettingApiV1FavoriteSettingPost,
  publicFoldersApiV1FavoriteUserFoldersGet,
  publicDynamicsApiV1FavoriteUserDynamicsGet,
  getSpaceInfoApiV1UserSpaceInfoGet,
  interactionStatusApiV1MomentInteractionStatusGet,
  interactionStatusDetailApiV1MomentInteractionStatusBizIdGet,
  avatarAuditMineApiV1UserAvatarAuditMineGet,
  avatarAuditListApiV1UserAvatarAuditListGet,
  avatarAuditApproveApiV1UserAvatarAuditApprovePost,
  avatarAuditRejectApiV1UserAvatarAuditRejectPost,
} from '@/api/notify/hey-api'
import { request, authHeaders, type RequestOptions } from '@/api/http'
import type {
  MomentFeedResp,
  MomentFeedItem,
  MomentDetailResp,
  MomentCreateReq,
  MomentCreateResp,
  MomentEditReq,
  MomentEditResp,
  MomentRemoveReq,
  MomentRemoveResp,
  MomentRepostReq,
  MomentRepostResp,
  MomentThumbReq,
  MomentThumbResp,
  MomentReportReq,
  MomentReportResp,
  ReportCreateReq,
  MomentTopicSquareResp,
  MomentTopicFeedResp,
  MomentTopicDetailResp,
  MomentTopicCreateReq,
  MomentTopicCreateResp,
  MomentTopicMineResp,
  MomentTopicAuditListResp,
  MomentTopicAuditApproveReq,
  MomentTopicAuditRejectReq,
  MomentAtListResp,
  MomentAtSearchResp,
  MomentPoiResp,
  MomentPoiItem,
  MomentAuditListResp,
  MomentAuditDetailResp,
  MomentAuditLogListResp,
  MomentAuditActionReq,
  MomentAuditRejectReq,
  MomentAuditItem,
  AvatarAuditMineResp,
  AvatarAuditListResp,
  AvatarAuditApproveReq,
  AvatarAuditRejectReq,
  MomentUpStatResp,
  MomentLikerListResp,
  MomentForwardListResp,
  FollowCountResp,
  FollowRelationResp,
  FollowOpResp,
  FavoriteFolderCreateReq,
  FavoriteFolderUpdateReq,
  FavoriteFolderDeleteReq,
  FavoriteFolderResp,
  FavoriteAddReq,
  FavoriteRemoveReq,
  FavoriteAddResp,
  FavoriteListResp,
  FavoriteItemListResp,
  FavoriteListItem,
  FavoriteDynFoldersResp,
  FavoriteSettingReq,
  FavoriteSettingResp,
  InteractionStatusResp,
  InteractionStatusItem,
  InteractionBizTypeEnum,
  SpaceInfoResp,
} from '@/api/notify/hey-api'

/**
 * 扩展互动状态：补充评论数 / 转发数 / 浏览数（动态资源才有评论转发；浏览数所有资源都有）。
 * 用于前端展示卡片页脚互动栏（参考 B 站动态：有数量→icon+数字，无数量→中文「评论/点赞/转发/收藏」）。
 */
export type InteractionStatusItemView = InteractionStatusItem & {
  commentCount?: number
  repostCount?: number
  viewCount?: number
}

// ---- Feed ----

export async function fetchAllFeed(params: {
  page_size?: number
  history_offset?: number
} = {}): Promise<MomentFeedResp> {
  return request<MomentFeedResp>(
    () =>
      feedAllApiV1MomentFeedAllGet({
        headers: authHeaders(),
        query: {
          page_size: params.page_size ?? 20,
          history_offset: params.history_offset,
        },
      }),
    { items: [], hasMore: false }
  )
}

export async function fetchSpaceFeed(
  mid: number,
  params: { page_size?: number; history_offset?: number } = {}
): Promise<MomentFeedResp> {
  return request<MomentFeedResp>(
    () =>
      feedSpaceApiV1MomentFeedSpaceMidGet({
        headers: authHeaders(),
        path: { mid },
        query: {
          page_size: params.page_size ?? 20,
          history_offset: params.history_offset,
        },
      }),
    { items: [], hasMore: false }
  )
}

// ---- Detail ----

export async function fetchMomentDetail(momentId: string): Promise<MomentDetailResp | null> {
  return request<MomentDetailResp | null>(
    () =>
      detailApiV1MomentDetailMomentIdGet({
        headers: authHeaders(),
        // 传字符串避免 19 位 dynId 精度丢失；SDK path 类型为 number，运行时字符串原样拼接
        path: { moment_id: momentId as unknown as number },
      }),
    null
  )
}

// ---- Create / Edit / Remove ----

export async function createMoment(
  payload: MomentCreateReq,
  options?: RequestOptions
): Promise<MomentCreateResp | null> {
  return request<MomentCreateResp | null>(
    () =>
      createDynamicApiV1MomentCreatePost({
        headers: authHeaders(),
        body: payload,
      }),
    null,
    options
  )
}

export async function editMoment(
  payload: MomentEditReq,
  options?: RequestOptions
): Promise<MomentEditResp | null> {
  return request<MomentEditResp | null>(
    () =>
      editDynamicApiV1MomentEditPost({
        headers: authHeaders(),
        body: payload,
      }),
    null,
    options
  )
}

export async function removeMoment(
  dynId: string,
  options?: RequestOptions
): Promise<MomentRemoveResp | null> {
  return request<MomentRemoveResp | null>(
    () =>
      removeDynamicApiV1MomentRemovePost({
        headers: authHeaders(),
        body: { dynId: dynId as unknown as number } as MomentRemoveReq,
      }),
    null,
    options
  )
}

/** 管理员删除任意动态（2.22.1，仅 root 可调；需管理端身份） */
export async function adminRemoveMoment(
  dynId: string,
  options?: RequestOptions
): Promise<MomentRemoveResp | null> {
  return request<MomentRemoveResp | null>(
    () =>
      adminRemoveDynamicApiV1MomentAdminRemovePost({
        headers: authHeaders(),
        body: { dynId: dynId as unknown as number } as MomentRemoveReq,
      }),
    null,
    options
  )
}

// ---- Repost ----

export async function repostMoment(
  payload: Omit<MomentRepostReq, 'srcDynId'> & { srcDynId: string }
): Promise<MomentRepostResp | null> {
  return request<MomentRepostResp | null>(
    () =>
      repostDynamicApiV1MomentRepostPost({
        headers: authHeaders(),
        body: payload as MomentRepostReq,
      }),
    null
  )
}

// ---- Top / Untop ----

export async function topMoment(dynId: string): Promise<boolean> {
  const r = await request<{ isTop?: number } | null>(
    () =>
      topDynamicApiV1MomentSpaceTopPost({
        headers: authHeaders(),
        body: { dynId: dynId as unknown as number },
      }),
    null
  )
  return r != null
}

export async function untopMoment(dynId: string): Promise<boolean> {
  const r = await request<{ isTop?: number } | null>(
    () =>
      untopDynamicApiV1MomentSpaceUntopPost({
        headers: authHeaders(),
        body: { dynId: dynId as unknown as number },
      }),
    null
  )
  return r != null
}

// ---- Thumb (Like / Unlike) ----

/** 点赞/取消点赞（2.17.0 泛化：支持多业务资源）。
 * 缺省 bizType='dynamic'，此时 bizId 等价 dynId（二者任传其一）。
 */
export async function thumbMoment(
  dynId: string,
  up: number, // 1=like, 2=unlike
  options: { bizType?: InteractionBizTypeEnum; bizId?: string } = {}
): Promise<MomentThumbResp | null> {
  const bizType = options.bizType ?? 'dynamic'
  const bizId = options.bizId ?? dynId
  return request<MomentThumbResp | null>(
    () =>
      thumbApiV1MomentThumbPost({
        headers: authHeaders(),
        body: {
          bizType,
          bizId: bizId as unknown as number,
          up,
          ...(bizType === 'dynamic'
            ? { dynId: dynId as unknown as number }
            : {}),
        } as MomentThumbReq,
      }),
    null
  )
}

/** 批量查询某类型资源当前用户交互态（收藏+点赞+计数）——列表页专用，不累计浏览 */
export async function fetchInteractionStatus(
  bizType: InteractionBizTypeEnum,
  bizIds: string[]
): Promise<InteractionStatusResp | null> {
  return request<InteractionStatusResp | null>(
    () =>
      interactionStatusApiV1MomentInteractionStatusGet({
        headers: authHeaders(),
        query: { bizType, bizIds: bizIds.join(',') },
      }),
    null
  )
}

/**
 * 查询单资源交互态——detail 页专用，查询后后端投递 MQ 异步累计浏览数。
 * 列表批量接口不累计浏览，仅进入详情页（本接口）才 +1。
 */
export async function fetchInteractionStatusOne(
  bizType: InteractionBizTypeEnum,
  bizId: string
): Promise<InteractionStatusItem | null> {
  return request<InteractionStatusItem | null>(
    () =>
      interactionStatusDetailApiV1MomentInteractionStatusBizIdGet({
        headers: authHeaders(),
        path: { biz_id: bizId },
        query: { bizType },
      }),
    null
  )
}

// ---- Report ----

export async function reportMoment(
  dynId: string,
  reasonType: number,
  reasonDesc?: string
): Promise<MomentReportResp | null> {
  return request<MomentReportResp | null>(
    () =>
      reportApiV1MomentReportPost({
        headers: authHeaders(),
        body: { dynId: dynId as unknown as number, reasonType, reasonDesc } as MomentReportReq,
      }),
    null
  )
}

// ---- 统一举报（动态/评论/用户空间，对标 B 站举报弹窗，P11-T6）----

/** 统一举报原因（对齐 B 站举报弹窗；value 对应后端 ReportReasonEnum） */
export const REPORT_REASONS: { label: string; value: number }[] = [
  { label: '垃圾广告', value: 7 },
  { label: '引战', value: 8 },
  { label: '辱骂/人身攻击', value: 3 },
  { label: '色情低俗', value: 4 },
  { label: '违法违规', value: 2 },
  { label: '涉政谣言', value: 9 },
  { label: '虚假不实信息', value: 1 },
  { label: '违法信息外链', value: 10 },
  { label: '诈骗/欺诈', value: 5 },
  { label: '其他', value: 6 },
]

export interface ReportByBizResult {
  code: number
  msg: string
  data: { created: boolean; triggered: boolean } | null
}

/**
 * 统一举报（动态/评论/用户空间三类合一，`bizType`+`bizId` 区分来源）。
 * 走 `POST /api/v1/report`，幂等（一人一对象一次），支持图片附件 `pics`（最多 3 张）。
 */
export async function reportByBiz(
  bizType: string,
  bizId: number,
  reasonType: number,
  reasonDesc?: string,
  pics?: string[],
  options?: RequestOptions
): Promise<{ created: boolean; triggered: boolean } | null> {
  return request<{ created: boolean; triggered: boolean } | null>(
    () =>
      createReportApiV1ReportPost({
        headers: authHeaders(),
        body: {
          bizType,
          bizId,
          reasonType,
          reasonDesc: reasonDesc?.trim() || null,
          pics: pics?.length ? pics : null,
        } as ReportCreateReq,
      }),
    null,
    options
  )
}

// ---- Create Check ----

export async function checkCreate(scene: string): Promise<boolean> {
  const r = await request<{ canCreate?: boolean } | null>(
    () =>
      createCheckApiV1MomentCreateCheckPost({
        headers: authHeaders(),
        body: { scene },
      }),
    null
  )
  return r?.canCreate ?? true
}

// ---- Topic ----

export async function fetchTopicSquare(params: {
  page?: number
  page_size?: number
  hot_only?: boolean
} = {}): Promise<MomentTopicSquareResp> {
  return request<MomentTopicSquareResp>(
    () =>
      topicSquareApiV1MomentTopicSquareGet({
        headers: authHeaders(),
        query: {
          page: params.page ?? 1,
          page_size: params.page_size ?? 20,
          hot_only: params.hot_only,
        },
      }),
    { items: [], hasMore: false, page: 1, page_size: params.page_size ?? 20 }
  )
}

// ---- Topic Create / Mine（话题创建与审核，2.19.0）----

/** 创建话题（创建即进入审核，auditStatus=auditing） */
export async function createTopic(params: {
  topicName: string
  topicCover?: string
  topicDesc?: string
}): Promise<MomentTopicCreateResp | null> {
  return request<MomentTopicCreateResp | null>(
    () =>
      topicCreateApiV1MomentTopicCreatePost({
        headers: authHeaders(),
        body: {
          topicName: params.topicName,
          topicCover: params.topicCover,
          topicDesc: params.topicDesc,
        } as MomentTopicCreateReq,
      }),
    null
  )
}

/** 我创建的话题（含审核状态） */
export async function fetchMyTopics(params: {
  page?: number
  page_size?: number
} = {}): Promise<MomentTopicMineResp> {
  return request<MomentTopicMineResp>(
    () =>
      topicMineApiV1MomentTopicMineGet({
        headers: authHeaders(),
        query: {
          page: params.page ?? 1,
          page_size: params.page_size ?? 20,
        },
      }),
    { items: [], hasMore: false }
  )
}

/** 管理端话题待审核列表（root） */
export async function fetchTopicAuditList(params: {
  page_num?: number
  page_size?: number
} = {}): Promise<MomentTopicAuditListResp> {
  return request<MomentTopicAuditListResp>(
    () =>
      topicAuditListApiV1MomentTopicAuditListGet({
        headers: authHeaders(),
        query: {
          page_num: params.page_num ?? 1,
          page_size: params.page_size ?? 20,
        },
      }),
    { items: [], total: 0, page_num: 1, page_size: params.page_size ?? 20 }
  )
}

/** 管理端审核通过话题（root） */
export async function topicAuditApprove(
  topicId: number,
  remark?: string
): Promise<MomentTopicAuditListResp | null> {
  return request<MomentTopicAuditListResp | null>(
    () =>
      topicAuditApproveApiV1MomentTopicAuditApprovePost({
        headers: authHeaders(),
        body: { topicId, remark } as MomentTopicAuditApproveReq,
      }),
    null
  )
}

/** 管理端审核驳回话题（root） */
export async function topicAuditReject(
  topicId: number,
  rejectReason: string,
  remark?: string
): Promise<MomentTopicAuditListResp | null> {
  return request<MomentTopicAuditListResp | null>(
    () =>
      topicAuditRejectApiV1MomentTopicAuditRejectPost({
        headers: authHeaders(),
        body: { topicId, rejectReason, remark } as MomentTopicAuditRejectReq,
      }),
    null
  )
}

export async function fetchTopicHotSearch(params: {
  page?: number
  page_size?: number
} = {}): Promise<MomentTopicSquareResp> {
  return request<MomentTopicSquareResp>(
    () =>
      topicHotSearchApiV1MomentTopicHotSearchGet({
        headers: authHeaders(),
        query: {
          page: params.page ?? 1,
          page_size: params.page_size ?? 20,
        },
      }),
    { items: [], hasMore: false }
  )
}

export async function fetchTopicFeed(
  topicId: number,
  params: { page_size?: number; history_offset?: number; sort?: 'hot' | 'time' } = {}
): Promise<MomentTopicFeedResp> {
  return request<MomentTopicFeedResp>(
    () =>
      topicFeedApiV1MomentTopicFeedTopicIdGet({
        headers: authHeaders(),
        path: { topicId },
        query: {
          page_size: params.page_size ?? 20,
          history_offset: params.history_offset,
          sort: params.sort ?? 'hot',
        },
      }),
    { topicId, topicName: '', items: [], hasMore: false }
  )
}

/** 话题详情（对齐 B 站 top_details 结构） */
export async function fetchTopicDetail(topicId: number): Promise<MomentTopicDetailResp | null> {
  return request<MomentTopicDetailResp | null>(
    () =>
      topicDetailApiV1MomentTopicDetailTopicIdGet({
        headers: authHeaders(),
        path: { topicId },
      }),
    null
  )
}

// ---- @ User ----

export async function fetchAtList(params: {
  page_size?: number
} = {}): Promise<MomentAtListResp> {
  return request<MomentAtListResp>(
    () =>
      atListApiV1MomentAtListGet({
        headers: authHeaders(),
        query: { page_size: params.page_size ?? 20 },
      }),
    { following: [], followers: [] }
  )
}

export async function searchAtUsers(keyword: string, params: {
  page_size?: number
} = {}): Promise<MomentAtSearchResp> {
  return request<MomentAtSearchResp>(
    () =>
      atSearchApiV1MomentAtSearchGet({
        headers: authHeaders(),
        query: { keyword, page_size: params.page_size ?? 10 },
      }),
    { items: [], hasMore: false }
  )
}

// ---- POI ----

export async function fetchPoiNearby(params: {
  page?: number
  page_size?: number
} = {}): Promise<MomentPoiResp> {
  return request<MomentPoiResp>(
    () =>
      poiNearbyApiV1MomentPoiNearbyGet({
        headers: authHeaders(),
        query: {
          page: params.page ?? 1,
          page_size: params.page_size ?? 20,
        },
      }),
    { items: [], hasMore: false }
  )
}

export async function searchPoi(keyword: string, params: {
  page?: number
  page_size?: number
} = {}): Promise<MomentPoiResp> {
  return request<MomentPoiResp>(
    () =>
      poiSearchApiV1MomentPoiSearchGet({
        headers: authHeaders(),
        query: { keyword, page: params.page ?? 1, page_size: params.page_size ?? 20 },
      }),
    { items: [], hasMore: false }
  )
}

// ---- Relation Stat (用户关系统计) ----

export async function fetchRelationStat(vmid: number) {
  return request<FollowCountResp | null>(
    () =>
      getStatApiV1MessageFollowStatGet({
        headers: authHeaders(),
        query: { vmid },
      }),
    null
  )
}

/** 我与某人的关注关系（是否已关注 / 是否被关注 / 是否互关 / 拉黑状态） */
export async function fetchFollowRelation(target_mid: number): Promise<FollowRelationResp | null> {
  return request<FollowRelationResp | null>(
    () =>
      getRelationApiV1MessageFollowRelationGet({
        headers: authHeaders(),
        query: { target_mid },
      }),
    null
  )
}

/** 关注某人（options 控制成功/失败提示行为） */
export async function followUser(
  targetMid: number,
  options?: RequestOptions
): Promise<FollowOpResp | null> {
  return request<FollowOpResp | null>(
    () =>
      followUserApiV1MessageFollowDoPost({
        headers: authHeaders(),
        body: { target_mid: targetMid },
      }),
    null,
    options
  )
}

/** 取消关注某人（options 控制成功/失败提示行为） */
export async function unfollowUser(
  targetMid: number,
  options?: RequestOptions
): Promise<FollowOpResp | null> {
  return request<FollowOpResp | null>(
    () =>
      unfollowUserApiV1MessageFollowUndoPost({
        headers: authHeaders(),
        body: { target_mid: targetMid },
      }),
    null,
    options
  )
}

/** 拉黑某人（加入黑名单；幂等，options 控制成功/失败提示行为） */
export async function blockUser(
  targetMid: number,
  options?: RequestOptions
): Promise<FollowOpResp | null> {
  return request<FollowOpResp | null>(
    () =>
      blockUserApiV1MessageFollowBlockPost({
        headers: authHeaders(),
        body: { target_mid: targetMid },
      }),
    null,
    options
  )
}

// ---- Likers / Forwards (点赞明细 / 转发列表，P8-T9) ----

export async function fetchMomentLikers(
  momentId: string,
  params: { page_num?: number; page_size?: number } = {}
): Promise<MomentLikerListResp> {
  return request<MomentLikerListResp>(
    () =>
      getMomentLikersApiV1MomentMomentIdLikersGet({
        headers: authHeaders(),
        path: { moment_id: momentId as unknown as number },
        query: { page_num: params.page_num ?? 1, page_size: params.page_size ?? 20 },
      }),
    { items: [], total: 0, page_num: 1, page_size: params.page_size ?? 20 }
  )
}

export async function fetchMomentForwards(
  momentId: string,
  params: { page_num?: number; page_size?: number } = {}
): Promise<MomentForwardListResp> {
  return request<MomentForwardListResp>(
    () =>
      getMomentForwardsApiV1MomentMomentIdForwardsGet({
        headers: authHeaders(),
        path: { moment_id: momentId as unknown as number },
        query: { page_num: params.page_num ?? 1, page_size: params.page_size ?? 20 },
      }),
    { items: [], total: 0, page_num: 1, page_size: params.page_size ?? 20 }
  )
}

// ---- Up Stat (空间统计：动态数 / 获赞数，对标 B 站 upstat) ----

export async function fetchUpStat(vmid: number): Promise<MomentUpStatResp | null> {
  return request<MomentUpStatResp | null>(
    () =>
      getUpstatApiV1MomentUpstatGet({
        headers: authHeaders(),
        query: { vmid },
      }),
    null
  )
}

// ---- User Space Info (用户空间资料，对标 B 站 acc/info，P9-T4) ----

/** 空间信息读取结果：保留业务码，供调用方区分「正常 / 用户不存在(1008) / 黑名单拒绝(403) / 失败」 */
export interface SpaceInfoResult {
  code: number
  msg: string
  data: SpaceInfoResp | null
}

/**
 * 读取单用户空间完整资料（对标 B 站 `/x/space/wbi/acc/info?mid=`）。
 *
 * 不走 `request` 的 fallback 归一化，而是保留业务码：
 * - `code === 0` 成功，`data` 为空间资料；
 * - `code === 403` 黑名单互访拒绝（本人除外，已拉黑 / 被拉黑）；
 * - `code === 1008`（USER_NOT_FOUND）目标用户不存在；
 * - 其它 / 网络失败为 `-1`。
 */
export async function fetchUserSpaceInfo(mid: number): Promise<SpaceInfoResult> {
  try {
    const r = await getSpaceInfoApiV1UserSpaceInfoGet({
      headers: authHeaders(),
      query: { mid },
    })
    const rr = r as {
      code?: number | string
      msg?: string
      data?: SpaceInfoResp | null
    } | null
    if (!rr) return { code: -1, msg: '服务器出错，请稍后重试', data: null }
    const code = typeof rr.code === 'number' ? rr.code : 0
    return { code, msg: rr.msg || 'ok', data: code === 0 ? rr.data ?? null : null }
  } catch {
    return { code: -1, msg: '服务器出错，请稍后重试', data: null }
  }
}

// ---- Audit (Admin) ----

export async function fetchAuditList(params: {
  page_num?: number
  page_size?: number
} = {}): Promise<MomentAuditListResp> {
  return request<MomentAuditListResp>(
    () =>
      auditListApiV1MomentAuditListGet({
        headers: authHeaders(),
        query: {
          page_num: params.page_num ?? 1,
          page_size: params.page_size ?? 20,
        },
      }),
    { items: [], total: 0, page_num: 1, page_size: params.page_size ?? 20 }
  )
}

export async function fetchAuditHistory(params: {
  dynId?: string
  operatorMid?: number
  fromDate?: string
  toDate?: string
  page_num?: number
  page_size?: number
} = {}): Promise<MomentAuditLogListResp> {
  return request<MomentAuditLogListResp>(
    () =>
      auditHistoryApiV1MomentAuditListHistoryGet({
        headers: authHeaders(),
        query: {
          dynId: params.dynId as unknown as number | undefined,
          operatorMid: params.operatorMid,
          fromDate: params.fromDate,
          toDate: params.toDate,
          page_num: params.page_num ?? 1,
          page_size: params.page_size ?? 20,
        },
      }),
    { items: [], total: 0, page_num: 1, page_size: params.page_size ?? 20 }
  )
}

export async function auditApprove(
  dynId: string,
  remark?: string
): Promise<MomentAuditDetailResp | null> {
  return request<MomentAuditDetailResp | null>(
    () =>
      auditApproveApiV1MomentAuditApprovePost({
        headers: authHeaders(),
        body: { dynId: dynId as unknown as number, remark } as MomentAuditActionReq,
      }),
    null
  )
}

export async function auditReject(
  dynId: string,
  rejectReason: string,
  remark?: string
): Promise<MomentAuditDetailResp | null> {
  return request<MomentAuditDetailResp | null>(
    () =>
      auditRejectApiV1MomentAuditRejectPost({
        headers: authHeaders(),
        body: { dynId: dynId as unknown as number, rejectReason, remark } as MomentAuditRejectReq,
      }),
    null
  )
}

export async function fetchAuditDetail(
  dynId: string
): Promise<MomentAuditDetailResp | null> {
  return request<MomentAuditDetailResp | null>(
    () =>
      auditDetailApiV1MomentAuditDynIdGet({
        headers: authHeaders(),
        path: { dynId: dynId as unknown as number },
      }),
    null
  )
}

// ---- Avatar Audit（头像更换审核）----

/** 我的头像审核状态（当前登录用户最近一条审核记录，无则 null） */
export async function fetchAvatarAuditMine(): Promise<AvatarAuditMineResp | null> {
  return request<AvatarAuditMineResp | null>(
    () =>
      avatarAuditMineApiV1UserAvatarAuditMineGet({
        headers: authHeaders(),
      }),
    null
  )
}

/** 管理端待审核头像列表（RootUser） */
export async function fetchAvatarAuditList(params: {
  page_num?: number
  page_size?: number
} = {}): Promise<AvatarAuditListResp> {
  return request<AvatarAuditListResp>(
    () =>
      avatarAuditListApiV1UserAvatarAuditListGet({
        headers: authHeaders(),
        query: {
          page_num: params.page_num ?? 1,
          page_size: params.page_size ?? 20,
        },
      }),
    { items: [], total: 0, page_num: 1, page_size: params.page_size ?? 20 }
  )
}

/** 管理端审核通过头像更换（RootUser） */
export async function avatarAuditApprove(
  pk: number,
  remark?: string
): Promise<AvatarAuditListResp | null> {
  return request<AvatarAuditListResp | null>(
    () =>
      avatarAuditApproveApiV1UserAvatarAuditApprovePost({
        headers: authHeaders(),
        body: { pk, remark } as AvatarAuditApproveReq,
      }),
    null
  )
}

/** 管理端审核驳回头像更换（RootUser） */
export async function avatarAuditReject(
  pk: number,
  reason: string,
  remark?: string
): Promise<AvatarAuditListResp | null> {
  return request<AvatarAuditListResp | null>(
    () =>
      avatarAuditRejectApiV1UserAvatarAuditRejectPost({
        headers: authHeaders(),
        body: { pk, reason, remark } as AvatarAuditRejectReq,
      }),
    null
  )
}

// ---- Favorite (收藏夹系统) ----

/** 创建收藏夹 */
export async function createFavoriteFolder(
  data: FavoriteFolderCreateReq
): Promise<FavoriteFolderResp | null> {
  return request<FavoriteFolderResp | null>(
    () =>
      createFolderApiV1FavoriteFolderCreatePost({
        headers: authHeaders(),
        body: data,
      }),
    null
  )
}

/** 更新收藏夹（名称/描述/封面） */
export async function updateFavoriteFolder(
  data: FavoriteFolderUpdateReq
): Promise<null> {
  return request<null>(
    () =>
      updateFolderApiV1FavoriteFolderUpdatePost({
        headers: authHeaders(),
        body: data,
      }),
    null
  )
}

/** 删除收藏夹 */
export async function deleteFavoriteFolder(
  folderId: string
): Promise<null> {
  return request<null>(
    () =>
      deleteFolderApiV1FavoriteFolderDeletePost({
        headers: authHeaders(),
        body: { folderId } as FavoriteFolderDeleteReq,
      }),
    null
  )
}

/** 我的收藏夹列表 */
export async function fetchFavoriteFolders(): Promise<FavoriteFolderResp[]> {
  return request<FavoriteFolderResp[]>(
    () =>
      listFoldersApiV1FavoriteFolderListGet({
        headers: authHeaders(),
      }),
    []
  )
}

/** 收藏资源到指定收藏夹（2.17.0 泛化）。
 * 缺省 bizType='dynamic'，此时 bizId 等价 dynId（二者任传其一）。
 */
export async function addFavorite(
  dynId: string,
  folderId: string,
  options: { bizType?: InteractionBizTypeEnum; bizId?: string } = {}
): Promise<FavoriteAddResp | null> {
  const bizType = options.bizType ?? 'dynamic'
  const bizId = options.bizId ?? dynId
  return request<FavoriteAddResp | null>(
    () =>
      addFavoriteApiV1FavoriteAddPost({
        headers: authHeaders(),
        body: {
          bizType,
          bizId,
          folderId,
          ...(bizType === 'dynamic' ? { dynId } : {}),
        } as FavoriteAddReq,
      }),
    null
  )
}

/** 从指定收藏夹取消收藏（2.17.0 泛化） */
export async function removeFavorite(
  dynId: string,
  folderId: string,
  options: { bizType?: InteractionBizTypeEnum; bizId?: string } = {}
): Promise<FavoriteAddResp | null> {
  const bizType = options.bizType ?? 'dynamic'
  const bizId = options.bizId ?? dynId
  return request<FavoriteAddResp | null>(
    () =>
      removeFavoriteApiV1FavoriteRemovePost({
        headers: authHeaders(),
        body: {
          bizType,
          bizId,
          folderId,
          ...(bizType === 'dynamic' ? { dynId } : {}),
        } as FavoriteRemoveReq,
      }),
    null
  )
}

/** 某收藏夹下的动态 id 列表（分页） */
export async function fetchFavoriteDynIds(
  folderId: string,
  params: { page?: number; pageSize?: number } = {}
): Promise<FavoriteListResp> {
  return request<FavoriteListResp>(
    () =>
      listFavoritesApiV1FavoriteListGet({
        headers: authHeaders(),
        query: {
          folderId,
          page: params.page ?? 1,
          pageSize: params.pageSize ?? 20,
        },
      }),
    { folderId, total: 0, dynIds: [] }
  )
}

/** 某收藏夹下的资源明细列表（bizType+bizId，分页；可按 bizType 过滤） */
export async function fetchFavoriteItems(
  folderId: string,
  params: {
    bizType?: InteractionBizTypeEnum
    page?: number
    pageSize?: number
  } = {}
): Promise<FavoriteItemListResp> {
  return request<FavoriteItemListResp>(
    () =>
      listFavoriteItemsApiV1FavoriteItemsGet({
        headers: authHeaders(),
        query: {
          folderId,
          bizType: params.bizType ?? null,
          page: params.page ?? 1,
          pageSize: params.pageSize ?? 20,
        },
      }),
    { folderId, total: 0, items: [] }
  )
}

/** 某资源被当前用户收藏在哪些收藏夹（2.17.0 泛化） */
export async function fetchDynFavoriteFolders(
  dynId: string,
  options: { bizType?: InteractionBizTypeEnum; bizId?: string } = {}
): Promise<FavoriteDynFoldersResp | null> {
  const bizType = options.bizType ?? 'dynamic'
  const bizId = options.bizId ?? dynId
  return request<FavoriteDynFoldersResp | null>(
    () =>
      dynFoldersApiV1FavoriteDynFoldersGet({
        headers: authHeaders(),
        query: {
          bizType,
          bizId,
          ...(bizType === 'dynamic' ? { dynId } : {}),
        },
      }),
    null
  )
}

/** 主页是否显示收藏 */
export async function fetchFavoriteSetting(): Promise<FavoriteSettingResp | null> {
  return request<FavoriteSettingResp | null>(
    () =>
      getSettingApiV1FavoriteSettingGet({
        headers: authHeaders(),
      }),
    null
  )
}

/** 设置主页是否显示收藏 */
export async function setFavoriteSetting(
  showFavorites: boolean,
  options?: RequestOptions
): Promise<FavoriteSettingResp | null> {
  return request<FavoriteSettingResp | null>(
    () =>
      setSettingApiV1FavoriteSettingPost({
        headers: authHeaders(),
        body: { showFavorites } as FavoriteSettingReq,
      }),
    null,
    options
  )
}

/** 某用户主页公开的收藏夹列表（无需登录；不公开返回 null） */
export async function fetchUserFavoriteFolders(
  mid: number
): Promise<FavoriteFolderResp[] | null> {
  try {
    return await request<FavoriteFolderResp[]>(
      () =>
        publicFoldersApiV1FavoriteUserFoldersGet({
          query: { mid },
        }),
      null
    )
  } catch {
    return null
  }
}

/** 某用户某收藏夹下的公开动态 id（无需登录；不公开返回 null） */
export async function fetchUserFavoriteDynIds(
  mid: number,
  folderId: string,
  params: { page?: number; pageSize?: number } = {}
): Promise<FavoriteListResp | null> {
  try {
    return await request<FavoriteListResp>(
      () =>
        publicDynamicsApiV1FavoriteUserDynamicsGet({
          query: {
            mid,
            folderId,
            page: params.page ?? 1,
            pageSize: params.pageSize ?? 20,
          },
        }),
      null
    )
  } catch {
    return null
  }
}

// ---- Re-export types for consumers ----
export type {
  MomentFeedResp,
  MomentFeedItem,
  MomentDetailResp,
  MomentCreateReq,
  MomentCreateResp,
  MomentAttachRef,
  MomentEditReq,
  MomentEditResp,
  MomentRepostReq,
  MomentRepostResp,
  MomentThumbResp,
  ReportCreateReq,
  MomentTopicSquareResp,
  MomentTopicFeedResp,
  MomentTopicCreateResp,
  MomentTopicMineItem,
  MomentTopicMineResp,
  MomentTopicAuditItem,
  MomentTopicAuditListResp,
  MomentAtListResp,
  MomentAtSearchResp,
  MomentPoiResp,
  MomentPoiItem,
  MomentAuditListResp,
  MomentAuditDetailResp,
  MomentAuditLogListResp,
  MomentAuditItem,
  MomentContentNode,
  MomentModule,
  MomentTopicInfo,
  FollowCountResp,
  MomentUpStatResp,
  FavoriteFolderCreateReq,
  FavoriteFolderUpdateReq,
  FavoriteFolderDeleteReq,
  FavoriteFolderResp,
  FavoriteAddReq,
  FavoriteRemoveReq,
  FavoriteAddResp,
  FavoriteListResp,
  FavoriteItemListResp,
  FavoriteListItem,
  FavoriteDynFoldersResp,
  FavoriteSettingReq,
  FavoriteSettingResp,
  InteractionStatusResp,
  InteractionStatusItem,
  InteractionBizTypeEnum,
  SpaceInfoResp,
  AvatarAuditMineResp,
  AvatarAuditListResp,
  AvatarAuditItem,
  AvatarAuditApproveReq,
  AvatarAuditRejectReq,
} from '@/api/notify/hey-api'
