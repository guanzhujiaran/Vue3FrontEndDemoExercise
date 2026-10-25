import { 时长与会员权益Service, 管理员管理Service } from '@/api/browser/hey-api'
import type {
  DurationAccountResponse,
  MonthCardInfo,
  RedeemResponse,
  SignInCalendarResponse,
  SignInResponse,
  SignMakeupResponse,
  SignOverviewResponse,
  SignRewardExchangeResponse,
  SignRewardConfigPayload,
  SignRewardConfigResponse,
  UsageStatItem,
  UsageStatsResponse,
  PaymentProductItem,
  PaymentProductsResponse,
  PaymentGrantedItem,
  PaymentConfirmResponse,
  GenerateCodesResponse
} from '@/api/browser/hey-api'
import type { RootObject } from '@/models/api/base_model'
import {
  businessHandler,
  type BusinessHandlerResult,
  type BusinessResponse
} from '@/utils/businessHandler'

/**
 * 时长与会员权益接口（RPA-Browser `/browser/membership/*`）。
 *
 * 业务封装层：接口函数一律取自生成的 `services/时长与会员权益Service.gen.ts`，
 * 类型按需从生成产物 `import type`，不手改 `hey-api/` 下的生成文件。
 * 后端数值字段均以 str 传输（防 JS 大整数精度丢失）。
 */

/** 时长流水条目（后端 BasePaginationResp 泛型被 SDK 抹平，前端本地定义视图类型） */
export interface DurationLedgerItem {
  id: string
  change_seconds: string
  balance_after: string
  change_type: string
  ref_id: string
  workflow_id: string
  run_id: string
  browser_id: string
  remark: string
  created_at: string
}

/** 业务码（与 bili_common ResponseCode 对齐） */
export const MEMBERSHIP_CODE = {
  DURATION_INSUFFICIENT: 5001,
  REDEEM_CODE_INVALID: 5002,
  REDEEM_CODE_EXHAUSTED: 5003,
  REDEEM_CODE_ALREADY_USED: 5004,
  SIGN_IN_ALREADY_TODAY: 5005
} as const

function extractBackendError<T>(error: unknown): BusinessResponse<T> | null {
  if (!error || typeof error !== 'object') return null
  const candidates: unknown[] = [
    error,
    (error as { data?: unknown }).data,
    (error as { response?: { _data?: unknown } }).response?._data
  ]
  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'object' && 'code' in candidate) {
      const root = candidate as RootObject<T>
      return { code: root.code, data: root.data, msg: root.msg }
    }
  }
  return null
}

/**
 * 把 hey-api 的返回适配成 businessHandler 约定的 { code, data, msg } 契约。
 *
 * 关键事实：hey-api 客户端 `ignoreResponseError: true` + `responseStyle: 'data'` 时，
 * Promise resolve 的就是**解析后的响应体本身**（{ code, msg, data }），不存在
 * { data, error } 信封——业务失败（如 code=5002）也在成功路径返回。
 */
function adapt<T>(
  result: Promise<unknown>,
  failMsg: string
): Promise<BusinessResponse<T>> {
  return result
    .then((r) => {
      if (r && typeof r === 'object' && 'code' in r) {
        const root = r as RootObject<T>
        return { code: root.code, msg: root.msg, data: root.data }
      }
      return { code: -1, msg: failMsg, data: undefined }
    })
    .catch((error: unknown): BusinessResponse<T> => {
      // 网络层异常（DNS/超时等，ofetch 仅在网络错误时抛出）
      const backendError = extractBackendError<T>(error)
      if (backendError) return backendError
      const detail = error instanceof Error ? `: ${error.message}` : ''
      return { code: -1, msg: `${failMsg}${detail}`, data: undefined }
    })
}

export interface LedgerPage {
  page: number
  per_page: number
  total: number
  items: DurationLedgerItem[]
}

/** 兑换码条目（管理端） */
export interface RedemptionCodeItem {
  code: string
  code_type: string
  duration_seconds: string
  card_days: string
  max_uses: string
  used_count: string
  is_enabled: boolean
  expire_at: string | null
  batch_no: string
  remark: string
  created_at: string
}

/** 管理端：批量生成兑换码入参 */
export interface GenerateCodesReq {
  code_type: string
  count: string
  max_uses?: string
  duration_seconds?: string
  card_days?: string
  expire_at?: string | null
  batch_no?: string
  remark?: string
}

class MembershipApi {
  /** 账户概览：余额 / 月卡状态 / 今日签到状态 */
  GetAccount(): Promise<BusinessHandlerResult<DurationAccountResponse>> {
    return businessHandler<DurationAccountResponse>(
      adapt<DurationAccountResponse>(
        时长与会员权益Service.getMembershipAccountApiV1RpaBrowserMembershipGetAccountPost({
          body: {}
        }) as unknown as Promise<{
          data?: unknown
          error?: unknown
        }>,
        '获取时长账户失败'
      ),
      { showSuccessToast: false, errorMessage: '获取时长账户失败' }
    )
  }

  /**
   * 签到日历（当月逐日补齐，含每天是否可补登）
   *
   * @param month 查询月份 `YYYY-MM`，不传取当前月。
   */
  SignInCalendar(month?: string): Promise<BusinessHandlerResult<SignInCalendarResponse>> {
    return businessHandler<SignInCalendarResponse>(
      adapt<SignInCalendarResponse>(
        时长与会员权益Service.getSignInCalendarApiV1RpaBrowserMembershipSignInCalendarPost({
          body: { month: month || null }
        }) as unknown as Promise<{ data?: unknown; error?: unknown }>,
        '获取签到日历失败'
      ),
      { showSuccessToast: false, errorMessage: '获取签到日历失败' }
    )
  }

  /**
   * 签到概览：累计天数 / 补登卡 / 档位状态 / 上线日期与时区
   *
   * 结构对齐后端 `SignOverviewResponse`（后端已按本项目资产裁剪：只有时长 + 补登卡）。
   */
  SignInOverview(): Promise<BusinessHandlerResult<SignOverviewResponse>> {
    return businessHandler<SignOverviewResponse>(
      adapt<SignOverviewResponse>(
        时长与会员权益Service.getSignInOverviewApiV1RpaBrowserMembershipSignInOverviewPost({
          body: {}
        }) as unknown as Promise<{ data?: unknown; error?: unknown }>,
        '获取签到概览失败'
      ),
      { showSuccessToast: false, errorMessage: '获取签到概览失败' }
    )
  }

  /**
   * 补登卡补签指定日期（仅未签到的过去日期，每次消耗 1 张卡）
   *
   * 业务码 5010/5011/5012 的后端 msg 原样透传给调用方展示。
   */
  MakeupSignInRaw(date: string): Promise<BusinessResponse<SignMakeupResponse>> {
    return adapt<SignMakeupResponse>(
      时长与会员权益Service.makeupSignInApiV1RpaBrowserMembershipSignInMakeupPost({
        body: { date }
      }) as unknown as Promise<{ data?: unknown; error?: unknown }>,
      '补签失败'
    )
  }

  /**
   * 兑换签到奖励档位（7d / 14d / 28d，每档每用户仅一次）
   *
   * 业务码 5013/5014 的后端 msg 原样透传给调用方展示。
   */
  ExchangeSignRewardRaw(tier: string): Promise<BusinessResponse<SignRewardExchangeResponse>> {
    return adapt<SignRewardExchangeResponse>(
      时长与会员权益Service.exchangeSignRewardApiV1RpaBrowserMembershipSignInRewardExchangePost({
        body: { tier }
      }) as unknown as Promise<{ data?: unknown; error?: unknown }>,
      '兑换奖励失败'
    )
  }

  /**
   * 每日签到（原始结果，不复用 businessHandler 统一错误提示：
   * 业务码 5005「今日已签到」按普通提示处理，由调用方区分）。
   */
  SignInRaw(): Promise<BusinessResponse<SignInResponse>> {
    return adapt<SignInResponse>(
      时长与会员权益Service.signInApiV1RpaBrowserMembershipSignInPost({
        body: {}
      }) as unknown as Promise<{
        data?: unknown
        error?: unknown
      }>,
      '签到失败'
    )
  }

  /**
   * 兑换码兑换（原始结果，不复用 businessHandler 统一错误提示）：
   * 业务码 5002/5003/5004 的后端 msg（兑换码无效/已用尽/已兑换过）必须原样透传给调用方展示。
   */
  RedeemRaw(code: string): Promise<BusinessResponse<RedeemResponse>> {
    return adapt<RedeemResponse>(
      时长与会员权益Service.redeemCodeApiV1RpaBrowserMembershipRedeemPost({
        body: { code }
      }) as unknown as Promise<{ data?: unknown; error?: unknown }>,
      '兑换失败'
    )
  }

  /**
   * 分页查询时长流水（时间倒序）
   *
   * @param changeTypes 变动类型过滤（逗号分隔的 `LedgerChangeType` 值）：
   *   空 = 全部；`consume` = 仅消耗；`sign_in,activity,redeem,purchase,adjust` = 仅获得。
   */
  LedgerList(
    page: number,
    perPage: number,
    changeTypes?: string
  ): Promise<BusinessHandlerResult<LedgerPage>> {
    return businessHandler<LedgerPage>(
      adapt<LedgerPage>(
        时长与会员权益Service.listDurationLedgerApiV1RpaBrowserMembershipLedgerListPost({
          body: { page, per_page: perPage, change_types: changeTypes || '' }
        }) as unknown as Promise<{ data?: unknown; error?: unknown }>,
        '获取时长流水失败'
      ),
      { showSuccessToast: false, errorMessage: '获取时长流水失败' }
    )
  }

  /**
   * 按日期区间查询使用日统计
   *
   * 后端 `UsageStatsResponse` 为包装对象（`{ items: [...] }`），不是裸数组。
   */
  UsageStats(
    startDate: string,
    endDate: string,
    browserId?: string
  ): Promise<BusinessHandlerResult<UsageStatsResponse>> {
    return businessHandler<UsageStatsResponse>(
      adapt<UsageStatsResponse>(
        时长与会员权益Service.listUsageStatsApiV1RpaBrowserMembershipUsageStatsPost({
          body: {
            start_date: startDate,
            end_date: endDate,
            browser_id: browserId || null
          }
        }) as unknown as Promise<{ data?: unknown; error?: unknown }>,
        '获取使用统计失败'
      ),
      { showSuccessToast: false, errorMessage: '获取使用统计失败' }
    )
  }

  // ============ 支付（Casdoor 收银台，入账只认服务端对账，见计划书 §3.3） ============

  /**
   * 上架的支付商品列表（含 Casdoor 收银台购买 URL；buy_url 为空表示服务端未启用支付）
   *
   * 后端 `PaymentProductsResponse` 为包装对象（`{ items: [...] }`），不是裸数组。
   */
  PaymentProducts(): Promise<BusinessHandlerResult<PaymentProductsResponse>> {
    return businessHandler<PaymentProductsResponse>(
      adapt<PaymentProductsResponse>(
        时长与会员权益Service.listPaymentProductsApiV1RpaBrowserMembershipPaymentProductsPost({
          body: {}
        }) as unknown as Promise<{ data?: unknown; error?: unknown }>,
        '获取支付商品失败'
      ),
      { showSuccessToast: false, errorMessage: '获取支付商品失败' }
    )
  }

  /**
   * 支付完成通知：透传 Casdoor Success URL 跳回的 transactionOwner / transactionName。
   * 后端 notify-payment 完成交易 + get-payment 服务端核验 + 幂等入账。
   *
   * 后端 `PaymentConfirmResponse` 为包装对象（`{ granted: [...] }`），不是裸数组。
   */
  NotifyPayment(
    transactionOwner: string,
    transactionName: string
  ): Promise<BusinessHandlerResult<PaymentConfirmResponse>> {
    return businessHandler<PaymentConfirmResponse>(
      adapt<PaymentConfirmResponse>(
        时长与会员权益Service.notifyPaymentApiV1RpaBrowserMembershipPaymentNotifyPost({
          body: { transaction_owner: transactionOwner, transaction_name: transactionName }
        }) as unknown as Promise<{ data?: unknown; error?: unknown }>,
        '支付状态核验失败'
      ),
      { showSuccessToast: false, errorMessage: '支付状态核验失败' }
    )
  }

  /**
   * 兜底对账：按用户拉取支付列表补入账（漏点跳转页时也能补）
   *
   * 后端 `PaymentConfirmResponse` 为包装对象（`{ granted: [...] }`），不是裸数组。
   */
  PaymentConfirm(): Promise<BusinessHandlerResult<PaymentConfirmResponse>> {
    return businessHandler<PaymentConfirmResponse>(
      adapt<PaymentConfirmResponse>(
        时长与会员权益Service.confirmPaymentsApiV1RpaBrowserMembershipPaymentConfirmPost({
          body: {}
        }) as unknown as Promise<{ data?: unknown; error?: unknown }>,
        '支付状态核验失败'
      ),
      { showSuccessToast: false, errorMessage: '支付状态核验失败' }
    )
  }

  // ============ 管理端（兑换码生成 / 查询，后端 require_admin） ============

  /** 批量生成兑换码（时长卡 / 月卡） */
  GenerateCodes(
    req: GenerateCodesReq
  ): Promise<BusinessHandlerResult<GenerateCodesResponse>> {
    return businessHandler<GenerateCodesResponse>(
      adapt<GenerateCodesResponse>(
        管理员管理Service.generateMembershipCodesApiAdminRpaMembershipCodesGeneratePost({
          body: req
        }) as unknown as Promise<{ data?: unknown; error?: unknown }>,
        '生成兑换码失败'
      ),
      { errorMessage: '生成兑换码失败' }
    )
  }

  /** 分页查询兑换码 */
  ListCodes(
    page: number,
    perPage: number,
    batchNo?: string,
    codeType?: string
  ): Promise<BusinessHandlerResult<{ total: number; items: RedemptionCodeItem[] }>> {
    return businessHandler<{ total: number; items: RedemptionCodeItem[] }>(
      adapt<{ total: number; items: RedemptionCodeItem[] }>(
        管理员管理Service.listMembershipCodesApiAdminRpaMembershipCodesListPost({
          body: {
            page: String(page),
            per_page: String(perPage),
            batch_no: batchNo || null,
            code_type: codeType || null
          }
        }) as unknown as Promise<{ data?: unknown; error?: unknown }>,
        '获取兑换码列表失败'
      ),
      { showSuccessToast: false, errorMessage: '获取兑换码列表失败' }
    )
  }

  // ============ 管理端：签到奖励配置（app/data/sign_in_rewards.json，require_admin） ============

  /**
   * 读取当前签到奖励配置
   *
   * 数值字段均以 str 返回（见后端 `SignRewardConfigResponse`）。
   */
  GetSignRewardConfig(): Promise<BusinessHandlerResult<SignRewardConfigResponse>> {
    return businessHandler<SignRewardConfigResponse>(
      adapt<SignRewardConfigResponse>(
        // 该只读接口后端不接收请求体（SDK 类型为 `body?: never`）
        管理员管理Service.getSignRewardConfigApiAdminRpaMembershipSignInRewardsGetPost() as unknown as Promise<{
          data?: unknown
          error?: unknown
        }>,
        '读取签到奖励配置失败'
      ),
      { showSuccessToast: false, errorMessage: '读取签到奖励配置失败' }
    )
  }

  /**
   * 整体覆盖保存签到奖励配置（保存后即时生效，无需重启）
   *
   * 约束与后端一致：数值一律 str 传输；`tiers` 必须按 `days` 升序且 days 不重复，
   * 否则后端返回 INVALID_PARAM（异常文案由后端给出）。
   */
  UpdateSignRewardConfig(
    payload: SignRewardConfigPayload
  ): Promise<BusinessHandlerResult<SignRewardConfigResponse>> {
    return businessHandler<SignRewardConfigResponse>(
      adapt<SignRewardConfigResponse>(
        管理员管理Service.updateSignRewardConfigApiAdminRpaMembershipSignInRewardsUpdatePost({
          body: payload
        }) as unknown as Promise<{ data?: unknown; error?: unknown }>,
        '保存签到奖励配置失败'
      ),
      { errorMessage: '保存签到奖励配置失败' }
    )
  }
}

export type {
  DurationAccountResponse,
  MonthCardInfo,
  RedeemResponse,
  SignInCalendarResponse,
  SignInResponse,
  SignMakeupResponse,
  SignOverviewResponse,
  SignRewardExchangeResponse,
  SignRewardConfigPayload,
  SignRewardConfigResponse,
  UsageStatItem,
  UsageStatsResponse,
  PaymentProductItem,
  PaymentProductsResponse,
  PaymentGrantedItem,
  PaymentConfirmResponse
}
export default new MembershipApi()
