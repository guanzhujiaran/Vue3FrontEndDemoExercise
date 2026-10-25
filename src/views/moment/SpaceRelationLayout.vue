<template>
  <div
    class="space-relation-layout max-w-5xl mx-auto w-full flex flex-col gap-4 md:flex-row md:items-start md:gap-8"
  >
    <!-- 左侧 menu（对标 B 站关系页）：本人视角恒展示「我的关注」分组 +「我的粉丝」入口；
         他人视角只有「全部关注 / 全部粉丝」两个选项。 -->
    <aside class="space-relation-layout__side w-full md:w-48 md:shrink-0 flex flex-col gap-6">
      <section class="space-relation-layout__section">
        <h2 class="space-relation-layout__section-title px-3 pb-2 text-sm text-text-placeholder">
          {{ isOwnSpace ? '我的关注' : 'TA 的关注' }}
        </h2>
        <!-- 本人视角：完整分组导航（全部关注 / 特别关注 / 默认分组 / 自建分组 + 新建）；
             在粉丝页也照常展示，点分组即切回关注列表 -->
        <SpaceFollowTagNav
          v-if="showTagNav"
          :active-tag-id="navActiveTagId"
          :total="followingCount"
          @update:active-tag-id="onTagIdChange"
          @update:active-tag-name="onTagNameChange"
          @select="onSelectTag"
        />
        <!-- 他人视角：只给一个「全部关注」入口 -->
        <button
          v-else
          type="button"
          class="space-relation-layout__entry flex w-full items-center justify-between gap-2 border-l-2 rounded-r-md px-3 py-2 text-left text-sm transition-colors"
          :class="isFollowRoute ? activeEntryClass : idleEntryClass"
          @click="goFollow"
        >
          <span class="space-relation-layout__entry-name truncate">全部关注</span>
          <span class="space-relation-layout__entry-count shrink-0 text-xs text-text-placeholder">
            {{ followingCount }}
          </span>
        </button>
      </section>

      <section class="space-relation-layout__section">
        <h2 class="space-relation-layout__section-title px-3 pb-2 text-sm text-text-placeholder">
          {{ isOwnSpace ? '我的粉丝' : 'TA 的粉丝' }}
        </h2>
        <button
          type="button"
          class="space-relation-layout__entry flex w-full items-center justify-between gap-2 border-l-2 rounded-r-md px-3 py-2 text-left text-sm transition-colors"
          :class="isFansRoute ? activeEntryClass : idleEntryClass"
          @click="goFans"
        >
          <span class="space-relation-layout__entry-name truncate">全部粉丝</span>
          <span class="space-relation-layout__entry-count shrink-0 text-xs text-text-placeholder">
            {{ followerCount }}
          </span>
        </button>
      </section>
    </aside>

    <section class="space-relation-layout__main flex-1 min-w-0">
      <RouterView />
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import SpaceFollowTagNav from '@/components/moment/SpaceFollowTagNav.vue'
import {
  provideMomentSpaceRelation,
  useMomentSpace,
} from '@/views/moment/tabs/spaceContext'

/**
 * 关系页布局壳（`/app/space/:mid/relation/follow|fans`，对标 B 站关系页）。
 *
 * - 左侧 menu 同时承担「关注 / 粉丝切换」与「关注分组选择」；
 * - **本人视角**恒展示完整关注分组（粉丝页也展示，点分组即切回关注列表）；
 *   **他人视角**只有「全部关注 / 全部粉丝」两个入口（分组是私域数据）；
 * - 分组状态（`activeTagId` / `activeTagName`）放本层，切子路由不丢；
 * - 计数直接用空间资料里的 `follow_stat`（布局壳已有，零额外请求）。
 */
const FOLLOW_ROUTE = 'MOMENT_USER_SPACE_FOLLOWINGS'
const FANS_ROUTE = 'MOMENT_USER_SPACE_FANS'

const route = useRoute()
const router = useRouter()
const { spaceMid, isOwnSpace, targetUser } = useMomentSpace()

const isFollowRoute = computed(() => route.name === FOLLOW_ROUTE)
const isFansRoute = computed(() => route.name === FANS_ROUTE)

/** 本人视角恒展示关注分组；他人视角只有两个固定入口 */
const showTagNav = computed(() => isOwnSpace.value)

const followingCount = computed(() => targetUser.value.follow_stat?.following_count ?? 0)
const followerCount = computed(() => targetUser.value.follow_stat?.follower_count ?? 0)

const activeTagId = ref<number | null>(null)
const activeTagName = ref('全部关注')

/** 分组高亮只在关注页生效（粉丝页传 `undefined` = 任何分组都不高亮，避免与「全部粉丝」同时选中） */
const navActiveTagId = computed<number | null | undefined>(() =>
  isFollowRoute.value ? activeTagId.value : undefined
)

provideMomentSpaceRelation({ activeTagId, activeTagName })

function onTagIdChange(id: number | null) {
  activeTagId.value = id
}

function onTagNameChange(name: string) {
  activeTagName.value = name
}

/** 每次点击分组都触发（值可能未变）：本人在粉丝页点分组时切回关注列表 */
function onSelectTag() {
  if (!isFollowRoute.value) {
    void router.push({ name: FOLLOW_ROUTE, params: { mid: spaceMid.value } })
  }
}

const activeEntryClass =
  'space-relation-layout__entry--active border-primary bg-bg-secondary text-primary font-medium'
const idleEntryClass = 'border-transparent text-text-primary hover:bg-bg-secondary'

function goFollow() {
  void router.push({ name: FOLLOW_ROUTE, params: { mid: spaceMid.value } })
}

function goFans() {
  void router.push({ name: FANS_ROUTE, params: { mid: spaceMid.value } })
}
</script>
