<!--
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-12-15 00:00:00
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-12-24 00:00:00
 * @FilePath: \Vue3FrontEndDemoExercise\src\components\browser\RealTimeControlModal\VideoPlayer.vue
 * @Description: 视频播放器组件
-->
<template>
    <div class="video-player-container">
        <!-- URL导航栏 -->
        <div class="url-navigation-bar">
            <el-input
                v-model="navigateUrl"
                placeholder="输入URL地址"
                clearable
                @keyup.enter="handleNavigate"
                size="small"
                class="url-input"
            >
                <template #prepend>
                    <el-icon><Promotion /></el-icon>
                </template>
            </el-input>
            <el-button type="primary" size="small" @click="handleNavigate">前往</el-button>
        </div>

        <div class="video-info-bar">
            <div class="info-item">
                <el-tag :type="sessionStatus.type" size="small" effect="dark">
                    <span class="status-dot" :class="connectionStatusClass"></span>
                    {{ sessionStatus.text }}
                </el-tag>
            </div>
            <div class="info-item">
                <el-icon><User /></el-icon>
                <span>连接数: {{ (sessionInfo as any).active_connections || sessionInfo.connections || 0 }}</span>
            </div>
            <div class="info-item">
                <el-icon><Clock /></el-icon>
                <span>{{ formatTime((sessionInfo as any).last_heartbeat || sessionInfo.lastActivity) }}</span>
            </div>
        </div>

        <div
            class="video-wrapper"
            @mouseenter="showControls = true"
            @mouseleave="showControls = false"
            :class="{ 'black-screen': reconnectError && !isStreaming }"
        >
            <!-- 加载遮罩层 -->
            <div v-if="showLoadingMask || props.isReconnecting" class="loading-mask">
                <div class="loading-content">
                    <el-icon class="is-loading" :size="60" color="var(--el-color-primary)"><Loading /></el-icon>
                    <p class="loading-text">{{ props.isReconnecting ? '正在重连...' : loadingText }}</p>
                </div>
            </div>

            <!-- 重连错误提示 -->
            <div v-if="reconnectError && !isStreaming" class="error-overlay">
                <el-icon :size="48" color="var(--el-color-danger)"><CircleClose /></el-icon>
                <p class="error-text">{{ reconnectError }}</p>
                <p class="error-subtext">连接已断开，请点击"开始视频"重新连接</p>
            </div>

            <video
                v-if="isStreaming"
                ref="videoPlayer"
                :autoplay="isStreaming"
                playsinline
                muted
                class="video-element"
                @loadedmetadata="$emit('videoMetadataLoaded')"
                @loadeddata="$emit('videoDataLoaded')"
            >
                您的浏览器不支持视频播放
            </video>

            <!-- 视频控制条 - B站风格,悬浮时显示 -->
            <transition name="control-bar-fade">
                <div v-if="showControls" class="video-control-bar">
                    <div class="control-bar-left">
                        <el-button
                            :icon="Camera"
                            circle
                            size="large"
                            @click="$emit('takeScreenshot')"
                            class="control-button"
                            title="截图"
                        />
                        <el-button
                            :icon="props.isStreaming ? VideoPause : VideoPlay"
                            circle
                            size="large"
                            @click="$emit('toggleVideo')"
                            class="control-button"
                            :title="props.isStreaming ? '停止视频' : '开始视频'"
                        />
                    </div>
                    <div class="control-bar-right">
                        <el-button
                            :icon="DocumentCopy"
                            circle
                            size="large"
                            @click="handleDebug"
                            class="control-button"
                            title="调试"
                        />
                    </div>
                </div>
            </transition>
        </div>

        <!-- 截图预览模态框 -->
        <el-dialog
            v-model="showScreenshotPreview"
            title="截图预览"
            width="90%"
            :close-on-click-modal="true"
            :close-on-press-escape="true"
            class="screenshot-preview-dialog"
        >
            <div class="screenshot-preview-container">
                <el-image
                    :src="screenshotUrl"
                    fit="contain"
                    class="screenshot-preview-image"
                    :preview-src-list="[screenshotUrl]"
                    :initial-index="0"
                    preview-teleported
                >
                    <template #error>
                        <div class="image-error">
                            <el-icon :size="60" color="var(--el-color-error)">
                                <CircleClose />
                            </el-icon>
                            <p>图片加载失败</p>
                        </div>
                    </template>
                </el-image>
            </div>

            <template #footer>
                <div class="screenshot-preview-actions">
                    <el-button @click="downloadScreenshot" type="primary" size="large">
                        下载截图
                    </el-button>
                    <el-button @click="copyScreenshotToClipboard" type="success" size="large">
                        复制到剪贴板
                    </el-button>
                    <el-button @click="showScreenshotPreview = false" size="large">
                        关闭
                    </el-button>
                </div>
            </template>
        </el-dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
    VideoPlay,
    VideoPause,
    User,
    Clock,
    Camera,
    DocumentCopy,
    Loading,
    Promotion,
    CircleClose
} from '@element-plus/icons-vue'

// 保留 VideoPlay 和 VideoPause 用于视频流控制按钮的图标切换

interface SessionInfo {
    connections: number
    lastActivity: string
    status: string
    active_connections?: number
    last_heartbeat?: number
    session_exists?: boolean
    browser_running?: boolean
    lifecycle_state?: string
    video_streaming?: boolean
    manual_mode?: boolean
    created_at?: number
    expires_at?: number | null
    cleanup_policy?: any
    message?: string
}

interface Props {
    isStreaming: boolean
    screenshotUrl: string
    sessionInfo: SessionInfo
    isDisconnecting?: boolean  // 是否正在主动断开连接
    isReconnecting?: boolean  // 是否正在重连
    reconnectError?: string  // 重连错误信息
    showDebugDialog?: boolean  // 是否显示调试对话框
    isGatheringIce?: boolean  // 是否正在收集ICE候选
}

const props = withDefaults(defineProps<Props>(), {
    isDisconnecting: false,
    isReconnecting: false,
    reconnectError: '',
    isGatheringIce: false
})

const emit = defineEmits<{
    'update:showDebugDialog': [value: boolean]
    videoMetadataLoaded: []
    videoDataLoaded: []
    toggleVideo: []
    takeScreenshot: []
    navigate: [url: string]
}>()

const videoPlayer = ref<HTMLVideoElement>()
const showControls = ref(false)  // 控制条显示状态
const navigateUrl = ref('')  // URL导航输入
const showScreenshotPreview = ref(false)  // 截图预览显示状态

const handleNavigate = () => {
    if (navigateUrl.value.trim()) {
        emit('navigate', navigateUrl.value)
        navigateUrl.value = ''
    }
}

// 下载截图
const downloadScreenshot = async () => {
    if (!props.screenshotUrl) return
    
    try {
        const response = await fetch(props.screenshotUrl)
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        
        const a = document.createElement('a')
        a.href = url
        a.download = `screenshot_${new Date().getTime()}.png`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        
        URL.revokeObjectURL(url)
    } catch (error) {
        console.error('下载截图失败:', error)
    }
}

// 复制截图到剪贴板
const copyScreenshotToClipboard = async () => {
    if (!props.screenshotUrl) return
    
    try {
        const response = await fetch(props.screenshotUrl)
        const blob = await response.blob()
        
        await navigator.clipboard.write([
            new ClipboardItem({
                [blob.type]: blob
            })
        ])
        
        // 显示成功消息
        const ElMessage = (await import('element-plus')).ElMessage
        ElMessage.success('截图已复制到剪贴板')
    } catch (error) {
        console.error('复制截图失败:', error)
        const ElMessage = (await import('element-plus')).ElMessage
        ElMessage.error('复制截图失败，请检查浏览器权限')
    }
}

const sessionStatus = computed(() => {
    const status = props.sessionInfo.status
    switch (status) {
        case 'connected':
        case 'running':
            return { type: 'success', text: '已连接' }
        case 'connecting':
            return { type: 'warning', text: '连接中' }
        case 'disconnected':
        case 'stopped':
            return { type: 'danger', text: '未连接' }
        default:
            return { type: 'info', text: '未知' }
    }
})

const connectionStatusClass = computed(() => {
    const status = props.sessionInfo.status
    return {
        'status-connected': status === 'connected' || status === 'running',
        'status-connecting': status === 'connecting',
        'status-disconnected': status === 'disconnected' || status === 'stopped'
    }
})

const showLoadingMask = computed(() => {
    // 只在连接中时显示加载遮罩，断开状态不显示（除非正在主动断开）
    // 同时也当正在收集ICE时显示加载遮罩
    return props.sessionInfo.status === 'connecting' ||
           (props.sessionInfo.status === 'disconnected' && props.isDisconnecting) ||
           props.isGatheringIce
})

const loadingText = computed(() => {
    const status = props.sessionInfo.status
    if (props.isGatheringIce) {
        return '正在建立连接...'
    }
    switch (status) {
        case 'connecting':
            return '正在连接...'
        case 'disconnected':
            return props.isDisconnecting ? '正在断开...' : '加载中...'
        default:
            return '加载中...'
    }
})

const formatTime = (timeValue: string | number) => {
    if (!timeValue) return '未知'
    
    // 如果是数字（时间戳），转换为日期字符串
    if (typeof timeValue === 'number') {
        const date = new Date(timeValue * 1000) // 后端返回的是秒级时间戳
        return date.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        })
    }
    
    // 如果是字符串，直接返回
    return timeValue
}

const handleDebug = () => {
    console.log('🔍 调试按钮被点击')
    console.log('📡 准备更新 showDebugDialog')
    try {
        emit('update:showDebugDialog', true)
        console.log('✅ showDebugDialog 已更新为 true')
    } catch (error) {
        console.error('❌ 更新失败:', error)
    }
}

// 监听截图URL变化，自动打开预览
watch(() => props.screenshotUrl, (newUrl) => {
    if (newUrl) {
        showScreenshotPreview.value = true
    }
})

defineExpose({
    videoPlayer
})
</script>

<style scoped>
.video-player-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: var(--el-color-black);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: var(--el-box-shadow);
    min-height: 0;
}

/* URL导航栏 */
.url-navigation-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    background: linear-gradient(180deg, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.6) 100%);
    backdrop-filter: blur(8px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.url-input {
    flex: 1;
}

.url-input :deep(.el-input-group__prepend) {
    background: rgba(255, 255, 255, 0.1);
    border: none;
    color: var(--el-color-white);
}

.url-input :deep(.el-input__wrapper) {
    background: rgba(255, 255, 255, 0.15);
    border: none;
    box-shadow: none;
}

.url-input :deep(.el-input__inner) {
    color: var(--el-color-white);
    font-family: 'Consolas', 'Monaco', monospace;
}

.url-input :deep(.el-input__inner::placeholder) {
    color: rgba(255, 255, 255, 0.5);
}

.video-info-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
    background: linear-gradient(180deg, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0.5) 100%);
    backdrop-filter: blur(8px);
    color: var(--el-color-white);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.info-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
}

.info-item :deep(.el-icon) {
    font-size: 16px;
}

.info-item :deep(.el-tag) {
    display: flex;
    align-items: center;
    gap: 6px;
}

.info-actions {
    display: flex;
    gap: 4px;
}

.info-actions :deep(.el-button) {
    color: var(--el-color-white);
}

.info-actions :deep(.el-button:hover) {
    background: rgba(255, 255, 255, 0.15);
}

.status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    animation: pulse 2s ease-in-out infinite;
}

/* 截图预览样式 */
.screenshot-preview-dialog :deep(.el-dialog) {
    background: rgba(0, 0, 0, 0.9);
    backdrop-filter: blur(10px);
}

.screenshot-preview-dialog :deep(.el-dialog__header) {
    background: transparent;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    color: var(--el-color-white);
}

.screenshot-preview-dialog :deep(.el-dialog__body) {
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
}

.screenshot-preview-container {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
}

.screenshot-preview-image {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    border-radius: 8px;
    box-shadow: 0 0 30px rgba(0, 0, 0, 0.5);
}

.screenshot-preview-actions {
    display: flex;
    justify-content: center;
    gap: 12px;
    padding: 20px 0;
}

.screenshot-preview-actions .el-button {
    min-width: 120px;
}

.image-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 400px;
    color: var(--el-color-error);
}

.image-error p {
    margin-top: 16px;
    font-size: 14px;
}

.status-connected .status-dot {
    background: var(--el-color-success);
    box-shadow: 0 0 8px rgba(82, 196, 26, 0.5);
}

.status-connecting .status-dot {
    background: var(--el-color-warning);
    box-shadow: 0 0 8px rgba(250, 173, 20, 0.5);
}

.status-disconnected .status-dot {
    background: var(--el-color-danger);
    box-shadow: 0 0 8px rgba(255, 77, 79, 0.5);
    animation: none;
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}

.video-wrapper {
    flex: 1;
    position: relative;
    background: var(--el-bg-color);
    overflow: hidden;
    min-height: 300px;
    min-width: 400px;
    /* 确保视频容器有固定尺寸 */
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
}

.video-wrapper.black-screen {
    background: #000000;
}

/* 加载遮罩层 */
.loading-mask {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(4px);
    z-index: 10;
}

.loading-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
}

.loading-content .el-icon.is-loading {
    animation: rotating 2s linear infinite;
}

@keyframes rotating {
    from {
        transform: rotate(0deg);
    }
    to {
        transform: rotate(360deg);
    }
}

.loading-text {
    color: var(--el-color-white);
    font-size: 14px;
    margin: 0;
}

/* 错误提示层 */
.error-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(8px);
    z-index: 15;
    gap: 16px;
}

.error-text {
    color: var(--el-color-danger);
    font-size: 18px;
    font-weight: 600;
    margin: 0;
    text-align: center;
    padding: 0 20px;
}

.error-subtext {
    color: var(--el-color-white);
    font-size: 14px;
    margin: 0;
    text-align: center;
    padding: 0 20px;
    opacity: 0.8;
}

.video-element {
    /* 保持视频元素最大尺寸不超过容器，但保持宽高比 */
    max-width: 100%;
    max-height: 100%;
    width: auto;
    height: auto;
    object-fit: contain;
    background: var(--el-color-black);
    /* 确保视频元素在容器中居中显示 */
    display: block;
    margin: 0 auto;
}

/* 视频控制条 - B站风格 */
.video-control-bar {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    background: linear-gradient(0deg, rgba(0, 0, 0, 0.9) 0%, rgba(0, 0, 0, 0.5) 70%, rgba(0, 0, 0, 0) 100%);
    backdrop-filter: blur(10px);
    z-index: 20;
    transition: opacity 0.3s ease;
}

.control-bar-left {
    display: flex;
    align-items: center;
    gap: 12px;
}

.control-bar-right {
    display: flex;
    align-items: center;
    gap: 12px;
}

.control-button {
    background: rgba(255, 255, 255, 0.1);
    border: none;
    color: #fff;
    width: 44px;
    height: 44px;
    transition: all 0.2s ease;
}

.control-button:hover {
    background: rgba(255, 255, 255, 0.25);
    transform: scale(1.1);
}

.control-button :deep(.el-icon) {
    font-size: 20px;
}

/* 控制条淡入淡出动画 */
.control-bar-fade-enter-active,
.control-bar-fade-leave-active {
    transition: opacity 0.3s ease;
}

.control-bar-fade-enter-from,
.control-bar-fade-leave-to {
    opacity: 0;
}

@media (max-width: 768px) {
    .url-navigation-bar {
        flex-direction: column;
        align-items: stretch;
    }

    .info-item span {
        display: none;
    }

    .info-item :deep(.el-tag) span {
        display: inline;
    }

    .video-wrapper {
        min-height: 250px;
        min-width: 100%;
    }

    .control-button {
        width: 36px;
        height: 36px;
    }

    .control-button :deep(.el-icon) {
        font-size: 18px;
    }
}
</style>
