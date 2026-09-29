// 导出一个函数，用于判断当前设备是否为移动设备
/**
 * 判断当前设备是否为移动设备
 * * @returns {2|1} 如果是移动设备，则返回2，否则返回1
 */
export function isMobileDevice() {
  // SSR / 预渲染环境没有 navigator：按「桌面端」处理。
  // 该函数用于点击跳转与 URL 生成，服务端不产生交互，客户端执行时会拿到真实结果。
  // 注意：不能在模块顶层调用后长期缓存（BiliJump.ts 就是这么做的），否则服务端会直接崩溃。
  if (typeof navigator === 'undefined') return 1
  // 获取当前浏览器的用户代理信息，并将其转换为小写
  const t = navigator.userAgent.toLowerCase(),
    // 判断是否为iPad设备
    i = !!t.match(/ipad/i),
    // 判断是否为iPhone设备
    r = !!t.match(/iphone os/i),
    // 判断是否为MIDP设备
    n = !!t.match(/midp/i),
    // 判断是否为rv:1.2.3.4设备
    o = !!t.match(/rv:1.2.3.4/i),
    // 判断是否为UCWEB设备
    a = !!t.match(/ucweb/i),
    // 判断是否为Android设备
    s = !!t.match(/android/i),
    // 判断是否为Windows CE设备
    u = !!t.match(/windows ce/i),
    // 判断是否为Windows Mobile设备
    l = !!t.match(/windows mobile/i)
  // 如果是以上任意一种设备，则返回2，否则返回1
  return i || r || n || o || a || s || u || l ? 2 : 1
}
