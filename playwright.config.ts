import { defineConfig } from '@playwright/test'

/**
 * Playwright E2E 配置
 *
 * 测试目标：RPA 提交审批下沉（普通用户「审批中心」/ 资源行「申请发布」/ 我的申请）。
 *
 * 运行前提（本地服务需可用）：
 *  - be-message  本地 18739（用于以 x-bili-mid 直连换取 bili_jwt cookie）
 *  - be-gateway  9923
 *  - RPA-Browser 28000
 *  - 前端 vite dev server（本配置通过 webServer 自动拉起，也可手动起）
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: {
    command: 'npm run dev -- --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
