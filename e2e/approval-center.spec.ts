import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/auth'
import { TEST_USER_MID } from './config'

/**
 * 审批中心（普通用户）
 * 覆盖：普通用户可访问审批中心 → 提交一条「公开到社区」的审批 → 「我的申请」出现该申请。
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173'

test.describe('审批中心（普通用户）', () => {
  test('可访问审批中心并提交公开审批，我的申请能看到', async ({ context }) => {
    const page = await loginAs(context, { mid: TEST_USER_MID, baseURL })

    await page.goto(`${baseURL}/app/rpa-browser/approval-center`, {
      waitUntil: 'domcontentloaded',
    })
    await expect(page.getByRole('heading', { name: /审批中心/ }).first()).toBeVisible()

    const uniq = Date.now()
    const title = `E2E-申请公开-${uniq}`
    const resourceId = `e2e_action_${uniq}`
    const desc = `E2E 自动测试提交：${uniq}`

    // 默认 resource_type=action；填写其余字段后提交
    await page.getByPlaceholder(/资源 ID/).first().fill(resourceId)
    await page.getByPlaceholder('申请标题').fill(title)
    await page.getByPlaceholder(/请描述该资源的内容与公开理由/).fill(desc)
    await page.getByRole('button', { name: '提交审批' }).click()

    await expect(page.getByText(/审批申请已提交/).first()).toBeVisible()

    // 我的申请列表应出现刚提交的申请（后端按 submitter=当前 mid 过滤）
    await expect(
      page.locator('.approval-center__table').getByText(title).first()
    ).toBeVisible({ timeout: 10_000 })
  })
})