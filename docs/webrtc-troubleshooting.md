# WebRTC 视频流问题诊断

## 当前状态

### 前端行为（正常）
- ✅ 成功获取后端的 SDP offer
- ✅ 成功创建并设置 answer
- ✅ 成功接收远程 video track
- ✅ 收集到本地 ICE candidates
- ✅ 发送 ICE candidates 到后端

### 后端行为（有问题）
- ✅ 返回 SDP offer（包含后端的 ICE candidates）
- ✅ 接收前端的 answer
- ❌ **可能没有正确处理前端的 ICE candidates**
- ❌ ICE 连接状态停留在 `checking`，最终失败

## 问题分析

### 1. ICE 连接失败原因

ICE (Interactive Connectivity Establishment) 连接需要双方交换候选信息：

```
前端 → answer
前端 → ICE candidates (包含前端的网络地址和端口)
后端 → 应该添加这些 candidates 到后端的 RTCPeerConnection
后端 → 连接建立
后端 → 开始发送视频流
```

当前的问题是：后端可能没有将前端的 ICE candidates 添加到后端的 RTCPeerConnection 中。

### 2. 后端可能的问题

根据错误日志 "Failed to add ICE candidate: connection not found"，后端可能：

1. **ICE candidates 处理逻辑有误**
   - 后端在收到 ICE candidates 时，后端的 RTCPeerConnection 可能还没有准备好
   - 或者后端没有正确调用 `addIceCandidate()`

2. **不完整的 WebRTC 实现**
   - 后端可能只实现了基本的 SDP 交换
   - 没有实现完整的 ICE 候选交换机制

3. **异步处理问题**
   - 前端发送 answer 后立即发送 ICE candidates
   - 但后端可能还在处理 answer，导致 connection not found

### 3. 前端已经收到的 track 为什么不播放？

虽然 `ontrack` 事件被触发（表示收到 track），但：
- ICE 连接未建立
- 媒体数据无法实际传输
- `readyState: 0` 表示没有数据到达

## 后端需要检查的地方

### 1. ICE candidate 处理

后端 `/webrtc/ice-candidate` 端点应该：
```python
async def add_ice_candidate(request: WebRTCIceCandidateRequest):
    # 获取对应的 RTCPeerConnection
    pc = get_peer_connection(request.browser_id)

    # 添加 ICE candidate
    await pc.addIceCandidate(request.candidate)

    return {"code": 0, "msg": "success"}
```

### 2. 答案处理顺序

后端应该在：
1. 先收到并设置 answer
2. 然后才接收 ICE candidates

或者使用更宽松的错误处理，在 connection not found 时缓存 candidates。

### 3. ICE candidate 格式

检查前端发送的 candidate 格式是否与后端期望的格式一致。

## 临时解决方案

### 方案 1：后端修复 ICE candidate 处理（推荐）

让后端开发者检查并修复：
1. 确保 RTCPeerConnection 在接收 answer 时已准备好
2. 正确实现 `addIceCandidate()` 调用
3. 添加错误处理和日志

### 方案 2：使用 WebSocket 进行 ICE 交换（长期方案）

标准的 WebRTC 实现通常会使用 WebSocket 来：
- 实时双向交换 ICE candidates
- 避免 connection not found 错误
- 提供更好的连接建立体验

### 方案 3：前端增加重试机制（缓解）

在前端添加对 ICE candidate 发送的重试逻辑，如果第一次失败，延迟后重试。

## 建议的后端修复步骤

1. **检查 `/webrtc/answer` 端点**
   - 确保设置了 `remoteDescription`
   - 确保返回后才允许接收 ICE candidates

2. **检查 `/webrtc/ice-candidate` 端点**
   - 添加对 "connection not found" 的错误处理
   - 添加详细的日志记录
   - 考虑实现 candidate 缓存机制

3. **测试 ICE 交换**
   - 使用 webrtc-internals (chrome://webrtc-internals/) 查看详细状态
   - 添加前后端日志对比

## 前端日志分析

从日志中可以看到：
```
ICE Connection State: checking → failed
```

这说明 ICE 握手没有成功完成。可能的原因：
- 后端没有添加前端的 ICE candidates
- 网络问题（但在局域网中可能性小）
- STUN/TURN 配置问题（已禁用，应该没问题）

## 下一步

请后端开发者检查：
1. `/webrtc/ice-candidate` 端点的实现
2. ICE candidates 是否正确添加到 RTCPeerConnection
3. 是否需要添加延迟或缓存机制

前端代码已经正确实现了 WebRTC 流程，问题应该在后端。
