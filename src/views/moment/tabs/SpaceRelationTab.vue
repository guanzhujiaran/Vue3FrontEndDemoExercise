<template>
  <section class="space-relation-tab flex flex-col gap-4">
    <header class="space-relation-tab__head flex items-center justify-between gap-3">
      <h2 class="space-relation-tab__title text-lg font-bold text-text-primary">{{ title }}</h2>
      <span v-if="!privacyClosed" class="space-relation-tab__total text-sm text-text-placeholder">
        共 {{ listTotal }} 条
      </span>
    </header>

    <!-- 主人关闭了对应可见性开关：整类不展示（连条数也不显示），且不再发请求 -->
    <EmptyState v-if="privacyClosed" class="space-relation-tab__closed" :text="closedText" />
    <SpaceRelationList
      v-else
      ref="listRef"
      :mid="spaceMid"
      :relation-type="relationType"
      :is-own-view="isOwnSpace"
      :tag-id="tagFilter"
      @update:total="listTotal = $event"
    />
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import SpaceRelationList from '@/components/moment/SpaceRelationList.vue'
import EmptyState from '@/components/message/EmptyState.vue'
import { useMomentSpace, useMomentSpaceRelation } from '@/views/moment/tabs/spaceContext'

/**
 * 关系页右侧内容（`/app/space/:mid/relation/follow|fans`）。
 *
 * 左侧 menu（关注 / 粉丝切换 + 关注分组）在布局壳 `SpaceRelationLayout` 里，
 * 本组件只负责右栏：大标题 + 列表；分组过滤状态由布局壳注入。
 *
 * - 分流靠**两个子路由 + props**，不引入 `kind` 参数；
 * - 可见性窗口（他人最多 5 页）由后端强制，前端在列表组件里夹页码并给说明。
 */
const props = defineProps<{
  /** followings 关注 / fans 粉丝 */
  relationType: 'followings' | 'fans'
}>()

const { spaceMid, isOwnSpace, targetUser } = useMomentSpace()
const { activeTagId, activeTagName } = useMomentSpaceRelation()

/** 列表总数（由列表组件上报） */
const listTotal = ref(0)
const listRef = ref<InstanceType<typeof SpaceRelationList> | null>(null)

/** 分组过滤只在「本人视角的关注列表」生效（粉丝列表无分组） */
const tagFilter = computed(() =>
  isOwnSpace.value && props.relationType === 'followings' ? activeTagId.value : null
)

/**
 * 主人是否关闭了对应可见性开关（设置页「关注列表」/「粉丝列表」）。
 *
 * 他人视角默认就该看不到（后端默认开关全关）—— 这里据此**不发请求**、
 * 直接给空态，避免请求必然空的数据；本人视角恒不拦截。
 */
const privacyClosed = computed(() => {
  if (isOwnSpace.value) return false
  const flags = targetUser.value?.privacy_flags
  return props.relationType === 'followings'
    ? !flags?.show_follow_list
    : !flags?.show_fans_list
})

const closedText = computed(() =>
  props.relationType === 'followings' ? 'TA 未公开关注列表' : 'TA 未公开粉丝列表'
)

const title = computed(() => {
  // 本人视角：关注页标题跟随左栏选中分组（默认「全部关注」），粉丝页固定「全部粉丝」
  if (props.relationType === 'followings') return isOwnSpace.value ? activeTagName.value : 'TA 的关注'
  return isOwnSpace.value ? '全部粉丝' : 'TA 的粉丝'
})
</script>
