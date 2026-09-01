/**
 * 统一举报 API 封装层（be-message `/api/v1/report`）。
 *
 * 仅在此处调用 hey-api 生成的 SDK，业务视图/组件统一调用本文件的封装函数。
 * 覆盖：管理端举报列表（含被举报数量 reportCount）、举报审核（成立/驳回 + 可选下架）。
 */
import { ReportBizTypeEnum, ReportService } from '@/api/community/hey-api'
import type { ReportItem, ReportListResp, ReportReviewReq } from '@/api/community/hey-api'
import { request, authHeaders } from '@/api/http'

export { ReportBizTypeEnum }
export type { ReportItem, ReportListResp }

/** 管理端举报列表（分页 + 来源/状态过滤） */
export async function fetchReportList(params: {
  biz_type?: ReportBizTypeEnum
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

/** 管理端审核举报：decision=resolve（成立）/ reject（驳回）；resourceAction=hide 可选下架 */
export async function reviewReport(req: {
  reportPk: number
  decision: 'resolve' | 'reject'
  resourceAction?: 'hide'
  remark?: string
}): Promise<void> {
  const body: ReportReviewReq = {
    reportPk: req.reportPk,
    decision: req.decision,
    resourceAction: req.resourceAction,
    remark: req.remark,
  }
  return request<void>(() =>
    ReportService.reviewApiV1ReportAdminReviewPost({
      body,
    }),
  )
}
