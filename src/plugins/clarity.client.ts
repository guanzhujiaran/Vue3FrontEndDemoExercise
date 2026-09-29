/**
 * Microsoft Clarity 埋点（对应原 createApp.ts 里的 `Clarity.init`）。
 * 只跑客户端：统计脚本没有服务端意义，预渲染时执行还会污染产物 HTML。
 */
import Clarity from '@microsoft/clarity'

export default defineNuxtPlugin(() => {
  const id = import.meta.env.VITE_CLARITY_ID
  if (id) Clarity.init(id)
})
