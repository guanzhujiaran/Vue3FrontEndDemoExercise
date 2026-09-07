import { test, expect, type Page } from '@playwright/test'
import { loginAs } from './helpers/auth'
import { createPrivateWorkflow } from './helpers/api'
import { TEST_USER_MID } from './config'

/**
 * 工作流管理（普通用户）
 * 覆盖：前置创建一条私有工作流后，行内出现「申请发布」按钮并可发起公开审批。
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173'

test.describe('工作流管理 - 申请发布', () => {
  test('私有工作流行内可点「申请发布」提交公开审批', async ({ context }) => {
    const page = await loginAs(context, { mid: TEST_USER_MID, baseURL })

    // 前置造数：创建一条私有工作流（默认 private）
    const uniq = Date.now()
    const wfName = `E2E私有工作流-${uniq}`
    const created = await createPrivateWorkflow(TEST_USER_MID, wfName)

    await page.goto(`${baseURL}/app/rpa-browser/workflows`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: /工作流管理/ }).first()).toBeVisible()

    // 私有列表应包含刚创建的工作流，行内有「申请发布」按钮
    const card = page.locator('.workflow-card', { hasText: wfName }).first()
    await expect(card).toBeVisible({ timeout: 10_000 })
    const applyBtn = card.getByRole('button', { name: '申请发布' })
    await expect(applyBtn).toBeVisible()

    // 点击后弹出确认框，提交公开审批
    await applyBtn.click()
    // ElMessageBox.prompt 会弹出一个文本输入框
    const promptBox = page.locator('.el-message-box').first()
    await expect(promptBox).toBeVisible()
    await promptBox.getByPlaceholder(/申请说明/).fill(`E2E 公开 ${wfName}`)
    await promptBox.getByRole('button', { name: '提交申请' }).click()

    await expect(page.getByText(/审批申请已提交/).first()).toBeVisible()
  })
})
