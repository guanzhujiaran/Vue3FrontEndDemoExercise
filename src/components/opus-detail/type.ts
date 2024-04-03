/*
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-04-01 16:57:49
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-04-03 15:01:01
 * @FilePath: \BiliLottery\src\components\opus-detail\type.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
type TAccountInfo = {
  account_name: string
  uid: string
  uname: string
  Vip: string
  Level: number
  face?: string
}
type TAccountDetail = {
  account_name?: string
  lottery_setting?: Object
}
type TSession = {
  content: string
  msg_key: string
  msg_type: string
  receiver_id: string
  timestamp: number
  msg_tips: string
}
export type { TAccountInfo, TAccountDetail, TSession }
