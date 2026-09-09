/**
 * Moment（动态）统一 API 封装层。
 *
 * 仅在此处调用 hey-api 生成的 SDK，业务视图/组件统一调用本文件的封装函数。
 */
import { AuditService, AvatarAuditService, FavoriteService, FolderCoverAuditService, InteractionBizTypeEnum, MessageFollowService, MomentAuditService, ResourceAuditStatusEnum, MomentFeedService, MomentService, MomentTopicAuditService, PptrUserGatewayService, ReportService } from '@/api/community/hey-api'
import { request, authHeaders, type RequestOptions } from '@/api/http'

import type {
  MomentFeedResp,
  MomentFeedItem,
  AuditApproveReq,
  AuditRejectReq,
  AuditActionResp,
  MomentDetailResp,
  MomentCreateReq,
  MomentCreateResp,
  MomentRemoveReq,
  MomentRemoveResp,
  MomentRepostReq,
  MomentRepostResp,
  MomentThumbReq,
  MomentThumbResp,
  MomentDislikeReq,
  MomentDislikeResp,
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
  MomentLikerListResp,
  MomentForwardListResp,
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
  FolderCoverAuditListResp,
  FolderCoverAuditItem,
  FolderCoverAuditApproveReq,
  FolderCoverAuditRejectReq,
  SpaceInfoResp,
  StandardResponseSpaceInfoResp,
} from '@/api/community/hey-api'


/**
 * 互动资源类型 / 举报来源类型，直接使用 SDK 生成的数值枚举（单一数据源，不再手写镜像）：
 * - InteractionBizTypeEnum：DYNAMIC=1 / LOTTERY=2 / RPA_ACTION=3 / RPA_WORKFLOW=4 / RPA_BROWSER=5 / RPA_PLUGIN=6
 * - InteractionBizTypeEnum：DYNAMIC=1 / LOTTERY=2 / RPA_ACTION=3 / RPA_WORKFLOW=4 / RPA_BROWSER=5 / RPA_PLUGIN=6 / COMMENT=7 / USER=8
 */
export { InteractionBizTypeEnum }

// 动态审核状态枚举：后端 `ResourceAuditStatusEnum` 为 IntEnum（AUDITING=1/NORMAL=2/REJECTED=3/HIDDEN=4），
// 请求参数必须传数字；响应里的 `auditStatus` 则是枚举成员名字符串（AUDITING/NORMAL/...）。
// 统一从 SDK 取值，禁止在视图里手写 'auditing' 之类的字符串（会被 FastAPI 校验拒绝，返回 400）。
export { ResourceAuditStatusEnum }

// ---- Feed ----

export async function fetchAllFeed(params: {
  ps?: number
  last_showlist?: string
  sort?: 'recommend' | 'time'
  uniq_id?: string
} = {}): Promise<MomentFeedResp> {
  return request<MomentFeedResp>(
    () =>
      MomentFeedService.feedAllApiV1CommunityFeedAllGet({
        query: {
          // 对齐 B 站 rcmd：推荐流用 ps + last_showlist（服务端去重），无 page/offset；
          // uniq_id 供未登录用户服务端派生随机权重（千人千面）
          ps: params.ps ?? 20,
          last_showlist: params.last_showlist,
          sort: params.sort,
          uniq_id: params.uniq_id,
        },
      }),
    { items: [], hasMore: false }
  )
}

export async function fetchSpaceFeed(
  mid: number | string,
  params: { page_size?: number; history_offset?: number } = {}
): Promise<MomentFeedResp> {
  return request<MomentFeedResp>(
    () =>
      MomentFeedService.feedSpaceApiV1CommunityFeedSpaceMidGet({
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
      MomentFeedService.detailApiV1CommunityDetailMomentIdGet({
        // 传字符串避免 19 位 dynId 精度丢失；SDK path 类型为 number，运行时字符串原样拼接
        path: { moment_id: momentId as unknown as number },
      }),
    null
  )
}

// ---- Create / Remove ----

export async function createMoment(
  payload: MomentCreateReq,
  options?: RequestOptions
): Promise<MomentCreateResp | null> {
  return request<MomentCreateResp | null>(
    () =>
      MomentService.createDynamicApiV1CommunityCreatePost({
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
      MomentService.removeDynamicApiV1CommunityRemovePost({
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
      MomentService.adminRemoveDynamicApiV1CommunityAdminRemovePost({
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
      MomentService.repostDynamicApiV1CommunityRepostPost({
        body: {
          ...payload,
          srcDynId: payload.srcDynId as unknown as number,
        } as MomentRepostReq,
      }),
    null
  )
}

// ---- Top / Untop ----

export async function topMoment(dynId: string): Promise<boolean> {
  const r = await request<{ isTop?: number } | null>(
    () =>
      MomentService.topDynamicApiV1CommunitySpaceTopPost({
        body: { dynId: dynId as unknown as number },
      }),
    null
  )
  return r != null
}

export async function untopMoment(dynId: string): Promise<boolean> {
  const r = await request<{ isTop?: number } | null>(
    () =>
      MomentService.untopDynamicApiV1CommunitySpaceUntopPost({
        body: { dynId: dynId as unknown as number },
      }),
    null
  )
  return r != null
}

// ---- Thumb (Like / Unlike) ----

/** 点赞/取消点赞（2.17.0 泛化：支持多业务资源；2.56.0 去除 dynId 别名）。
 * 资源一律以 `bizId` 定位（缺省 bizType='dynamic'，动态时 bizId 即动态 ID）。
 */
export async function thumbMoment(
  bizId: string,
  up: number, // 1=like, 2=unlike
  options: { bizType?: InteractionBizTypeEnum; bizId?: string } = {}
): Promise<MomentThumbResp | null> {
  const bizType = options.bizType ?? InteractionBizTypeEnum.DYNAMIC
  const resolvedBizId = options.bizId ?? bizId
  return request<MomentThumbResp | null>(
    () =>
      MomentService.thumbApiV1CommunityThumbPost({
        body: {
          bizType,
          bizId: resolvedBizId as unknown as number,
          up,
        } as MomentThumbReq,
      }),
    null
  )
}

// ---- Dislike (点踩 / 取消点踩) ----

/**
 * 点踩 / 取消点踩（2.35.0 后端已有；2.62.0 前端接入，计划书 §5.20）。
 *
 * 后端语义：
 * - 幂等（明细表 `TResourceDislike` 唯一约束 bizType+bizId+mid，一人一踩）；
 * - 点踩后① 全站 `dislike_ratio` 对该资源**略降**权重；② 该资源**对点踩者本人大幅降权**
 *   （`feed_engine` 精排后处理）；
 * - **不改变内容可见性**（不下架），与举报审核的 `resourceAction=hide` 语义分离。
 *
 * 注意：点踩计数不对外展示，前端只用 `isDislike` 渲染踩的状态。
 */
export async function dislikeMoment(
  bizId: string,
  up: number, // 1=点踩, 2=取消点踩
  options: { bizType?: InteractionBizTypeEnum; bizId?: string } = {}
): Promise<MomentDislikeResp | null> {
  const bizType = options.bizType ?? InteractionBizTypeEnum.DYNAMIC
  const resolvedBizId = options.bizId ?? bizId
  return request<MomentDislikeResp | null>(
    () =>
      MomentService.dislikeApiV1CommunityDislikePost({
        body: {
          bizType,
          bizId: resolvedBizId as unknown as number,
          up,
        } as MomentDislikeReq,
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
      MomentService.interactionStatusApiV1CommunityInteractionStatusGet({
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
      MomentService.interactionStatusDetailApiV1CommunityInteractionStatusBizIdGet({
        path: { biz_id: bizId },
        query: { bizType },
      }),
    null
  )
}

// ---- Report ----

export async function reportMoment(
  bizId: string,
  reasonType: number,
  reasonDesc?: string
): Promise<MomentReportResp | null> {
  return request<MomentReportResp | null>(
    () =>
      MomentService.reportApiV1CommunityReportPost({
        body: { bizId: bizId as unknown as number, reasonType, reasonDesc } as MomentReportReq,
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

/**
 * 统一举报（动态/评论/用户空间三类合一，`bizType`+`bizId` 区分来源）。
 * 走 `POST /api/v1/report`，幂等（一人一对象一次），支持图片附件 `pics`（最多 3 张）。
 */
export async function reportByBiz(
  bizType: InteractionBizTypeEnum,
  bizId: string,
  reasonType: number,
  reasonDesc?: string,
  pics?: string[],
  options?: RequestOptions
): Promise<{ created: boolean; triggered: boolean } | null> {
  return request<{ created: boolean; triggered: boolean } | null>(
    () =>
      ReportService.createReportApiV1ReportPost({
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
      MomentService.createCheckApiV1CommunityCreateCheckPost({
        body: { scene },
      }),
    null
  )
  return r?.canCreate ?? true
}

// ---- Topic ----

export async function fetchTopicSquare(params: {
  page_size?: number
  last_showlist?: number[] | string
  keyword?: string
  hot_only?: boolean
} = {}): Promise<MomentTopicSquareResp> {
  return request<MomentTopicSquareResp>(
    () =>
      MomentService.topicSquareApiV1CommunityTopicSquareGet({
        query: {
          page_size: params.page_size ?? 20,
          ...(params.last_showlist != null
            ? {
                last_showlist: Array.isArray(params.last_showlist)
                  ? params.last_showlist.join(',')
                  : params.last_showlist,
              }
            : {}),
          ...(params.keyword ? { keyword: params.keyword } : {}),
          ...(params.hot_only ? { hot_only: true } : {}),
        },
      }),
    { items: [], hasMore: false, updateBaseline: null, historyOffset: null, updateNum: 0 }
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
      MomentService.topicCreateApiV1CommunityTopicCreatePost({
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
      MomentService.topicMineApiV1CommunityTopicMineGet({
        query: {
          page: params.page ?? 1,
          page_size: params.page_size ?? 20,
        },
      }),
    { items: [], hasMore: false }
  )
}

/** 管理端话题审核列表（root，按状态筛选；auditStatus 待 SDK 同步，先断言透传） */
export async function fetchTopicAuditList(params: {
  auditStatus?: ResourceAuditStatusEnum
  page_num?: number
  page_size?: number
} = {}): Promise<MomentTopicAuditListResp> {
  return request<MomentTopicAuditListResp>(
    () =>
      MomentTopicAuditService.topicAuditListApiV1CommunityTopicAuditListGet({
        query: {
          ...(params.auditStatus != null ? { auditStatus: params.auditStatus } : {}),
          page_num: params.page_num ?? 1,
          page_size: params.page_size ?? 20,
        } as never,
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
      MomentTopicAuditService.topicAuditApproveApiV1CommunityTopicAuditApprovePost({
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
      MomentTopicAuditService.topicAuditRejectApiV1CommunityTopicAuditRejectPost({
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
      MomentService.topicHotSearchApiV1CommunityTopicHotSearchGet({
        query: {
          page: params.page ?? 1,
          page_size: params.page_size ?? 20,
        },
      }),
    { items: [], hasMore: false }
  )
}

export async function fetchTopicFeed(
  topicId: number | string,
  params: { page_size?: number; history_offset?: number; sort?: 'hot' | 'time' } = {}
): Promise<MomentTopicFeedResp> {
  return request<MomentTopicFeedResp>(
    () =>
      MomentService.topicFeedApiV1CommunityTopicFeedTopicIdGet({
        path: { topicId },
        query: {
          page_size: params.page_size ?? 20,
          history_offset: params.history_offset,
          sort: params.sort ?? 'hot',
        },
      }),
    { topicId: Number(topicId), topicName: '', items: [], hasMore: false, topicIdStr: String(topicId) }
  )
}

/** 话题详情（对齐 B 站 top_details 结构） */
export async function fetchTopicDetail(topicId: number | string): Promise<MomentTopicDetailResp | null> {
  return request<MomentTopicDetailResp | null>(
    () =>
      MomentService.topicDetailApiV1CommunityTopicDetailTopicIdGet({
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
      MomentService.atListApiV1CommunityAtListGet({
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
      MomentService.atSearchApiV1CommunityAtSearchGet({
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
      MomentService.poiNearbyApiV1CommunityPoiNearbyGet({
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
      MomentService.poiSearchApiV1CommunityPoiSearchGet({
        query: { keyword, page: params.page ?? 1, page_size: params.page_size ?? 20 },
      }),
    { items: [], hasMore: false }
  )
}

// ---- User Space Info (用户空间资料，对标 B 站 acc/info，P9-T4) ----
// 2.51.0 起 `follow_stat` / `upstat` 已由 `/user/space/info` 内联返回，
// 原 `fetchRelationStat` / `fetchUpStat` 两个薄封装于 2.52.0 随 `/message/follow/stat`
// 与 `/community/upstat` 端点一并移除。

/** 我与某人的关注关系（是否已关注 / 是否被关注 / 是否互关 / 拉黑状态） */
export async function fetchFollowRelation(target_mid: number): Promise<FollowRelationResp | null> {
  return request<FollowRelationResp | null>(
    () =>
      MessageFollowService.getRelationApiV1MessageFollowRelationGet({
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
      MessageFollowService.followUserApiV1MessageFollowDoPost({
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
      MessageFollowService.unfollowUserApiV1MessageFollowUndoPost({
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
      MessageFollowService.blockUserApiV1MessageFollowBlockPost({
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
      MomentFeedService.getMomentLikersApiV1CommunityMomentIdLikersGet({
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
      MomentFeedService.getMomentForwardsApiV1CommunityMomentIdForwardsGet({
        path: { moment_id: momentId as unknown as number },
        query: { page_num: params.page_num ?? 1, page_size: params.page_size ?? 20 },
      }),
    { items: [], total: 0, page_num: 1, page_size: params.page_size ?? 20 }
  )
}

// ---- User Space Info (用户空间资料，对标 B 站 acc/info，P9-T4) ----

/**
 * 读取单用户空间完整资料（对标 B 站 `/x/space/wbi/acc/info?mid=`）。
 *
 * 不走 `request` 的 fallback 归一化，而是保留业务码：
 * - `code === 0` 成功，`data` 为空间资料；
 * - `code === 403` 黑名单互访拒绝（本人除外，已拉黑 / 被拉黑）；
 * - `code === 1008`（USER_NOT_FOUND）目标用户不存在；
 * - 其它 / 网络失败为 `-1`。
 * 返回类型直接使用 SDK 生成的 StandardResponseSpaceInfoResp。
 */
export async function fetchUserSpaceInfo(mid: number | string): Promise<StandardResponseSpaceInfoResp> {
  try {
    const r = await PptrUserGatewayService.getSpaceInfoApiV1UserSpaceInfoGet({
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
  /** 审核状态筛选：auditing（默认，待审核）/ normal（已过审，可驳回撤回）/ rejected（已驳回，可通过恢复）/ hidden（已下架） */
  auditStatus?: ResourceAuditStatusEnum
  /** 资源子类型筛选（动态类型 WORD/FORWARD/…，各 admin list 接口统一参数名；SDK 类型待同步先断言透传） */
  bizType?: string
  page_num?: number
  page_size?: number
} = {}): Promise<MomentAuditListResp> {
  return request<MomentAuditListResp>(
    () =>
      MomentAuditService.auditListApiV1CommunityAuditListGet({
        query: {
          auditStatus: params.auditStatus,
          ...(params.bizType ? { bizType: params.bizType } : {}),
          page_num: params.page_num ?? 1,
          page_size: params.page_size ?? 20,
        } as never,
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
      MomentAuditService.auditHistoryApiV1CommunityAuditListHistoryGet({
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
      MomentAuditService.auditApproveApiV1CommunityAuditApprovePost({
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
      MomentAuditService.auditRejectApiV1CommunityAuditRejectPost({
        body: { dynId: dynId as unknown as number, rejectReason, remark } as MomentAuditRejectReq,
      }),
    null
  )
}

// ==================== 通用审核（bizType + bizId，计划书 Phase 10 / 后端 §5.13）====================
// 所有管理端审核页统一走这两个函数：后端按 bizType+bizId 经资源类执行审核，
// 驳回通知由资源方法内部承载，前端不再区分 dynId / topicId / pk / rpid 等专用入参。

export async function auditApproveByBiz(
  bizType: InteractionBizTypeEnum,
  bizId: string | number,
  remark?: string
): Promise<AuditActionResp | null> {
  return request<AuditActionResp | null>(
    () =>
      AuditService.auditApproveApiV1AuditApprovePost({
        body: {
          bizType,
          bizId: String(bizId),
          remark,
        } as AuditApproveReq,
      }),
    null
  )
}

export async function auditRejectByBiz(
  bizType: InteractionBizTypeEnum,
  bizId: string | number,
  rejectReason: string,
  remark?: string
): Promise<AuditActionResp | null> {
  return request<AuditActionResp | null>(
    () =>
      AuditService.auditRejectApiV1AuditRejectPost({
        body: {
          bizType,
          bizId: String(bizId),
          rejectReason,
          remark,
        } as AuditRejectReq,
      }),
    null
  )
}

export async function fetchAuditDetail(
  dynId: string
): Promise<MomentAuditDetailResp | null> {
  return request<MomentAuditDetailResp | null>(
    () =>
      MomentAuditService.auditDetailApiV1CommunityAuditDynIdGet({
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
      AvatarAuditService.avatarAuditMineApiV1UserAvatarAuditMineGet({
      }),
    null
  )
}

/** 管理端待审核头像列表（RootUser） */
export async function fetchAvatarAuditList(params: {
  auditStatus?: ResourceAuditStatusEnum
  page_num?: number
  page_size?: number
} = {}): Promise<AvatarAuditListResp> {
  return request<AvatarAuditListResp>(
    () =>
      AvatarAuditService.avatarAuditListApiV1UserAvatarAuditListGet({
        query: {
          ...(params.auditStatus != null ? { auditStatus: params.auditStatus } : {}),
          page_num: params.page_num ?? 1,
          page_size: params.page_size ?? 20,
        } as never,
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
      AvatarAuditService.avatarAuditApproveApiV1UserAvatarAuditApprovePost({
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
      AvatarAuditService.avatarAuditRejectApiV1UserAvatarAuditRejectPost({
        body: { pk, reason, remark } as AvatarAuditRejectReq,
      }),
    null
  )
}

// ---- Folder Cover Audit（收藏夹封面审核）----

/** 管理端待审核收藏夹封面列表（RootUser） */
export async function fetchFolderCoverAuditList(params: {
  auditStatus?: ResourceAuditStatusEnum
  page_num?: number
  page_size?: number
} = {}): Promise<FolderCoverAuditListResp> {
  return request<FolderCoverAuditListResp>(
    () =>
      FolderCoverAuditService.folderCoverAuditListApiV1FavoriteFolderCoverAuditListGet({
        query: {
          ...(params.auditStatus != null ? { auditStatus: params.auditStatus } : {}),
          page_num: params.page_num ?? 1,
          page_size: params.page_size ?? 20,
        } as never,
      }),
    { items: [], total: 0, page_num: 1, page_size: params.page_size ?? 20 }
  )
}

/** 管理端审核通过收藏夹封面（RootUser，通过后新封面公开显示） */
export async function folderCoverAuditApprove(
  pk: number,
  remark?: string
): Promise<FolderCoverAuditItem | null> {
  return request<FolderCoverAuditItem | null>(
    () =>
      FolderCoverAuditService.folderCoverAuditApproveApiV1FavoriteFolderCoverAuditApprovePost({
        body: { pk, remark } as FolderCoverAuditApproveReq,
      }),
    null
  )
}

/** 管理端审核驳回收藏夹封面（RootUser，保持原封面） */
export async function folderCoverAuditReject(
  pk: number,
  reason: string,
  remark?: string
): Promise<FolderCoverAuditItem | null> {
  return request<FolderCoverAuditItem | null>(
    () =>
      FolderCoverAuditService.folderCoverAuditRejectApiV1FavoriteFolderCoverAuditRejectPost({
        body: { pk, reason, remark } as FolderCoverAuditRejectReq,
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
      FavoriteService.createFolderApiV1FavoriteFolderCreatePost({
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
      FavoriteService.updateFolderApiV1FavoriteFolderUpdatePost({
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
      FavoriteService.deleteFolderApiV1FavoriteFolderDeletePost({
        body: { folderId } as FavoriteFolderDeleteReq,
      }),
    null
  )
}

/** 我的收藏夹列表 */
export async function fetchFavoriteFolders(): Promise<FavoriteFolderResp[]> {
  return request<FavoriteFolderResp[]>(
    () =>
      FavoriteService.listFoldersApiV1FavoriteFolderListGet({
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
  const bizType = options.bizType ?? InteractionBizTypeEnum.DYNAMIC
  const bizId = options.bizId ?? dynId
  return request<FavoriteAddResp | null>(
    () =>
      FavoriteService.addFavoriteApiV1FavoriteAddPost({
        body: {
          bizType,
          bizId,
          folderId,
          ...(bizType === InteractionBizTypeEnum.DYNAMIC ? { dynId } : {}),
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
  const bizType = options.bizType ?? InteractionBizTypeEnum.DYNAMIC
  const bizId = options.bizId ?? dynId
  return request<FavoriteAddResp | null>(
    () =>
      FavoriteService.removeFavoriteApiV1FavoriteRemovePost({
        body: {
          bizType,
          bizId,
          folderId,
          ...(bizType === InteractionBizTypeEnum.DYNAMIC ? { dynId } : {}),
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
      FavoriteService.listFavoritesApiV1FavoriteListGet({
        query: {
          folderId,
          page: params.page ?? 1,
          pageSize: params.pageSize ?? 20,
        },
      }),
    { folderId, total: 0, items: [] }
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
      FavoriteService.listFavoriteItemsApiV1FavoriteItemsGet({
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
  const bizType = options.bizType ?? InteractionBizTypeEnum.DYNAMIC
  const bizId = options.bizId ?? dynId
  return request<FavoriteDynFoldersResp | null>(
    () =>
      FavoriteService.dynFoldersApiV1FavoriteDynFoldersGet({
        query: {
          bizType,
          bizId,
          ...(bizType === InteractionBizTypeEnum.DYNAMIC ? { dynId } : {}),
        },
      }),
    null
  )
}

/** 主页是否显示收藏 */
export async function fetchFavoriteSetting(): Promise<FavoriteSettingResp | null> {
  return request<FavoriteSettingResp | null>(
    () =>
      FavoriteService.getSettingApiV1FavoriteSettingGet({
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
      FavoriteService.setSettingApiV1FavoriteSettingPost({
        body: { showFavorites } as FavoriteSettingReq,
      }),
    null,
    options
  )
}

/** 某用户主页公开的收藏夹列表（无需登录；不公开返回 null） */
export async function fetchUserFavoriteFolders(
  mid: number | string
): Promise<FavoriteFolderResp[] | null> {
  try {
    return await request<FavoriteFolderResp[] | null>(
      () =>
        FavoriteService.publicFoldersApiV1FavoriteUserFoldersGet({
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
  mid: number | string,
  folderId: string,
  params: { page?: number; pageSize?: number } = {}
): Promise<FavoriteListResp | null> {
  try {
    return await request<FavoriteListResp | null>(
      () =>
        FavoriteService.publicDynamicsApiV1FavoriteUserDynamicsGet({
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

/** 动态审核总统计：按类型 + 按状态分组计数（role=root，与审核列表同守卫） */
/** 通用审核统计响应（后端 /audit/statistics 统一结构，SDK 类型待同步先用本地契约） */
export interface AuditStatisticsData {
  total: number
  byStatus: Record<string, number>
  byType?: Array<Record<string, unknown>>
}

/**
 * 审核统计业务域：直接复用 bili_common 收口的统一业务资源类型枚举
 * （InteractionBizTypeEnum）。SDK 尚未同步后端新增的审核域成员（9~13），
 * 先本地补充；SDK 重新生成后删除展开中的重复成员、直接用 SDK 导出。
 */
export const AuditBizType = {
  ...InteractionBizTypeEnum,
  TOPIC: 9,
  DM: 10,
  AVATAR: 11,
  FOLDER_COVER: 12,
  REPORT: 13,
} as const

/** 通用审核统计（按 bizType 业务域，传 InteractionBizTypeEnum 数值；SDK 类型待同步先断言透传） */
export async function fetchAuditStatisticsByBiz(
  bizType: number
): Promise<AuditStatisticsData> {
  return request<AuditStatisticsData>(
    () =>
      MomentAuditService.auditStatisticsApiV1CommunityAuditStatisticsGet({
        query: { bizType } as never,
      }),
    { total: 0, byStatus: {}, byType: [] }
  )
}

// ---- Re-export types for consumers ----
export type {
  MomentFeedResp,
  MomentFeedItem,
  MomentDetailResp,
  MomentCreateReq,
  MomentCreateResp,
  MomentAttachRef,
  MomentRepostReq,
  MomentRepostResp,
  MomentThumbResp,
  MomentDislikeResp,
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
  SpaceInfoResp,
  MomentLikerListResp,
  MomentForwardListResp,
  MomentTopicDetailResp,
  AvatarAuditMineResp,
  AvatarAuditListResp,
  AvatarAuditItem,
  AvatarAuditApproveReq,
  AvatarAuditRejectReq,
  FolderCoverAuditListResp,
  FolderCoverAuditItem,
  FolderCoverAuditApproveReq,
  FolderCoverAuditRejectReq,
  AuditApproveReq,
  AuditRejectReq,
  AuditActionResp,
} from '@/api/community/hey-api'
