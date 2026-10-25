<script setup lang="ts">
import { computed } from 'vue'
import { VueFlow, Handle, Position, type Edge, type Node } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'
import ActionIcon from '@/components/rpa-browser/ActionIcon.vue'
import { resolveActionTypeIcon } from '@/utils/rpa/actionTypeIcon'
import type { ActionFlowNodeData } from '@/utils/rpa/actionFlow'

/**
 * 动作结构流程图（只读）
 *
 * 纯展示：不可拖拽 / 连线 / 选中，仅保留平移缩放与自动适配视图。
 * 图数据由 `@/utils/rpa/actionFlow` 的 `stepsToFlow` 生成。
 */

interface Props {
  nodes: Node<ActionFlowNodeData>[]
  edges: Edge[]
  /** 画布高度 */
  height?: string
}

const props = withDefaults(defineProps<Props>(), {
  height: '520px',
})

const canvasHeight = computed(() => props.height)
</script>

<template>
  <div class="action-flow-view" :style="{ height: canvasHeight }">
    <!-- VueFlow 会在渲染期访问 window/document，SSR 下必须仅在客户端渲染 -->
    <ClientOnly>
      <VueFlow
        :nodes="nodes"
        :edges="edges"
        :nodes-draggable="false"
        :nodes-connectable="false"
        :elements-selectable="false"
        :edges-updatable="false"
        :zoom-on-double-click="false"
        :min-zoom="0.2"
        :max-zoom="1.6"
        fit-view-on-init
        :default-viewport="{ zoom: 0.9 }"
      >
        <Background :gap="18" />
        <Controls :show-interactive="false" position="bottom-right" />

        <template #node-actionNode="{ data }">
          <div class="flow-node" :class="`flow-node--${data.kind}`" :title="data.name">
            <Handle type="target" :position="Position.Top" class="flow-handle" />
            <ActionIcon :series="data.iconSeries" :id="data.iconId" class="flow-node__icon">
              <template #fallback>
                <el-icon class="flow-node__icon-inner">
                  <component :is="resolveActionTypeIcon(data.actionId)" />
                </el-icon>
              </template>
            </ActionIcon>
            <div class="flow-node__text">
              <div class="flow-node__name">{{ data.name }}</div>
              <div v-if="data.badge" class="flow-node__badge">{{ data.badge }}</div>
            </div>
            <Handle type="source" :position="Position.Bottom" class="flow-handle" />
          </div>
        </template>
      </VueFlow>
    </ClientOnly>
  </div>
</template>

<style scoped>
.action-flow-view {
  width: 100%;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  overflow: hidden;
  background: var(--el-fill-color-blank);
}

/* 只读画布：收紧默认主题样式，避免节点出现可交互的视觉反馈 */
:deep(.vue-flow__node) {
  cursor: default;
}

:deep(.vue-flow__edge-path) {
  stroke: var(--el-border-color-darker, #b1b3b8);
  stroke-width: 1.4;
}

:deep(.vue-flow__edge-text) {
  font-size: 11px;
  fill: var(--el-text-color-secondary);
}

/* 连线锚点仅用于挂载边，视觉上隐藏 */
.flow-handle {
  opacity: 0;
  pointer-events: none;
}

.flow-node {
  box-sizing: border-box;
  width: 220px;
  min-height: 64px;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid var(--el-border-color);
  border-radius: 10px;
  background: var(--el-bg-color-overlay);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.flow-node--branch {
  border-color: var(--el-color-warning);
}

.flow-node--loop {
  border-color: var(--el-color-primary);
}

.flow-node__icon {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.flow-node__icon-inner {
  font-size: 18px;
  color: var(--el-text-color-primary);
}

.flow-node__text {
  min-width: 0;
  flex: 1;
}

.flow-node__name {
  font-size: 13px;
  font-weight: 600;
  line-height: 18px;
  color: var(--el-text-color-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.flow-node__badge {
  margin-top: 2px;
  font-size: 11px;
  line-height: 14px;
  color: var(--el-text-color-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
