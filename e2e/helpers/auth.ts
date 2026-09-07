import type { BrowserContext, Page } from '@playwright/test'
import { BE_MESSAGE_BASE, TEST_USER_MID } from '../config'

/** 从 Set-Cookie 头里解析指定 cookie 的值 */
function parseCookieValue(setCookie: string | undefined, name: string): string | null {
  if (!setCookie) return null
  const parts = setCookie.split(';')
  const hit = parts.find((p) => p.trim().startsWith(`${name}=`))
  if (!hit) return null
  return hit.trim().slice(name.length + 1)
}

/**
 * 绕过 casdoor，直连 be-message 的 refresh_token 换取真实 bili_jwt cookie。
 *
 * be-message 的 refresh_token 只信任 x-bili-mid 请求头（不校验 casdoor code/JWT），
 * 服务端据 mid 查库后无条件签发新 JWT 并 Set-Cookie: bili_jwt=...
 */
export async function fetchBiliJwt(mid: number): Promise<string> {
  const res = await fetch(`${BE_MESSAGE_BASE}/api/v1/user/refresh_token`, {
    method: 'POST',
    headers: {
      'x-bili-mid': String(mid),
      'x-bili-level': '5',
      'x-bili-role': 'level0',
    },
  })
  if (!res.ok) {
    throw new Error(`refresh_token failed: ${res.status} ${await res.text()}`)
  }
  const jwt = parseCookieValue(res.headers.get('set-cookie') || '', 'bili_jwt')
  if (!jwt) {
    throw new Error('refresh_token 未返回 bili_jwt cookie')
  }
  return jwt
}

/**
 * 让 context 以指定 mid 的登录态访问前端：
 *  - 先直连 be-message 换 bili_jwt
 *  - 注入到 context（domain = 前端 host）
 *  - 访问首页，触发 isLogin(/user/nav) 刷新登录态
 */
export async function loginAs(
  context: BrowserContext,
  options: { mid?: number; baseURL: string } = { baseURL: 'http://localhost:5173' }
): Promise<Page> {
  const mid = options.mid ?? TEST_USER_MID
  const jwt = await fetchBiliJwt(mid)

  const u = new URL(options.baseURL)
  await context.addCookies([
    {
      name: 'bili_jwt',
      value: jwt,
      domain: u.hostname,
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ])

  const page = await context.newPage()
  // 访问首页触发 user/nav，让前端完成登录态初始化
  await page.goto(options.baseURL, { waitUntil: 'domcontentloaded' })
  // 轮询等待前端登录 store(user-nav) 已记录目标 uid（多 context/慢网络下更稳）
  await page
    .waitForFunction(
      (expectedMid) => {
        const raw = localStorage.getItem('user-nav')
        if (!raw) return false
        try {
          const data = JSON.parse(raw)
          const uid = data?.user_nav?.uid ?? data?.uid ?? data?.mid
          return String(uid ?? '') === String(expectedMid)
        } catch {
          return false
        }
      },
      mid,
      { timeout: 8000 }
    )
    .catch(() => {
      // 登录态未就绪也不阻断，后续页面会自行拉取
    })
  await page.waitForTimeout(800)
  return page
}
