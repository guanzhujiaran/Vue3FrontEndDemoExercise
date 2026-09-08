<template>
  <!-- 未登录：BiliErrorRouteTo 提示未登录，倒计时/按钮返回首页 -->
  <BiliErrorRouteTo
    v-if="loginRequired"
    class="moment-space__login-required"
    :detail="BiliErrorRouteToTxt.space_login_required"
  />
  <div
    v-else
    class="moment-space flex-1 h-full flex flex-col bg-bg-page text-text-primary"
  >
    <!-- 顶部横幅 + 头像信息 -->
    <section class="moment-space__header relative">
      <!-- 横幅背景 -->
      <div class="moment-space__banner h-48 w-full bg-linear-to-br from-primary-light-3 to-info-light-3 overflow-hidden">
        <img
          v-if="userBanner"
          class="moment-space__banner-img w-full h-full object-cover"
          :src="userBanner"
          alt="banner"
        />
      </div>
      <!-- 用户信息（2.25.0：头像上移，更贴近横幅，对标 B 站空间） -->
      <div class="moment-space__user relative px-6 -mt-16">
        <div class="moment-space__user-main flex items-end gap-4">
          <el-avatar
            class="moment-space__avatar border-4 border-bg-page"
            :size="96"
            :src="targetUser.face || BiliImg.face.noface"
          />
          <div class="flex-1 min-w-0 pb-2">
            <div class="flex items-center gap-2 flex-wrap">
              <h1 class="moment-space__username text-xl font-bold truncate">
                {{ targetUser.name || '加载中...' }}
              </h1>
              <!-- 2.26.0：用户等级徽章（B 站风格 SVG，随等级动态切换） -->
              <span
                v-if="levelBadge"
                class="moment-space__level-badge inline-flex items-center"
                :title="`等级 Lv.${targetUser.level || 0}`"
              >
                <component :is="levelBadge" class="bili-icon w-6 h-6" />
              </span>
              <el-tag v-if="isOwnSpace" size="default" type="primary">我</el-tag>
            </div>
            <p v-if="userBio" class="moment-space__bio text-sm text-text-placeholder mt-1 truncate">
              {{ userBio }}
            </p>
          </div>
          <!-- 操作按钮区 -->
          <div class="moment-space__actions flex gap-2 pb-2">
            <!-- 自己视角：显示编辑按钮 -->
            <template v-if="isOwnSpace">
              <el-button
                class="moment-space__edit-btn"
                size="default"
                :icon="Edit"
                @click="goEditProfile"
              >
                编辑资料
              </el-button>
              <el-button
                class="moment-space__publish-btn"
                type="primary"
                size="default"
                :icon="Promotion"
                @click="publishVisible = true"
              >
                发布动态
              </el-button>
            </template>
            <!-- 他人视角：显示关注 / 私信按钮 -->
            <template v-else>
              <el-button
                class="moment-space__follow-btn"
                type="primary"
                size="default"
                @click="handleFollow"
              >
                {{ isFollowed ? '已关注' : '关注' }}
              </el-button>
              <el-button
                class="moment-space__dm-btn"
                size="default"
                :icon="ChatDotRound"
                @click="handleDM"
              >
                私信
              </el-button>
              <el-dropdown trigger="click">
                <el-button class="moment-space__more-btn" size="default" :icon="MoreFilled" />
                <template #dropdown>
                  <el-dropdown-menu class="moment-space__actions-menu">
                    <el-dropdown-item @click="handleReport">举报</el-dropdown-item>
                    <el-dropdown-item @click="handleBlacklist">
                      {{ iBlocked ? '解除拉黑' : '拉黑' }}
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </template>
          </div>
        </div>

        <!-- 统计栏 -->
        <div class="moment-space__stats flex items-center gap-6 mt-4 pb-4 text-sm text-text-placeholder">
          <div class="moment-space__stat-item">
            <span class="font-bold text-text-primary">{{ formatNum(stats.following) }}</span>
            <span class="ml-1">关注</span>
          </div>
          <div class="moment-space__stat-item">
            <span class="font-bold text-text-primary">{{ formatNum(stats.followers) }}</span>
            <span class="ml-1">粉丝</span>
          </div>
          <div class="moment-space__stat-item">
            <span class="font-bold text-text-primary">{{ formatNum(stats.liked) }}</span>
            <span class="ml-1">获赞</span>
          </div>
          <div class="moment-space__stat-item">
            <span class="font-bold text-text-primary">{{ formatNum(stats.dynamicCount) }}</span>
            <span class="ml-1">动态</span>
          </div>
          <div class="flex-1" />
        </div>

        <!-- 2.25.0：横向导航栏（对标 B 站空间） -->
        <nav class="moment-space__tabs flex items-center gap-2 border-b border-border-lighter pt-4">
          <div
            v-for="tab in tabs"
            :key="tab.name"
            class="moment-space__tab-item flex items-center gap-1.5 px-4 py-2 cursor-pointer rounded-md transition-colors"
            :class="
              resolvedActiveTab === tab.name
                ? 'text-primary bg-primary-light-3/50 font-bold'
                : 'text-text-placeholder hover:text-text-primary hover:bg-bg-page'
            "
            @click="switchTab(tab.name)"
          >
            <component :is="tab.icon" class="bili-icon w-5 h-5 shrink-0" />
            <span class="moment-space__tab-title text-sm whitespace-nowrap">{{ tab.title }}</span>
            <span v-if="tab.badge" class="moment-space__tab-badge text-xs">{{ tab.badge }}</span>
          </div>
        </nav>
      </div>
    </section>

    <!-- 内容区 -->
    <section class="moment-space__body flex-1 min-h-0 overflow-y-auto px-6 py-6">
      <!-- 黑名单互访拒绝：展示受限提示，不加载空间内容（P9-T4） -->
      <div v-if="blocked" class="moment-space__blocked max-w-2xl mx-auto">
        <div class="moment-space__blocked-card bg-bg-overlay border border-border-light rounded-lg p-10 text-center">
          <el-icon class="moment-space__blocked-icon text-5xl text-text-placeholder" :size="48">
            <Lock />
          </el-icon>
          <template v-if="iBlocked">
            <!-- 主动拉黑对方：在空间页「更多 → 解除拉黑」可恢复访问 -->
            <p class="moment-space__blocked-text mt-4 text-base text-text-primary font-medium">
              你已将对方加入黑名单，无法查看其空间
            </p>
            <p class="moment-space__blocked-sub mt-2 text-sm text-text-placeholder">
              如要恢复访问，可在右上角「更多」中解除拉黑
            </p>
          </template>
          <template v-else>
            <p class="moment-space__blocked-text mt-4 text-base text-text-primary font-medium">
              对方已将你加入黑名单，无法访问其空间
            </p>
            <p class="moment-space__blocked-sub mt-2 text-sm text-text-placeholder">如需解除，请通过其他方式联系对方</p>
          </template>
        </div>
      </div>
      <!-- 主页 Tab（仅自己显示） -->
      <div v-if="resolvedActiveTab === 'home' && isOwnSpace" class="moment-space__home max-w-5xl">
        <div class="moment-space__home-grid grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- 主区域 -->
          <div class="lg:col-span-2 space-y-6">
            <div class="moment-space__empty-card bg-bg-overlay border border-border-light rounded-lg p-6 text-center text-text-placeholder">
              数据总览开发中
            </div>
          </div>
          <!-- 侧栏 -->
          <div class="space-y-4">
            <div class="bg-bg-overlay border border-border-light rounded-lg p-4 text-sm">
              <h3 class="font-bold mb-2">个人简介</h3>
              <p class="text-text-placeholder">{{ userBio || '暂无简介' }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 动态 Tab -->
      <div v-if="resolvedActiveTab === 'dynamic' && !blocked" class="moment-space__dynamic max-w-2xl mx-auto">
        <div class="moment-space__dynamic-toolbar mb-4 flex items-center justify-between">
          <span class="text-sm text-text-placeholder">共 {{ items.length }} 条动态</span>
          <el-button
            v-if="isOwnSpace"
            class="moment-space__dynamic-publish-btn"
            type="primary"
            size="default"
            @click="publishVisible = true"
          >
            发布动态
          </el-button>
        </div>
        <LoadingWrap :loading="loading">
          <EmptyState v-if="!loading && items.length === 0" text="还没有发布过动态 ~" />
          <div v-else class="moment-space__list space-y-4">
            <MomentCard
              v-for="item in items"
              :key="item.dynIdStr"
              :item="item"
              :status="statusOf(item.dynIdStr)"
              :show-more-actions="isOwnSpace"
              :can-remove="isOwnSpace"
              @click="openDetail"
              @avatar-click="onCardAvatarClick"
              @thumb="handleThumb(item)"
              @remove="handleRemove(item)"
            />
            <div v-if="hasMore" class="flex justify-center py-4">
              <el-button size="default" :loading="loadingMore" @click="loadMore">加载更多</el-button>
            </div>
            <div v-else-if="items.length > 0" class="text-center text-sm text-text-placeholder py-4">
              — 没有更多了 —
            </div>
          </div>
        </LoadingWrap>
      </div>

      <!-- 收藏 Tab -->
      <div v-else-if="resolvedActiveTab === 'favorites'" class="moment-space__favorites max-w-2xl mx-auto">
        <!-- 收藏夹切换 -->
        <div class="moment-space__fav-folders mb-4 flex items-center gap-2 flex-wrap">
          <el-tag
            v-for="folder in favFolders"
            :key="folder.folderId"
            class="moment-space__fav-folder cursor-pointer"
            :type="activeFolderId === folder.folderId ? 'primary' : 'info'"
            effect="plain"
            @click="switchFolder(folder)"
          >
            {{ folder.name }}（{{ folder.favoriteCount }}）
          </el-tag>
          <span v-if="favFolders.length === 0" class="text-sm text-text-placeholder">暂无收藏夹</span>
        </div>

        <LoadingWrap :loading="favLoading">
          <EmptyState v-if="!favLoading && visibleFavItems.length === 0" text="还没有收藏的动态 ~" />
          <div v-else class="moment-space__fav-list space-y-4">
            <MomentCard
              v-for="item in visibleFavItems"
              :key="item.dynIdStr"
              :item="item"
              @click="openDetail(item)"
            />
            <div v-if="favHasMore" class="flex justify-center py-4">
              <el-button size="default" :loading="favLoading" @click="loadMoreFavorites">加载更多</el-button>
            </div>
            <div v-else-if="favDynIds.length > 0" class="text-center text-sm text-text-placeholder py-4">
              — 没有更多了 —
            </div>
          </div>
        </LoadingWrap>
      </div>

      <!-- 设置 Tab（仅自身空间） -->
      <div v-else-if="resolvedActiveTab === 'settings' && isOwnSpace" class="moment-space__settings max-w-2xl mx-auto">
        <div class="bg-bg-overlay border border-border-light rounded-lg p-4">
          <div class="flex items-center justify-between">
            <div>
              <div class="moment-space__settings-label font-medium">在主页展示「收藏」</div>
              <div class="text-xs text-text-placeholder mt-1">关闭后，你的主页（含访客视角）将不再展示收藏 tab</div>
            </div>
            <el-switch
              v-model="showFavorites"
              class="moment-space__settings-switch"
              @change="toggleShowFavorites"
            />
          </div>
        </div>
      </div>

      <!-- 其他 Tab 占位 -->
      <div v-else-if="resolvedActiveTab !== 'home' && resolvedActiveTab !== 'dynamic'" class="moment-space__placeholder max-w-2xl mx-auto">
        <EmptyState :text="`${currentTab.title} 模块开发中`" />
      </div>
    </section>

    <!-- 发布动态弹窗 -->
    <MomentPublishForm
      v-if="isOwnSpace"
      v-model:visible="publishVisible"
      @submit="handlePublish"
    />

    <!-- 统一举报弹窗（用户空间） -->
    <ReportDialog v-model="reportDialogVisible" :biz-type="InteractionBizTypeEnum.USER" :biz-id="reportSpaceMid" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, type Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Promotion,
  ChatDotRound,
  MoreFilled,
  Bell,
  Lock,
  Edit,
} from '@element-plus/icons-vue'
import {
  fetchSpaceFeed,
  fetchUserSpaceInfo,
  fetchMomentDetail,
  createMoment,
  thumbMoment,
  fetchFavoriteSetting,
  setFavoriteSetting,
  fetchFavoriteFolders,
  fetchFavoriteDynIds,
  fetchUserFavoriteFolders,
  fetchUserFavoriteDynIds,
  fetchInteractionStatus,
  InteractionBizTypeEnum,
  } from '@/api/notify/moment-api'
import type { FavoriteFolderResp } from '@/api/notify/moment-api'
import type {
  MomentFeedItem,
  MomentCreateReq,
  SpaceInfoResp,
  InteractionStatusItem,
} from '@/api/notify/moment-api'
import LoadingWrap from '@/components/message/LoadingWrap.vue'
import EmptyState from '@/components/message/EmptyState.vue'
import MomentCard from '@/components/moment/MomentCard.vue'
import MomentPublishForm from '@/components/moment/MomentPublishForm.vue'
import ReportDialog from '@/components/moment/ReportDialog.vue'
import { buildMomentContentNodes, type MomentAttachResource } from '@/utils/momentContent'
import { useUserNavStore } from '@/stores/user_nav'
import { BiliImg } from '@/assets/img/BiliImg'
import biliMessage from '@/utils/message'
import userApi from '@/api/user/user_api.ts'
import { isLogin } from '@/api/user/utils.ts'
import BiliErrorRouteTo from '@/components/CommonCompo/Bili-Feedback-Compo/BiliErrorRouteTo.vue'
import { BiliErrorRouteToTxt } from '@/assets/text/BiliErrorTxt.ts'

const route = useRoute()
const router = useRouter()
const userNavStore = useUserNavStore()

// 路由 mid 存在 → 查看他人空间；不存在 → 自身空间
// 2.25.0：currentMid 必须为 computed —— 登录态是异步加载的（App.vue onMounted 后 nav 请求才返回），
// setup 阶段同步快照 uid 恒为空串，导致自己空间被误判为未登录（「请先登录」）
const routeMid = computed(() => (route.params.mid ? String(route.params.mid) : null))
const currentMid = computed(() => userNavStore.user_nav.uid || '')
const spaceMid = computed(() => routeMid.value ?? currentMid.value)
const isOwnSpace = computed(() => routeMid.value === null || routeMid.value === currentMid.value)

const publishVisible = ref(false)
// `/app/space`（无 mid）且确认未登录：展示 BiliErrorRouteTo 未登录提示页
const loginRequired = ref(false)
const activeTab = ref<string>('')
/** 2.25.0：登录态异步加载，activeTab 默认值改为响应式兜底（就绪后再定） */
const resolvedActiveTab = computed(() =>
  activeTab.value ? activeTab.value : isOwnSpace.value ? 'home' : 'dynamic'
)

// 空间主人信息（完整空间资料，对标 B 站 acc/info）
const targetUser = ref<SpaceInfoResp>({ mid: 0, midStr: null, name: '加载中...' })
const userBanner = ref<string | undefined>(undefined)
const userBio = ref<string>('')
const isFollowed = ref(false)
// 黑名单互访拒绝状态：true 时空间页显示受限提示、不加载内容（P9-T4）
const blocked = ref(false)
// 受限方向标记：是否是我主动拉黑了对方（决定受限文案与「拉黑 / 解除拉黑」菜单）
const iBlocked = ref(false)

// 统计（2.32.0：全部随 /user/space/info 一次返回，不再并发 follow/stat + upstat）
const stats = ref({ following: 0, followers: 0, liked: 0, dynamicCount: 0 })

/** 2.32.0：把 `/user/space/info` 内联的聚合统计落到 stats（不再单独请求） */
function applySpaceStats(info: SpaceInfoResp | null | undefined): void {
  if (!info) return
  stats.value.following = info.follow_stat?.following_count ?? 0
  stats.value.followers = info.follow_stat?.follower_count ?? 0
  stats.value.dynamicCount = info.upstat?.dynamic_count ?? 0
  stats.value.liked = info.upstat?.like_count ?? 0
}

// 2.25.0：横向导航栏图标（统一使用 src/assets/svgs/space/ 下 B 站风格 SVG）
import SpaceHomeIcon from '@/assets/svgs/space/home.svg?component'
import SpaceDynamicIcon from '@/assets/svgs/space/dynamic.svg?component'
import SpaceCollectionIcon from '@/assets/svgs/space/collection.svg?component'
import SpaceFavoriteIcon from '@/assets/svgs/space/favorite.svg?component'
import SpaceSettingIcon from '@/assets/svgs/space/setting.svg?component'
// 2.26.0：用户等级徽章（B 站风格，Lv0~Lv6 完整单色版）
import LevelBadge0 from '@/assets/svgs/space/user_level_0.svg?component'
import LevelBadge1 from '@/assets/svgs/space/user_level_1.svg?component'
import LevelBadge2 from '@/assets/svgs/space/user_level_2.svg?component'
import LevelBadge3 from '@/assets/svgs/space/user_level_3.svg?component'
import LevelBadge4 from '@/assets/svgs/space/user_level_4.svg?component'
import LevelBadge5 from '@/assets/svgs/space/user_level_5.svg?component'
import LevelBadge6 from '@/assets/svgs/space/user_level_6.svg?component'

const LEVEL_BADGES = [LevelBadge0, LevelBadge1, LevelBadge2, LevelBadge3, LevelBadge4, LevelBadge5, LevelBadge6]

/** 2.26.0：当前用户等级徽章（越界/未知返回 undefined 不显示） */
const levelBadge = computed(() => {
  const lv = targetUser.value.level
  if (typeof lv !== 'number' || lv < 0 || lv > 6) return undefined
  return LEVEL_BADGES[lv]
})

// 自身空间 tab 列表
interface SpaceTab {
  name: string
  title: string
  icon: Component
  badge?: string
}
const ownTabs: SpaceTab[] = [
  { name: 'home', title: '主页', icon: SpaceHomeIcon },
  { name: 'dynamic', title: '动态', icon: SpaceDynamicIcon },
  { name: 'collections', title: '合集和系列', icon: SpaceCollectionIcon, badge: '0' },
  { name: 'favorites', title: '收藏', icon: SpaceFavoriteIcon, badge: '0' },
  { name: 'settings', title: '设置', icon: SpaceSettingIcon },
]
// 他人空间 tab 列表（收藏 tab 仅当主人开启「显示收藏」时才展示）
const otherTabs: SpaceTab[] = [
  { name: 'dynamic', title: '动态', icon: SpaceDynamicIcon },
]
const tabs = computed(() => {
  const base = isOwnSpace.value ? ownTabs : otherTabs
  if (!showFavorites.value) {
    // 不展示收藏：自身空间由设置开关控制；他人空间由主人公开状态控制
    return base.filter((t) => t.name !== 'favorites')
  }
  // 他人空间且主人公开了收藏 → 追加收藏 tab
  if (!isOwnSpace.value && !base.some((t) => t.name === 'favorites')) {
    return [...base, { name: 'favorites', title: '收藏', icon: SpaceFavoriteIcon } as SpaceTab]
  }
  return base
})

const currentTab = computed(() => tabs.value.find((t) => t.name === resolvedActiveTab.value) ?? { name: 'dynamic', title: '动态', icon: SpaceDynamicIcon })

/** 2.24.0：下拉菜单切换 Tab */
function switchTab(name: string) {
  activeTab.value = name
}

const items = ref<MomentFeedItem[]>([])
const loading = ref(false)
const loadingMore = ref(false)
const hasMore = ref(false)

// 2.41.0：卡片统计统一走 /interaction/status 批量接口（卡片不再内置 stat 模块）
const statusMap = ref<Record<string, InteractionStatusItem>>({})
async function loadStatus(ids: string[]) {
  const fresh = ids.filter((id) => !statusMap.value[id])
  if (!fresh.length) return
  try {
    const res = await fetchInteractionStatus(InteractionBizTypeEnum.DYNAMIC, fresh)
    for (const it of res?.items ?? []) {
      if (it?.bizId) statusMap.value[it.bizId] = it
    }
  } catch {
    // 弱依赖：失败不阻断展示
  }
}
function statusOf(dynIdStr: string): InteractionStatusItem | null {
  return statusMap.value[dynIdStr] ?? null
}
let historyOffset: number | undefined

// 收藏夹 / 收藏 tab
const showFavorites = ref(true) // 主页是否显示收藏 tab（默认显示）
const favFolders = ref<FavoriteFolderResp[]>([])
const activeFolderId = ref<string>('')
const favDynIds = ref<string[]>([])
const favItemsMap = ref<Record<string, MomentFeedItem>>({})
const favLoading = ref(false)
const favHasMore = ref(false)
let favPage = 1
// 收藏 tab 实际渲染项（过滤掉详情加载失败的 dynId）
const visibleFavItems = computed(() =>
  favDynIds.value.map((id) => favItemsMap.value[id]).filter((x): x is MomentFeedItem => Boolean(x))
)

/**
 * 2.56.0：`/app/space`（无 mid，自身空间入口）登录态处理。
 * App.vue 的 checkLoginStatus 是 onMounted 异步的（nav 请求），空间页 setup 时
 * user_nav.uid 可能尚为空，不能以同步快照判定登录态：
 * - `/app/space/:mid`（他人空间）→ 直接加载
 * - `/app/space` 且 uid 已就绪（store 持久化）→ 302 到 `/app/space/{uid}`
 * - `/app/space` 且 uid 未就绪 → 主动调 isLogin() 确认：
 *   已登录（isLogin 内部会 save_user_nav）→ 跳转 uid 页；未登录 → 提示并引导返回首页
 */
onMounted(() => {
  if (routeMid.value) {
    loadFirst()
    return
  }
  if (currentMid.value) {
    enterOwnSpace()
    return
  }
  void confirmLoginAndEnter()
})

/** 登录态就绪后把 URL 归位到带 uid 的空间页（`/app/space/{uid}`，组件复用不重挂载） */
function enterOwnSpace() {
  router.replace({ name: 'MOMENT_USER_SPACE', params: { mid: currentMid.value } })
  loadFirst()
}

/** uid 未就绪：主动确认登录态；未登录 → BiliErrorRouteTo 提示未登录并返回首页 */
async function confirmLoginAndEnter() {
  const [loggedIn, , user_nav] = await isLogin()
  if (loggedIn && user_nav?.uid) {
    enterOwnSpace()
  } else {
    loginRequired.value = true
  }
}

async function loadFirst() {
  const mid = spaceMid.value
  if (!mid) {
    biliMessage.warning('请先登录')
    return
  }
  loading.value = true
  // 先拉用户空间完整资料（对标 B 站 acc/info，公开可读），并据此做黑名单互访拦截
  const space = await fetchUserSpaceInfo(mid)
  if (space.code === 403) {
    // 黑名单互访拒绝：已拉黑对方或被对方拉黑，均不可访问其空间
    blocked.value = true
    loading.value = false
    targetUser.value = { mid: Number(mid) || 0, midStr: mid, name: `用户 ${mid}` }
    // 判定受限方向（主动拉黑 / 被对方拉黑），决定受限文案与菜单项行为
    void resolveBlockedDirection()
    return
  }
  if (space.data) {
    targetUser.value = space.data
    userBio.value = space.data.sign || ''
    isFollowed.value = space.data.is_followed ?? false
    userBanner.value = undefined
  } else if (space.code !== 0) {
    // 用户不存在等：降级展示
    targetUser.value = {
      mid: Number(mid) || 0,
      midStr: mid,
      name: isOwnSpace.value ? userNavStore.user_nav.user_name : `用户 ${mid}`,
      face: userNavStore.user_nav.face || undefined,
    }
  } else {
    targetUser.value.name = isOwnSpace.value ? userNavStore.user_nav.user_name : `用户 ${mid}`
  }
  // 自己空间：头像优先取 store 中缓存
  if (isOwnSpace.value && userNavStore.user_nav.face) {
    targetUser.value.face = userNavStore.user_nav.face
  }

  const res = await fetchSpaceFeed(mid, { page_size: 20 })
  items.value = res.items || []
  hasMore.value = res.hasMore ?? false
  historyOffset = res.historyOffset ?? undefined
  // 2.41.0：批量拉取本页卡片互动统计（统一 status 接口）
  if (items.value.length) void loadStatus(items.value.map((i) => i.dynIdStr))
  // 2.32.0：关系统计 / 空间统计已随 space/info 一次返回，不再单独请求
  applySpaceStats(space.data)
  loading.value = false

  // 收藏：加载主页收藏可见性（仅自身空间可写开关）与收藏夹列表
  loadFavoriteData()
}

/** 加载收藏可见性设置 + 收藏夹列表（自身空间读本人收藏；他人空间读主人公开收藏） */
async function loadFavoriteData() {
  const mid = spaceMid.value
  if (!mid) return
  try {
    if (isOwnSpace.value) {
      const setting = await fetchFavoriteSetting()
      showFavorites.value = setting?.showFavorites ?? true
      const folders = await fetchFavoriteFolders()
      favFolders.value = folders
    } else {
      // 他人空间：读主人公开收藏夹（不公开时返回 null → 隐藏收藏 tab）
      const folders = await fetchUserFavoriteFolders(mid)
      if (folders === null) {
        showFavorites.value = false
        favFolders.value = []
        activeFolderId.value = ''
        favDynIds.value = []
        return
      }
      showFavorites.value = true
      favFolders.value = folders
    }
    if (favFolders.value.length > 0) {
      const defaultFolder = favFolders.value.find((f) => f.isDefault) ?? favFolders.value[0]
      activeFolderId.value = defaultFolder.folderId
      await loadFavoriteDyns(defaultFolder.folderId, true)
    } else {
      activeFolderId.value = ''
      favDynIds.value = []
    }
  } catch {
    showFavorites.value = isOwnSpace.value
    favFolders.value = []
  }
}

/** 加载某收藏夹下动态 id（并批量拉详情；自身空间读本人，他人空间读主人公开） */
async function loadFavoriteDyns(folderId: string, reset = false) {
  if (!folderId) return
  if (reset) {
    favPage = 1
    favDynIds.value = []
  }
  favLoading.value = true
  try {
    const res = isOwnSpace.value
      ? await fetchFavoriteDynIds(folderId, { page: favPage, pageSize: 20 })
      : await fetchUserFavoriteDynIds(spaceMid.value, folderId, { page: favPage, pageSize: 20 })
    if (res === null) {
      // 不公开/夹不存在：隐藏收藏 tab
      showFavorites.value = false
      favDynIds.value = []
      favHasMore.value = false
      return
    }
    // 2.55.0 后端收藏夹通用化：返回 items（bizType+bizId 对），本空间仅展示动态资源
    const newIds = (res.items ?? [])
      .filter((it) => it.bizType === InteractionBizTypeEnum.DYNAMIC)
      .map((it) => it.bizId)
    favDynIds.value = reset ? newIds : [...favDynIds.value, ...newIds]
    favHasMore.value = favPage * 20 < (res.total || 0)
    // 逐个拉取收藏动态详情（用于 MomentCard 渲染）
    const freshItems: Record<string, MomentFeedItem> = { ...favItemsMap.value }
    await Promise.all(
      newIds.map(async (id) => {
        if (freshItems[id]) return
        try {
          const detail = await fetchMomentDetail(id)
          if (detail) freshItems[id] = detail
        } catch {
          // 动态已删除等：跳过，不渲染
        }
      })
    )
    favItemsMap.value = freshItems
  } catch {
    favHasMore.value = false
  } finally {
    favLoading.value = false
  }
}

function switchFolder(folder: FavoriteFolderResp) {
  if (activeFolderId.value === folder.folderId) return
  activeFolderId.value = folder.folderId
  loadFavoriteDyns(folder.folderId, true)
}

function loadMoreFavorites() {
  if (favLoading.value || !favHasMore.value) return
  favPage += 1
  loadFavoriteDyns(activeFolderId.value)
}

/** 切换主页是否显示收藏（仅自身空间）：成功文案由调用方预设，失败由后端响应驱动 */
async function toggleShowFavorites(v: boolean | string | number) {
  const enabled = Boolean(v)
  showFavorites.value = enabled
  const ok = await setFavoriteSetting(enabled, {
    showSuccessToast: true,
    successMessage: enabled ? '主页已显示收藏' : '主页已隐藏收藏',
  })
  if (!ok) showFavorites.value = !enabled
}

async function loadMore() {
  const mid = spaceMid.value
  if (loadingMore.value || !hasMore.value) return
  loadingMore.value = true
  const res = await fetchSpaceFeed(mid, { page_size: 20, history_offset: historyOffset })
  const newItems = res.items || []
  items.value.push(...newItems)
  hasMore.value = res.hasMore ?? false
  historyOffset = res.historyOffset ?? undefined
  loadingMore.value = false
  // 2.41.0：批量拉取本页卡片互动统计（统一 status 接口）
  if (newItems.length) void loadStatus(newItems.map((i) => i.dynIdStr))
}

function openDetail(item: MomentFeedItem) {
  router.push({ name: 'MOMENT_DETAIL', params: { momentId: item.dynIdStr } })
}

function onCardAvatarClick(item: MomentFeedItem) {
  // item.mid 是 number，spaceMid 取自路由 params 是字符串，比较前先对齐类型
  if (String(item.mid) !== spaceMid.value) {
    router.push({ name: 'MOMENT_USER_SPACE', params: { mid: String(item.mid) } })
  }
}

function handleFollow() {
  isFollowed.value = !isFollowed.value
  biliMessage.success(isFollowed.value ? '已关注' : '已取消关注')
}

function goEditProfile() {
  router.push('/app/user-center/user-info-config')
}

function handleDM() {
  biliMessage.info('私信功能开发中')
}

/** 统一举报弹窗（P11-T6，用户空间举报：bizType=user，bizId=mid） */
const reportDialogVisible = ref(false)
const reportSpaceMid = ref<string>('')

function handleReport() {
  if (!spaceMid.value) return
  reportSpaceMid.value = String(spaceMid.value) // mid 转 str，避免大整数精度丢失
  reportDialogVisible.value = true
}

/**
 * 受限态下确认方向：我拉黑了对方（iBlocked=true）还是被对方拉黑。
 * 空间信息接口只回 403 不回方向，需查一次关系。
 */
async function resolveBlockedDirection() {
  const mid = Number(spaceMid.value)
  if (!mid || mid <= 0) {
    iBlocked.value = false
    return
  }
  try {
    const r = await userApi.BlocklistCheck(mid)
    iBlocked.value = r.success ? Boolean(r.data?.i_blocked) : false
  } catch {
    iBlocked.value = false
  }
}

/** 拉黑 / 解除拉黑（空间页「更多」菜单，仅他人空间可用） */
async function handleBlacklist() {
  const mid = Number(spaceMid.value)
  if (!mid || mid <= 0 || isOwnSpace.value) return

  if (iBlocked.value) {
    // 已拉黑对方 → 解除
    const r = await userApi.BlocklistRemove(mid)
    if (!r.success) return
    biliMessage.success('已解除拉黑')
    blocked.value = false
    iBlocked.value = false
    items.value = []
    await loadFirst()
    return
  }

  // 拉黑对方
  const r = await userApi.BlocklistAdd(mid)
  if (!r.success) return
  biliMessage.success('已将对方加入黑名单')
  isFollowed.value = false
  // 后端对任一向黑名单关系都会拒绝空间访问：拉黑后空间即转为受限态
  iBlocked.value = true
  blocked.value = true
  items.value = []
}

async function handleThumb(item: MomentFeedItem) {
  const up = item.modules?.find((m) => m.moduleType === 'interaction')?.isLike ? 2 : 1
  const res = await thumbMoment(item.dynIdStr, up)
  if (res) {
    const interMod = item.modules?.find((m) => m.moduleType === 'interaction')
    if (interMod) interMod.isLike = up === 1
    const st = statusMap.value[item.dynIdStr]
    if (st) {
      st.isLike = up === 1
      st.likeCount = Math.max(0, Number(st.likeCount ?? 0) + (up === 1 ? 1 : -1))
    }
  }
}

/** 2.22.1：删除确认与 API 已下沉 MomentCard，父组件仅移除列表项 */
function handleRemove(item: MomentFeedItem) {
  items.value = items.value.filter((i) => i.dynIdStr !== item.dynIdStr)
}

async function handlePublish(payload: {
  content: string
  topics?: { topicId: number }[]
  images?: string[]
  atNameToMid?: Record<string, number>
  attachResource?: MomentAttachResource
  poiName?: string
}) {
  // 复用统一编辑器节点构建工具（@ / 图片；2.22.0 正文不再解析 #话题#）
  const content = buildMomentContentNodes(payload)
  const body: MomentCreateReq = {
    scene: 'WORD',
    content: content.length ? content : [{ type: 'WORDS', text: payload.content }],
    // 2.22.0：多话题经 MomentCreateReq.topics 单独提交
    topics: payload.topics?.length ? payload.topics : undefined,
    lbs: payload.poiName ? { poi: payload.poiName } : undefined,
  }
  const res = await createMoment(body, {
    showSuccessToast: true,
    successMessage: '发布成功，等待审核',
  })
  if (res) {
    publishVisible.value = false
    loadFirst()
  }
}

function formatNum(n?: number | null): string {
  if (n == null || n === 0) return '0'
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w'
  return String(n)
}
</script>