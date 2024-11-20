const utils = {
  // 将时间戳或日期字符串转换为格式化后的日期字符串
  formatTimeOrReturnOriginal(value: any) {
    if (value === null || value === undefined) {
      return ''; // 处理空值
    }
    // 尝试将值作为时间戳解析
    const timestamp = Number(value);
    if (!isNaN(timestamp)) {
      // 判断是毫秒级还是秒级时间戳
      let date;
      if (timestamp.toString().length === 13) { // 毫秒级
        date = new Date(timestamp);
      } else if (timestamp.toString().length === 10) { // 秒级
        date = new Date(timestamp * 1000); // 转换为毫秒
      } else {
        // 如果不是有效的秒级或毫秒级时间戳，则尝试直接解析为日期
        date = new Date(value);
      }

      // 检查日期是否有效且在合理的范围内
      if (this.isValidDate(date)) {
        return this.formatDate(date);
      }
    } else {
      // 如果输入值不是一个数字，则尝试直接解析为日期
      const dateFromString = new Date(value);
      if (this.isValidDate(dateFromString)) {
        return this.formatDate(dateFromString);
      }
    }

    // 如果既不能解析为时间戳也不能解析为日期字符串，或者日期不合理，则返回原值
    return value;
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
  isValidDate(date:Date) {
    // 获取当前时间
    const now = new Date();
    // 定义一个合理的最小日期（例如：Unix 时间纪元）

    const minDate = new Date(now.getFullYear(), 0, 1); 
    // 定义一个合理的最大日期（例如：未来 100 年）
    const maxDate = new Date(now.getFullYear() + 20, 0, 1);

    // 检查日期是否在合理范围内，并且是一个有效日期
    return !isNaN(date.getTime()) && date >= minDate && date <= maxDate;
  }
}
export default utils
