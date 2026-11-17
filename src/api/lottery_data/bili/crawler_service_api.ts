/**
 * 管理端 crawler 后台服务启停 API 封装（be-message `/api/v1/crawler/admin/service`）。
 *
 * crawler 的 `/api/v1/background_service/*` 无鉴权且网关不转发，
 * 前端只认 be-message 的管理端代理（需管理员登录）。
 *
 * 服务名取值同 crawler `BackgroundServiceName`，页面使用到的 5 个：
 * GET_DYN / GET_TOPIC / GET_RESERVE_INFO / REFRESH_BILI_LOTDATA_DATABASE / GET_OTHERS_LOT_DYN。
 */
import { CrawlerServiceAdminService } from '@/api/community/hey-api'
import type {
  CrawlerServiceAction,
  CrawlerServiceOperateResp,
  CrawlerServiceStatusResp,
} from '@/api/community/hey-api'
import { request } from '@/api/http'

export type {
  CrawlerScheduledService,
  CrawlerServiceAction,
  CrawlerServiceOperateResp,
  CrawlerServiceStatusResp,
} from '@/api/community/hey-api'

/**
 * 查询当前已注册（未被停止）的后台服务。
 *
 * 失败返回 `null`（错误提示由统一请求层弹出），调用方据此保留原有按钮状态。
 */
export async function fetchCrawlerServiceStatus(): Promise<CrawlerServiceStatusResp | null> {
  return request<CrawlerServiceStatusResp | null>(
    () => CrawlerServiceAdminService.getServiceStatusApiV1CrawlerAdminServiceGet(),
    null,
    { errorMessage: '获取后台服务调度状态失败' }
  )
}

/**
 * 执行启动 / 停止 / 重启。
 *
 * 返回 crawler 的结果描述（含 `msg`），失败返回 `null`；
 * 错误提示由统一请求层弹出，成功提示由调用方使用 `msg` 展示。
 */
export async function operateCrawlerService(
  action: CrawlerServiceAction,
  service_name: string
): Promise<CrawlerServiceOperateResp | null> {
  const call = () => {
    const options = { body: { service_name } }
    if (action === 'start') {
      return CrawlerServiceAdminService.startServiceApiV1CrawlerAdminServiceStartPost(options)
    }
    if (action === 'stop') {
      return CrawlerServiceAdminService.stopServiceApiV1CrawlerAdminServiceStopPost(options)
    }
    return CrawlerServiceAdminService.restartServiceApiV1CrawlerAdminServiceRestartPost(options)
  }
  return request<CrawlerServiceOperateResp | null>(call, null, {
    errorMessage: '后台服务操作失败',
  })
}
