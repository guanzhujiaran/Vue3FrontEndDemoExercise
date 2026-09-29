<script setup lang="ts">
/**
 * 播放器中央大播放按钮（参考 B 站直播播放器）
 *
 * 统一「未开播 → 启动直播」与「已暂停 → 继续播放」两个入口：
 * 用户只需要认这一个按钮，工具栏不再放「启动直播」按钮。
 */
interface Props {
  title: string
  disabled?: boolean
  /** 启动中：三角换成转圈，避免用户以为点击没生效 */
  loading?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'click'): void
}>()
</script>

<template>
  <button
    type="button"
    class="live-center-play-btn absolute inset-0 m-auto flex h-16 w-16 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:scale-105 hover:bg-black/60 disabled:opacity-50"
    :title="props.title"
    :disabled="props.disabled || props.loading"
    @click="emit('click')"
  >
    <span
      v-if="props.loading"
      class="h-7 w-7 animate-spin rounded-full border-2 border-white/20 border-t-white/80"
    ></span>
    <svg v-else viewBox="0 0 24 24" class="ml-0.5 h-7 w-7" fill="currentColor" aria-hidden="true">
      <path d="M8 5.14v13.72a1 1 0 0 0 1.54.84l10.29-6.86a1 1 0 0 0 0-1.68L9.54 4.3A1 1 0 0 0 8 5.14Z" />
    </svg>
  </button>
</template>
