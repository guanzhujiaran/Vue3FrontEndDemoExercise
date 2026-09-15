/**
 * 统一举报 API 封装层（be-message `/api/v1/report`）。
 *
 * 仅在此处调用 hey-api 生成的 SDK，业务视图/组件统一调用本文件的封装函数。
 * 覆盖：管理端举报列表（含被举报数量 reportCount）、举报审核（成立/驳回 + 可选下架）。
 */
import { InteractionBizTypeEnum, ReportService } from '@/api/community/hey-api'
import type { ReportItem, ReportListResp, ReportReviewReq } from '@/api/community/hey-api'
import { request, requestOk, authHeaders } from '@/api/http'

export { InteractionBizTypeEnum }
export type { ReportItem, ReportListResp }

/** 管理端举报列表（分页 + 来源/状态过滤） */
export async function fetchReportList(params: {
  biz_type?: InteractionBizTypeEnum
  status?: string
  page?: number
  page_size?: number
} = {}): Promise<ReportListResp> {
  return request<ReportListResp>(
    () =>
      ReportService.listReportsApiV1ReportAdminListGet({
        query: {
          biz_type: params.biz_type,
          status: params.status,
          page: params.page ?? 1,
          page_size: params.page_size ?? 20,
        },
      }),
    { items: [], total: 0, page: 1, pageSize: 20 },
  )
}

/**
 * 管理端审核举报：decision=resolve（成立）/ reject（驳回）；resourceAction=hide 可选下架。
 *
 * 返回「是否成功」：该接口没有业务返回体（`data` 为空），
 * 用 `request<T>(call, fallback)` 时成功与失败的返回值都是 `undefined`，调用方无法区分
 * （曾导致审核失败也提示「举报已成立」并移除该行）。故改用 `requestOk()` 直接取统一入口的成功标志。
 */
export async function reviewReport(req: {
  reportPk: number
  decision: 'resolve' | 'reject'
  resourceAction?: 'hide'
  remark?: string
}): Promise<boolean> {
  const body: ReportReviewReq = {
    reportPk: req.reportPk,
    decision: req.decision,
    resourceAction: req.resourceAction,
    remark: req.remark,
  }
  return requestOk(
    () =>
      ReportService.reviewApiV1ReportAdminReviewPost({
        body,
      }),
    undefined
  )
}
