import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

/**
 * 单元测试配置（nuxt generate 之外的独立 vitest 进程）。
 *
 * 只覆盖**纯逻辑层**（状态机 / 工具函数 / 载荷构造），不启 nuxt 环境：
 * 组件级交互验证仍走 e2e（playwright）。
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.spec.ts'],
    reporters: 'default',
  },
})