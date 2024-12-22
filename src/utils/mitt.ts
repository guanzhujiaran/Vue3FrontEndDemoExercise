/*
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-06-12 14:40:12
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-06-12 14:40:25
 * @FilePath: \Vue3FrontEndDemoExercise\src\utils\mitt.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import type { GlobalEvents } from '@/models/base/event_model'
import mitt from 'mitt'
const emitter = mitt<GlobalEvents>()

export default emitter
