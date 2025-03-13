/*
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-05-29 23:52:55
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-11-11 23:27:04
 * @FilePath: \Vue3FrontEndDemoExercise\vite.config.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import path from 'path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import VueDevTools from 'vite-plugin-vue-devtools'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), vueJsx(), VueDevTools()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@api': path.resolve(__dirname, 'src/api'),
      '@views': path.resolve(__dirname, 'src/views'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@comp': path.resolve(__dirname, 'src/components'),
      '@assets': path.resolve(__dirname, 'src/assets')
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:9923',
        changeOrigin: true // 修改源
      }
    },
    host: '0.0.0.0'
  }
  // esbuild: {
  //   drop: ['console', 'debugger']
  // }
})
