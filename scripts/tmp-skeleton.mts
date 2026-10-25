import { chromium, type Page } from 'playwright'
const baseURL = 'http://localhost:5173'
const PAGES = [
  '/app/lot-data/bili-data/official',
  '/app/lot-data/bili-data/reserve',
  '/app/lot-data/bili-data/charge',
  '/app/lot-data/bili-data/topic',
  '/app/lot-data/bili-data/others-dyn-list'
]
const probe = (page: Page) =>
  page.evaluate(`(() => {
    const panel = document.querySelector('.bili-lottery-data-panel') || document.querySelector('.pagination-container-wrapper')
    return JSON.stringify({
      skeleton: document.querySelectorAll('.el-skeleton').length,
      empty: !!document.querySelector('.bili-empty'),
      emptyText: document.querySelector('.bili-empty')?.innerText?.slice(0,20) ?? '',
      mask: !!document.querySelector('.el-loading-mask'),
      cards: document.querySelectorAll('.bili-lottery-card, [class*="lottery-card"]').length,
      text: panel ? panel.innerText.replace(/\\s+/g,' ').slice(0,50) : ''
    })
  })()`)
const run = async () => {
  const browser = await chromium.launch()
  for (const delay of [2500]) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'zh-CN' })
    // 人为给抽奖数据接口加延迟，模拟慢网，观察首屏加载态
    await ctx.route('**/api/v1/lottery_database/bili/Get*', async (r) => { await new Promise(s => setTimeout(s, delay)); await r.continue() })
    const page = await ctx.newPage()
    for (const p of PAGES) {
      await page.goto(baseURL, { waitUntil: 'domcontentloaded' })
      await page.evaluate((sel) => {
        const el = document.querySelector(sel) as HTMLElement | null
        el?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      }, '.bili-header .el-menu .el-menu-item')
      await page.goto(`${baseURL}${p}`, { waitUntil: 'commit' })
      await page.waitForTimeout(1200)
      const during = await probe(page)
      await page.waitForTimeout(4500)
      const after = await probe(page)
      console.log(`[${delay}ms] ${p}\n   加载中: ${during}\n   加载后: ${after}`)
      await page.screenshot({ path: `test-results/sk-${delay}-${p.split('/').pop()}.png` })
    }
    await ctx.close()
  }
  await browser.close()
}
run().catch(e => { console.error(e); process.exit(1) })
