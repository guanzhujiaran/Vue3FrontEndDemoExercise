/*
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-10-19 23:04:03
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-10-19 23:20:02
 * @FilePath: \Vue3FrontEndDemoExercise\src\models\inject\inject_type.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import type { InjectionKey } from 'vue'

export interface account_left_panel_reload {
  (): void
}
const account_left_panel_reload_key: InjectionKey<account_left_panel_reload> = Symbol(
  'account_left_panel_reload'
)

export { account_left_panel_reload_key }
