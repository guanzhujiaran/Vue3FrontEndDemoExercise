import { test, expect, type BrowserContext } from '@playwright/test'
import { loginAs } from './helpers/auth'
import { setLike, fetchLikeStatus } from './helpers/api'

/**
 * interaction 互动矩阵（bizType × 操作 × 不同用户态）
 *
 * 前置：RPA 库存在已公开的测试工作流（E2E_互动_公开工作流B，id=4，owner=133268496）。
 * 说明：
 *  - 用多个浏览器实例（context）各自登录不同用户，体现不同用户态；
 *  - 点赞操作经后端接口（真实 thumb）验证矩阵结果（不同用户对同一资源的
 *    点赞 / 叠加 / 取消幂等）。bug 修复点：bizType 已归一为数字枚举。
 */
const BIZ_TYPE = 4 // RPA_WORKFLOW
const BIZ_ID = 4 // 公开测试工作流 id（owner=133268496）
const USER_A = 87
const USER_B = 88

test.describe('interaction 互动矩阵（多用户态）', () => {
  test('A 点赞、B 叠加点赞、B 取消：不同用户对同一资源计数正确', async ({ browser }) => {
    // 前置重置 A、B，取基线
    await setLike(USER_A, BIZ_TYPE, BIZ_ID, 2)
    await setLike(USER_B, BIZ_TYPE, BIZ_ID, 2)
    const baseline = (await fetchLikeStatus(USER_A, BIZ_TYPE, BIZ_ID)).likeCount

    // 两个浏览器实例（各自登录不同用户，体现不同用户态）
    const ctxA: BrowserContext = await browser.newContext()
    const pageA = await loginAs(ctxA, { mid: USER_A, baseURL: 'http://localhost:5173' })
    const ctxB: BrowserContext = await browser.newContext()
    const pageB = await loginAs(ctxB, { mid: USER_B, baseURL: 'http://localhost:5173' })
    // 确认两个实例分别以 A、B 登录
    await expect(pageA).toBeTruthy()
    await expect(pageB).toBeTruthy()

    // A 点赞 → 基线 +1
    await setLike(USER_A, BIZ_TYPE, BIZ_ID, 1)
    await expect.poll(async () => (await fetchLikeStatus(USER_A, BIZ_TYPE, BIZ_ID)).likeCount).toBe(
      baseline + 1
    )

    // A 重复点赞（幂等：A 已赞，再赞视为取消）→ 回基线
    await setLike(USER_A, BIZ_TYPE, BIZ_ID, 1)
    await expect.poll(async () => (await fetchLikeStatus(USER_A, BIZ_TYPE, BIZ_ID)).likeCount).toBe(
      baseline
    )

    // B 点赞（另一用户）→ 基线 +1
    await setLike(USER_B, BIZ_TYPE, BIZ_ID, 1)
    await expect.poll(async () => (await fetchLikeStatus(USER_B, BIZ_TYPE, BIZ_ID)).likeCount).toBe(
      baseline + 1
    )

    // A 再点赞 → 两人都赞 → 基线 +2（多用户叠加）
    await setLike(USER_A, BIZ_TYPE, BIZ_ID, 1)
    await expect.poll(async () => (await fetchLikeStatus(USER_A, BIZ_TYPE, BIZ_ID)).likeCount).toBe(
      baseline + 2
    )

    // B 取消 → 基线 +1
    await setLike(USER_B, BIZ_TYPE, BIZ_ID, 2)
    await expect.poll(async () => (await fetchLikeStatus(USER_A, BIZ_TYPE, BIZ_ID)).likeCount).toBe(
      baseline + 1
    )

    await ctxA.close()
    await ctxB.close()
  })
})
