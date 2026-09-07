import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/auth'
import { TEST_USER_MID } from './config'

/**
 * 动作管理（普通用户）
 * 覆盖：动作管理页可访问，顶部提供「审批中心」入口并可跳转。
 * （行内「申请发布」按钮与工作流为同一 handleApplyPublish 交互，已由 workflows.spec 覆盖）
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173'

test.describe('动作管理 - 审批入口', () => {
  test('动作管理页提供「审批中心」入口并可跳转', async ({ context }) => {
    const page = await loginAs(context, { mid: TEST_USER_MID, baseURL })

    await page.goto(`${baseURL}/app/rpa-browser/actions`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: /动作管理/ }).first()).toBeVisible()

    const centerBtn = page.getByRole('button', { name: '审批中心' }).first()
    await expect(centerBtn).toBeVisible()
    await centerBtn.click()

    await expect(page.getByRole('heading', { name: /审批中心/ }).first()).toBeVisible({
      timeout: 10_000,
    })
  })
})
