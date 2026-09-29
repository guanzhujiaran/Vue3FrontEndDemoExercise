<script setup lang="ts">
import { VideoPause } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import type { LiveOverlayState } from '@/models/rpa_browser/live_stream'

/**
 * 直播画面覆盖层（各状态互斥，由父组件判定唯一状态后传入）
 *
 * - `suspended`：会话闲置挂起（关流保实例）→ 一键恢复
 * - `closing`：会话进入待关闭宽限期 → 一键续命
 * - `connecting`：建连中
 * - `stopped`：已断开
 * - `idle`：未开播（播放器空态；点击播放交给中央大按钮）
 * - `none`：播放中，不压任何东西
 */
interface Props {
  state: LiveOverlayState
  /** 闲置秒数（挂起提示） */
  idleSeconds?: number | null
  /** 距关闭的剩余秒数（宽限期倒计时） */
  closingCountdown?: number | null
  /** 恢复中：按钮转圈 */
  busy?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  /** 恢复直播（挂起）/ 续命（待关闭）：都会重新建流并刷新后端活跃时间 */
  (e: 'resume'): void
}>()

const { t } = useI18n()
</script>

<template>
  <div
    v-if="props.state === 'suspended'"
    class="live-overlay live-overlay--suspended absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/60"
  >
    <div class="text-center text-white">
      <el-icon><VideoPause /></el-icon>
      <div class="mt-4">{{ t('rpa.streamSuspended') }}</div>
      <div v-if="props.idleSeconds !== null && props.idleSeconds !== undefined" class="mt-1 text-sm text-white/80">
        {{ t('rpa.idleForSeconds', { seconds: props.idleSeconds }) }}
      </div>
    </div>
    <el-button type="primary" :loading="props.busy" @click="emit('resume')">
      {{ t('rpa.resumeStream') }}
    </el-button>
  </div>

  <div
    v-else-if="props.state === 'closing'"
    class="live-overlay live-overlay--closing absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/60"
  >
    <div class="text-center text-white">
      <el-icon><VideoPause /></el-icon>
      <div class="mt-4">{{ t('rpa.sessionClosingSoon') }}</div>
      <div
        v-if="props.closingCountdown !== null && props.closingCountdown !== undefined"
        class="mt-1 text-sm text-white/80"
      >
        {{ t('rpa.closingInSeconds', { seconds: props.closingCountdown }) }}
      </div>
    </div>
    <el-button type="warning" :loading="props.busy" @click="emit('resume')">
      {{ t('rpa.keepAlive') }}
    </el-button>
  </div>

  <div
    v-else-if="props.state === 'connecting'"
    class="live-overlay live-overlay--connecting absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70"
  >
    <span class="h-7 w-7 animate-spin rounded-full border-2 border-white/20 border-t-white/80"></span>
    <p class="text-sm text-white/65">{{ t('rpa.connecting') }}</p>
  </div>

  <!-- 已停止 / 未开播：只垫底 + 文案，播放入口交给中央大播放按钮（盖在其上）。
       pt-32 把文案压到按钮下方，避免与按钮重叠。 -->
  <div
    v-else-if="props.state === 'stopped'"
    class="live-overlay live-overlay--stopped absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 pt-32"
  >
    <p class="text-sm text-white/65">{{ t('rpa.streamStopped') }}</p>
  </div>

  <div
    v-else-if="props.state === 'idle'"
    class="live-overlay live-overlay--idle absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black pt-32"
  >
    <p class="text-sm text-white/55">{{ t('rpa.clickToStart') }}</p>
  </div>
</template>
