# 提交抽奖/话题内容功能

## 功能概述

新增了提交B站抽奖和话题抽奖的组件，支持：
- 官方抽奖提交
- 充电抽奖提交
- 预约抽奖提交
- 话题抽奖提交

## 组件位置

### SubmitDynamicLottery.vue
- 路径：`src/components/lottery_data/bili_data/SubmitDynamicLottery.vue`
- 功能：提交官方转发抽奖、充电抽奖、预约抽奖
- 使用页面：官方抽奖、充电抽奖、预约抽奖页面

### SubmitTopicLottery.vue
- 路径：`src/components/lottery_data/bili_data/SubmitTopicLottery.vue`
- 功能：提交B站话题活动抽奖
- 使用页面：话题抽奖页面

## 功能特性

### SubmitDynamicLottery 组件

#### 单个提交
- 支持输入完整的B站动态链接（如：`https://t.bilibili.com/xxxxx`）
- 支持直接输入动态ID
- 一键粘贴功能（从剪贴板读取）
- 自动解析抽奖类型（官方/充电/预约）

#### 批量提交
- 支持批量提交多个动态链接
- 每行一个链接，最多支持50个
- 实时显示提交结果
- 显示成功/失败状态和错误信息

### SubmitTopicLottery 组件

#### 话题提交
- 支持输入话题ID
- 格式验证（只允许字母、数字、下划线、连字符）
- 从话题链接中提取ID（如：`https://www.bilibili.com/topic/xxxxx` 中的 xxxxx）

## 使用说明

### 1. 提交动态抽奖

**步骤：**
1. 进入对应的抽奖页面（官方/充电/预约）
2. 点击页面顶部的"提交抽奖动态"卡片标题旁的展开按钮
3. 在"动态链接"输入框中输入B站动态链接或ID
4. 点击"粘贴"按钮可从剪贴板快速粘贴
5. 点击"提交抽奖"按钮提交

**批量提交：**
1. 在"批量提交"文本框中输入多个链接，每行一个
2. 点击"提交抽奖"按钮
3. 查看批量提交结果表格

### 2. 提交话题抽奖

**步骤：**
1. 进入话题抽奖页面
2. 点击页面顶部的"提交话题抽奖"卡片标题旁的展开按钮
3. 在"话题ID"输入框中输入话题ID
4. 点击"提交话题"按钮提交

## API接口

### 动态抽奖提交
- **接口：**`POST /api/v1/lottery_database/bili/AddDynamicLottery`
- **参数：**
  ```json
  {
    "dynamic_id_or_url": "动态链接或ID"
  }
  ```
- **响应：**
  ```json
  {
    "code": 0,
    "msg": "success",
    "data": "提交结果消息"
  }
  ```

### 批量动态抽奖提交
- **接口：**`POST /api/v1/lottery_database/bili/BulkAddDynamicLottery`
- **参数：**
  ```json
  {
    "dynamic_id_or_urls": ["链接1", "链接2", ...]
  }
  ```
- **响应：**
  ```json
  {
    "code": 0,
    "msg": "success",
    "data": [
      {
        "dynamic_id": "链接1",
        "is_succ": true,
        "msg": "成功"
      },
      {
        "dynamic_id": "链接2",
        "is_succ": false,
        "msg": "失败原因"
      }
    ]
  }
  ```

### 话题抽奖提交
- **接口：**`POST /api/v1/lottery_database/bili/AddTopicLottery`
- **参数：**
  ```json
  {
    "topic_id": "话题ID"
  }
  ```
- **响应：**
  ```json
  {
    "code": 0,
    "msg": "success",
    "data": "提交结果消息"
  }
  ```

## UI设计

### 组件样式
- 使用Element Plus卡片组件
- 支持展开/收起功能
- 使用Element Plus图标
- 响应式布局，适配不同屏幕尺寸
- 主题色使用`var(--el-color-xx)`变量

### 交互反馈
- 提交成功后显示成功提示
- 提交失败后显示错误提示
- 批量提交显示详细结果表格
- 提交成功后自动刷新列表数据
- 表单验证提示

## 注意事项

1. **动态链接格式**
   - 支持完整链接：`https://t.bilibili.com/xxxxx`
   - 支持动态ID：直接输入数字ID

2. **话题ID格式**
   - 只允许字母、数字、下划线、连字符
   - 从话题链接中提取ID

3. **批量提交限制**
   - 最多支持50个链接
   - 每行一个链接
   - 自动过滤空行

4. **提交流程**
   - 提交成功后会自动刷新列表
   - 可以点击"重置"按钮清空表单
   - 批量提交结果可查看详细信息

## 后端接口要求

后端需要实现以下接口并返回符合规范的响应：

1. `/api/v1/lottery_database/bili/AddDynamicLottery`
2. `/api/v1/lottery_database/bili/BulkAddDynamicLottery`
3. `/api/v1/lottery_database/bili/AddTopicLottery`

所有接口需要返回标准格式的响应：
```json
{
  "code": 0,
  "msg": "success",
  "data": {}
}
```

JWT token会自动从请求头中传递。
