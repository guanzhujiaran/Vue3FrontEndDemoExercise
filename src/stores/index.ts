/*
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-05-30 23:10:38
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-05-30 23:24:22
 * @FilePath: \Vue3FrontEndDemoExercise\src\stores\index.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { createPinia } from 'pinia'
import { createPersistedState } from 'pinia-plugin-persistedstate'

const pinia = createPinia()

pinia.use(
  createPersistedState({
    auto: true,
  })
)
export default pinia