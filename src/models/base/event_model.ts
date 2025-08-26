/*
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-06-12 13:42:32
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-06-12 13:42:49
 * @FilePath: \Vue3FrontEndDemoExercise\src\models\base\event_model.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
// export type GLoablEvents = {
//   toast: any
// }

export type GlobalEvents = {
  /**
   * 发送toast事件
   */
  toast: { t: string; e?: 'info' | 'success' | 'error' | 'loading' }
  /**
   * 未登录事件
   */
  needLogin: void
  /**
   * 登录成功事件
   */
  loading: { isLoading: boolean; loadingText?: string }
}
