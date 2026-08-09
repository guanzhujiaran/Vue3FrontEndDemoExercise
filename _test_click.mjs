import { chromium } from 'playwright'

const browser = await chromium.launch()
const page = await browser.newPage()
const logs = []
page.on('console', (m) => logs.push(`[console.${m.type()}] ${m.text()}`))
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))

await page.goto('http://localhost:5174/', { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)

const menuItems = await page.locator('.el-menu--horizontal .el-menu-item').allInnerTexts().catch(() => [])
console.log('HEADER MENU ITEMS:', JSON.stringify(menuItems))

const adminItem = page.locator('.el-menu--horizontal .el-menu-item', { hasText: '管理后台' })
const count = await adminItem.count()
console.log('管理后台 header item count:', count)

if (count > 0) {
  console.log('clicking 管理后台 ...')
  await adminItem.first().click().catch((e) => console.log('CLICK ERROR:', e.message))
  await page.waitForTimeout(1500)
  console.log('URL after click:', page.url())
  const sidebarText = await page.locator('.admin-layout__nav').first().allInnerTexts().catch(() => [])
  console.log('ADMIN SIDEBAR TEXT:', JSON.stringify(sidebarText))
  const rpaItem = page.locator('.admin-layout__nav-item', { hasText: 'RPA 管理后台' })
  const rpaCount = await rpaItem.count()
  console.log('RPA 管理后台 sidebar item count:', rpaCount)
  if (rpaCount > 0) {
    console.log('clicking RPA 管理后台 ...')
    await rpaItem.first().click().catch((e) => console.log('RPA CLICK ERROR:', e.message))
    await page.waitForTimeout(1500)
    console.log('URL after RPA click:', page.url())
  }
} else {
  console.log('管理后台 header item NOT FOUND')
}

console.log('--- PAGE LOGS ---')
console.log(logs.join('\n'))
await browser.close()
