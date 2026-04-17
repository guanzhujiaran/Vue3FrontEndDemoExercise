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
            <div class="flex items-center gap-1.5 text-[13px]">
                <el-tag :type="sessionStatus.type" size="small" effect="dark">
                    <span class="status-dot" :class="connectionStatusClass"></span>
                    {{ sessionStatus.text }}
                </el-tag>
            </div>
            <div class="flex items-center gap-1.5 text-[13px]">
                <el-icon><User /></el-icon>
                <span>连接数: {{ (sessionInfo as any).active_connections || sessionInfo.connections || 0 }}</span>
            </div>
            <div class="flex items-center gap-1.5 text-[13px]">
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
                <div class="flex flex-col items-center gap-4">
                    <el-icon class="is-loading fill-primary" :size="60"><Loading /></el-icon>
                    <p class="text-white text-[14px] m-0">{{ props.isReconnecting ? '正在重连...' : loadingText }}</p>
                </div>
            </div>

            <!-- 重连错误提示 -->
            <div v-if="reconnectError && !isStreaming" class="error-overlay">
                <el-icon :size="48" class="fill-danger"><CircleClose /></el-icon>
                <p class="text-[var(--el-color-danger)] text-[18px] font-semibold m-0 text-center px-5">{{ reconnectError }}</p>
                <p class="text-white text-[14px] m-0 text-center px-5 opacity-80">连接已断开，请点击"开始视频"重新连接</p>
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
                    <div class="flex items-center gap-3">
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
                    <div class="flex items-center gap-3">
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
            <div class="w-full h-full flex items-center justify-center p-5">
                <el-image
                    :src="screenshotUrl"
                    fit="contain"
                    class="screenshot-preview-image"
                    :preview-src-list="[screenshotUrl]"
                    :initial-index="0"
                    preview-teleported
                >
                    <template #error>
                        <div class="flex flex-col items-center justify-center h-[400px] text-[var(--el-color-error)]">
                            <el-icon :size="60" class="fill-error">
                                <CircleClose />
                            </el-icon>
                            <p class="mt-4 text-[14px]">图片加载失败</p>
                        </div>
                    </template>
                </el-image>
            </div>

            <template #footer>
                <div class="flex justify-center gap-3 py-5">
                    <el-button @click="downloadScreenshot" type="primary" size="large" class="min-w-[120px]">
                        下载截图
                    </el-button>
                    <el-button @click="copyScreenshotToClipboard" type="success" size="large" class="min-w-[120px]">
                        复制到剪贴板
                    </el-button>
                    <el-button @click="showScreenshotPreview = false" size="large" class="min-w-[120px]">
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
        const biliMessage = (await import('@/utils/message')).default
        biliMessage.success('截图已复制到剪贴板')
    } catch (error) {
        console.error('复制截图失败:', error)
        const biliMessage = (await import('@/utils/message')).default
        biliMessage.error('复制截图失败，请检查浏览器权限')
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
    @apply flex-1 flex flex-col bg-black rounded-[var(--size-radius-large)] overflow-hidden shadow-[var(--el-box-shadow)] min-h-0;
}

/* URL导航栏 */
.url-navigation-bar {
    @apply flex items-center gap-2 px-4 py-2.5 bg-gradient-to-b from-black/80 to-black/60 backdrop-blur-sm border-b border-white/10;
}

.url-input {
    @apply flex-1;
}

.url-input :deep(.el-input-group__prepend) {
    @apply bg-white/10 border-none text-white;
}

.url-input :deep(.el-input__wrapper) {
    @apply bg-white/15 border-none shadow-none;
}

.url-input :deep(.el-input__inner) {
    @apply text-white font-mono;
}

.url-input :deep(.el-input__inner::placeholder) {
    color: rgba(255, 255, 255, 0.5);
}

.video-info-bar {
    @apply flex items-center justify-between px-4 py-2.5 bg-gradient-to-b from-black/70 to-black/50 backdrop-blur-sm text-white border-b border-white/10;
}

.status-dot {
    @apply w-2 h-2 rounded-full;
    animation: pulse 2s ease-in-out infinite;
}

/* 截图预览样式 */
.screenshot-preview-dialog :deep(.el-dialog) {
    @apply bg-black/90 backdrop-blur-md;
}

.screenshot-preview-dialog :deep(.el-dialog__header) {
    @apply bg-transparent border-b border-white/10 text-white;
}

.screenshot-preview-dialog :deep(.el-dialog__body) {
    @apply p-0 flex items-center justify-center bg-transparent;
}

.screenshot-preview-image {
    @apply max-w-full max-h-full object-contain rounded-lg shadow-2xl shadow-black/50;
}

.status-connected .status-dot {
    @apply bg-[var(--color-success)] shadow-[0_0_8px_rgba(34,197,94,0.5)];
}

.status-connecting .status-dot {
    @apply bg-[var(--color-warning)] shadow-[0_0_8px_rgba(234,179,8,0.5)];
}

.status-disconnected .status-dot {
    @apply bg-[var(--color-danger)] shadow-[0_0_8px_rgba(239,68,68,0.5)] !animate-none;
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}

.video-wrapper {
    @apply flex-1 relative bg-[var(--el-bg-color)] overflow-hidden min-h-[var(--spacing-16)] min-w-[var(--spacing-20)] w-full h-full flex items-center justify-center;
}

.video-wrapper.black-screen {
    @apply bg-black;
}

/* 加载遮罩层 */
.loading-mask {
    @apply absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-10;
}

.loading-content .el-icon.is-loading {
    animation: rotating 2s linear infinite;
}

@keyframes rotating {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

/* 错误提示层 */
.error-overlay {
    @apply absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm z-15 gap-4;
}

.video-element {
    @apply max-w-full max-h-full w-auto h-auto object-contain bg-black block mx-auto;
}

/* 视频控制条 - B站风格 */
.video-control-bar {
    @apply absolute bottom-0 left-0 right-0 flex items-center justify-between px-5 py-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent backdrop-blur-md z-20 transition-opacity duration-300;
}

.control-button {
    @apply bg-white/10 border-none text-white w-11 h-11 transition-all duration-200;
}

.control-button:hover {
    @apply bg-white/25 scale-110;
}

.control-button :deep(.el-icon) {
    @apply text-[20px];
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
        @apply flex-col items-stretch;
    }

    .video-info-bar span {
        @apply hidden;
    }

    .video-info-bar :deep(.el-tag) span {
        @apply inline;
    }

    .video-wrapper {
        @apply min-h-[var(--spacing-12)] min-w-full;
    }

    .control-button {
        @apply w-9 h-9;
    }

    .control-button :deep(.el-icon) {
        @apply text-[18px];
    }
}
</style>
