import { 管理员管理Service } from '@/api/browser/hey-api'
import type {
  PermissionQuotaResp,
  PermissionQuotaUpdateReq
} from '@/api/browser/hey-api'
import type { RootObject } from '@/models/api/base_model'
import {
  businessHandler,
  type BusinessHandlerResult,
  type BusinessResponse
} from '@/utils/businessHandler'

/**
 * 等级指纹配额管理端接口（RPA-Browser `/api/admin/rpa/permission/*`，仅 root）。
 *
 * 业务封装层：`levels` / `update` / `reset` 三个接口的函数一律取自生成的
 * `services/管理员管理Service.gen.ts`，类型按需从生成产物 `import type`，
 * 不手改 `hey-api/` 下的生成文件。
 */

/**
 * 从 hey-api 的 error（HTTP 非 2xx / 连接失败）中尽力还原后端返回的业务对象，
 * 避免用前端兜底文案覆盖后端真实报错（与 `sys_config_api.ts` 同构）。
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

class PermissionApi {
  /**
   * 查询各等级的最大浏览器指纹数量（仅 root）。
   *
   * 返回磁盘配置的**全量**等级（`permissions` 只读展示用），并附带 `config_file`，
   * 便于运维确认实际读写位置。
   */
  Levels(): Promise<BusinessHandlerResult<PermissionQuotaResp>> {
    return businessHandler<PermissionQuotaResp>(
      adapt<PermissionQuotaResp>(
        管理员管理Service.readPermissionQuotasApiAdminRpaPermissionLevelsGet() as unknown as Promise<{
          data?: unknown
          error?: unknown
        }>,
        '获取等级配额失败'
      ),
      { showSuccessToast: false, errorMessage: '获取等级配额失败' }
    )
  }

  /**
   * 保存等级最大指纹数量（仅 root），后端按 `level_name` 合并进磁盘现值后写回
   * `permissions.json`，**立即生效、无需重启**。
   *
   * 只需提交被改动的等级；`permissions` / `level_value` 后端一律以现值为准。
   */
  Update(
    req: PermissionQuotaUpdateReq
  ): Promise<BusinessHandlerResult<PermissionQuotaResp>> {
    return businessHandler<PermissionQuotaResp>(
      adapt<PermissionQuotaResp>(
        管理员管理Service.updatePermissionQuotasApiAdminRpaPermissionUpdatePost({
          body: req
        }) as unknown as Promise<{ data?: unknown; error?: unknown }>,
        '保存等级配额失败'
      ),
      { successMessage: '等级指纹配额已保存（立即生效）', errorMessage: '保存等级配额失败' }
    )
  }

  /**
   * 各等级配额恢复为后端代码内默认值（仅 root），同样立即写回配置文件。
   */
  Reset(): Promise<BusinessHandlerResult<PermissionQuotaResp>> {
    return businessHandler<PermissionQuotaResp>(
      adapt<PermissionQuotaResp>(
        管理员管理Service.resetPermissionQuotasApiAdminRpaPermissionResetPost() as unknown as Promise<{
          data?: unknown
          error?: unknown
        }>,
        '恢复默认配额失败'
      ),
      { successMessage: '等级指纹配额已恢复默认（立即生效）', errorMessage: '恢复默认配额失败' }
    )
  }
}

export default new PermissionApi()
