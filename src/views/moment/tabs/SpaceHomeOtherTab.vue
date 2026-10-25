<template>
  <div class="space-home-other-layout max-w-6xl mx-auto w-full flex flex-row items-start gap-3 md:gap-6 lg:gap-8">
    <!-- 左栏内容流 + 右栏个人资料卡窄条：全屏宽都保持左右分栏（对标 B 站空间，手机端也是「内容 + 窄条」）；
         右栏宽度随断点递进：144 / 256 / 288px（与「我的主页」一致）。 -->

    <!-- 左栏：动态摘要 / 行为记录 / 粉丝 / 收藏概览 -->
    <div class="space-home-other__main flex-1 min-w-0 flex flex-col gap-6">
    <!-- 最近动态摘要（固定展示，不受隐私开关影响） -->
    <section class="space-home-other__section">
      <header class="space-home-other__section-head mb-3 flex items-center justify-between">
        <h2 class="space-home-other__section-title text-base font-bold text-text-primary">最近动态</h2>
        <el-button class="space-home-other__more" size="default" text type="primary" @click="goDynamicTab">
          查看全部
        </el-button>
      </header>
      <LoadingWrap :loading="loading">
        <EmptyState v-if="!loading && items.length === 0" text="TA 还没有发布过动态~" />
        <div v-else class="space-home-other__summary-list flex flex-col gap-3">
          <SpaceSummaryCard
            v-for="item in items"
            :key="item.dynId_str ?? ''"
            :item="item"
            :stats="statusOf(item.dynId_str ?? '')"
            @click="openDetail"
          />
        </div>
      </LoadingWrap>
    </section>

    <!-- TA 的行为时间线：关注 / 点赞 / 收藏，后端按 TA 的隐私开关整类过滤。
         主页只展示最近 5 条概览，完整流水去「时间线」tab；三类全关时返回空列表（空态文案引导）。 -->
    <section class="space-home-other__section">
      <header class="space-home-other__section-head">
        <el-link
          class="space-home-other__section-link text-xl font-bold"
          type="primary"
          underline="never"
          @click="goTimelineTab"
        >
          TA 的时间线
        </el-link>
      </header>
      <SpaceTimelineList :mid="spaceMid" :limit="PREVIEW_LIMIT" empty-text="TA 暂未公开行为记录~" />
    </section>

    <!-- TA 的粉丝模块：对标 B 站 /x/relation/fans，仅在 TA 公开粉丝列表时渲染。
         后端再兜底一次 show_fans_list，并把结果截断在最新 500 个粉丝。 -->
    <section v-if="showFans" class="space-home-other__section">
      <header class="space-home-other__section-head mb-3">
        <h2 class="space-home-other__section-title text-base font-bold text-text-primary">TA 的粉丝</h2>
      </header>
      <SpaceFansGrid :mid="spaceMid" />
    </section>

    <!-- TA 的收藏概览：收藏夹列表由布局壳持有（零额外请求）；不公开时整块隐藏 -->
    <section v-if="favFolders.length > 0" class="space-home-other__section">
      <header class="space-home-other__section-head mb-3 flex items-center justify-between">
        <h2 class="space-home-other__section-title text-base font-bold text-text-primary">TA 的收藏</h2>
        <el-button class="space-home-other__more" size="default" text type="primary" @click="goFavoritesTab()">
          查看全部
        </el-button>
      </header>
      <ul class="space-home-other__fav-list grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <li
          v-for="folder in visibleFolders"
          :key="folder.folderId_str ?? ''"
          class="space-home-other__fav-item flex items-center gap-3 bg-bg-overlay border border-border-light rounded-lg px-3 py-2.5 cursor-pointer transition-colors hover:border-primary/40"
          :data-folder-id="folder.folderId_str ?? ''"
          @click="goFavoritesTab(folder)"
        >
          <el-avatar :size="40" :src="folder.coverUrl || undefined" shape="square" />
          <div class="flex flex-col gap-0.5 min-w-0 flex-1">
            <span class="space-home-other__fav-name text-sm text-text-primary truncate">{{ folder.name }}</span>
            <span class="space-home-other__fav-desc text-xs text-text-placeholder truncate">
              {{ folder.description || '私密收藏夹' }}
            </span>
          </div>
        </li>
      </ul>
    </section>
    </div>
    <!-- 右栏：个人资料卡（生日 / 性别 / 邮箱 / IP 属地 / 上次登录 / 空间访问；仅资料类字段按 TA 的隐私开关过滤） -->
    <aside class="space-home-other__aside w-36 shrink-0 md:w-64 lg:w-72 sticky top-4">
      <SpaceProfileAside />
    </aside>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { fetchSpaceFeed, fetchInteractionStatus, InteractionBizTypeEnum } from '@/api/notify/moment-api'
import type { MomentFeedItem, InteractionStatusItem, FavoriteFolderResp } from '@/api/notify/moment-api'
import LoadingWrap from '@/components/message/LoadingWrap.vue'
import EmptyState from '@/components/message/EmptyState.vue'
import SpaceSummaryCard from '@/components/moment/SpaceSummaryCard.vue'
import SpaceTimelineList from '@/components/moment/SpaceTimelineList.vue'
import SpaceFansGrid from '@/components/moment/SpaceFansGrid.vue'
import SpaceProfileAside from '@/components/moment/SpaceProfileAside.vue'
import { useMomentSpace } from '@/views/moment/tabs/spaceContext'

/**
 * TA 的主页（他人空间落地页，2.58.0）。
 *
 * 与「我的主页」是两个独立页面组件（展示内容完全不同），分流点在布局壳
 * `MomentSpaceView.vue` 的 resolveTabComponent —— 本组件内不出现 isOwnSpace 分支。
 *
 * 布局壳头部已展示昵称 / 等级 / 签名 / 统计栏，所以这里只放头部没有的内容：
 * 最近动态摘要（概览，完整列表在「动态」tab）+ TA 的公开收藏概览。
 */
const { spaceMid, favFolders, profileVersion, ensureProfileLoaded, targetUser } = useMomentSpace()
const router = useRouter()

/** TA 是否公开粉丝列表（关闭时粉丝模块整块不渲染，后端也会再兜底一次） */
const showFans = computed(() => Boolean(targetUser.value?.privacy_flags?.show_fans_list))

/** 摘要条数：够看概况又不至于拉太多（feed 接口一次 5 条） */
const SUMMARY_SIZE = 5
/** 时间线概览条数（主页只展示最近 N 条，完整流水在「时间线」tab） */
const PREVIEW_LIMIT = 5
/** 收藏概览最多展示 6 个夹，更多的交给「查看全部」 */
const FAV_PREVIEW_LIMIT = 6

const items = ref<MomentFeedItem[]>([])
const loading = ref(false)
const statusMap = ref<Record<string, InteractionStatusItem>>({})

/** 收藏概览：有封面的排前面，避免一排灰占位 */
const visibleFolders = computed<FavoriteFolderResp[]>(() =>
  [...favFolders.value]
    .sort((a, b) => Number(Boolean(b.coverUrl)) - Number(Boolean(a.coverUrl)))
    .slice(0, FAV_PREVIEW_LIMIT)
)

/** 已加载的空间资料版本（-1 = 尚未加载）：版本变化才需要重新拉摘要 */
let loadedVersion = -1

async function loadSummary() {
  const mid = spaceMid.value
  if (!mid) return
  // 等布局壳把空间资料（mid / 受限态 / 收藏可见性）拉完，避免用空 mid 发请求
  await ensureProfileLoaded()
  loadedVersion = profileVersion.value
  statusMap.value = {}
  loading.value = true
  const res = await fetchSpaceFeed(mid, { page_size: SUMMARY_SIZE })
  items.value = res.items || []
  loading.value = false
  const ids = items.value.map((i) => i.dynId_str ?? '').filter(Boolean)
  if (ids.length) void loadStatus(ids)
}

onMounted(() => {
  void loadSummary()
})

// 布局壳重载空间资料（切换空间 / 解除拉黑）→ 摘要已过期
watch(profileVersion, (v) => {
  if (v !== loadedVersion) void loadSummary()
})

/** 2.41.0：摘要卡片的互动计数统一走批量 status 接口（Feed 本身不返回统计） */
async function loadStatus(ids: string[]) {
  try {
    const res = await fetchInteractionStatus(InteractionBizTypeEnum.DYNAMIC, ids)
    const map: Record<string, InteractionStatusItem> = {}
    for (const it of res?.items ?? []) {
      if (it?.bizId) map[it.bizId] = it
    }
    statusMap.value = map
  } catch {
    // 弱依赖：计数失败不影响摘要展示
  }
}

function statusOf(dynId_str: string): InteractionStatusItem | null {
  return statusMap.value[dynId_str] ?? null
}

function openDetail(item: MomentFeedItem) {
  router.push({ name: 'MOMENT_DETAIL', params: { momentId: item.dynId_str } })
}

/** 去「动态」tab（完整列表） */
function goDynamicTab() {
  router.push({ name: 'MOMENT_USER_SPACE_DYNAMIC', params: { mid: spaceMid.value } })
}

/** 去「时间线」tab（完整流水） */
function goTimelineTab() {
  router.push({ name: 'MOMENT_USER_SPACE_TIMELINE', params: { mid: spaceMid.value } })
}

/** 去「收藏」tab；带 fid 时直达某个夹（与 B 站 /favlist?fid= 对齐） */
function goFavoritesTab(folder?: FavoriteFolderResp) {
  const fid = folder?.folderId_str ?? ''
  router.push({
    name: 'MOMENT_USER_SPACE_FAVORITES',
    params: { mid: spaceMid.value },
    query: fid ? { fid, ftype: 'create' } : {}
  })
}
</script>
