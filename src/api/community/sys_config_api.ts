import { client } from '@/api/community/hey-api/client.gen'
import type { RootObject } from '@/models/api/base_model'
import type { SysConfigItem, SysConfigListResp, SysConfigUpdateReq } from '@/models/admin/sys_config_model'
import {
  businessHandler,
  type BusinessHandlerResult,
  type BusinessResponse
} from '@/utils/businessHandler'

/**
 * 运行时系统配置管理端接口（be-message `/api/v1/message/admin/sys-config`，2.64.0）。
 *
 * 这里手写封装而非使用 hey-api 生成的服务：新接口要等 be-message 启动后由 vite 的
 * hey-api 插件重新拉取 openapi.json 才会生成对应 Service，手写可立即生效、不阻塞开发；
 * 待 SDK 重新生成后可平滑替换为生成的 Service（URL 与类型完全一致）。
 */

/**
 * 从 hey-api 的 error（HTTP 非 2xx / 连接失败）中尽力还原后端返回的业务对象。
 * 与 `src/api/user/user_api.ts` 同构：后端按 RootObject 契约返回的内容原样透传，
 * 避免用前端兜底文案覆盖后端真实报错。
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

class SysConfigApi {
  /**
   * 运行时配置列表（root 专属）。
   *
   * 返回**全部已登记配置项**：尚未写入数据库的项以服务端默认值返回并带 `isDefault=true`，
   * 因此管理端页面首屏就能看到「当前生效的阈值」。
   */
  List(): Promise<BusinessHandlerResult<SysConfigListResp>> {
    return businessHandler<SysConfigListResp>(
      adapt<SysConfigListResp>(
        client.get({ url: '/api/v1/message/admin/sys-config' }),
        '获取运行时配置失败'
      ),
      { showSuccessToast: false, errorMessage: '获取运行时配置失败' }
    )
  }

  /**
   * 写入（整体替换）某个配置项，实现**不重启改参数**。
   *
   * 保存后本实例立即生效，其余实例最迟在缓存 TTL（默认 10s）内生效；
   * key 未登记或值结构非法时后端回 400，不会落库。
   */
  Update(req: SysConfigUpdateReq): Promise<BusinessHandlerResult<SysConfigItem>> {
    return businessHandler<SysConfigItem>(
      adapt<SysConfigItem>(
        client.post({
          url: '/api/v1/message/admin/sys-config/update',
          body: req,
          headers: { 'Content-Type': 'application/json' }
        }),
        '保存配置失败'
      ),
      { successMessage: '配置已保存（热更新，无需重启）', errorMessage: '保存配置失败' }
    )
  }
}

export default new SysConfigApi()
