# BiliLottery - B站抽奖数据管理平台

[![Vue](https://img.shields.io/badge/Vue-3.5-green.svg)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![Element Plus](https://img.shields.io/badge/Element_Plus-2.10-purple.svg)](https://element-plus.org/)
[![Vite](https://img.shields.io/badge/Vite-7.1-yellow.svg)](https://vitejs.dev/)
[![Pinia](https://img.shields.io/badge/Pinia-3.0-orange.svg)](https://pinia.vuejs.org/)

一个基于 Vue 3 的前端项目，模仿 B 站 UI 风格，用于管理和分析 B 站抽奖数据。支持响应式设计、深色/浅色主题切换和多种设备适配。

🌐 在线演示: [serena.dynv6.net](https://serena.dynv6.net)  
🔙 后端项目: [BilibiliExplosion](https://github.com/guanzhujiaran/BilibiliExplosion)  
📋 更新日志: [CHANGELOG.md](./CHANGELOG.md)

## 功能特点

- **用户认证系统**：支持登录/注册和账号管理(Casdoor集成)
- **浏览器管理**：管理浏览器指纹、插件配置和通知设置
- **抽奖数据统计**：可视化展示 B 站各类抽奖数据
- **数据爬取管理**：管理和监控 B 站抽奖数据爬取任务
- **中奖统计**：分析用户中奖情况和概率
- **用户中心**：个人信息设置和账号管理
- **反馈系统**：用户反馈和建议收集
- **山姆会员店信息**：山姆会员店信息查询功能
- **主题切换**：支持深色/浅色/自动三种主题模式
- **全局加载遮罩**：统一的路由切换加载效果
- **响应式设计**：适配从手机到大屏幕的各种设备
- **性能优化**：使用 Vite 构建，组件按需加载

## 技术栈

- **前端框架**: Vue 3.5 + TypeScript 5.9
- **UI 组件库**: Element Plus 2.13
- **状态管理**: Pinia 3.0
- **路由管理**: Vue Router 4.6
- **数据可视化**: ECharts 6.0 + vue-echarts 8.0
- **HTTP 客户端**: Axios 1.13
- **GraphQL**: @urql/vue 2.0 + graphql-codegen
- **Markdown 编辑器**: mavon-editor 3.0 + md-editor-v3 6.3 + vditor 3.11
- **样式方案**: Tailwind CSS 4.1 + DaisyUI 5.5 + Sass
- **构建工具**: Vite 7.3
- **代码工具**: ESLint 9.39 + Prettier 3.7 + TypeScript 5.9
- **其他工具**: Pinia持久化、Mitt事件总线、Microsoft Clarity分析

## 项目结构

```
BiliLottery/
├── src/
│   ├── api/            # API 请求封装
│   ├── assets/         # 静态资源
│   ├── components/     # Vue 组件
│   ├── gql/            # GraphQL 相关代码
│   ├── models/         # 数据模型定义
│   ├── router/         # 路由配置
│   ├── stores/         # Pinia 状态管理
│   ├── utils/          # 工具函数
│   └── views/          # 页面级组件
├── public/            # 公共资源
├── docs/              # 项目文档
├── vite.config.ts     # Vite 配置
├── package.json       # 项目依赖
└── CHANGELOG.md       # 更新日志
```

## 开发指南

### 推荐 IDE 设置

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (禁用
Vetur)。

### TypeScript 对 `.vue` 导入的支持

TypeScript 默认无法处理 `.vue` 导入的类型信息，因此我们使用 `vue-tsc` 替代 `tsc`
进行类型检查。在编辑器中，需要安装 [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) 来支持 `.vue`
文件的类型检查。

### 项目设置

```sh
# 安装依赖 (推荐使用 pnpm)
pnpm install

# 开发模式
npm run dev

# 生产构建
npm run build

# 快速构建 (不进行类型检查)
npm run build:no-check

# 代码检查
npm run lint

# 类型检查
npm run type-check

# GraphQL 代码生成
npm run graphqlgen

# 代码格式化
npm run format

# 预览生产构建
npm run preview
```

## 部署指南

### 构建生产版本

```sh
# 完整构建 (包含类型检查)
npm run build

# 快速构建 (跳过类型检查)
npm run build:no-check
```

### 部署方式

1. 将生成的 `dist` 目录部署到您的 web 服务器
2. 或使用静态网站托管服务 (如 Vercel, Netlify, GitHub Pages 等)
3. 或使用 Docker 容器化部署

### 环境变量

项目支持多环境配置:
- `.env.development` - 开发环境
- `.env.prod` - 生产环境

请在相应文件中配置您的 API 地址、认证信息等环境变量。

## 项目架构

### 核心模块

- **API 层**: 封装了 RESTful API 和 GraphQL 请求
- **状态管理**: 使用 Pinia 管理全局状态，支持持久化
- **路由系统**: 基于 Vue Router 4，支持嵌套路由和路由守卫
- **组件库**: 基于 Element Plus 和 Tailwind CSS 构建组件
- **工具函数**: 通用工具函数和事件总线

### 目录结构

```
src/
├── api/              # API 请求封装
├── assets/           # 静态资源 (CSS, SVG等)
├── components/       # Vue 组件 (130+)
├── config/           # 配置文件
├── gql/              # GraphQL 查询和 mutation
├── models/           # TypeScript 类型定义
├── router/           # 路由配置
├── stores/           # Pinia 状态管理
├── types/            # 类型定义
├── utils/            # 工具函数
└── views/            # 页面级组件 (10+)
```

## 贡献指南

欢迎提交 Pull Request 或 Issue。在提交代码前，请确保：

1. 代码通过 ESLint 检查 (`npm run lint`)
2. 通过 TypeScript 类型检查 (`npm run type-check`)
3. 代码格式化 (`npm run format`)
4. 更新相关文档和注释
5. 遵循现有的代码风格

## 常见问题

### 如何启动开发环境？

确保已安装 pnpm，然后运行:
```sh
pnpm install
npm run dev
```

### 如何添加新的路由？

1. 在 `src/router/index.ts` 中添加路由配置
2. 在 `src/models/router/index.ts` 的 `RouteName` 枚举中添加路由名称
3. 创建对应的 Vue 组件文件

### 如何使用 GraphQL？

项目已集成 `@urql/vue` 和 `graphql-codegen`:
1. 在 `src/gql/` 目录下定义 GraphQL 查询
2. 运行 `npm run graphqlgen` 生成类型
3. 在组件中使用生成的类型安全查询

## 许可证

MIT License

Copyright (c) [2025] ([guanzhujiaran/斯卡蒂天下第一/serena](https://space.bilibli.com/1905702375))

## 联系

如有任何问题，请联系项目维护者。
