// WebSocket 连接工具类
class RPAWebSocket {
  private socket: WebSocket | null = null
  private url: string = ''
  private reconnectInterval: number = 5000 // 重连间隔时间(毫秒)
  private maxReconnectAttempts: number = 5 // 最大重连次数
  private reconnectAttempts: number = 0 // 当前重连次数
  private isIntentionallyClosed: boolean = false // 是否为主动关闭

  // 回调函数
  private onOpenCallback: (() => void) | null = null
  private onMessageCallback: ((data: any) => void) | null = null
  private onErrorCallback: ((error: Event) => void) | null = null
  private onCloseCallback: ((event: CloseEvent) => void) | null = null

  constructor() {}

  // 设置 WebSocket URL
  setUrl(url: string): void {
    this.url = url
  }

  // 设置回调函数
  setOnOpenCallback(callback: () => void): void {
    this.onOpenCallback = callback
  }

  setOnMessageCallback(callback: (data: any) => void): void {
    this.onMessageCallback = callback
  }

  setOnErrorCallback(callback: (error: Event) => void): void {
    this.onErrorCallback = callback
  }

  setOnCloseCallback(callback: (event: CloseEvent) => void): void {
    this.onCloseCallback = callback
  }

  // 连接到 WebSocket 服务器
  connect(url?: string): void {
    if (url) {
      this.url = url
    }

    // 如果已有连接，先关闭
    if (this.socket) {
      this.isIntentionallyClosed = true
      this.socket.close()
    }

    try {
      // 重置状态
      this.isIntentionallyClosed = false
      this.reconnectAttempts = 0

      // 创建 WebSocket 连接
      this.socket = new WebSocket(this.url)

      // 绑定事件处理函数
      this.bindEvents()
    } catch (error) {
      console.error('WebSocket connection error:', error)
      if (this.onErrorCallback) {
        this.onErrorCallback(error as Event)
      }
    }
  }

  // 绑定事件处理函数
  private bindEvents(): void {
    if (!this.socket) return

    // 连接成功
    this.socket.onopen = (event: Event) => {
      console.log('WebSocket connected:', event)
      if (this.onOpenCallback) {
        this.onOpenCallback()
      }
    }

    // 收到消息
    this.socket.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)
        if (this.onMessageCallback) {
          this.onMessageCallback(data)
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error)
        if (this.onMessageCallback) {
          this.onMessageCallback(event.data)
        }
      }
    }

    // 连接错误
    this.socket.onerror = (error: Event) => {
      console.error('WebSocket error:', error)
      if (this.onErrorCallback) {
        this.onErrorCallback(error)
      }
    }

    // 连接关闭
    this.socket.onclose = (event: CloseEvent) => {
      console.log('WebSocket closed:', event)
      
      if (this.onCloseCallback) {
        this.onCloseCallback(event)
      }

      // 如果不是主动关闭且未达到最大重连次数，则尝试重连
      if (!this.isIntentionallyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++
        console.log(`WebSocket reconnecting... Attempt ${this.reconnectAttempts}`)
        setTimeout(() => {
          this.connect()
        }, this.reconnectInterval)
      }
    }
  }

  // 发送消息
  send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(data)
    } else {
      console.warn('WebSocket is not connected. Cannot send message.')
    }
  }

  // 发送 JSON 数据
  sendJSON(obj: any): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(obj))
    } else {
      console.warn('WebSocket is not connected. Cannot send JSON message.')
    }
  }

  // 关闭连接
  close(): void {
    this.isIntentionallyClosed = true
    if (this.socket) {
      this.socket.close()
    }
  }

  // 获取连接状态
  getState(): number {
    if (this.socket) {
      return this.socket.readyState
    }
    return WebSocket.CLOSED
  }

  // 检查是否已连接
  isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN
  }
}

// 创建并导出实例
export default new RPAWebSocket()