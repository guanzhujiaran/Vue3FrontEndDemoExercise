import { fetchBiliJwt } from './auth'

/**
 * 真实后端接口辅助（走 be-gateway，绕 casdoor）。
 * 用于 E2E 前置造数：为测试用户创建私有资源，使资源行内的「申请发布」按钮可断言。
 */

export const GATEWAY_BASE = process.env.E2E_GATEWAY_BASE || 'http://localhost:9923'

async function authHeaders(mid: number) {
  const jwt = await fetchBiliJwt(mid)
  return { Cookie: `bili_jwt=${jwt}`, 'Content-Type': 'application/json' }
}

/**
 * 前置创建一条私有工作流（仅 name 必填，默认 is_public=false）。
 * 返回后端返回的 workflow 数据。
 */
export async function createPrivateWorkflow(
  mid: number,
  name: string
): Promise<{ id: number; workflow_id: string; name: string }> {
  const res = await fetch(`${GATEWAY_BASE}/api/v1/rpa/browser/control/workflows/create`, {
    method: 'POST',
    headers: await authHeaders(mid),
    body: JSON.stringify({ name }),
  })
  const json = (await res.json()) as { code: number; data?: { id: number; workflow_id: string; name: string } }
  if (!res.ok || json.code !== 0 || !json.data) {
    throw new Error(`createPrivateWorkflow failed: ${res.status} ${JSON.stringify(json)}`)
  }
  return json.data
}

/**
 * 对某资源设置点赞态（up=1 赞 / up=2 取消），供 interaction 测试前置重置与相对断言。
 * bizType：RPA_WORKFLOW=4；bizId 用资源的数字 id。
 */
export async function setLike(
  mid: number,
  bizType: number,
  bizId: string | number,
  up: 1 | 2
): Promise<{ isLike: boolean; likeCount: number }> {
  const res = await fetch(`${GATEWAY_BASE}/api/v1/community/thumb`, {
    method: 'POST',
    headers: await authHeaders(mid),
    body: JSON.stringify({ bizType, bizId: String(bizId), up }),
  })
  const json = (await res.json()) as {
    code: number
    data?: { isLike: boolean; likeCount: number }
  }
  if (!res.ok || json.code !== 0 || !json.data) {
    throw new Error(`setLike failed: ${res.status} ${JSON.stringify(json)}`)
  }
  return json.data
}

/**
 * 读取某用户视角下某资源的互动状态（用于断言真实落库值）。
 */
export async function fetchLikeStatus(
  mid: number,
  bizType: number,
  bizId: string | number
): Promise<{ isLike: boolean; likeCount: number }> {
  const res = await fetch(
    `${GATEWAY_BASE}/api/v1/community/interaction/status/${bizId}?bizType=${bizType}`,
    { headers: await authHeaders(mid) }
  )
  const json = (await res.json()) as {
    code: number
    data?: { isLike?: boolean; likeCount?: number }
  }
  if (!res.ok || json.code !== 0 || !json.data) {
    throw new Error(`fetchLikeStatus failed: ${res.status} ${JSON.stringify(json)}`)
  }
  return { isLike: json.data.isLike ?? false, likeCount: json.data.likeCount ?? 0 }
}
