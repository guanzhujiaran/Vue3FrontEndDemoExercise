<script setup lang="ts">
import { computed } from 'vue'
import { Clock, List, RefreshRight, VideoPause, VideoPlay } from '@element-plus/icons-vue'
import type { WorkflowRunProgress } from '@/api/browser/workflow_run_api'
import type { WorkflowItem } from '@/models/rpa_browser'
import WorkflowRunProgressBar from './WorkflowRunProgressBar.vue'
import ResourceInteractionBar from '@/components/interaction/ResourceInteractionBar.vue'
import IconRefresh from '@/assets/svgs/space/refresh.svg?component'
import IconMore from '@/assets/svgs/space/more.svg?component'

/** 「更多」下拉菜单命令类型 */
export type WorkflowMoreCommand = 'edit' | 'duplicate' | 'publish' | 'delete'

interface Props {
  item: WorkflowItem
  /** 浏览器ID -> 名称映射（展示目标浏览器用；未命中回落「浏览器 {id}」） */
  browserNameMap?: Map<number, string>
  /** 当前进行中的运行进度快照（终态帧保留，卡片可继续显示最终耗时） */
  progress?: WorkflowRunProgress | null
  /** 是否正在运行（本页刚发起 / 后端带回的进行中运行 / 定时触发） */
  running?: boolean
  /** 「立即运行」请求进行中（点击到接口返回之间） */
  runLoading?: boolean
  /** 「停止」请求进行中 */
  stopping?: boolean
  /** 「继续运行」请求进行中 */
  resuming?: boolean
  /** 同步上游请求进行中 */
  syncLoading?: boolean
  /** 上游自动同步开关请求进行中 */
  autoSyncLoading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  browserNameMap: () => new Map<number, string>(),
  progress: null,
  running: false,
  runLoading: false,
  stopping: false,
  resuming: false,
  syncLoading: false,
  autoSyncLoading: false,
})

interface Emits {
  (e: 'toggle-public', value: boolean): void
  (e: 'toggle-enabled', value: boolean): void
  (e: 'toggle-auto-sync', value: boolean): void
  (e: 'sync-upstream'): void
  (e: 'stop-run'): void
  (e: 'run'): void
  (e: 'resume-run'): void
  (e: 'open-run-log'): void
  (e: 'open-resource-records'): void
  (e: 'open-browser-detail'): void
  (e: 'more-command', command: WorkflowMoreCommand): void
}
const emit = defineEmits<Emits>()

// ── 开关：item 由父组件持有，卡片只透传变更意图 ──
const publicSwitch = computed({
  get: () => props.item.is_public,
  set: (value: boolean) => emit('toggle-public', value),
})
const enabledSwitch = computed({
  get: () => props.item.is_enabled,
  set: (value: boolean) => emit('toggle-enabled', value),
})
const autoSyncSwitch = computed({
  get: () => props.item.auto_sync_upstream ?? false,
  set: (value: boolean) => emit('toggle-auto-sync', value),
})

const cronOf = (item: WorkflowItem) => {
  const cron = item.trigger_config?.cron
  return typeof cron === 'string' ? cron : ''
}

const triggerText = (item: WorkflowItem) =>
  item.trigger_type === 'cron' ? `定时（${cronOf(item) || '未配置'}）` : '手动'

// ── 执行日志状态（三态开关：true=显式开 / false=显式关 / null=跟随动作级/项目级） ──
type LogState = 'on' | 'off' | 'inherit'
const logStateOf = (item: WorkflowItem): LogState =>
  item.log_enabled === true ? 'on' : item.log_enabled === false ? 'off' : 'inherit'
const logLabel: Record<LogState, string> = {
  on: '日志：开',
  off: '日志：关',
  inherit: '日志：跟随',
}
const logTagType: Record<LogState, 'success' | 'info' | 'warning'> = {
  on: 'success',
  off: 'info',
  inherit: 'warning',
}
const logTip =
  '执行日志按步骤记录入参/结果/耗时（仅保留最近 7 天）。优先级：工作流开关 > 动作开关 > 项目兜底；「跟随」表示本工作流未设置，按动作/项目开关决定。'
/** 调试模式徽标（用户级 debug：全量记录，优先级高于日志开关） */
const logDebugTip =
  '调试模式：全量记录——入参 / 返回结果 / 变量池快照全部记录，成功的步骤也记录、内容不截断（仍只保留 7 天）'

/** 工作流绑定的浏览器ID列表（多浏览器优先，回落到单浏览器） */
const browserIdsOf = (item: WorkflowItem): number[] => {
  const ids = item.browser_ids?.length ? item.browser_ids : []
  if (ids.length) return ids
  return item.browser_id === null || item.browser_id === undefined ? [] : [item.browser_id]
}

/** 卡片展示：多浏览器用「A、B」列出 */
const browserLabel = (item: WorkflowItem): string => {
  const ids = browserIdsOf(item)
  if (!ids.length) return '未配置'
  return ids.map(id => props.browserNameMap.get(id) ?? `浏览器 ${id}`).join('、')
}

/** 多浏览器执行模式标签文案 */
const execModeLabel = (item: WorkflowItem): string => {
  if (browserIdsOf(item).length <= 1) return ''
  return item.concurrent_exec ? '并发执行' : '串行执行'
}

const runStatusLabel: Record<string, string> = {
  success: '成功',
  failed: '失败',
  running: '运行中',
  interrupted: '已中断',
}
const runStatusType: Record<string, 'success' | 'danger' | 'warning' | 'info'> = {
  success: 'success',
  failed: 'danger',
  running: 'warning',
  interrupted: 'info',
}

/** 同步图标悬停文案（图标化后的状态说明入口） */
const syncIconTip = (item: WorkflowItem) => {
  if (item.has_upstream_update) {
    return item.local_steps_modified ? '上游有更新（有本地修改，同步将覆盖）' : '上游有更新，点击同步'
  }
  return item.local_steps_modified ? '已是最新版本（有本地修改）' : '已是最新版本'
}

const formatTime = (t: string | null) => {
  if (!t) return '-'
  return new Date(t).toLocaleString('zh-CN')
}
</script>

<template>
  <div
    class="workflow-card min-w-0 rounded-xl p-3 border border-border-light hover:border-primary transition-colors flex flex-col gap-3 overflow-hidden">
    <!-- 名称行 -->
    <div class="flex items-start justify-between gap-2">
      <div class="flex-1 min-w-0">
        <h3 class="text-base font-semibold truncate" :title="item.name">{{ item.name }}</h3>
        <p class="text-sm text-gray-400 mt-1 line-clamp-2 min-h-10">
          {{ item.description || '暂无描述' }}
        </p>
      </div>
      <!-- 右上角状态区：上游同步图标（仅 Fork 副本，有更新=warning 高亮可点击，
           已是最新=置灰不可点，悬停有说明）+ 可见性 / 启用开关。
           两个开关从底部操作栏上移到此处：底部只留运行/记录/编辑等主操作，
           避免窄卡片下按钮溢出；开关属于状态表达，放状态区语义也更一致 -->
      <div class="workflow-card__status-icons flex items-center gap-2 shrink-0">
        <el-tooltip v-if="item.forked_from_id" :content="syncIconTip(item)" placement="top">
          <el-button
            v-if="item.has_upstream_update"
            link
            class="workflow-card__sync-icon p-0 h-auto text-warning"
            :loading="syncLoading"
            @click="emit('sync-upstream')"
          >
            <component :is="IconRefresh" class="w-4 h-4" />
          </el-button>
          <span v-else class="workflow-card__sync-idle text-gray-300">
            <component :is="IconRefresh" class="w-4 h-4" />
          </span>
        </el-tooltip>

        <el-tooltip :content="item.is_public ? '公开' : '私有'" placement="top">
          <el-switch v-model="publicSwitch" size="small" inline-prompt active-text="公开" inactive-text="私有" />
        </el-tooltip>
        <el-tooltip :content="item.is_enabled ? '启用' : '禁用'" placement="top">
          <el-switch v-model="enabledSwitch" size="small" inline-prompt active-text="启用" inactive-text="禁用" />
        </el-tooltip>
      </div>
    </div>

    <!-- 元信息 -->
    <div class="flex items-center gap-4 text-xs text-gray-400">
      <span>点赞: {{ item.likes_count }}</span>
      <span>Fork: {{ item.forks_count }}</span>
      <span>更新: {{ formatTime(item.updated_at) }}</span>
    </div>

    <!-- 调度信息（触发方式 / 上次运行 / 下次运行） -->
    <div class="workflow-card__schedule flex flex-col gap-1 text-xs">
      <div class="flex items-center gap-2 flex-wrap">
        <el-tag :type="item.trigger_type === 'cron' ? 'warning' : 'info'" effect="plain">
          {{ triggerText(item) }}
        </el-tag>
        <el-tag v-if="running" type="warning" effect="plain">
          正在运行
        </el-tag>
        <el-tag v-else-if="item.last_run_status" :type="runStatusType[item.last_run_status] || 'info'" effect="plain">
          上次运行：{{ runStatusLabel[item.last_run_status] || item.last_run_status }}
        </el-tag>
        <el-tag
          class="workflow-card__browser cursor-pointer"
          :type="item.browser_id === null ? 'danger' : 'info'"
          effect="plain"
          @click="emit('open-browser-detail')"
        >
          目标浏览器：{{ browserLabel(item) }}
        </el-tag>
        <el-tag
          v-if="execModeLabel(item)"
          class="workflow-card__exec-mode"
          :type="item.concurrent_exec ? 'warning' : 'info'"
          effect="plain"
          :title="item.concurrent_exec
            ? '多个浏览器同时启动各自的一次运行'
            : '按浏览器列表顺序依次执行，一个跑完再跑下一个'"
        >
          {{ execModeLabel(item) }}（{{ browserIdsOf(item).length }} 个浏览器）
        </el-tag>
        <el-tag
          class="workflow-card__log"
          :type="logTagType[logStateOf(item)]"
          effect="plain"
          :title="logTip"
        >
          {{ logLabel[logStateOf(item)] }}
        </el-tag>
        <el-tag
          v-if="item.log_debug === true"
          class="workflow-card__log-debug"
          type="warning"
          effect="plain"
          :title="logDebugTip"
        >
          调试
        </el-tag>
      </div>
      <div class="text-gray-400 flex items-center gap-3 flex-wrap">
        <span>上次：{{ formatTime(item.last_run_at) }}</span>
        <span v-if="item.trigger_type === 'cron'">下次：{{ formatTime(item.next_run_at) }}</span>
      </div>

      <!-- 运行进度：循环体内按轮次，否则按步骤；运行时长本地每秒自增 -->
      <div
        v-if="running || progress"
        class="workflow-card__progress mt-1"
      >
        <WorkflowRunProgressBar :progress="progress" />
      </div>
    </div>

    <!-- 收藏/点赞（2.17.0：工作流走 be-message 通用互动） -->
    <div class="flex items-center pt-1">
      <ResourceInteractionBar biz-type="rpa_workflow" :biz-id="String(item.id)" />
    </div>

    <!-- 操作栏：只放主操作（运行/停止、运行记录、编辑）+ 复制图标 + 更多下拉；
         可见性 / 启用开关已上移至卡片右上角状态区，同步入口也在右上角，
         底部不再混放开关，窄卡片下按钮不溢出（flex-wrap 兜底换行，
         [&_.el-button]:ml-0 中和 EP 给相邻按钮加的 12px 左边距） -->
    <div
      class="workflow-card__actions flex items-center flex-wrap gap-2 pt-3 border-t border-border-lighter [&_.el-button]:ml-0">
      <el-button v-if="running" size="small" type="danger" :icon="VideoPause"
        :loading="stopping" @click="emit('stop-run')">停止</el-button>
      <template v-else>
        <el-button size="small" type="primary" :loading="runLoading" :icon="VideoPlay"
          @click="emit('run')">立即运行</el-button>
        <el-tooltip
          v-if="item.last_run_status === 'interrupted'"
          content="从上次中断的检查点继续执行：当前步骤会重跑，循环内已处理的资源自动跳过"
          placement="top"
        >
          <el-button size="small" type="warning" plain :icon="RefreshRight"
            :loading="resuming" @click="emit('resume-run')">继续运行</el-button>
        </el-tooltip>
      </template>
      <el-button size="small" :icon="Clock" @click="emit('open-run-log')">运行记录</el-button>
      <el-button size="small" :icon="List" @click="emit('open-resource-records')">已处理数据</el-button>

      <!-- 上游自动同步开关（仅 Fork 副本） -->
      <el-tooltip v-if="item.forked_from_id"
        :content="item.auto_sync_upstream ? '自动同步：开' : '自动同步：关'" placement="top">
        <el-switch class="workflow-card__auto-sync" v-model="autoSyncSwitch"
          :loading="autoSyncLoading" />
      </el-tooltip>

      <!-- 更多下拉：编辑/复制等次级操作统一收纳，减少卡片按钮数量 -->
      <el-dropdown class="workflow-card__more ml-auto" trigger="click"
        @command="(cmd: string) => emit('more-command', cmd as WorkflowMoreCommand)">
        <el-button link class="workflow-card__more-trigger p-0 h-auto text-text-primary">
          <component :is="IconMore" class="w-4 h-4" />
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="edit">编辑</el-dropdown-item>
            <el-dropdown-item command="duplicate">复制工作流</el-dropdown-item>
            <el-dropdown-item v-if="!item.is_public" command="publish" divided>申请公开</el-dropdown-item>
            <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>
