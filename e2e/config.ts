/**
 * E2E 环境配置（真实后端联调用）
 *
 * - be-message 本地直连端口（用于以 x-bili-mid 换取 bili_jwt cookie，绕过 casdoor）
 * - 测试普通用户：uid=23「测试账号」、role=level0（在 pptr PPTR_Bili_Lot 库 TUserInfo 存在）
 * - 前端 baseURL 由 playwright.config baseURL 提供（默认 http://localhost:5173）
 */

export const BE_MESSAGE_BASE =
  process.env.E2E_BE_MESSAGE_BASE || 'http://localhost:18739'

/** 测试普通用户 mid（role=level0，非 root；需 TUserInfo/TUserDetail/TUserLevel/TUserVip 四表齐全，否则 user/nav 500） */
export const TEST_USER_MID = Number(process.env.E2E_TEST_MID || 87)

/** 管理员审核页所需 root mid（仅用于管理员相关用例；本套用例以普通用户为主） */
export const TEST_ROOT_MID = Number(process.env.E2E_ROOT_MID || 11)
