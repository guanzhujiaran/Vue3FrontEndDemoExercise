import { chromium } from 'playwright'
const baseURL = 'http://localhost:5173'
const PAGES = ['official', 'reserve', 'charge', 'topic', 'others-dyn-list']
const probe = `(() => {
  const panel = document.querySelector('.bili-lottery-data-panel') || document.querySelector('.pagination-container-wrapper')
  return JSON.stringify({
    sk: document.querySelectorAll('.el-skeleton').length,
    empty: !!document.querySelector('.bili-empty'),
    mask: !!document.querySelector('.el-loading-mask'),
    h: panel ? Math.round(panel.getBoundingClientRect().height) : 0,
    txt: panel ? panel.innerText.replace(/\\s+/g,' ').trim().slice(0,26) : '(无面板)'
  })
})()`
const nav = (path: string) => `(() => {
  const el = document.querySelector('#__nuxt') || document.body.firstElementChild
  const app = el.__vue_app__ || el.__vueParentComponent?.appContext?.app
  if (!app) return 'no-app:' + el.tagName
  const r = app.config.globalProperties.$router
  if (!r) return 'no-router:' + Object.keys(app.config.globalProperties).join(',')
  r.push('${path}')
  return 'ok'
})()`
const run = async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'zh-CN' })
  const page = await ctx.newPage()
  const errs: string[] = []
  page.on('pageerror', e => errs.push(e.message))
  // 预热首页
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(5000)
  for (const p of PAGES) {
    const navRes = await page.evaluate(nav(`/app/lot-data/bili-data/${p}`))
    if (navRes !== 'ok') { console.log(`[${p}] 导航失败: ${navRes}`); continue }
    const frames: string[] = []
    for (let i = 0; i < 10; i++) {
      frames.push(await page.evaluate(probe))
      await page.waitForTimeout(90)
    }
    console.log(`\n[${p}] 客户端导航后连续 10 帧：`)
    frames.forEach((f, i) => console.log(`   ${(i * 90).toString().padStart(4)}ms ${f}`))
    await page.screenshot({ path: `test-results/sk2-${p}.png` })
  }
  console.log(errs.length ? `\npageerror:\n${errs.join('\n')}` : '\n无 pageerror')
  await browser.close()
}
run().catch(e => { console.error(e); process.exit(1) })
