# 浏览器控制功能文档

## 功能概览
本模块提供完整的浏览器远程控制功能,包括:
- 视频流实时预览和控制
- WebRTC连接状态监测
- 标签页管理
- 远程点击控制

---

## 1. WebRTC连接断开检测

### 功能说明
- 实时监测WebRTC连接状态
- 自动检测连接断开/恢复
- UI实时显示连接状态
- 定期健康检查确保连接正常

### 连接状态类型
```typescript
type StreamConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'failed'
```

**状态说明:**
- `connected`: 连接正常,视频流正常播放
- `connecting`: 正在建立连接
- `disconnected`: 未连接或已断开
- `failed`: 连接失败

### UI展示
连接状态通过标签组件显示在视频预览区域:

**已连接** - 绿色标签,显示连接图标
**连接中** - 橙色标签,显示加载图标,带动画
**未连接** - 蓝色标签,显示警告图标
**连接失败** - 红色标签,显示警告图标

### 健康检查机制
```typescript
// 每5秒执行一次健康检查
const startStreamHealthCheck = () => {
  stopStreamHealthCheck()
  streamHealthCheckInterval.value = setInterval(() => {
    checkStreamHealth()
  }, 5000)
}
```

**检查内容:**
1. 调用API获取视频流状态
2. 检查流是否活跃(streaming/active)
3. 状态变化时更新UI和显示提示

**状态变化提示:**
- 连接断开时显示警告: "视频流连接已断开"
- 连接恢复时显示成功: "视频流连接已恢复"
- 连接异常时显示警告: "视频流连接异常,请检查网络"

### API接口
```typescript
// 获取视频流状态
POST /api/v1/rpa/browser_live_control/browser/stream/status
Request: { browser_id: string }
Response: {
  active: boolean
  streaming: boolean
  // ...其他状态信息
}
```

### 使用场景
1. **网络波动检测**: 自动发现网络问题导致的连接中断
2. **服务器状态监控**: 实时了解后端视频流服务状态
3. **用户体验优化**: 及时提示用户连接问题,避免误操作
4. **自动恢复提示**: 连接恢复后自动通知用户

---

## 2. 视频流暂停和恢复功能

### 功能说明
- 支持暂停和恢复浏览器画面直播流
- 暂停时显示最后截取的画面,减少网络流量
- 恢复时重新启动视频流

### API接口
```typescript
// 暂停视频流
POST /api/v1/rpa/browser_live_control/browser/stream/pause
Request: { browser_id: string }

// 恢复视频流
POST /api/v1/rpa/browser_live_control/browser/stream/resume
Request: { browser_id: string }
```

### 前端实现
- 控制面板视频预览区域新增"暂停"和"恢复"按钮
- 暂停状态下显示截图而非视频流
- 点击恢复后重新建立视频流连接

## 2. 标签页管理功能

### 功能说明
- 查询当前浏览器的所有标签页
- 显示标签页标题、URL和状态
- 支持切换到指定标签页

### API接口
```typescript
// 获取标签页列表
POST /api/v1/rpa/browser_live_control/browser/tabs/list
Request: { browser_id: string }
Response: {
  tabs: Array<{
    id: string
    title: string
    url: string
    active: boolean
  }>
}

// 切换标签页
POST /api/v1/rpa/browser_live_control/browser/tabs/switch
Request: {
  browser_id: string
  tab_id: string
}
```

### 前端实现
- 控制面板新增"标签页管理"卡片
- 显示所有标签页列表,当前标签页高亮显示
- 点击标签项切换到对应标签页
- 支持刷新标签页列表

## 3. 画面点击控制功能

### 功能说明
- 直接点击视频/截图画面实现远程浏览器控制
- 自动计算相对坐标(0.0-1.0)
- 支持左键点击操作

### API接口
```typescript
// 浏览器点击操作
POST /api/v1/rpa/browser_live_control/browser/click
Request: {
  request: {
    x: number  // 相对X坐标 (0.0-1.0)
    y: number  // 相对Y坐标 (0.0-1.0)
    button: string  // 鼠标按钮: left, middle, right
    double: boolean  // 是否双击
    wait_after: number  // 点击后等待时间(毫秒)
  },
  body: {
    browser_id: string
  }
}
```

### 前端实现
- 视频容器和截图容器添加点击事件监听
- 计算点击位置相对于容器的坐标
- 转换为相对坐标(0.0-1.0)后调用点击API
- 添加hover效果提示可点击

## 使用说明

### 1. 启动浏览器会话
1. 在浏览器管理页面选择浏览器实例
2. 点击"启动浏览器会话"按钮
3. 等待会话创建完成

### 2. 启动视频流
1. 点击"启动视频流"按钮
2. 视频预览区域显示实时画面

### 3. 暂停/恢复视频流
1. 视频流运行时,点击"暂停"按钮暂停视频
2. 暂停后显示最后截图,减少带宽消耗
3. 点击"恢复"按钮重新启动视频流

### 4. 管理标签页
1. 在"标签页管理"卡片查看所有标签页
2. 点击"刷新"按钮更新标签页列表
3. 点击标签项切换到对应标签页
4. 当前标签页显示"当前"标签

### 5. 点击控制
1. 直接在视频或截图画面上点击要操作的位置
2. 系统自动发送点击指令到远程浏览器
3. 画面会响应点击操作

## 技术细节

### 坐标计算
点击控制使用相对坐标系统:
```typescript
const relativeX = (event.clientX - rect.left) / rect.width
const relativeY = (event.clientY - rect.top) / rect.height
```

### 状态管理
- `videoPaused`: 视频流暂停状态
- `tabsList`: 标签页列表数据
- `tabsLoading`: 标签页加载状态

### 事件传递
新增事件类型:
- `pause-video`: 暂停视频流
- `resume-video`: 恢复视频流
- `refresh-tabs`: 刷新标签页列表
- `switch-tab`: 切换标签页
- `video-click`: 视频点击事件

## 注意事项

1. **视频流性能**: 视频流暂停后可以减少网络流量和CPU使用
2. **标签页同步**: 标签页操作后建议手动刷新列表获取最新状态
3. **点击精度**: 坐标计算基于容器尺寸,确保响应式布局正常工作
4. **权限要求**: 所有操作需要用户已登录且拥有对应浏览器实例的权限

## 技术实现细节

### WebRTC连接状态管理

**状态定义:**
```typescript
const streamConnectionStatus = ref<'connected' | 'connecting' | 'disconnected' | 'failed'>('disconnected')
```

**状态转换:**
```
disconnected → connecting → connected
connected → disconnected
connected → failed
```

**健康检查定时器:**
```typescript
const streamHealthCheckInterval = ref<NodeJS.Timeout | null>(null)
```

**生命周期管理:**
- 组件挂载时不自动启动检查
- 启动视频流时开始健康检查
- 停止视频流时停止健康检查
- 组件卸载时清理所有定时器

### 事件处理流程

**1. 启动视频流:**
```
用户点击启动 → videoLoading=true → 连接状态=connecting
→ API调用成功 → streamUrl赋值 → 连接状态=connected
→ 启动健康检查定时器 → videoLoading=false
```

**2. 健康检查:**
```
定时器触发 → 调用stream/status API
→ 检查streaming/active状态
→ 状态变化时更新UI并显示提示
```

**3. 检测到断开:**
```
健康检查失败 → 连接状态=disconnected
→ 显示警告消息
→ 自动刷新截图作为替代
```

**4. 恢复连接:**
```
健康检查成功且状态为connected
→ 连接状态=connected
→ 显示成功消息
→ 继续视频流播放
```

## 后端需求

### 新增API端点
后端需要实现以下API端点:

1. `POST /api/v1/rpa/browser_live_control/browser/stream/pause`
   - 暂停视频流传输
   - 返回成功状态

2. `POST /api/v1/rpa/browser_live_control/browser/stream/resume`
   - 恢复视频流传输
   - 返回成功状态

3. `POST /api/v1/rpa/browser_live_control/browser/tabs/list`
   - 获取浏览器所有标签页信息
   - 返回标签页列表(包含id、title、url、active状态)

4. `POST /api/v1/rpa/browser_live_control/browser/tabs/switch`
   - 切换到指定标签页
   - 参数: browser_id, tab_id
   - 返回操作结果

### 现有API
点击控制使用现有API:
- `POST /api/v1/rpa/browser_live_control/browser/click`
  - 已存在,支持相对坐标点击
