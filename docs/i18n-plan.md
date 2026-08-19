# 前端 i18n 国际化改造计划书

> 目标：将前端所有硬编码中文文案提取为 i18n key，支持简体中文(zh-CN, 默认)、English(en)、
> 繁體中文(zh-TW)、日本語(ja)、한국어(ko) 五种语言，并在顶部 Header 提供语言切换器，
> 选择持久化到 localStorage，默认跟随浏览器语言。

---

## 一、技术选型与基础设施

| 项 | 方案 |
| --- | --- |
| i18n 库 | `vue-i18n@^10`（Vue 3 兼容） |
| locale 目录 | `src/i18n/locales/{zh-CN,en,zh-TW,ja,ko}.ts`，统一导出 `messages` 对象 |
| 入口装配 | `src/i18n/index.ts` 创建 `i18n` 实例并 `app.use(i18n)`，`main.ts` 注册 |
| 语言状态 | 新增 `stores/locale.ts`（Pinia 持久化），管理当前语言、Element Plus locale、切换逻辑 |
| Element Plus 多语言 | 同步切换 `el-config-provider` 的 `:locale`（zh-cn/en/zh-tw/ja/ko 由 element-plus/es/locale 提供） |
| 语言切换器 | 在 `HeaderBarView.vue` 右侧 `AvatarDropdown` 旁新增 `el-dropdown` 语言选择，存 localStorage，默认 `navigator.language` |
| 默认值兜底 | `missingWarn: false`，未翻译 key 回退中文，保证不空白 |

---

## 二、Key 命名规范（必须遵守）

1. **命名空间分层**：按业务模块/组件路径划分，避免冲突。
   - 例：`home.hero.title`、`message.notify.empty`、`rpa.browser.start`、`common.confirm`、`admin.overview.title`
2. **文件名映射**：`src/views/message/NotifyListView.vue` → 前缀 `message.notifyList.*`；
   `src/components/CommonCompo/AvatarDropdown.vue` → 前缀 `common.avatar.*`
3. **通用文案集中**：`common.*`（确认/取消/加载中/保存/删除/搜索等）复用，禁止重复定义。
4. **带参数**：使用 vue-i18n 插值 `{name}`，如 `common.welcome = '欢迎 {name}'` → `t('common.welcome', { name })`。
5. **复数/列表**：优先用 `v-for` + 数组，避免拼接多语言句子。

## 三、改造范围（全量一次性）

- 遍历 `src/**/*.vue` 与 `src/**/*.ts` 中所有硬编码中文字符串：
  - 模板内纯文本节点（如 `<span>登录</span>`）
  - 属性文案（`label="用户名"`、`placeholder="请输入"`、`el-button` 文本、`title`/`content` 等）
  - `ElMessage`/`ElMessageBox` 文案
  - `.ts` 中返回/拼接的中文提示字符串（如 `throw new Error('xxx')`、`return '加载中'`）
- **不改**：代码标识符、变量名、API 路径、class 名、注释（注释可不处理，但建议同步）。
- **不改**：动态数据（后端返回的文案、用户名等）。

## 四、分批执行计划

按目录分批，每批完成：提取文案 → 写 5 语言 → 替换 `t()` → 自检无中文残留。

- [ ] Phase 1：基础设施（i18n 库、locales 骨架、stores/locale、main.ts 装配、Header 切换器、Element Plus locale 联动）
- [ ] Phase 2：`src/views/*` 根视图（HomeView、UserCenterView、NetworkErrorView、ChangelogView 等）
- [ ] Phase 3：`src/views/message/*` 消息系统全量
- [ ] Phase 4：`src/views/rpa-browser/*` RPA 浏览器全量（最大批）
- [ ] Phase 5：`src/views/moment/*`、`src/views/admin/*`、`src/views/lottery/*` 等其余视图
- [ ] Phase 6：`src/components/**` 全部组件（按子目录分批）
- [ ] Phase 7：`src/utils/**`、`src/stores/**`、`src/composables/**` 中中文文案
- [ ] Phase 8：全局校验（`grep` 中文残留、`pnpm type-check`、`pnpm lint`），修复遗漏

## 五、验收口径

- 切换语言后，全站 UI 文案（含 Element Plus 组件）随之变化。
- 5 种语言 locale 文件结构一致（key 集合相同），缺失 key 回退中文不报错。
- 刷新页面后语言选择保持（localStorage）。
- `pnpm type-check` 与 `pnpm lint` 零报错。
- 模板内硬编码中文（`>...<` 文本节点、属性文案）基本清零（仅保留动态的、后端数据类文案）。
