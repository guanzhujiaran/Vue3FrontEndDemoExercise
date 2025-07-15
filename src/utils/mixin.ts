import aes from 'crypto-js/aes'
import * as echarts from 'echarts/core'

const utils = {
  // 将时间戳或日期字符串转换为格式化后的日期字符串
  formatTimeOrReturnOriginal(value: any) {
    if (value === null || value === undefined) {
      return '' // 处理空值
    }
    // 尝试将值作为时间戳解析
    const timestamp = Number(value)
    if (!isNaN(timestamp)) {
      // 判断是毫秒级还是秒级时间戳
      let date
      if (timestamp.toString().length === 13) {
        // 毫秒级
        date = new Date(timestamp)
      } else if (timestamp.toString().length === 10) {
        // 秒级
        date = new Date(timestamp * 1000) // 转换为毫秒
      } else {
        // 如果不是有效的秒级或毫秒级时间戳，则尝试直接解析为日期
        date = new Date(value)
      }

      // 检查日期是否有效且在合理的范围内
      if (this.isValidDate(date)) {
        return this.formatDate(date)
      }
    } else {
      // 如果输入值不是一个数字，则尝试直接解析为日期
      const dateFromString = new Date(value)
      if (this.isValidDate(dateFromString)) {
        return this.formatDate(dateFromString)
      }
    }

    // 如果既不能解析为时间戳也不能解析为日期字符串，或者日期不合理，则返回原值
    return value
  },
  // 格式化日期对象为字符串
  formatDate(date: Date) {
    const year = date.getFullYear()
    const month = ('0' + (date.getMonth() + 1)).slice(-2) // 月份从0开始
    const day = ('0' + date.getDate()).slice(-2)
    const hours = ('0' + date.getHours()).slice(-2)
    const minutes = ('0' + date.getMinutes()).slice(-2)
    const seconds = ('0' + date.getSeconds()).slice(-2)

    // 返回 YYYY-MM-DD HH:mm:ss 格式的日期
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  },
  isValidDate(date: Date) {
    // 获取当前时间
    const now = new Date()
    // 定义一个合理的最小日期（例如：Unix 时间纪元）

    const minDate = new Date(now.getFullYear(), 0, 1)
    // 定义一个合理的最大日期（例如：未来 100 年）
    const maxDate = new Date(now.getFullYear() + 20, 0, 1)

    // 检查日期是否在合理范围内，并且是一个有效日期
    return !isNaN(date.getTime()) && date >= minDate && date <= maxDate
  },
  /**
   * 转换秒级时间戳
   * @param t
   */
  formatDateTS(t: number) {
    const e = Math.floor(new Date().getTime() / 1e3) - t,
      n = new Date()
    if (
      (n.setHours(0),
      n.setMinutes(0),
      n.setSeconds(0),
      !(Math.floor(n.getTime() / 1e3) < t && e >= 0))
    ) {
      const i = new Date()
      i.setTime(1e3 * t)
      const r = i.getFullYear(),
        o = i.getMonth() + 1 >= 10 ? i.getMonth() + 1 : '0'.concat(String(i.getMonth() + 1)),
        a = i.getDate() >= 10 ? i.getDate() : '0'.concat(String(i.getDate())),
        s = i.getHours() >= 10 ? i.getHours() : '0'.concat(String(i.getHours())),
        l = i.getMinutes() >= 10 ? i.getMinutes() : '0'.concat(String(i.getMinutes()))
      return ''
        .concat(String(r), '-')
        .concat(<string>o, '-')
        .concat(<string>a, ' ')
        .concat(<string>s, ':')
        .concat(<string>l)
    }
    if (e < 60) {
      const c = 10 * Math.floor((e % 60) / 10)
      return c >= 10 ? ''.concat(String(c), '秒前') : '刚刚'
    }
    return 60 <= e && e < 3600
      ? ''.concat(String(Math.floor(e / 60)), '分钟前')
      : e >= 3600
        ? ''.concat(String(Math.floor(e / 3600)), '小时前')
        : void 0
  },
  homo_gen(n: number) {
    return 2 * n - 1 + ((n - 1) * (n - 2) * (n - 3) * (n - 4) * 114505) / 24
  },
  encrypt_pwd(t: string, sec: string) {
    return aes.encrypt(t + String(this.homo_gen(5)), sec).toString()
  },
  arabicToChinese(num: number) {
    const chineseDigits = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九']
    const units = ['', '十', '百', '千', '万', '十', '百', '千', '亿']

    if (num === 0) return chineseDigits[0]

    let result = ''
    let unitIndex = 0

    while (num > 0) {
      const digit = num % 10
      if (digit !== 0) {
        result = chineseDigits[digit] + units[unitIndex] + result
      } else {
        // 处理连续零的情况
        if (result[0] !== '零' && result[0] !== '') {
          result = '零' + result
        }
      }
      num = Math.floor(num / 10)
      unitIndex++
    }

    // 去掉多余的“零”和“一十”
    result = result.replace(/零+$/, '').replace(/^一十/, '十')
    return result
  }
}

export default utils
