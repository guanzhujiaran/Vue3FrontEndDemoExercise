/**
 * RPA 动作 / 工作流「分享」相关工具。
 *
 * 后端 `custom-actions/export`、`workflows/export` 返回的 JSON 与导入接口请求体一致，
 * 前端只负责把它序列化、下载或复制给用户，不改动任何内容（唯一可读源头仍由后端保证）。
 *
 * - `stringifyShareJson`：统一缩进格式，保证「复制」与「下载」内容完全一致
 * - `downloadJsonFile`：浏览器端保存为 .json 文件
 * - `copyText`：写入剪贴板（不支持时 reject，由调用方提示）
 * - `shareFileName`：用资源名生成安全的文件名
 */

/** 文件名中不允许出现的字符（Windows / macOS 共性问题），统一替换为下划线 */
const ILLEGAL_FILENAME_CHARS = /[\\/:*?"<>|\r\n\t]+/g

/** 分享 JSON 的统一序列化格式（复制 / 下载共用，避免两处不一致） */
export function stringifyShareJson(payload: unknown): string {
  return JSON.stringify(payload, null, 2)
}

/**
 * 用资源名生成分享文件名。
 * @param name 动作 / 工作流名称
 * @param fallback 名称清洗后为空时的兜底名（如 `rpa-action`）
 */
export function shareFileName(name: string, fallback: string): string {
  const cleaned = (name || '').replace(ILLEGAL_FILENAME_CHARS, '_').replace(/^[.\s]+|[.\s]+$/g, '')
  return `${cleaned.slice(0, 60) || fallback}.json`
}

/** 触发浏览器下载一个 JSON 文件 */
export function downloadJsonFile(fileName: string, payload: unknown): void {
  const blob = new Blob([stringifyShareJson(payload)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()
  // 立即释放会让部分浏览器下载中断，延后释放
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** 复制文本到剪贴板；浏览器不支持或用户拒绝时 reject */
export async function copyText(text: string): Promise<void> {
  if (!navigator.clipboard?.writeText) {
    throw new Error('当前浏览器不支持剪贴板写入，请手动选中文本复制')
  }
  await navigator.clipboard.writeText(text)
}
