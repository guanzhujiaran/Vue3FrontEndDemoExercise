import { client } from '@/api/bili_lottery_data/hey-api/client.gen'
import type { LoginModel, UserNavModel } from '@/models/user/user_model'
import type { RootObject } from '@/models/api/base_model.ts'
import { businessHandler } from '@/utils/businessHandler'
import type {
  BusinessHandlerResult,
  BusinessResponse,
} from '@/utils/businessHandler'
import type {
  User_base_info_config_form,
  Set_user_role_form,
} from '@/models/user/user_setting/user_base_info_config_model.ts'
import type { UserCasdoorInfoModel } from '@/models/user/casdoor/user_casdoor_info_model.ts'

// 用户类型统一从 SDK 导入，单一数据源，消除重复定义
export type {
  PptrUserLevelInfo,
  PptrUserVipInfo,
  PptrUserRoleInfo,
  PptrUserSearchItem,
  PptrUserSearchResult,
} from '@/api/notify/hey-api'

/**
 * 统一把 hey-api 的 RequestResult（{ data, error }）适配成 businessHandler 约定的
 * { code, data, msg } 业务响应契约：
 *   - 网络/HTTP 失败（r.error 存在或 data 为空）：code=-1，交由 businessHandler 判失败并弹错；
 *   - 成功：把后端业务对象包进 data，code 置 0。
 *
 * 所有 user_api 方法统一经 businessHandler 包装，保证「全部接口用 businessHandler 处理请求」，
 * 后端返回业务失败码（如 casdoor/info 的 -3）时会自动弹错误提示，无需调用方各自 try/catch。
 */
function adapt<T>(
  result: Promise<{ data?: T | null; error?: unknown }>,
  failMsg: string
): Promise<BusinessResponse<T>> {
  return result.then((r) => {
    if (r.error || r.data == null) {
      return { code: -1, msg: failMsg, data: undefined }
    }
    // hey-api 在 responseStyle 默认（data）下，r.data 已是后端的 RootObject
    const root = r.data as unknown as RootObject<T>
    if (root && typeof root === 'object' && 'code' in root) {
      return { code: root.code, data: root.data, msg: root.msg }
    }
    return { code: 0, msg: 'ok', data: r.data as T }
  })
}

class UserApi {
  RefreshToken(): Promise<BusinessHandlerResult<LoginModel>> {
    return businessHandler<LoginModel>(
      adapt<LoginModel>(
        client.post({
          url: '/api/v1/user/refresh_token',
          headers: { 'Content-Type': 'application/json' },
        }),
        '刷新登录态失败'
      ),
      { showSuccessToast: false, errorMessage: '刷新登录态失败' }
    )
  }

  Login(user_name: String, pwd: String): Promise<BusinessHandlerResult<LoginModel>> {
    return businessHandler<LoginModel>(
      adapt<LoginModel>(
        client.post({
          url: '/api/v1/user/login',
          body: { user_name: user_name, pwd: pwd },
          headers: { 'Content-Type': 'application/json' },
        }),
        '登录失败'
      ),
      { successMessage: '登录成功', errorMessage: '登录失败' }
    )
  }

  // 使用 fields 返回风格：即使后端返回 401 等错误状态码，也能拿到
  // response（用于判断 HTTP 状态）和 error（响应体），避免 responseStyle: 'data'
  // 在错误响应时直接返回 undefined 导致上层无法区分网络故障与未登录
  Nav(): Promise<{
    data?: RootObject<UserNavModel>
    error?: any
    response?: { status: number; [key: string]: any }
  }> {
    return client.get({
      url: '/api/v1/user/nav',
      responseStyle: 'fields',
    }) as any
  }

  Reg(user_name: String, pwd: String): Promise<BusinessHandlerResult<String>> {
    return businessHandler<String>(
      adapt<String>(
        client.post({
          url: '/api/v1/user/reg',
          body: { user_name: user_name, pwd: pwd },
          headers: { 'Content-Type': 'application/json' },
        }),
        '注册失败'
      ),
      { successMessage: '注册成功', errorMessage: '注册失败' }
    )
  }

  UserInfo(): Promise<BusinessHandlerResult<User_base_info_config_form>> {
    return businessHandler<User_base_info_config_form>(
      adapt<User_base_info_config_form>(
        client.get({
          url: '/api/v1/user/user_info',
        }),
        '获取用户信息失败'
      ),
      { showSuccessToast: false, errorMessage: '获取用户信息失败' }
    )
  }

  UpdateUserInfo(
    user_base_info_config_form: Omit<User_base_info_config_form, 'userid'>,
  ): Promise<BusinessHandlerResult<string>> {
    return businessHandler<string>(
      adapt<string>(
        client.post({
          url: '/api/v1/user/user_info/update',
          body: user_base_info_config_form,
          headers: { 'Content-Type': 'application/json' },
        }),
        '保存失败'
      ),
      { successMessage: '用户信息已更新', errorMessage: '保存失败' }
    )
  }

  Logout(): Promise<BusinessHandlerResult<string>> {
    return businessHandler<string>(
      adapt<string>(
        client.post({
          url: '/api/v1/user/logout',
          headers: { 'Content-Type': 'application/json' },
        }),
        '退出登录失败'
      ),
      { successMessage: '退出登录成功', errorMessage: '退出登录失败' }
    )
  }

  // 通过本系统 JWT 换取 Casdoor 中的账户信息（余额、积分等）
  CasdoorInfo(): Promise<BusinessHandlerResult<UserCasdoorInfoModel>> {
    return businessHandler<UserCasdoorInfoModel>(
      adapt<UserCasdoorInfoModel>(
        client.get({
          url: '/api/v1/user/casdoor/info',
        }),
        '获取第三方账户信息失败'
      ),
      { showSuccessToast: false, errorMessage: '获取第三方账户信息失败' }
    )
  }

  // 设置用户角色（仅系统管理员 root 可调用，用于赋予/调整管理员权限等）
  SetUserRole(form: Set_user_role_form): Promise<BusinessHandlerResult<string>> {
    return businessHandler<string>(
      adapt<string>(
        client.post({
          url: '/api/v1/user/role/set',
          body: form,
          headers: { 'Content-Type': 'application/json' },
        }),
        '设置失败'
      ),
      { successMessage: '角色设置成功', errorMessage: '设置失败' }
    )
  }

  // 按用户名 / 昵称 / mid 查找用户（仅系统管理员 root 可调用），返回结构对齐 nav
  Search(keyword: string, limit = 10): Promise<BusinessHandlerResult<PptrUserSearchItem[]>> {
    return businessHandler<PptrUserSearchItem[]>(
      adapt<PptrUserSearchItem[]>(
        client.get({
          url: '/api/v1/user/search',
          query: { keyword, limit },
        }),
        '用户搜索失败'
      ),
      { showSuccessToast: false, errorMessage: '用户搜索失败' }
    )
  }

  // 管理端用户搜索：经 pptr 网关（:23333）的 /api/v1/message 反向代理转发到 be-message-service。
  // 仅系统管理员 root 可调用，返回 StandardResponse（code=0 表示成功），支持 offset 分页。
  // 注意：不能直接连 be-message(:18739)，必须经 pptr 网关转发（由网关注入 x-bili-* 鉴权头）。
  SearchAdmin(
    keyword: string,
    offset = 0,
    limit = 20,
  ): Promise<BusinessHandlerResult<PptrUserSearchResult>> {
    return businessHandler<PptrUserSearchResult>(
      adapt<PptrUserSearchResult>(
        client.get({
          url: '/api/v1/message/admin/user/search',
          query: { keyword, offset, limit },
        }),
        '管理端用户搜索失败'
      ),
      { showSuccessToast: false, errorMessage: '管理端用户搜索失败' }
    )
  }
}

const userApi = new UserApi()

export default userApi