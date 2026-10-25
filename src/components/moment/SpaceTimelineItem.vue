<template>
  <!-- 一条时间线记录 = 一个整体卡片：外层「用户操作」+ 内层「资源卡」在同一容器内（同底色、同边框、内部留缝）。
       由 SpaceTimelineList 逐条渲染，本组件只负责单条展示：所有数据加工（资源类型映射 / 摘要截断）
       与跳转、互动计数都收敛在这里，列表组件只管拉数据与分页。 -->
  <li
    class="space-timeline-item flex flex-col gap-2 bg-bg-overlay border border-border-light rounded-lg p-3"
  >
    <!-- 外层：用户操作卡（谁 · 做了什么 · 何时） -->
    <div class="space-timeline-item__action flex items-center gap-3 px-1 text-sm">
      <el-avatar
        v-if="item.target_face || item.target_mid_str"
        :size="36"
        :src="item.target_face || undefined"
        class="space-timeline-item__avatar shrink-0 cursor-pointer"
        @click="emit('open-user')"
      />
      <div class="flex flex-col gap-0.5 min-w-0 flex-1">
        <p class="space-timeline-item__text text-text-primary">
          <template v-if="item.act_type === 'follow'">
            关注了
            <span class="cursor-pointer hover:text-primary" @click="emit('open-user')">
              {{ item.target_name || '已注销用户' }}
            </span>
          </template>
          <template v-else-if="item.act_type === 'like'">
            点赞了
            <span class="cursor-pointer hover:text-primary" @click="emit('open-resource')">
              {{ resourceLabel }}
            </span>
          </template>
          <template v-else>
            收藏了
            <span class="cursor-pointer hover:text-primary" @click="emit('open-resource')">
              {{ resourceLabel }}
            </span>
            <span v-if="item.target_folder_name">到收藏夹「{{ item.target_folder_name }}」</span>
          </template>
        </p>
        <span class="space-timeline-item__time text-xs text-text-placeholder">
          {{ formatRelativeTime(item.acted_at) }}
        </span>
      </div>
    </div>

    <!-- 内层：资源卡 —— dynamic 用完整动态卡（复用 MomentCard），非 dynamic 用附加资源卡（复用 MomentAttachCard）。
         卡片自带边框，这里去掉自身圆角/边框的重复感（用外层容器的边框收口）。 -->
    <template v-if="resource?.moment">
      <MomentCard
        class="space-timeline-item__moment p-3! rounded-lg"
        :item="resource.moment as unknown as MomentFeedItem"
        :status="status"
        :inline-comment="false"
        @status-change="(dynId, payload) => emit('status-change', payload)"
      />
    </template>
    <MomentAttachCard
      v-else-if="resource && !resource.moment"
      class="space-timeline-item__attach"
      :biz-type="attachBizType"
      :biz-id="resource.biz_id_str ?? ''"
      :name="resource.name ?? summarize(item.target_text)"
      :cover="resource.cover"
      :jump-url="resource.jump_url"
    />
    <!-- 兜底：资源卡缺失（例如后端未升级 / 资源已不可见）时退回一行摘要 -->
    <p v-else-if="item.target_text" class="space-timeline-item__fallback px-1 text-sm text-text-primary">
      {{ summarize(item.target_text) }}
    </p>
  </li>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { InteractionBizTypeEnum } from '@/api/notify/moment-api'
import type { MomentFeedItem, InteractionStatusItem } from '@/api/notify/moment-api'
// SDK 类型名与本组件同名，类型侧统一取别名 TimelineRecord
import type { SpaceTimelineItem as TimelineRecord, SpaceTimelineResource } from '@/api/community/hey-api'
import type { FavoriteChangedPayload } from '@/utils/interaction/favoriteSync'
import MomentCard from '@/components/moment/MomentCard.vue'
import MomentAttachCard from '@/components/moment/MomentAttachCard.vue'
import { formatRelativeTime } from '@/utils/dateFormat'

/**
 * 空间行为时间线的**单条**记录（我的主页概览 / TA 的主页概览 / 时间线 tab 共用）。
 *
 * 拆分原因：条目结构（操作文案三分支 + 资源类型映射表 + 两种资源卡 + 摘要截断）体量不小，
 * 之前整段塞在列表组件里，导致列表同时承担「渲染 + 加工 + 分页」三件事；拆出来后
 * 列表只留数据与分页，条目加工全部由本组件复用。
 *
 * 互动态计数由列表组件统一批量拉取后以 `status` 传入（本组件不自行请求，避免每条一份状态副本）。
 */
const props = defineProps<{
  item: TimelineRecord
  /** 该条 dynamic 资源的互动态（列表组件批量拉取后传入，非 dynamic 传 null） */
  status?: InteractionStatusItem | null
}>()

/** 收藏夹弹窗操作成功后由列表组件浅合并进共享仓库，这里只向上抛事件 */
const emit = defineEmits<{
  /** 点击头像 / 用户名：跳该用户空间 */
  (e: 'open-user'): void
  /** 点击资源名：dynamic 进详情，其余由资源卡自己处理 */
  (e: 'open-resource'): void
  /** 资源卡内互动状态变化（bizId 由列表组件按当前条目回填） */
  (e: 'status-change', payload: FavoriteChangedPayload): void
}>()

/** 资源卡：follow 条目为 null；dynamic 带完整 moment，非 dynamic 带 name/cover/jump_url */
const resource = computed<SpaceTimelineResource | null>(() => props.item.target_resource ?? null)

/**
 * 资源类型文字（后端 `InteractionBizTypeEnum.to_text()` = 枚举名小写）→ 前端数值枚举。
 * 前端 SDK 的 `InteractionBizTypeEnum` 是 `name -> number` 常量映射，没有字符串成员，
 * 所以这里显式建一张对照表（后端加新类型时在此补一行）。
 */
const BIZ_TYPE_BY_TEXT: Record<string, InteractionBizTypeEnum> = {
  dynamic: InteractionBizTypeEnum.DYNAMIC,
  lottery: InteractionBizTypeEnum.LOTTERY,
  rpa_action: InteractionBizTypeEnum.RPA_ACTION,
  rpa_workflow: InteractionBizTypeEnum.RPA_WORKFLOW,
  rpa_browser: InteractionBizTypeEnum.RPA_BROWSER,
  rpa_plugin: InteractionBizTypeEnum.RPA_PLUGIN,
  comment: InteractionBizTypeEnum.COMMENT,
  user: InteractionBizTypeEnum.USER,
  topic: InteractionBizTypeEnum.TOPIC,
  dm: InteractionBizTypeEnum.DM,
  avatar: InteractionBizTypeEnum.AVATAR,
  folder_cover: InteractionBizTypeEnum.FOLDER_COVER,
  report: InteractionBizTypeEnum.REPORT,
  rpa_tag: InteractionBizTypeEnum.RPA_TAG,
  others_lot_dyn: InteractionBizTypeEnum.OTHERS_LOT_DYN
}

/** 资源类型文字 → 前端枚举（MomentAttachCard 跳转用；未知类型回退 undefined） */
const attachBizType = computed<InteractionBizTypeEnum | undefined>(() => {
  const bizType = resource.value?.biz_type
  return bizType ? BIZ_TYPE_BY_TEXT[bizType] : undefined
})

/** 摘要截断（兜底文案与附加卡无标题时用） */
function summarize(text?: string | null): string {
  const t = (text ?? '').trim()
  if (!t) return '一条内容'
  return t.length > 40 ? `${t.slice(0, 40)}…` : t
}

/** 操作文案里的资源名：优先资源卡标题，其次摘要 */
const resourceLabel = computed(() => {
  const r = resource.value
  if (r?.name) return summarize(r.name)
  return summarize(props.item.target_text)
})
</script>
