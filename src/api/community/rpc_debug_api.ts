import { RpcDebugService } from '@/api/community/hey-api/services/RpcDebugService.gen'
import type { RootObject } from '@/models/api/base_model'
import type {
  RpcDebugMethodItem,
  RpcInvokeReqModel,
  RpcInvokeResultItem
} from '@/models/admin/rpc_debug_model'
import {
  businessHandler,
  type BusinessHandlerResult,
  type BusinessResponse
} from '@/utils/businessHandler'

/**
 * 管理端「RPC 调试」接口（be-message `/api/v1/message/admin/rpc-debug`，计划书 §5.22）。
 *
 * 已切换到 hey-api 生成的 `RpcDebugService.gen.ts`（SDK 由 `npx @hey-api/openapi-ts` 生成）。
 */

/**
 * 从 hey-api 的 error（HTTP 非 2xx / 连接失败）中尽力还原后端返回的业务对象。
 * 与 `src/api/community/sys_config_api.ts` 的 `extractBackendError` 同构
 * （该处为私有实现，调试接口这边独立一份；后续可统一抽到 utils）。
 */
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

/** 把 hey-api 的 RequestResult 适配成 businessHandler 约定的 { code, data, msg } 契约。 */
function adapt<T>(
  result: Promise<{ data?: unknown; error?: unknown }>,
  failMsg: string
): Promise<BusinessResponse<T>> {
  return result.then((r) => {
    const root = r.data as unknown as RootObject<T> | null
    if (root && typeof root === 'object' && 'code' in root) {
      return { code: root.code, data: root.data, msg: root.msg }
    }
    const backendError = extractBackendError<T>(r.error)
    if (backendError) return backendError
    if (r.data != null) return { code: 0, msg: '', data: r.data as T }
    return { code: -1, msg: failMsg, data: undefined }
  })
}

class RpcDebugApi {
  /** 列出全部可测试的 RPC 方法（契约登记表，root 专用）。 */
  Methods(): Promise<BusinessHandlerResult<RpcDebugMethodItem[]>> {
    return businessHandler<RpcDebugMethodItem[]>(
      adapt<RpcDebugMethodItem[]>(
        RpcDebugService.listMethodsApiV1MessageAdminRpcDebugMethodsGet(),
        '获取可测试 RPC 方法失败'
      ),
      { showSuccessToast: false, errorMessage: '获取可测试 RPC 方法失败' }
    )
  }

  /**
   * 发起一次真实 RPC 往返。
   *
   * `showErrorToast: false`：外层 code!=0（400 参数不合法 / 504 超时 / 500 异常）的
   * 详情由结果面板原样展示，调试页不弹 toast 一闪而过。
   */
  Invoke(req: RpcInvokeReqModel): Promise<BusinessHandlerResult<RpcInvokeResultItem>> {
    return businessHandler<RpcInvokeResultItem>(
      adapt<RpcInvokeResultItem>(
        RpcDebugService.invokeRpcApiV1MessageAdminRpcDebugInvokePost({ body: req }),
        'RPC 调用失败'
      ),
      { showSuccessToast: false, showErrorToast: false, errorMessage: 'RPC 调用失败' }
    )
  }
}

export default new RpcDebugApi()
