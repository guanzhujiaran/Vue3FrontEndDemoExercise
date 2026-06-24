<script setup lang="ts">
import { ref } from 'vue'
import { Tools, Close } from '@element-plus/icons-vue'

interface Props {
  title: string
}

defineProps<Props>()
const emit = defineEmits<{
  restore: []
  close: []
}>()

const minBarRef = ref<HTMLElement | null>(null)
const barX = ref(window.innerWidth - 44)
const barY = ref(Math.floor(window.innerHeight / 2 - 60))
const wasDragged = ref(false)

function handleDragStart(e: MouseEvent) {
  e.preventDefault()
  wasDragged.value = false
  const startX = e.clientX
  const startY = e.clientY
  const startBarX = barX.value
  const startBarY = barY.value
  const onMove = (ev: MouseEvent) => {
    wasDragged.value = true
    barX.value = startBarX + (ev.clientX - startX)
    barY.value = startBarY + (ev.clientY - startY)
  }
  const onUp = () => {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    if (wasDragged.value && minBarRef.value) {
      const w = minBarRef.value.offsetWidth
      const h = minBarRef.value.offsetHeight
      const gap = 8
      const centerX = barX.value + w / 2
      barX.value = centerX < window.innerWidth / 2 ? gap : window.innerWidth - w - gap
      barY.value = Math.max(gap, Math.min(barY.value, window.innerHeight - h - gap))
    }
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

function handleClick() {
  if (wasDragged.value) {
    wasDragged.value = false
    return
  }
  emit('restore')
}
</script>

<template>
  <Teleport to="body">
    <div
      ref="minBarRef"
      class="fixed z-9999 flex items-center bg-bg border border-border rounded shadow-lg cursor-pointer select-none min-bar"
      :style="{ left: barX + 'px', top: barY + 'px' }"
      @click="handleClick"
    >
      <div
        class="flex items-center gap-1 px-2 py-3 cursor-move [writing-mode:vertical-rl]"
        @mousedown="handleDragStart"
      >
        <el-icon class="text-color-secondary"><Tools /></el-icon>
        <span class="text-sm">{{ title }}</span>
      </div>
      <button
        class="absolute -top-1.5 -right-1.5 w-4 h-4 flex items-center justify-center rounded-full bg-bg border border-border cursor-pointer hover:text-danger"
        @click.stop="emit('close')"
      >
        <el-icon :size="10"><Close /></el-icon>
      </button>
    </div>
  </Teleport>
</template>
