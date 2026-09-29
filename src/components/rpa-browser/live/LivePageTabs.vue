<script setup lang="ts">
import { Plus, Close } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import type { LivePageTab } from '@/models/rpa_browser/live_stream'

/**
 * 直播工具栏：浏览器标签页
 *
 * 只负责展示与事件上抛 —— 新建 / 关闭 / 切换页面都是**会话级**操作
 * （一端操作，其余观看者跟随），具体调用在父组件的 `useLivePages` 里。
 * 监管只读模式下不渲染新建 / 关闭按钮。
 */
interface Props {
  tabs: LivePageTab[]
  currentIndex: number
  loading?: boolean
  /** 监管只读模式：隐藏一切写操作入口 */
  readonly?: boolean
  /** 浏览器会话是否已连接（未连接时禁用新建页） */
  sessionConnected: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'switch', index: number): void
  (e: 'add'): void
  (e: 'close', index: number): void
}>()

const { t } = useI18n()

// el-tabs 的 tab-click 回调参数是 TabsPaneContext，用其 paneName（即 :name）还原页面索引
const handleTabClick = (pane: { paneName?: string | number }) => {
  const index = Number(pane?.paneName)
  if (!Number.isFinite(index)) return
  emit('switch', index)
}
</script>

<template>
  <div
    class="live-page-tabs flex flex-wrap items-center gap-2 border-b border-border bg-fill-light px-4 py-2"
  >
    <div
      class="live-page-tabs__scroller min-w-40 flex-1 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent overflow-x-auto overflow-y-hidden"
    >
      <el-tabs
        :model-value="props.currentIndex"
        type="card"
        class="w-max min-w-full"
        @tab-click="handleTabClick"
      >
        <el-tab-pane
          v-for="tab in props.tabs"
          :key="tab.index"
          :label="tab.title"
          :name="String(tab.index)"
        >
          <template #label>
            <div class="live-page-tabs__label flex items-center gap-1">
              <span>{{ tab.title }}</span>
              <el-button
                v-if="!props.readonly && props.tabs.length > 1"
                size="large"
                circle
                :icon="Close"
                class="p-1!"
                @click.stop="emit('close', tab.index)"
              />
            </div>
          </template>
        </el-tab-pane>
      </el-tabs>
    </div>

    <div class="live-page-tabs__actions flex flex-wrap items-center gap-2">
      <el-button
        v-if="!props.readonly"
        size="large"
        :icon="Plus"
        :loading="props.loading"
        :disabled="!props.sessionConnected"
        @click="emit('add')"
        >{{ t('rpa.addPage') }}</el-button
      >
    </div>
  </div>
</template>
