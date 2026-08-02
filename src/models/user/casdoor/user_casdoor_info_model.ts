/**
 * 本系统 JWT 换取到的 Casdoor 账户信息
 * 来自后端 GET /api/v1/user/casdoor/info。
 *
 * 注意：后端现已直接透传 Casdoor 原始用户对象（不再做字段裁剪/重排），
 * 因此这里复用 CasdoorUserModel 的宽松结构，前端应直接遍历原始字段展示。
 */
import type { CasdoorUserModel } from './casdoor_user_model'

export type UserCasdoorInfoModel = CasdoorUserModel
