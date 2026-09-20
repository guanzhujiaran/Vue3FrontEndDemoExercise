/**
 * 站内 SPA 链接的统一点击策略。
 *
 * 背景：搜索引擎爬虫只认 `<a href>`，`router.push()` 驱动的 `div` / `li` 点击对爬虫不可见，
 * 因此头部菜单、首页功能导航等站内入口都需要渲染成带真实 href 的链接；
 * 但带上 href 后浏览器默认会整页刷新，所以普通左键点击要拦掉默认行为并交给 vue-router，
 * 而修饰键（Ctrl / Cmd / Shift / Alt）与中键点击则保留浏览器「新标签页打开」的原生行为。
 */

/**
 * 本次点击是否应由 SPA 路由接管。
 * 返回 false 表示交还浏览器原生处理（新标签页打开）。
 */
export function shouldSpaHandleClick(e: MouseEvent): boolean {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false
  // button：0 为左键；部分合成事件不带 button 字段，按左键处理
  return e.button === undefined || e.button === 0
}

/**
 * 阻止浏览器整页跳转，改由 `navigate` 走 SPA 路由。
 *
 * 用法：`<a :href="href" @click="onSpaLinkClick($event, () => router.push(path))">`
 */
export function onSpaLinkClick(e: MouseEvent, navigate: () => void): void {
  if (!shouldSpaHandleClick(e)) return
  e.preventDefault()
  navigate()
}

/**
 * 只阻止浏览器整页跳转，不在这里发起导航。
 *
 * 用于 Element Plus 的 `el-menu-item` / `el-sub-menu`：链接位于菜单项内部，
 * 点击后事件继续冒泡到 `li`，由菜单自身已存在的点击逻辑统一处理跳转与子菜单展开，
 * 这样既保留真实 href 又不会产生重复导航。
 */
export function preventLinkDefault(e: MouseEvent): void {
  if (!shouldSpaHandleClick(e)) return
  e.preventDefault()
}
