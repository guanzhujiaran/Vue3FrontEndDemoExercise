import { useTimeAgo } from '@vueuse/core'

// 价格相关处理函数
export const handlePriceTitleTextColor = (
  price: number
): 'primary' | 'success' | 'warning' | 'danger' | 'info' => {
  return price > 0 ? 'success' : price < 0 ? 'danger' : 'info'
}

export const handlePriceValueTextColor = (price: number) => {
  return price > 0
    ? 'var(--el-color-success)'
    : price < 0
      ? 'var(--el-color-danger)'
      : 'var(--el-color-info)'
}

// 价格位置相关函数
export const getPricePositionText = (percentile: number): string => {
  if (percentile <= 25) return '极低价'
  if (percentile <= 50) return '低价位'
  if (percentile <= 75) return '中价位'
  return '高价位'
}

export const getPricePositionColor = (percentile: number): string => {
  if (percentile <= 25) return 'var(--el-color-success)'
  if (percentile <= 50) return 'var(--el-color-success-light-3)'
  if (percentile <= 75) return 'var(--el-color-warning)'
  return 'var(--el-color-danger)'
}

export const getPricePositionType = (
  percentile: number
): 'primary' | 'success' | 'warning' | 'danger' | 'info' => {
  if (percentile <= 25) return 'success'
  if (percentile <= 50) return 'info'
  if (percentile <= 75) return 'warning'
  return 'danger'
}

// 标签类型处理
export const handleSpuInfoTagType = (tagMark: string | undefined) => {
  switch (tagMark) {
    case 'GLOBAL_SHOPPING':
    case 'IMPORTED':
    case 'PURCHASE_LIMIT':
    case 'FAST_DELIVERY':
    case 'SPU_GOODS_COMMENT_COUNT':
    case 'SPU_GOODS_COMMENT_WORD_COUNT':
    case 'SPU_MONTHLY_SALES_COUNT':
    case 'SPU_YEARS_REBUY_COUNT':
    case 'STOCK_NUM':
    case 'SPU_SHARE_QUANTITY_COUNT':
    case 'ONLY_STORE_SALE':
    case 'SPU_MEMBER_RECOMMEND_COUNT':
    case 'SELF_TAKE':
    case 'PURCHASE_MIN':
      return 'info'
    case 'NEW':
    case 'MG':
      return 'primary'
    case 'STATIC':
      return 'success'
    case 'CUSTOM':
    case 'YELLOW_PRICE':
    case 'MJJ':
    case 'MJZ':
      return 'warning'
    default:
      return 'danger'
  }
}

// 格式化日期
export const formatDate = (timestamp: any) => {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// 格式化日期和时间
export const formatDateTime = (timestamp: any) => {
  const date = new Date(timestamp)
  return date.toLocaleString()
}

// 使用VueUse的useTimeAgo获取相对时间
export const getTimeAgo = (timestamp: any) => {
  if (!timestamp) return '未知时间'
  return useTimeAgo(new Date(timestamp), {
    showSecond: false,
    messages: {
      justNow: '刚刚',
      past: (n: string) => (n.match(/\d/) ? `${n}前` : n),
      future: (n: string) => (n.match(/\d/) ? `${n}后` : n),
      month: (n: number, past: boolean) => (n === 1 ? (past ? '上个月' : '下个月') : `${n} 个月`),
      year: (n: number, past: boolean) => (n === 1 ? (past ? '去年' : '明年') : `${n} 年`),
      day: (n: number, past: boolean) => (n === 1 ? (past ? '昨天' : '明天') : `${n} 天`),
      week: (n: number, past: boolean) => (n === 1 ? (past ? '上周' : '下周') : `${n} 周`),
      hour: (n: number) => `${n} 小时`,
      minute: (n: number) => `${n} 分钟`,
      second: (n: number) => `${n} 秒`
    } as any
  }).value
}

// 生成随机颜色但保持一定的美观度
export const generateChartColor = () => {
  // 使用固定的颜色方案而不是完全随机
  const colors = [
    'rgba(55, 162, 255, 0.6)',
    'rgba(255, 120, 120, 0.6)',
    'rgba(50, 205, 50, 0.6)',
    'rgba(255, 192, 0, 0.6)'
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}