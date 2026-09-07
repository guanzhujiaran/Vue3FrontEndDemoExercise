import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/auth'
import { TEST_ROOT_MID } from './config'

/**
 * 管理端 - 审批审核
 * 覆盖：root 身份可进入管理后台的「审批审核」页（提交入口已下沉普通用户后，
 * 管理端专注审核列表）。
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173'

test.describe('管理端 - 审批审核', () => {
  test('root 可访问管理员审批审核页', async ({ context }) => {
    const page = await loginAs(context, { mid: TEST_ROOT_MID, baseURL })

    await page.goto(`${baseURL}/app/admin/rpa/approval`, { waitUntil: 'domcontentloaded' })
    // 管理后台标题（ApprovalAdmin 已瘦身为纯审核视图）
    await expect(page.getByRole('heading', { name: /审批审核/ }).first()).toBeVisible({
      timeout: 15_000,
    })

    // 列表应能渲染（root 看全部审批）
    await expect(page.locator('.rpa-admin-table').first()).toBeVisible()
  })
})
