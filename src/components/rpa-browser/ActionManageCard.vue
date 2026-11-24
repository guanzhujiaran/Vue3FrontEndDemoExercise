<script setup lang="ts">
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import ActionIcon from '@/components/rpa-browser/ActionIcon.vue'
import { DEFAULT_ACTION_ICON } from '@/utils/rpa/actionTypeIcon'
import ResourceInteractionBar from '@/components/interaction/ResourceInteractionBar.vue'
import IconRefresh from '@/assets/svgs/space/refresh.svg?component'
import IconTag from '@/assets/svgs/space/tag.svg?component'
import IconMore from '@/assets/svgs/space/more.svg?component'
import CopyIcon from '@/assets/svgs/space/copy.svg?component'
import { copyToClipboard } from '@/utils/rpa/clipboard'

/**
 * 自定义动作管理卡片
 *
 * 动作管理页与社区广场共用同一份卡片结构：
 * - manage（默认）：完整的自有资源操作（同步上游 / 编辑标签 / 可见性 / 更多）；
 * - community：只保留「查看」与插槽内的社区操作（Fork / 举报），
 *   隐藏所有作者侧操作，避免在别人的资源上出现不可用按钮。
 */
interface ActionManageCardItem {
  /** 表主键（be-message 互动体系 rpa_action 的 bizId 用数字主键，非 action_id） */
  id: number
  action_id: string
  name: string
  action_type: string
  description: string
  /** 动作展示图标：系列编号（0 = 默认图标） */
  icon_series?: number
  /** 动作展示图标：系列内编号（0 = 默认图标） */
  icon_id?: number
  steps_count: number
  tags: string[]
  is_enabled: boolean
  is_public: boolean
  likes_count: number
  forks_count: number
  /** Fork 来源动作的数据库主键（非空表示这是从上游 Fork 的副本，可同步上游最新内容） */
  forked_from_id: number | null
  /** 作者声明的语义化版本（服务端不自动递增） */
  version?: string
  /** 语义内容指纹（展示前 8 位；空 = 存量未计算） */
  content_hash?: string
  /** 上游是否有新版本可同步（仅 Fork 副本有意义） */
  has_upstream_update?: boolean
  /** 上游当前声明的版本号（非 Fork 或上游不可用时为 null） */
  upstream_version?: string | null
  /** 是否开启上游自动同步（仅 Fork 副本有意义） */
  auto_sync_upstream?: boolean
  /** 是否有会被同步覆盖的本地修改（true 时自动同步会跳过） */
  local_steps_modified?: boolean
  created_at: string | null
  updated_at: string | null
}

interface Props {
  item: ActionManageCardItem
  variant?: 'manage' | 'community'
  /** 同步上游请求进行中 */
  syncLoading?: boolean
  /** 上游自动同步开关请求进行中 */
  autoSyncLoading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'manage',
  syncLoading: false,
  autoSyncLoading: false,
})

const emit = defineEmits<{
  (e: 'view'): void
  (e: 'sync-upstream'): void
  (e: 'edit-tags'): void
  (e: 'toggle-public'): void
  (e: 'toggle-auto-sync'): void
  (e: 'more-command', command: 'rename' | 'publish' | 'share' | 'delete'): void
}>()

const isOwnerView = computed(() => props.variant === 'manage')

const shortHash = (hash?: string) => (hash ? hash.slice(0, 8) : '')

const formatTime = (t: string | null) => {
  if (!t) return '-'
  return new Date(t).toLocaleString('zh-CN')
}

/** 同步图标悬停文案（图标化后的状态说明入口） */
const syncIconTip = (item: ActionManageCardItem) => {
  const mine = item.version ? `你的副本 v${item.version}` : '你的副本'
  if (item.has_upstream_update) {
    // 上游改了内容却没升版本号：如实说明，不假装"有新版本 1.1.0"
    const upstream = item.upstream_version
      ? item.upstream_version === item.version
        ? `上游内容已变（版本号仍为 v${item.upstream_version}，作者未升级）`
        : `上游 v${item.upstream_version}`
      : '上游有新内容'
    const tip = `${upstream} · ${mine}`
    return item.local_steps_modified ? `${tip}；有本地修改，同步将覆盖` : `${tip}；点击同步`
  }
  return item.local_steps_modified
    ? `已是最新版本（${mine}，有本地修改）`
    : `已是最新版本（${mine}）`
}

/** 快捷复制 Action ID（action_id 为雪花字符串，复制原值避免转 Number 丢精度） */
const handleCopyActionId = async (actionId: string) => {
  const ok = await copyToClipboard(actionId)
  if (ok) {
    ElMessage.success(`已复制 Action ID：${actionId}`)
  } else {
    ElMessage.warning('复制失败，请手动选择复制')
  }
}
</script>

<template>
  <div
    class="action-card min-w-0 rounded-xl p-5 border border-border-light hover:border-primary transition-colors flex flex-col gap-3 overflow-hidden"
  >
    <!-- 名称行 -->
    <div class="action-card__header flex items-start justify-between gap-2">
      <div class="flex-1 min-w-0">
        <div class="action-card__title-row flex items-center gap-2">
          <ActionIcon
            :series="item.icon_series"
            :id="item.icon_id"
            :seed="item.action_id || item.action_type"
            class="action-card__icon w-5 h-5 shrink-0 text-text-primary"
          >
            <template #fallback>
              <el-icon class="text-lg text-text-primary">
                <component :is="DEFAULT_ACTION_ICON" />
              </el-icon>
            </template>
          </ActionIcon>
          <h3 class="text-base font-semibold truncate" :title="item.name">{{ item.name }}</h3>
        </div>
        <p class="action-card__description text-sm text-gray-400 mt-1 line-clamp-2 min-h-10">
          {{ item.description || '暂无描述' }}
        </p>
      </div>
      <!-- 上游同步状态图标（仅 Fork 副本）：有更新=warning 高亮可点击；
           已是最新=置灰不可点，悬停有说明，取代原文字徽标与同步按钮 -->
      <div v-if="isOwnerView" class="action-card__status-icons flex items-center gap-2 shrink-0">
        <el-tooltip v-if="item.forked_from_id" :content="syncIconTip(item)" placement="top">
          <el-button
            v-if="item.has_upstream_update"
            link
            class="action-card__sync-icon p-0 h-auto text-warning"
            :loading="syncLoading"
            @click="emit('sync-upstream')"
          >
            <component :is="IconRefresh" class="w-4 h-4" />
          </el-button>
          <span v-else class="action-card__sync-idle text-gray-300">
            <component :is="IconRefresh" class="w-4 h-4" />
          </span>
        </el-tooltip>
      </div>
    </div>

    <!-- Action ID：完整展示 + 一键复制（雪花字符串，复制原值） -->
    <div class="action-card__id flex items-center gap-1 min-w-0 text-xs text-gray-400 font-mono">
      <span class="shrink-0">ID:</span>
      <span class="action-card__id-value flex-1 min-w-0 truncate" :title="item.action_id">{{ item.action_id }}</span>
      <el-tooltip content="复制 Action ID" placement="top">
        <el-button
          link
          class="action-card__copy-id shrink-0 p-0 h-auto text-text-primary"
          @click.stop="handleCopyActionId(item.action_id)"
        >
          <component :is="CopyIcon" class="w-4 h-4" />
        </el-button>
      </el-tooltip>
    </div>

    <!-- 标签（仅在有标签时展示，无占位文字，避免卡片信息过载） -->
    <div v-if="item.tags?.length" class="action-card__tags flex flex-wrap items-center gap-1.5">
      <el-tag
        v-for="tag in item.tags"
        :key="tag"
        effect="plain"
      >
        {{ tag }}
      </el-tag>
    </div>

    <!-- 元信息 -->
    <div class="action-card__meta flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
      <span class="shrink-0">步骤: {{ item.steps_count }}</span>
      <span v-if="item.version" class="action-card__version shrink-0">版本: v{{ item.version }}</span>
      <span
        v-if="item.content_hash"
        class="action-card__content-hash shrink-0 font-mono"
        :title="`内容指纹: ${item.content_hash}`"
      >{{ shortHash(item.content_hash) }}</span>
      <span class="truncate">更新: {{ formatTime(item.updated_at) }}</span>
    </div>

    <!-- 收藏/点赞（2.17.0：动作走 be-message 通用互动） -->
    <div class="action-card__interaction flex items-center pt-1">
      <ResourceInteractionBar biz-type="rpa_action" :biz-id="String(item.id)" />
    </div>

    <!-- 操作栏：主操作（查看）保留文字按钮，次级操作全部图标化，
         重命名/申请公开/删除收入「更多」下拉；EP 会给相邻 el-button
         加 12px 左边距，用 [&_.el-button]:ml-0 中和 gap -->
    <div class="action-card__actions flex items-center gap-3 pt-3 border-t border-border-lighter [&_.el-button]:ml-0">
      <el-button type="primary" @click="emit('view')">查看</el-button>

      <template v-if="isOwnerView">
        <el-tooltip content="编辑标签" placement="top">
          <el-button
            link
            class="action-card__action-tags p-0 h-auto text-text-primary"
            @click="emit('edit-tags')"
          >
            <component :is="IconTag" class="w-4 h-4" />
          </el-button>
        </el-tooltip>

        <!-- 上游自动同步开关（仅 Fork 副本） -->
        <el-tooltip
          v-if="item.forked_from_id"
          :content="item.auto_sync_upstream ? '自动同步：开' : '自动同步：关'"
          placement="top"
        >
          <el-switch
            class="action-card__auto-sync"
            v-model="item.auto_sync_upstream"
            :loading="autoSyncLoading"
            @change="emit('toggle-auto-sync')"
          />
        </el-tooltip>

        <!-- 可见性开关 -->
        <el-tooltip :content="item.is_public ? '公开' : '私有'" placement="top">
          <el-switch
            class="action-card__visibility"
            v-model="item.is_public"
            inline-prompt
            active-text="公开"
            inactive-text="私有"
            @change="emit('toggle-public')"
          />
        </el-tooltip>

        <!-- 更多次级操作 -->
        <el-dropdown
          class="action-card__more ml-auto"
          trigger="click"
          @command="(cmd: string) => emit('more-command', cmd as 'rename' | 'publish' | 'share' | 'delete')"
        >
          <el-button link class="action-card__more-trigger p-0 h-auto text-text-primary">
            <component :is="IconMore" class="w-4 h-4" />
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="rename">重命名</el-dropdown-item>
              <el-dropdown-item command="share">分享</el-dropdown-item>
              <el-dropdown-item v-if="!item.is_public" command="publish">申请公开</el-dropdown-item>
              <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </template>

      <!-- 社区模式：Fork / 举报等操作由使用方注入 -->
      <div v-if="$slots.actions" class="action-card__community-actions flex items-center gap-3 ml-auto [&_.el-button]:ml-0">
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>
