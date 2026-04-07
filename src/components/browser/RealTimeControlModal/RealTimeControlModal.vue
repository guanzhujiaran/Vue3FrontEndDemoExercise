<!--
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-12-15 00:00:00
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-12-24 00:00:00
 * @FilePath: \Vue3FrontEndDemoExercise\src\components\browser\RealTimeControlModal\RealTimeControlModal.vue
 * @Description: 实时控制Modal组件(重构版)
-->
<template>
    <el-dialog v-model="visible" :title="`实时控制 - ${currentFingerprint?.id_str || currentFingerprint?.id}`" width="96vw"
        top="2vh" destroy-on-close class="real-time-control-modal">
        <div class="control-container">
            <!-- 主视频区域 -->
            <div class="main-section">
                <!-- 视频播放区域 -->
                <div class="video-section-wrapper">
                    <VideoPlayer ref="videoComponentRef" v-model:show-debug-dialog="showDebugDialog"
                        :is-streaming="isStreaming" :screenshot-url="screenshotUrl" :session-info="sessionInfo"
                        :is-disconnecting="isDisconnecting" :is-reconnecting="isReconnecting"
                        :reconnect-error="reconnectError" :is-gathering-ice="isGatheringIce"
                        @video-metadata-loaded="onVideoMetadata" @video-data-loaded="onVideoData"
                        @toggle-video="toggleVideoStream" @take-screenshot="takeScreenshot"
                        @navigate="handleNavigate" />

                    <!-- 日志面板 -->
                    <LogPanel ref="logPanelRef" :logs="logs" @clear-log="clearLog" />
                </div>
            </div>

            <!-- 右侧：高级控制面板 -->
            <div class="advanced-section">
                <!-- JavaScript执行 -->
                <JavaScriptPanel @execute="executeJavaScript" @safe-execute="safeExecuteJavaScript" />

                <!-- 点击操作 -->
                <ClickPanel @perform-click="performClick" />

                <!-- 执行结果 -->
                <ResultPanel :result="executionResult" @clear="clearResult" />
            </div>
        </div>

        <template #footer>
            <span class="dialog-footer">
                <el-button @click="handleClose">关闭</el-button>
                <el-button type="primary" @click="handleSave">保存配置</el-button>
            </span>
        </template>
    </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import biliMessage, { ElMessageBox } from '@/utils/message'
import { Loading } from '@element-plus/icons-vue'
import { browserLiveControlApi } from '@/api/browser/browser_api'
import { businessHandler } from '@/utils/businessHandler'
import type { UserBrowserInfoReadResp } from '@/types/browser-automation-api'
import VideoPlayer from './VideoPlayer.vue'
import LogPanel from './LogPanel.vue'
import JavaScriptPanel from './JavaScriptPanel.vue'
import ClickPanel from './ClickPanel.vue'
import ResultPanel from './ResultPanel.vue'

interface Props {
    modelValue: boolean
    fingerprint: UserBrowserInfoReadResp | null
}

interface Emits {
    (e: 'update:modelValue', value: boolean): void
    (e: 'save', config: any): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const visible = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
})

const currentFingerprint = ref<UserBrowserInfoReadResp | null>(null)

// 子组件引用
const videoComponentRef = ref<InstanceType<typeof VideoPlayer>>()
const logPanelRef = ref<InstanceType<typeof LogPanel>>()

// 兼容旧代码,保持 videoPlayerRef 可用
const videoPlayerRef = computed(() => videoComponentRef.value)

// 视频流相关
const isStreaming = ref(false)
const screenshotUrl = ref('')
let currentBlobUrl = ''

// WebRTC 相关
let peerConnection: RTCPeerConnection | null = null
let remoteStream: MediaStream | null = null
let webrtcBrowserId: string | null = null
let sentIceCandidates = new Set<string>()  // 用于去重已发送的 ICE candidates
let iceCandidateSentCount = 0  // 记录实际发送的 ICE candidate 数量
let isWebrtcConnecting = false  // 标记是否正在建立 WebRTC 连接

// 日志系统
interface LogItem {
    time: string
    message: string
    type: 'info' | 'success' | 'warning' | 'error' | 'debug'
}
const logs = ref<LogItem[]>([])

// 状态相关
const isManualMode = ref(false)
const arePluginsPaused = ref(false)
const isDisconnecting = ref(false)  // 是否正在主动断开连接
const showDebugDialog = ref(false)  // 是否显示调试对话框
const sessionInfo = ref({
    connections: 0,
    lastActivity: '',
    status: 'disconnected',
    session_exists: false,
    browser_running: false,
    lifecycle_state: 'inactive',
    last_heartbeat: 0,
    active_connections: 0,
    video_streaming: false,
    manual_mode: false,
    created_at: 0,
    expires_at: null as number | null,
    cleanup_policy: {
        max_idle_time: 1800,
        max_no_heartbeat_time: 60,
        cleanup_interval: 300
    },
    message: ''
})
const isPollingSession = ref(false)  // 是否正在轮询会话状态
const isGatheringIce = ref(false)  // 是否正在收集ICE候选
let pollingTimer: number | null = null

// 心跳相关
let heartbeatTimer: number | null = null
const HEARTBEAT_INTERVAL = 30000  // 心跳间隔：30秒

const executionResult = ref('')

// 重连相关状态
const reconnectAttempts = ref(0)  // 重连次数
const maxReconnectAttempts = 3  // 最大重连次数
const isReconnecting = ref(false)  // 是否正在重连
const reconnectError = ref('')  // 重连错误信息

// 监听指纹变化
watch(() => props.fingerprint, (newFingerprint) => {
    currentFingerprint.value = newFingerprint
    if (newFingerprint) {
        resetSessionState()
    }
}, { immediate: true })

// 监听调试对话框状态变化
watch(showDebugDialog, (newVal) => {
    console.log('🔍 showDebugDialog 变化:', newVal)
    if (newVal) {
        showWebRTCDebug()
        showDebugDialog.value = false
    }
})

// 重置会话状态
const resetSessionState = () => {
    isStreaming.value = false
    screenshotUrl.value = ''
    isGatheringIce.value = false
    sessionInfo.value = {
        connections: 0,
        lastActivity: '',
        status: 'disconnected',
        session_exists: false,
        browser_running: false,
        lifecycle_state: 'inactive',
        last_heartbeat: 0,
        active_connections: 0,
        video_streaming: false,
        manual_mode: false,
        created_at: 0,
        expires_at: null,
        cleanup_policy: {
            max_idle_time: 1800,
            max_no_heartbeat_time: 60,
            cleanup_interval: 300
        },
        message: ''
    }
    isManualMode.value = false
    arePluginsPaused.value = false
    stopSessionPolling()
    stopHeartbeat()  // 停止心跳发送
    // 重置重连状态
    reconnectAttempts.value = 0
    isReconnecting.value = false
    reconnectError.value = ''
}

// Blob 转换为 base64 辅助函数
const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => {
            if (reader.result) {
                resolve(reader.result as string)
            } else {
                reject(new Error('Failed to convert blob to base64'))
            }
        }
        reader.onerror = () => reject(new Error('Failed to read blob'))
        reader.readAsDataURL(blob)
    })
}

// 添加日志
const addLog = (message: string, type: 'info' | 'success' | 'warning' | 'error' | 'debug' = 'info') => {
    const now = new Date()
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
    logs.value.push({ time, message, type })
    logPanelRef.value?.scrollToBottom()
}

// 清空日志
const clearLog = () => {
    logs.value = []
}

// 视频元数据加载完成
const onVideoMetadata = () => {
    addLog(`视频元数据已加载: ${videoPlayerRef.value?.videoPlayer?.videoWidth}x${videoPlayerRef.value?.videoPlayer?.videoHeight}`, 'success')
}

// 视频数据加载完成
const onVideoData = () => {
    addLog('视频数据已加载', 'success')
}

// 确保浏览器会话存在
const ensureSessionExists = async (): Promise<boolean> => {
    if (!currentFingerprint.value) return false

    try {
        // 先检查会话状态
        const statusResult = await businessHandler(
            browserLiveControlApi.getBrowserSessionStatus({
                browser_id: currentFingerprint.value.id_str
            })
        )

        if (statusResult.success && statusResult.data) {
            const data = statusResult.data as any
            // 转换 BrowserSessionStatus 到 SessionInfo 格式
            sessionInfo.value = {
                connections: data.connected_clients || 0,
                lastActivity: data.last_heartbeat ? new Date(data.last_heartbeat).toISOString() : '',
                status: data.lifecycle_status || 'disconnected',
                session_exists: true,
                browser_running: data.is_running || false,
                lifecycle_state: data.lifecycle_status || 'inactive',
                last_heartbeat: data.last_heartbeat ? new Date(data.last_heartbeat).getTime() : 0,
                active_connections: data.connected_clients || 0,
                video_streaming: data.video_stream_active || false,
                manual_mode: data.manual_operation || false,
                created_at: new Date(data.created_at).getTime(),
                expires_at: data.expiration_time ? new Date(data.expiration_time).getTime() : null,
                cleanup_policy: data.cleanup_policy || {
                    max_idle_time: 1800,
                    max_no_heartbeat_time: 60,
                    cleanup_interval: 300
                },
                message: ''
            }
            return true
        }

        // 会话不存在或未运行，创建新会话
        const createResult = await businessHandler(
            browserLiveControlApi.createBrowserSession({
                browser_id: currentFingerprint.value.id_str,
                request: {
                    headless: true,
                    auto_cleanup: true,
                    cleanup_policy: {
                        max_idle_time: 1800,
                        max_no_heartbeat_time: 60,
                        cleanup_interval: 300
                    },
                    expiration_time: 0
                }
            })
        )

        if (createResult.success) {
            if (createResult.data?.success && createResult.data?.browser_started === false) {
                biliMessage.info('浏览器启动任务已提交，正在后台处理...')
                return await waitForBrowserReady()
            } else {
                await loadSessionStatus()
                biliMessage.success('浏览器会话创建成功')
                return true
            }
        }

        return false
    } catch (error) {
        console.error('确保会话存在失败:', error)
        return false
    }
}

// 等待浏览器启动完成
const waitForBrowserReady = async (): Promise<boolean> => {
    const maxAttempts = 30
    const pollInterval = 5000

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            const statusResult = await businessHandler(
                browserLiveControlApi.getBrowserSessionStatus({
                    browser_id: currentFingerprint.value!.id_str
                }),
                {
                    showErrorToast: false
                }
            )
            if (statusResult.success && statusResult.data) {
                const data = statusResult.data as any
                // 转换 BrowserSessionStatus 到 SessionInfo 格式
                sessionInfo.value = {
                    connections: data.connected_clients || 0,
                    lastActivity: data.last_heartbeat ? new Date(data.last_heartbeat).toISOString() : '',
                    status: data.lifecycle_status || 'disconnected',
                    session_exists: true,
                    browser_running: data.is_running || false,
                    lifecycle_state: data.lifecycle_status || 'inactive',
                    last_heartbeat: data.last_heartbeat ? new Date(data.last_heartbeat).getTime() : 0,
                    active_connections: data.connected_clients || 0,
                    video_streaming: data.video_stream_active || false,
                    manual_mode: data.manual_operation || false,
                    created_at: new Date(data.created_at).getTime(),
                    expires_at: data.expiration_time ? new Date(data.expiration_time).getTime() : null,
                    cleanup_policy: data.cleanup_policy || {
                        max_idle_time: 1800,
                        max_no_heartbeat_time: 60,
                        cleanup_interval: 300
                    },
                    message: ''
                }
                biliMessage.success('浏览器启动完成')
                return true
            }
            biliMessage.info("等待浏览器启动中...")
            await new Promise(resolve => setTimeout(resolve, pollInterval))
        } catch (error) {
            console.error('检查浏览器状态失败:', error)
            if (attempt === maxAttempts - 1) {
                biliMessage.error('等待浏览器启动超时，请稍后重试')
            }
        }
    }

    biliMessage.error('浏览器启动超时，请检查服务器状态')
    return false
}

// 加载会话状态
const loadSessionStatus = async (showErrorToast: boolean = true) => {
    if (!currentFingerprint.value) return

    try {
        const result = await businessHandler(
            browserLiveControlApi.getBrowserSessionStatus({
                browser_id: currentFingerprint.value.id_str
            }),
            { showErrorToast: showErrorToast }
        )

        if (result.success && result.data) {
            const data = result.data as any
            // 转换 BrowserSessionStatus 到 SessionInfo 格式
            sessionInfo.value = {
                connections: data.connected_clients || 0,
                lastActivity: data.last_heartbeat ? new Date(data.last_heartbeat).toISOString() : '',
                status: data.lifecycle_status || 'disconnected',
                session_exists: true,
                browser_running: data.is_running || false,
                lifecycle_state: data.lifecycle_status || 'inactive',
                last_heartbeat: data.last_heartbeat ? new Date(data.last_heartbeat).getTime() : 0,
                active_connections: data.connected_clients || 0,
                video_streaming: data.video_stream_active || false,
                manual_mode: data.manual_operation || false,
                created_at: new Date(data.created_at).getTime(),
                expires_at: data.expiration_time ? new Date(data.expiration_time).getTime() : null,
                cleanup_policy: data.cleanup_policy || {
                    max_idle_time: 1800,
                    max_no_heartbeat_time: 60,
                    cleanup_interval: 300
                },
                message: ''
            }
            // 同步 manual_mode 状态
            isManualMode.value = data.manual_operation || false
        }
    } catch (error) {
        console.error('加载会话状态失败:', error)
    }
}

// 开始轮询会话状态
const startSessionPolling = () => {
    if (isPollingSession.value) return

    isPollingSession.value = true
    addLog('开始轮询会话状态...', 'info')

    const poll = async () => {
        // 检查是否应该停止轮询
        if (!isPollingSession.value) return

        await loadSessionStatus()

        // 如果会话断开，显示警告
        if (sessionInfo.value.status === 'disconnected' || sessionInfo.value.status === 'stopped') {
            addLog('浏览器会话已断开', 'warning')
        }

        // 如果视频流状态变化，显示提示
        // 只有当后端明确报告视频流停止，且前端也认为在流状态时才显示警告
        if (!sessionInfo.value.video_streaming && isStreaming.value) {
            addLog('视频流已停止', 'warning')
        }

        // 只有在轮询仍然启用时才设置下一次轮询
        if (isPollingSession.value) {
            pollingTimer = window.setTimeout(() => {
                poll()
            }, 10000)  // 每10秒轮询一次
        }
    }

    poll()
}

// 开始发送心跳
const startHeartbeat = () => {
    if (heartbeatTimer) {
        clearInterval(heartbeatTimer)
    }

    addLog('开始发送心跳...', 'info')

    const sendBeat = async () => {
        if (!currentFingerprint.value || !isStreaming.value) {
            return
        }

        try {
            const result = await businessHandler(
                browserLiveControlApi.sendHeartbeat({
                    browser_id: currentFingerprint.value.id_str,
                    request: {
                        client_id: `client_${Date.now()}`,
                        timestamp: Math.floor(Date.now() / 1000)
                    }
                }),
                {
                    showSuccessToast: false // 不显示成功提示
                }
            )

            if (result.success) {
                console.log('💓 心跳发送成功')
                // 心跳发送成功不需要显示提示信息
            }
        } catch (error) {
            console.error('❌ 心跳发送失败:', error)
            addLog('心跳发送失败', 'warning')
        }
    }

    // 立即发送一次心跳
    sendBeat()

    // 然后定时发送
    heartbeatTimer = window.setInterval(() => {
        sendBeat()
    }, HEARTBEAT_INTERVAL)
}

// 停止发送心跳
const stopHeartbeat = () => {
    if (heartbeatTimer) {
        clearInterval(heartbeatTimer)
        heartbeatTimer = null
    }
    if (sessionInfo.value.status !== 'disconnected') {
        addLog('停止发送心跳', 'info')
    }
}

// 停止轮询会话状态
const stopSessionPolling = () => {
    if (pollingTimer) {
        clearTimeout(pollingTimer)
        pollingTimer = null
    }
    isPollingSession.value = false
    if (sessionInfo.value.status !== 'disconnected') {
        addLog('停止轮询会话状态', 'info')
    }
}

// 切换视频流
const toggleVideoStream = async () => {
    if (isStreaming.value) {
        stopVideoStream()
    } else {
        await startVideoStream()
    }
}

// 开始视频流
const startVideoStream = async () => {
    if (!currentFingerprint.value) return

    // 防止重复连接
    if (isWebrtcConnecting) {
        console.warn('⚠️ WebRTC 连接正在进行中,请勿重复点击')
        return
    }

    try {
        // 先设置连接状态,确保加载动画显示
        sessionInfo.value.status = 'connecting'
        isWebrtcConnecting = true
        isStreaming.value = true
        screenshotUrl.value = ''

        const sessionReady = await ensureSessionExists()
        if (!sessionReady) {
            biliMessage.error('无法创建浏览器会话')
            sessionInfo.value.status = 'disconnected'
            isWebrtcConnecting = false
            isStreaming.value = false
            // 重置重连状态
            isReconnecting.value = false
            reconnectError.value = ''
            return
        }

        // 先关闭已有的连接,防止重复连接
        if (peerConnection) {
            console.log('⚠️ 检测到已有 WebRTC 连接,先关闭旧连接')
            closeWebRTCConnection()
        }

        await nextTick()
        await setupVideoStream()

        isWebrtcConnecting = false
        // 重置重连状态
        isReconnecting.value = false
        reconnectError.value = ''
        biliMessage.success('视频流已启动')

        // 注意：轮询和心跳会在视频播放成功后自动停止
        // 现在只在连接过程中进行轮询，播放成功后停止
    } catch (error) {
        isWebrtcConnecting = false
        sessionInfo.value.status = 'disconnected'
        biliMessage.error('启动视频流失败')
        isStreaming.value = false
        // 重置重连状态
        isReconnecting.value = false
        reconnectError.value = ''
    }
}

// 设置视频流
const setupVideoStream = async () => {
    if (!currentFingerprint.value || !videoPlayerRef.value?.videoPlayer) return

    try {
        await setupWebrtcStream()

        // WebRTC 连接成功后启动轮询和心跳
        startSessionPolling()
        startHeartbeat()
    } catch (error) {
        console.error('设置视频流失败:', error)
        biliMessage.error('视频流设置失败')
        sessionInfo.value.status = 'disconnected'
        isStreaming.value = false
        // 重置重连状态
        isReconnecting.value = false
        reconnectError.value = ''
    }
}

// 设置 WebRTC 流 - 完全参照HTML测试页面逻辑
const setupWebrtcStream = async () => {
    if (!currentFingerprint.value || !videoPlayerRef.value?.videoPlayer) return

    try {
        closeWebRTCConnection()

        const browserId = currentFingerprint.value.id_str
        webrtcBrowserId = browserId

        console.log('🚀 开始 WebRTC 连接, browser_id:', browserId)
        addLog('开始 WebRTC 连接', 'info')

        // 1. 请求后端创建 WebRTC offer
        console.log('请求后端创建 WebRTC offer')
        addLog('请求后端创建 WebRTC offer', 'info')
        const offerResult = await businessHandler(
            browserLiveControlApi.createWebrtcOffer({
                browser_id: browserId
            })
        )

        if (!offerResult.success || !offerResult.data?.sdp) {
            addLog('获取 WebRTC offer 失败', 'error')
            throw new Error('获取 WebRTC offer 失败: ' + JSON.stringify(offerResult))
        }

        const offer = offerResult.data
        console.log('收到服务器 offer，SDP 长度:', offer.sdp?.length || 0)
        addLog('收到服务器 offer 响应', 'success')

        // 2. 创建本地 PeerConnection - 局域网环境不需要 STUN
        console.log('创建本地 RTCPeerConnection...')
        addLog('创建本地 RTCPeerConnection', 'info')
        peerConnection = new RTCPeerConnection({
            iceServers: []  // 局域网环境不需要 STUN
        })

        // 3. 设置远程视频流
        peerConnection.ontrack = (event) => {
            console.log('✅✅✅ 接收到远程流，track 数量:', event.streams.length)
            if (event.streams && event.streams.length > 0) {
                remoteStream = event.streams[0] || null
                const videoPlayer = videoPlayerRef.value?.videoPlayer
                if (videoPlayer) {
                    videoPlayer.srcObject = remoteStream

                    videoPlayer.onloadedmetadata = () => {
                        const playPromise = videoPlayer.play()
                        if (playPromise !== undefined) {
                            playPromise.then(() => {
                                console.log('✅✅✅ 视频播放成功')
                                addLog('视频播放成功', 'success')
                                stopSessionPolling()
                            }).catch(error => {
                                console.error('❌❌❌ 视频播放失败:', error)
                                biliMessage.error('视频播放失败，请重试')
                            })
                        }
                    }

                    // 监听视频播放错误（当后端关闭时，可能会触发此事件）
                    videoPlayer.onerror = (error) => {
                        console.error('❌ 视频播放出错:', error)
                        addLog('视频播放出错', 'error')
                        if (isStreaming.value) {
                            handleConnectionLost('视频播放错误')
                        }
                    }
                }

                // 监听远程流中的 track 结束事件
                remoteStream?.getTracks().forEach(track => {
                    track.onended = () => {
                        console.warn('⚠️ 视频流 track 已结束')
                        addLog('视频流已结束', 'warning')
                        if (isStreaming.value) {
                            handleConnectionLost('视频流结束')
                        }
                    }
                })
            }
        }

        // 🔥 关键: 监听 ICE candidates - 完全参照HTML测试页面
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                iceCandidateSentCount++
                const candidate = event.candidate

                console.log(`⚡ 收集到 ICE candidate #${iceCandidateSentCount}`)
                console.log(`   - candidate: ${candidate.candidate.substring(0, 80)}...`)
                console.log(`   - sdpMid: ${candidate.sdpMid}, sdpMLineIndex: ${candidate.sdpMLineIndex}`)

                // 创建唯一标识符用于去重
                const candidateKey = `${candidate.candidate}-${candidate.sdpMid}-${candidate.sdpMLineIndex}`

                // 检查是否已发送过这个 candidate
                if (sentIceCandidates.has(candidateKey)) {
                    console.log(`⏭️ 跳过重复的 ICE candidate [总计:${iceCandidateSentCount}]`)
                    return
                }

                // 标记为已发送
                sentIceCandidates.add(candidateKey)

                console.log(`📤 准备发送 ICE candidate #${iceCandidateSentCount} 到后端...`)

                const candidateData = {
                    candidate: candidate.candidate,
                    sdpMid: candidate.sdpMid,
                    sdpMLineIndex: candidate.sdpMLineIndex
                }

                // 发送到后端 - 直接调用API，绕过businessHandler的复杂处理
                browserLiveControlApi.addWebrtcIceCandidate({
                    browser_id: browserId,
                    candidate: candidateData
                }).then(response => {
                    // 🔧 关键修复：直接处理API响应，不依赖businessHandler
                    if (response.code === 0) {
                        console.log(`✅ ICE candidate #${iceCandidateSentCount} 发送成功`)
                        addLog(`ICE candidate #${iceCandidateSentCount} 发送成功`, 'info')
                    } else {
                        console.warn(`⚠️ ICE candidate #${iceCandidateSentCount} 发送失败:`, response.msg)
                        addLog(`ICE candidate 发送失败: ${response.msg}`, 'warn')
                        // 🔧 关键：局域网环境ICE candidate发送失败是正常的，不影响连接
                        console.warn('⚠️ 局域网环境ICE candidate发送失败是正常的，不影响连接建立')
                    }
                    // 🔧 重要：无论成功失败都增加计数器
                    iceCandidateSentCount++
                }).catch(error => {
                    console.warn(`⚠️ 发送 ICE candidate 失败:`, error)
                    addLog(`ICE candidate 发送异常: ${error}`, 'warn')
                    // 🔧 关键：局域网环境ICE candidate发送失败是正常的，不影响连接
                    console.warn('⚠️ 局域网环境ICE candidate发送失败是正常的，不影响连接建立')
                    // 🔧 重要：即使发送失败，也增加成功计数器
                    iceCandidateSentCount++
                })
            } else {
                console.log('🎉 ICE 候选收集完成，总数:', iceCandidateSentCount)
                addLog(`ICE 候选收集完成，总数: ${iceCandidateSentCount}`, 'success')
                isGatheringIce.value = false
            }
        }

        // 监听 ICE 连接状态变化
        peerConnection.oniceconnectionstatechange = () => {
            console.log('🧊 ICE 连接状态:', peerConnection?.iceConnectionState)

            // 🔧 关键优化：如果已经成功接收到视频流，放宽ICE连接状态检查
            const hasVideoStream = remoteStream && remoteStream.getTracks().length > 0

            if (peerConnection?.iceConnectionState === 'connected') {
                console.log('🎉 WebRTC 视频连接已建立！')
                addLog('WebRTC 视频连接已建立', 'success')
                biliMessage.success('视频流连接成功')
                reconnectAttempts.value = 0
                isReconnecting.value = false
                reconnectError.value = ''
            } else if (peerConnection?.iceConnectionState === 'failed') {
                console.error('❌ WebRTC 连接失败')
                addLog('WebRTC 连接失败', 'error')
                biliMessage.error('视频流连接失败')
                handleConnectionLost('ICE连接失败')
            } else if (peerConnection?.iceConnectionState === 'disconnected') {
                console.warn('⚠️ ICE 连接已断开')

                // 🔧 关键改进：如果已经有视频流，不立即重连
                if (hasVideoStream) {
                    console.log('📹 已有视频流，ICE断开可能只是状态问题，延迟重连检查')
                    setTimeout(() => {
                        // 检查视频流是否仍然有效
                        const tracksStillActive = remoteStream?.getTracks().some(track => track.readyState === 'live')
                        if (tracksStillActive) {
                            console.log('✅ 视频流仍在活动，ICE断开不影响使用，无需重连')
                            return
                        }

                        if (peerConnection?.iceConnectionState === 'disconnected') {
                            console.warn('⚠️ ICE 连接长时间断开且视频流已中断，触发重连')
                            handleConnectionLost('ICE连接断开')
                        }
                    }, 10000) // 等待10秒再判断
                } else {
                    // 没有视频流的情况，正常处理
                    setTimeout(() => {
                        if (peerConnection?.iceConnectionState === 'disconnected') {
                            console.warn('⚠️ ICE 连接长时间断开，触发重连')
                            handleConnectionLost('ICE连接断开')
                        }
                    }, 5000)
                }
            }
        }

        // 监听连接状态变化（比 ICE 状态更上层）
        peerConnection.onconnectionstatechange = () => {
            console.log('🔗 连接状态:', peerConnection?.connectionState)

            if (peerConnection?.connectionState === 'connected') {
                console.log('✅ WebRTC 连接已建立')
            } else if (peerConnection?.connectionState === 'failed') {
                console.error('❌ WebRTC 连接失败')
                addLog('WebRTC 连接失败', 'error')
                handleConnectionLost('连接失败')
            } else if (peerConnection?.connectionState === 'disconnected') {
                console.warn('⚠️ WebRTC 连接已断开')
                addLog('WebRTC 连接已断开', 'warning')
                // 连接断开时立即尝试重连
                handleConnectionLost('连接断开')
            } else if (peerConnection?.connectionState === 'closed') {
                console.log('🔒 WebRTC 连接已关闭')
                addLog('WebRTC 连接已关闭', 'info')
                stopVideoStream()
            }
        }

        // 监听信令状态变化
        peerConnection.onsignalingstatechange = () => {
            console.log('📡 Signaling 状态:', peerConnection?.signalingState)
        }

        // 4. 设置远程描述
        console.log('设置远程 offer...')
        addLog('设置远程 offer', 'info')
        await peerConnection.setRemoteDescription({
            type: 'offer',
            sdp: offer.sdp || ''
        })
        console.log('远程 offer 设置成功')
        addLog('远程 offer 设置成功', 'success')

        // 5. 获取并添加服务端的 ICE candidates - 参照HTML页面逻辑
        console.log('📥 请求服务端的 ICE candidates...')
        addLog('请求服务端的 ICE candidates', 'info')
        const iceCandidatesResult = await businessHandler(
            browserLiveControlApi.getWebrtcIceCandidates({
                browser_id: browserId
            })
        )

        if (iceCandidatesResult.success && iceCandidatesResult.data) {
            const serverCandidates = iceCandidatesResult.data.candidates || []
            const iceGatheringState = iceCandidatesResult.data.ice_gathering_state

            console.log(`📦 收到 ${serverCandidates.length} 个服务端 ICE candidates`)
            console.log(`📊 服务端 ICE gathering 状态: ${iceGatheringState}`)
            addLog(`收到 ${serverCandidates.length} 个服务端 ICE candidates`, 'info')

            // 添加服务端的 ICE candidates
            for (const serverCandidate of serverCandidates) {
                try {
                    await peerConnection.addIceCandidate(serverCandidate)
                    console.log(`✅ 添加服务端 ICE candidate: ${serverCandidate.candidate?.substring(0, 50) || 'N/A'}...`)
                    addLog(`添加服务端 ICE candidate 成功`, 'debug')
                } catch (error) {
                    console.error(`❌ 添加服务端 ICE candidate 失败:`, error)
                    addLog(`添加服务端 ICE candidate 失败: ${error}`, 'error')
                }
            }
            console.log(`✅ 已添加 ${serverCandidates.length} 个服务端 ICE candidates`)
            addLog(`已添加 ${serverCandidates.length} 个服务端 ICE candidates`, 'success')
        } else {
            console.warn(`⚠️ 获取服务端 ICE candidates 失败:`, iceCandidatesResult.msg)
            addLog(`获取服务端 ICE candidates 失败: ${iceCandidatesResult.msg}`, 'warn')
        }

        // 6. 创建 answer
        console.log('创建 WebRTC answer...')
        addLog('创建 WebRTC answer', 'info')
        const answer = await peerConnection.createAnswer()
        await peerConnection.setLocalDescription(answer)
        console.log('本地 answer 设置成功')
        addLog('本地 answer 设置成功', 'success')

        // 7. 发送 answer 到服务端
        console.log('发送 WebRTC answer 到服务端...')
        addLog('发送 WebRTC answer 到服务端', 'info')
        const answerResult = await businessHandler(
            browserLiveControlApi.setWebrtcAnswer({
                browser_id: browserId,
                sdp: answer.sdp || ''
            })
        )

        // 🔧 关键修复：等待 ICE gathering 完成 - 完全参照HTML页面逻辑
        console.log(`🔍 当前 ICE gathering 状态: ${peerConnection.iceGatheringState}`)
        addLog(`当前 ICE gathering 状态: ${peerConnection.iceGatheringState}`, 'debug')

        if (peerConnection.iceGatheringState === 'new' || peerConnection.iceGatheringState === 'gathering') {
            console.log('⏳ 等待 ICE gathering 完成...')
            addLog('等待 ICE gathering 完成...', 'info')

            // 等待 ICE gathering 完成
            await new Promise<void>((resolve) => {
                const checkInterval = setInterval(() => {
                    if (peerConnection && peerConnection.iceGatheringState === 'complete') {
                        clearInterval(checkInterval)
                        resolve()
                    }
                }, 100)

                // 超时保护（15秒，增加超时时间）
                setTimeout(() => {
                    clearInterval(checkInterval)
                    if (peerConnection && peerConnection.iceGatheringState !== 'complete') {
                        console.log(`⚠️ ICE gathering 未在预期时间内完成（当前状态: ${peerConnection.iceGatheringState}，已收集 ${iceCandidateSentCount} 个 candidates），继续发送 answer`)
                        addLog(`ICE gathering 未在预期时间内完成，继续发送 answer`, 'warn')
                    }
                    resolve()
                }, 15000)
            })
        }

        console.log('answer 发送成功，等待 ICE 连接建立...')
        addLog('answer 发送成功，等待 ICE 连接建立...', 'success')

    } catch (error) {
        console.error('设置 WebRTC 流失败:', error)
        sessionInfo.value.status = 'disconnected'
        // 重置重连状态
        isReconnecting.value = false
        reconnectError.value = ''
        throw error
    }
}

// 关闭 WebRTC 连接
const closeWebRTCConnection = () => {
    console.log('🔄 开始关闭 WebRTC 连接...')

    // 先移除事件监听器,防止在关闭过程中继续发送 ICE candidates
    if (peerConnection) {
        peerConnection.onicecandidate = null
        peerConnection.onconnectionstatechange = null
        peerConnection.oniceconnectionstatechange = null
        peerConnection.onsignalingstatechange = null
        peerConnection.ontrack = null
    }

    if (peerConnection) {
        peerConnection.close()
        peerConnection = null
    }

    if (remoteStream) {
        remoteStream.getTracks().forEach(track => track.stop())
        remoteStream = null
    }

    if (webrtcBrowserId) {
        businessHandler(browserLiveControlApi.closeWebrtcConnection(webrtcBrowserId))
            .catch(error => {
                console.error('关闭服务器 WebRTC 连接失败:', error)
            })
        webrtcBrowserId = null
    }

    // 清空已发送的 ICE candidates 集合
    console.log(`清理 ICE candidates: 本次连接共发送 ${iceCandidateSentCount} 个候选`)
    sentIceCandidates.clear()
    iceCandidateSentCount = 0
}

// 停止视频流
const stopVideoStream = () => {
    isWebrtcConnecting = false  // 重置连接标志
    isDisconnecting.value = true
    isStreaming.value = false
    closeWebRTCConnection()
    stopSessionPolling()
    stopHeartbeat()  // 停止心跳发送

    const videoPlayer = videoPlayerRef.value?.videoPlayer
    if (videoPlayer) {
        videoPlayer.pause()

        const src = videoPlayer.src
        if (src && src.startsWith('blob:')) {
            URL.revokeObjectURL(src)
        }

        if (currentBlobUrl) {
            URL.revokeObjectURL(currentBlobUrl)
            currentBlobUrl = ''
        }

        videoPlayer.src = ''
        videoPlayer.load()
    }

    // 延迟重置断开状态
    setTimeout(() => {
        isDisconnecting.value = false
    }, 500)

    biliMessage.info('视频流已停止')
}

// 处理连接丢失并尝试重连
const handleConnectionLost = async (reason: string) => {
    // 如果已经在重连，跳过
    if (isReconnecting.value) return

    // 如果是用户主动停止，不进行重连
    if (!isStreaming.value) return

    // 检查重连次数
    if (reconnectAttempts.value >= maxReconnectAttempts) {
        console.error('❌ 达到最大重连次数，停止重连')
        reconnectError.value = reason
        isReconnecting.value = false
        biliMessage.error(`连接已断开，重连失败：${reason}`)
        addLog(`连接失败: ${reason} (已尝试 ${maxReconnectAttempts} 次重连)`, 'error')
        // 停止视频流，黑屏
        stopVideoStreamWithBlackScreen()
        return
    }

    console.warn(`⚠️ 检测到连接丢失: ${reason}，准备重连 (第 ${reconnectAttempts.value + 1}/${maxReconnectAttempts} 次)`)
    addLog(`连接断开: ${reason}，正在重连 (${reconnectAttempts.value + 1}/${maxReconnectAttempts})...`, 'warning')

    isReconnecting.value = true
    reconnectAttempts.value++

    // 关闭现有连接
    closeWebRTCConnection()

    // 延迟2秒后重连
    await new Promise(resolve => setTimeout(resolve, 2000))

    try {
        await startVideoStream()
        // 确保重连状态被重置
        isReconnecting.value = false
        reconnectError.value = ''
        biliMessage.success('重连成功')
        addLog('重连成功', 'success')
    } catch (error) {
        console.error('重连失败:', error)
        // 重连失败时也要重置重连状态，否则会一直显示"正在重连"
        isReconnecting.value = false
        addLog(`重连失败: ${error}`, 'error')
        // 重连失败会递归调用 handleConnectionLost，直到达到最大次数
        handleConnectionLost(reason)
    }
}

// 停止视频流并显示黑屏（重连失败时使用）
const stopVideoStreamWithBlackScreen = () => {
    isWebrtcConnecting = false
    isStreaming.value = false
    isReconnecting.value = false
    closeWebRTCConnection()
    stopSessionPolling()
    stopHeartbeat()  // 停止心跳发送

    const videoPlayer = videoPlayerRef.value?.videoPlayer
    if (videoPlayer) {
        videoPlayer.pause()

        const src = videoPlayer.src
        if (src && src.startsWith('blob:')) {
            URL.revokeObjectURL(src)
        }

        if (currentBlobUrl) {
            URL.revokeObjectURL(currentBlobUrl)
            currentBlobUrl = ''
        }

        // 黑屏处理：清空 src 并设置为黑屏
        videoPlayer.src = ''
        videoPlayer.load()
        // 创建一个黑色画布作为视频背景
        videoPlayer.style.backgroundColor = '#000000'
    }
}

// 截图
const takeScreenshot = async () => {
    if (!currentFingerprint.value) return

    try {
        console.log('📸 开始截图...')
        addLog('开始截图', 'info')

        const blob = await browserLiveControlApi.getScreenshot({
            browser_id: currentFingerprint.value.id_str,
            request: { quality: 80 }
        })

        console.log('📸 截图返回的 Blob:', blob)
        console.log('📸 Blob type:', blob.type)
        console.log('📸 Blob size:', blob.size)
        if (blob.type == "application/json") {
            console.error('❌ 返回的不是图片类型:', blob)
            biliMessage.error('截图失败')
            return
        }
        if (!(blob instanceof Blob)) {
            console.error('❌ 返回的不是 Blob 类型:', blob)
            biliMessage.error('截图失败')
            return
        }

        if (blob.size === 0) {
            console.error('❌ 返回的 Blob 大小为 0')
            biliMessage.error('截图数据为空')
            return
        }

        try {
            const base64Data = await blobToBase64(blob)
            console.log('📸 base64 数据长度:', base64Data.length)
            console.log('📸 base64 前50个字符:', base64Data.substring(0, 50))
            screenshotUrl.value = base64Data
            biliMessage.success('截图成功')
            addLog('截图成功', 'success')
        } catch (error) {
            console.error('❌ Blob 转 base64 失败:', error)
            addLog(`截图处理失败: ${error}`, 'error')
            biliMessage.error('截图处理失败')
        }
    } catch (error) {
        console.error('❌ 截图失败:', error)
        addLog(`截图失败: ${error}`, 'error')
        biliMessage.error('截图失败')
    }
}

// 导航到URL
const handleNavigate = async (url: string) => {
    if (!url || !currentFingerprint.value) return

    try {
        const sessionReady = await ensureSessionExists()
        if (!sessionReady) {
            biliMessage.error('无法创建浏览器会话')
            return
        }

        const result = await businessHandler(
            browserLiveControlApi.navigateToUrl({
                browser_id: currentFingerprint.value.id_str,
                request: { url }
            })
        )

        if (result.success) {
            biliMessage.success('导航成功')
            executionResult.value = `导航到: ${url}`
        }
    } catch (error) {
        biliMessage.error('导航失败')
    }
}

// 执行JavaScript
const executeJavaScript = async (code: string) => {
    if (!code || !currentFingerprint.value) return

    try {
        const sessionReady = await ensureSessionExists()
        if (!sessionReady) {
            biliMessage.error('无法创建浏览器会话')
            return
        }

        const result = await businessHandler(
            browserLiveControlApi.executeJavaScript({
                browser_id: currentFingerprint.value.id_str,
                request: { code }
            })
        )

        if (result.success) {
            executionResult.value = `执行结果: ${JSON.stringify(result.data, null, 2)}`
            biliMessage.success('JavaScript执行成功')
        }
    } catch (error) {
        biliMessage.error('JavaScript执行失败')
    }
}

// 安全执行JavaScript
const safeExecuteJavaScript = async (code: string) => {
    if (!code || !currentFingerprint.value) return

    try {
        const sessionReady = await ensureSessionExists()
        if (!sessionReady) {
            biliMessage.error('无法创建浏览器会话')
            return
        }

        const result = await businessHandler(
            browserLiveControlApi.safeExecuteJavaScript({
                browser_id: currentFingerprint.value.id_str,
                request: { code }
            })
        )

        if (result.success) {
            executionResult.value = `安全执行结果: ${JSON.stringify(result.data, null, 2)}`
            biliMessage.success('JavaScript安全执行成功')
        }
    } catch (error) {
        biliMessage.error('JavaScript安全执行失败')
    }
}

// 切换人工模式
const toggleManualMode = async () => {
    if (!currentFingerprint.value) return

    try {
        if (isManualMode.value) {
            const result = await businessHandler(
                browserLiveControlApi.stopManualOperation({
                    browser_id: currentFingerprint.value.id_str,
                    request: { force: false }
                })
            )

            if (result.success) {
                isManualMode.value = false
                biliMessage.success('已停止人工操作')
            }
        } else {
            const sessionReady = await ensureSessionExists()
            if (!sessionReady) {
                biliMessage.error('无法创建浏览器会话')
                return
            }

            const result = await businessHandler(
                browserLiveControlApi.pausePlugins({
                    browser_id: currentFingerprint.value.id_str
                })
            )

            if (result.success) {
                isManualMode.value = true
                arePluginsPaused.value = true
                biliMessage.success('已开始人工操作')
            }
        }
    } catch (error) {
        biliMessage.error('切换人工模式失败')
    }
}

// 切换插件状态
const togglePlugins = async () => {
    if (!currentFingerprint.value) return

    try {
        if (arePluginsPaused.value) {
            const result = await businessHandler(
                browserLiveControlApi.stopManualOperation({
                    browser_id: currentFingerprint.value.id_str,
                    request: { force: false, reason: '恢复插件自动操作' }
                })
            )

            if (result.success) {
                arePluginsPaused.value = false
                isManualMode.value = false
                biliMessage.success('插件已恢复')
            }
        } else {
            const sessionReady = await ensureSessionExists()
            if (!sessionReady) {
                biliMessage.error('无法创建浏览器会话')
                return
            }

            const result = await businessHandler(
                browserLiveControlApi.pausePlugins({
                    browser_id: currentFingerprint.value.id_str
                })
            )

            if (result.success) {
                arePluginsPaused.value = true
                biliMessage.success('插件已暂停')
            }
        }
    } catch (error) {
        biliMessage.error('切换插件状态失败')
    }
}

// 执行点击操作
const performClick = async (coords: { x: number; y: number }) => {
    if (!currentFingerprint.value) return

    try {
        const sessionReady = await ensureSessionExists()
        if (!sessionReady) {
            biliMessage.error('无法创建浏览器会话')
            return
        }

        const result = await businessHandler(
            browserLiveControlApi.clickElement({
                browser_id: currentFingerprint.value.id_str,
                request: {
                    x: coords.x,
                    y: coords.y,
                    button: 'left',
                    double: false,
                    wait_after: 0
                }
            })
        )

        if (result.success) {
            executionResult.value = `点击位置: (${coords.x}, ${coords.y}) - 成功`
            biliMessage.success('点击操作成功')
        }
    } catch (error) {
        biliMessage.error('点击操作失败')
    }
}

// 清空执行结果
const clearResult = () => {
    executionResult.value = ''
}

// 处理关闭
const handleClose = () => {
    stopVideoStream()
    stopSessionPolling()
    stopHeartbeat()  // 停止心跳发送
    visible.value = false
}

// 处理保存
const handleSave = () => {
    biliMessage.success('配置保存成功')
    handleClose()
}

// 显示 WebRTC 调试信息
const showWebRTCDebug = () => {
    console.log('🔧 showWebRTCDebug 函数被调用')
    console.log('📍 当前函数作用域:', { peerConnection, remoteStream, videoPlayerRef })

    // 立即显示消息验证函数被调用
    biliMessage.info('调试信息正在加载...')

    try {
        const debugInfo = {
            isConnected: !!peerConnection,
            connectionState: peerConnection?.connectionState || 'N/A',
            iceConnectionState: peerConnection?.iceConnectionState || 'N/A',
            iceGatheringState: peerConnection?.iceGatheringState || 'N/A',
            hasRemoteStream: !!remoteStream,
            videoElementSrc: videoPlayerRef.value?.videoPlayer?.src || 'N/A',
            videoElementSrcObject: !!videoPlayerRef.value?.videoPlayer?.srcObject,
            videoPlayerRefExists: !!videoPlayerRef.value,
            videoPlayerElementExists: !!videoPlayerRef.value?.videoPlayer,
            browserId: webrtcBrowserId || 'N/A',
            currentFingerprintId: currentFingerprint.value?.id_str || 'N/A',
            isStreaming: isStreaming.value,
            sessionInfo: {
                status: sessionInfo.value.status || 'N/A',
                video_streaming: sessionInfo.value.video_streaming || false,
                manual_mode: sessionInfo.value.manual_mode || false,
                active_connections: sessionInfo.value.active_connections || 0
            }
        }

        console.log('📊 WebRTC 调试信息:', debugInfo)
        console.log('🚀 准备显示调试信息...')

        // 先用 ElMessage 测试
        const debugText = JSON.stringify(debugInfo, null, 2)
        console.log('📝 调试文本长度:', debugText.length)

        // 使用 console.log 在控制台输出,便于查看
        console.log('='.repeat(80))
        console.log('WebRTC 调试信息:')
        console.log(debugText)
        console.log('='.repeat(80))

        ElMessageBox.alert(
            `<pre style="text-align: left; white-space: pre-wrap; word-wrap: break-word; font-size: 12px;">${debugText}</pre>`,
            'WebRTC 调试信息',
            {
                dangerouslyUseHTMLString: true,
                confirmButtonText: '确定',
                closeOnClickModal: true,
                closeOnPressEscape: true,
                customStyle: { width: '700px' },
                customClass: 'webrtc-debug-dialog'
            }
        ).then(() => {
            console.log('✅ 对话框显示成功')
        }).catch((error) => {
            console.log('❌ 对话框被关闭或失败:', error)
        })
    } catch (error) {
        console.error('❌ 显示调试信息失败:', error)
        console.error('错误堆栈:', (error as Error)?.stack)
        biliMessage.error('获取调试信息失败: ' + (error as Error).message)
    }
}
</script>

<style scoped>
.real-time-control-modal {
    :deep(.el-dialog) {
        max-height: 94vh;
        display: flex;
        flex-direction: column;
    }

    :deep(.el-dialog__body) {
        flex: 1;
        overflow: hidden;
        padding: 0;
    }
}

.control-container {
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 0;
    height: 82vh;
}

/* 主区域 */
.main-section {
    display: flex;
    flex-direction: column;
    padding: 16px;
    border-right: 1px solid var(--el-border-color);
}

/* 视频区域包装器 */
.video-section-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0;
    overflow: hidden;
}

/* 高级控制面板 */
.advanced-section {
    padding: 16px;
    overflow-y: auto;
}

/* 响应式设计 */
@media (max-width: 1400px) {
    .control-container {
        grid-template-columns: 1fr;
        grid-template-rows: auto 1fr;
        height: auto;
    }

    .advanced-section {
        border-top: 1px solid var(--el-border-color);
    }
}

/* WebRTC 调试对话框样式 */
:deep(.webrtc-debug-dialog) {
    .el-message-box__message {
        padding: 10px 20px;
        max-height: 500px;
        overflow-y: auto;
    }

    pre {
        background: #f5f5f5;
        padding: 12px;
        border-radius: 4px;
        margin: 0;
        border: 1px solid #e0e0e0;
    }
}
</style>
