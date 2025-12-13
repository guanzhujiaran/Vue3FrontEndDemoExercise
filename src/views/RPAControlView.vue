<template>
  <div class="rpa-control-view">
    <h1>RPA 浏览器控制面板</h1>

    <!-- 连接控制 -->
    <div class="control-panel">
      <div class="connection-controls">
        <input v-model="liveId" placeholder="输入 Live ID" class="live-id-input" />
        <button @click="connect" :disabled="isConnected" class="connect-btn">连接</button>
        <button @click="disconnect" :disabled="!isConnected" class="disconnect-btn">断开</button>
      </div>

      <!-- 状态显示 -->
      <div class="status">
        <span :class="['status-indicator', isConnected ? 'connected' : 'disconnected']">
          {{ isConnected ? '已连接' : '未连接' }}
        </span>
      </div>
    </div>

    <!-- 视频流显示 -->
    <div class="video-container">
      <div v-if="!isConnected" class="placeholder">
        <p>请先连接到直播流</p>
      </div>
      <img v-else :src="streamUrl" alt="浏览器直播流" class="video-stream" v-show="isConnected" />
    </div>

    <!-- 控制台 -->
    <div class="console-panel">
      <div class="console-header">
        <h3>控制台</h3>
        <button @click="clearConsole" class="clear-btn">清空</button>
      </div>

      <!-- 消息显示区域 -->
      <div class="messages" ref="messagesContainer">
        <div v-for="(msg, index) in messages" :key="index" :class="['message', msg.type]">
          <span class="timestamp">[{{ msg.timestamp }}]</span>
          <span class="type">[{{ msg.type.toUpperCase() }}]</span>
          <span class="content">{{ msg.content }}</span>
        </div>
      </div>

      <!-- 命令输入 -->
      <div class="command-input">
        <select v-model="commandType" class="command-type">
          <option value="navigate">导航</option>
          <option value="eval">执行代码</option>
        </select>
        <input
          v-model="commandInput"
          placeholder="输入命令..."
          @keyup.enter="sendCommand"
          class="command-text"
        />
        <button @click="sendCommand" :disabled="!isConnected" class="send-btn">发送</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted, nextTick } from 'vue'
import { rpaWebSocket } from '@/api/rpa'

// 响应式数据
const liveId = ref('')
const isConnected = ref(false)
const messages = ref<Array<{ type: string; content: string; timestamp: string }>>([])
const commandInput = ref('')
const commandType = ref('navigate')
const messagesContainer = ref<HTMLElement | null>(null)

// 计算属性
const streamUrl = computed(() => {
  if (liveId.value) {
    return `${window.location.origin}/rpa/browser_control/live/stream?live_id=${liveId.value}`
  }
  return ''
})

// 添加消息到控制台
const addMessage = (type: string, content: string) => {
  const now = new Date()
  const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`

  messages.value.push({
    type,
    content,
    timestamp
  })

  // 滚动到底部
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

// 连接WebSocket
const connect = () => {
  if (!liveId.value) {
    addMessage('error', '请输入 Live ID')
    return
  }

  try {
    // 设置WebSocket URL
    const wsUrl = `${window.location.origin.replace('http', 'ws')}/rpa/browser_control/live/ws?live_id=${liveId.value}`
    rpaWebSocket.setUrl(wsUrl)

    // 设置回调函数
    rpaWebSocket.setOnOpenCallback(() => {
      isConnected.value = true
      addMessage('info', `已连接到 WebSocket: ${wsUrl}`)
    })

    rpaWebSocket.setOnMessageCallback((data: any) => {
      if (data.type === 'eval_result') {
        addMessage('result', data.payload)
      } else if (data.type === 'info') {
        addMessage('info', data.payload)
      } else if (data.type === 'error') {
        addMessage('error', data.payload)
      } else {
        addMessage('message', JSON.stringify(data))
      }
    })

    rpaWebSocket.setOnErrorCallback((error: Event) => {
      addMessage('error', `WebSocket 错误: ${JSON.stringify(error)}`)
      isConnected.value = false
    })

    rpaWebSocket.setOnCloseCallback((event: CloseEvent) => {
      isConnected.value = false
      addMessage('info', `WebSocket 连接已关闭: ${event.reason}`)
    })

    // 建立连接
    rpaWebSocket.connect()
  } catch (error) {
    addMessage('error', `连接失败: ${error}`)
  }
}

// 断开WebSocket连接
const disconnect = () => {
  rpaWebSocket.close()
  isConnected.value = false
  addMessage('info', '已断开 WebSocket 连接')
}

// 发送命令
const sendCommand = () => {
  if (!commandInput.value.trim() || !isConnected.value) {
    return
  }

  try {
    if (commandType.value === 'navigate') {
      const message = {
        type: 'navigate',
        url: commandInput.value
      }
      rpaWebSocket.sendJSON(message)
      addMessage('command', `导航到: ${commandInput.value}`)
    } else if (commandType.value === 'eval') {
      const message = {
        type: 'eval',
        code: commandInput.value
      }
      rpaWebSocket.sendJSON(message)
      addMessage('command', `执行代码: ${commandInput.value}`)
    }

    commandInput.value = ''
  } catch (error) {
    addMessage('error', `发送命令失败: ${error}`)
  }
}

// 清空控制台
const clearConsole = () => {
  messages.value = []
}

// 组件卸载时断开连接
onUnmounted(() => {
  if (isConnected.value) {
    disconnect()
  }
})
</script>

<style scoped>
.rpa-control-view {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.control-panel {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 15px;
  background-color: #f5f5f5;
  border-radius: 8px;
}

.connection-controls {
  display: flex;
  gap: 10px;
  align-items: center;
}

.live-id-input {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.connect-btn,
.disconnect-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.connect-btn {
  background-color: #4caf50;
  color: white;
}

.connect-btn:disabled {
  background-color: #a5d6a7;
  cursor: not-allowed;
}

.disconnect-btn {
  background-color: #f44336;
  color: white;
}

.disconnect-btn:disabled {
  background-color: #ef9a9a;
  cursor: not-allowed;
}

.status {
  font-weight: bold;
}

.status-indicator {
  padding: 6px 12px;
  border-radius: 4px;
  color: white;
}

.status-indicator.connected {
  background-color: #4caf50;
}

.status-indicator.disconnected {
  background-color: #f44336;
}

.video-container {
  width: 100%;
  height: 500px;
  background-color: #000;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder {
  color: #fff;
  font-size: 18px;
}

.video-stream {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.console-panel {
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
}

.console-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  background-color: #f5f5f5;
  border-bottom: 1px solid #ddd;
}

.clear-btn {
  padding: 6px 12px;
  background-color: #ff9800;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.messages {
  height: 300px;
  overflow-y: auto;
  padding: 15px;
  background-color: #000;
  font-family: monospace;
  font-size: 14px;
}

.message {
  margin-bottom: 8px;
  color: #fff;
}

.message.info {
  color: #4caf50;
}

.message.error {
  color: #f44336;
}

.message.result {
  color: #2196f3;
}

.message.command {
  color: #ff9800;
}

.timestamp {
  color: #9e9e9e;
  margin-right: 10px;
}

.type {
  color: #795548;
  margin-right: 10px;
  font-weight: bold;
}

.command-input {
  display: flex;
  padding: 15px;
  background-color: #f5f5f5;
  border-top: 1px solid #ddd;
  gap: 10px;
}

.command-type,
.command-text {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.command-type {
  width: 120px;
}

.command-text {
  flex: 1;
}

.send-btn {
  padding: 8px 16px;
  background-color: #2196f3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.send-btn:disabled {
  background-color: #90caf9;
  cursor: not-allowed;
}
</style>
