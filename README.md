# BiliLottery - B站抽奖数据管理平台

[![Vue](https://img.shields.io/badge/Vue-3.x-green.svg)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.x-blue.svg)](https://www.typescriptlang.org/)
[![Element Plus](https://img.shields.io/badge/Element_Plus-2.x-purple.svg)](https://element-plus.org/)

一个基于 Vue 3 的前端项目,模仿 B 站 UI 风格，用于管理和分析 B 站抽奖数据。

🌐 在线演示: [serena.dynv6.net](https://serena.dynv6.net)  
🔙 后端项目: [BilibiliExplosion](https://github.com/guanzhujiaran/BilibiliExplosion)

## 功能特点

- **用户认证系统**：支持登录\注册和账号管理
- **抽奖数据统计**：可视化展示 B 站各类抽奖数据
- **数据爬取管理**：管理和监控 B 站抽奖数据爬取任务
- **中奖统计**：分析用户中奖情况和概率
- **用户中心**：个人信息设置和账号管理
- **反馈系统**：用户反馈和建议收集
- **山姆会员店信息**：相关会员店信息查询

## 技术栈

- **前端框架**: Vue 3 + TypeScript
- **UI 组件库**: Element Plus
- **状态管理**: Pinia
- **路由管理**: Vue Router
- **数据可视化**: ECharts + vue-echarts
- **HTTP 客户端**: Axios
- **GraphQL**: @urql/vue
- **Markdown 编辑器**: mavon-editor + md-editor-v3
- **构建工具**: Vite

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
├── vite.config.ts     # Vite 配置
└── package.json        # 项目依赖
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
# 安装依赖
npm install

# 开发模式
npm run dev

# 生产构建
npm run build

# 代码检查
npm run lint

# 类型检查
npm run type-check
```

## 部署指南

1. 构建生产版本：
   ```sh
   npm run build
   ```
2. 将生成的 `dist` 目录部署到您的 web 服务器。

## 贡献指南

欢迎提交 Pull Request 或 Issue。在提交代码前，请确保：

1. 代码通过 ESLint 检查
2. 添加适当的单元测试
3. 更新相关文档

## 许可证

MIT License

Copyright (c) [2025] ([guanzhujiaran/斯卡蒂天下第一/serena](https://space.bilibli.com/1905702375))

## 联系

如有任何问题，请联系项目维护者。
