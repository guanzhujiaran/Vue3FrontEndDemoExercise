/**
 * 写剪贴板（带回退）。
 *
 * `navigator.clipboard` 只在 HTTPS / localhost 且页面有焦点时可用，
 * 本机以 IP 或 http 方式访问时会直接抛错，因此保留 `textarea + execCommand`
 * 的回退路径，保证「复制本轮」在任何访问方式下都能用。
 *
 * @returns 是否复制成功
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // 继续走回退
  }

  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    // 避免复制时页面滚动 / 元素闪现
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.top = '-9999px'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(textarea)
    return ok
  } catch {
    return false
  }
}
