<template>
  <div class="space-timeline-tab max-w-4xl mx-auto w-full">
    <!-- 完整时间线（游标分页）。个人资料卡只挂在主页右栏，这里是纯流水单列，不再重复展示。 -->

    <section class="space-timeline-tab__main min-w-0">
      <header class="space-timeline-tab__head mb-3">
        <h2 class="space-timeline-tab__title text-base font-bold text-text-primary">
          {{ isOwnSpace ? '我的时间线' : 'TA 的时间线' }}
        </h2>
      </header>
      <SpaceTimelineList
        ref="timelineRef"
        :key="spaceMid"
        :mid="spaceMid"
        :empty-text="isOwnSpace ? '最近还没有行为记录~' : 'TA 暂未公开行为记录~'"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import SpaceTimelineList from '@/components/moment/SpaceTimelineList.vue'
import { useMomentSpace } from '@/views/moment/tabs/spaceContext'

/**
 * 时间线 tab（`/app/space/:mid/timeline`，2.59.0）：关注 / 点赞 / 收藏的完整流水（游标分页）。
 *
 * 主页只展示最近 `PREVIEW_LIMIT`（5）条概览（标题即入口，点进来），完整记录来这里看。
 * 自己 / TA 走同一个组件：隐私过滤在后端（TA 视角按开关整类不返回），组件内不分支。
 * 个人资料卡只在主页右栏展示，本页不重复。
 */
const { isOwnSpace, spaceMid, ensureProfileLoaded } = useMomentSpace()

/** 切mid 时重挂列表（组件内部按 mid watch 也会重拉，这里用 key 保证状态干净） */
const timelineRef = ref<InstanceType<typeof SpaceTimelineList> | null>(null)

watch(spaceMid, () => {
  void ensureProfileLoaded()
  void timelineRef.value?.reload()
})
</script>