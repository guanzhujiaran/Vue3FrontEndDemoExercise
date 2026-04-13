# 浏览器控制台组件说明

## 概述

浏览器控制台采用卡片式设计,提供三个主要功能模块:
- **可视化操作**: 直观的浏览器控制和快捷操作
- **自定义操作**: 管理和执行用户自定义的RPA操作
- **Debug调试**: 参数预览、验证和单步执行调试

## 组件结构

```
BrowserDebugPanel/
├── BrowserDebugPanel.vue      # 主面板(标签页容器)
├── VisualControlPanel.vue     # 可视化操作面板
├── CustomActionPanel.vue      # 自定义操作管理
└── DebugPanel.vue             # Debug调试面板
```

## 功能说明

### 1. 可视化操作面板 (VisualControlPanel)

#### 浏览器状态卡片
- 显示浏览器运行状态、会话ID、人工操作模式
- 支持启动浏览器和强制释放操作
- 实时刷新状态信息

#### 快捷操作卡片
- **页面导航**: 快速跳转到指定URL
- **页面截图**: 捕获当前页面并预览/下载
- **执行JS**: 运行自定义JavaScript代码(支持安全模式)
- **插件管理**: 暂停/恢复浏览器插件

#### 系统操作列表
- 以卡片形式展示所有系统预注册的操作
- 显示操作类型、名称和描述
- 一键执行操作

### 2. 自定义操作管理 (CustomActionPanel)

#### 操作列表
- 卡片式展示所有自定义操作
- 显示操作类型、复合状态、创建时间
- 支持下拉菜单操作:查看、编辑、执行、删除

#### 创建/编辑操作
- **简单模式**: 单一操作步骤,选择系统操作并配置参数
- **复合模式**: 多步骤操作,可添加多个步骤串联执行
- 支持JSON格式的参数配置
- 表单验证和错误提示

#### 操作详情
- 查看操作的完整配置信息
- 显示参数定义和执行步骤
- JSON格式的数据展示

#### 执行结果
- 显示操作执行的成功/失败状态
- 展示返回数据和错误信息
- 记录执行时间

### 3. Debug调试面板 (DebugPanel)

#### 左侧: 操作配置
- **操作选择**: 切换系统操作和自定义操作
- **参数配置**:
  - 动态表单: 根据操作元数据自动生成表单
  - JSON编辑器: 手动输入JSON格式参数
- **调试按钮**:
  - 预览参数: 查看参数替换效果
  - 验证参数: 检查参数有效性
  - 单步执行: 执行复合操作的第一步
  - 执行操作: 完整执行操作

#### 右侧: 调试结果
- **参数预览**: 显示原始参数和替换后参数的对比
- **验证结果**: 列出缺失参数、无效参数和错误信息
- **执行结果**: 展示执行状态、返回数据和错误

#### 执行日志
- 记录所有调试操作的历史
- 显示操作类型、时间和耗时
- 支持清空和导出日志(JSON格式)

## 使用示例

### 基本使用

```vue
<template>
  <BrowserDebugPanel :browser-id="browserId" />
</template>

<script setup>
import { ref } from 'vue'
import BrowserDebugPanel from '@/components/browser/BrowserDebugPanel.vue'

const browserId = ref('your-browser-id')
</script>
```

### 在对话框中使用

```vue
<el-dialog v-model="visible" title="浏览器控制台" width="90%">
  <BrowserDebugPanel :browser-id="browserId" />
</el-dialog>
```

## API依赖

组件依赖以下API接口:

### 浏览器控制
- `getBrowserSessionStatus` - 获取会话状态
- `createBrowserSession` - 创建会话
- `forceReleaseBrowser` - 强制释放
- `navigateToUrl` - 页面导航
- `getScreenshot` - 获取截图
- `executeJavaScript` / `safeExecuteJavaScript` - 执行JS
- `pausePlugins` - 暂停插件

### 操作管理
- `listRegisteredActions` - 获取系统操作列表
- `listCustomActions` - 获取自定义操作列表
- `getCustomAction` - 获取操作详情
- `createCustomAction` - 创建操作
- `updateCustomAction` - 更新操作
- `deleteCustomAction` - 删除操作
- `reloadCustomActions` - 重载缓存

### 调试功能
- `previewActionParams` - 预览参数
- `validateActionParams` - 验证参数
- `executeAction` - 执行操作
- `executeActionStep` - 单步执行

## 样式定制

所有组件都使用scoped SCSS,可以通过覆盖CSS变量或添加全局样式来定制外观:

```scss
// 自定义卡片样式
.visual-control-panel .action-card {
  border-radius: 8px;
}

// 自定义按钮颜色
.debug-panel .debug-actions .el-button--primary {
  background-color: #409eff;
}
```

## 注意事项

1. **浏览器状态**: 大部分操作需要浏览器处于运行状态
2. **JSON格式**: 参数配置需要使用有效的JSON格式
3. **操作ID**: 自定义操作的ID只能包含字母、数字和下划线
4. **复合操作**: 至少需要一个步骤,可以添加多个步骤串联执行
5. **日志限制**: 执行日志最多保留100条,超出会自动清理

## 未来扩展

可能的改进方向:
- [ ] 添加操作录制和回放功能
- [ ] 支持导入/导出自定义操作
- [ ] 添加操作执行历史记录
- [ ] 支持拖拽编排复合操作步骤
- [ ] 添加更多可视化控制选项(滚动、键盘输入等)
