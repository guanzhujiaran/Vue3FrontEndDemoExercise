<template>
  <div class="moment-space-root flex h-full min-h-0 flex-1 flex-col">
    <!-- 顶层路由组件必须单根：登录引导（v-if）与空间主页（v-else）都要写在根元素「内部」，
         否则模板会编译成 fragment，外层 transition + keep-alive 在切换 header 时会卡死。 -->
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
        <!-- 横幅背景（小屏压低，避免头像区把首屏全占掉） -->
        <div class="moment-space__banner h-32 sm:h-48 w-full bg-linear-to-br from-primary-light-3 to-info-light-3 overflow-hidden">
          <img
            v-if="userBanner"
            class="moment-space__banner-img w-full h-full object-cover"
            :src="userBanner"
            alt="banner"
          />
        </div>
        <!-- 用户信息（2.25.0：头像上移，更贴近横幅，对标 B 站空间） -->
        <div class="moment-space__user relative px-4 sm:px-6 -mt-12 sm:-mt-16">
          <!-- 头像 + 用户信息 + 操作按钮始终在同一行右侧：信息块 flex-1 min-w-0 负责省略号收敛，
               按钮组 wrap 时右对齐，不会像之前那样掉到独立一行把头部撑高。 -->
          <div class="moment-space__user-main flex items-end gap-4">
            <el-avatar
              class="moment-space__avatar border-4 border-bg-page h-20! w-20! sm:h-24! sm:w-24!"
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
                <el-tag v-if="mounted && isOwnSpace" size="default" type="primary">我</el-tag>
                <!-- 视角预览：非本人视角时用标签明示当前模拟的是访客 / 粉丝 -->
                <el-tag v-else-if="mounted && isPreviewing" size="default" type="warning">
                  {{ previewModeLabel }}
                </el-tag>
                <!-- 最近一次登录：仅本人可见（后端 act-log 只允许读自己的记录），日期精确到日 + IP 属地 -->
                <span
                  v-if="mounted && lastLoginTip && !isPreviewing"
                  class="moment-space__last-login text-sm text-text-placeholder"
                >
                  {{ lastLoginTip }}
                </span>
              </div>
              <p v-if="userBio" class="moment-space__bio text-sm text-text-placeholder mt-1 truncate">
                {{ userBio }}
              </p>
            </div>
            <!-- 操作按钮区（依赖登录态：SSR / 水合初期 currentMid 未就绪，挂载后才渲染，避免 hydration mismatch） -->
            <div v-if="mounted" class="moment-space__actions flex flex-wrap items-center justify-end gap-2 shrink-0 max-w-full pb-2">
              <!-- 自己视角：编辑资料 + 视角预览（空间页是「资料 / 关系」场所，不放发布动态入口；
                   要发动态去「动态」tab，那里的按钮复用同一份发布弹窗） -->
              <template v-if="isOwnSpace && !isPreviewing">
                <el-dropdown trigger="click">
                  <el-button class="moment-space__preview-btn" size="default" :icon="View">
                    视角预览
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu class="moment-space__preview-menu">
                      <el-dropdown-item
                        v-for="opt in PREVIEW_OPTIONS"
                        :key="opt.value"
                        :disabled="previewMode === opt.value"
                        @click="setPreviewMode(opt.value)"
                      >
                        {{ opt.label }}
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
                <el-button
                  class="moment-space__edit-btn"
                  size="default"
                  :icon="Edit"
                  @click="goEditProfile"
                >
                  编辑资料
                </el-button>
              </template>
              <!-- 他人视角 / 预览中的访客视角：显示关注 / 私信按钮 -->
              <template v-else>
                <!-- 已关注：按钮变为下拉（设置分组 / 取消关注），对齐 B 站他人主页；
                     未关注：普通「关注」按钮 -->
                <el-dropdown v-if="effectiveFollowed" trigger="click">
                  <el-button class="moment-space__follow-btn" size="default">已关注</el-button>
                  <template #dropdown>
                    <el-dropdown-menu class="moment-space__follow-menu">
                      <el-dropdown-item @click="openTagPicker">设置分组</el-dropdown-item>
                      <el-dropdown-item @click="handleFollow">取消关注</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
                <el-button
                  v-else
                  class="moment-space__follow-btn"
                  type="primary"
                  size="default"
                  @click="handleFollow"
                >
                  关注
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
        </div>
      </section>

      <!-- 内容区：黑名单受限态在布局壳内统一拦截，正常内容交给子路由 -->
      <section class="moment-space__body flex-1 min-h-0 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">
        <!-- 吸顶头部（2.59.0）：预览提示条 + tab 栏放在**滚动容器内**并用 sticky 吸顶。
             不用 el-affix：affix 走 position:fixed + top=offset，offset 需要等于「横幅 + 头像区」高度
             才能停在正确位置，数值随视口高度漂移；而 sticky 直接相对本滚动容器定位，稳。
             必须给不透明背景（bg-bg-page），否则下方内容会从这一行下方透出。 -->
        <div class="moment-space__sticky-head sticky top-0 z-20 bg-bg-page">
          <!-- 预览提示条：切换到访客 / 粉丝视角后常驻吸顶，随时可一键关闭预览（B 站预览条） -->
          <div
            v-if="isOwnSpace && isPreviewing"
            class="moment-space__preview-bar flex flex-col items-center justify-center gap-2 py-2 sm:flex-row sm:gap-3 bg-primary-light-3 text-sm text-center sm:text-left text-text-primary"
          >
            <span class="moment-space__preview-tip">
              当前为预览模式，展示的是{{ previewModeLabel }}看到的样子，不会产生任何真实操作
            </span>
            <el-button
              class="moment-space__preview-exit-btn"
              type="primary"
              size="default"
              @click="exitPreview"
            >
              关闭预览
            </el-button>
          </div>

          <!-- 2.58.0：tab 栏改用 el-menu（router 模式）驱动子路由，不再手写 router.push。
               :route 传具名路由对象（index 只作高亮键），避免相对路径被 vue-router 解析成兄弟路径。
               2.59.0：关注/粉丝/获赞/动态统计独立成行放在菜单栏**上方**，各屏宽都不会与菜单项挤在一行。 -->
          <nav class="moment-space__tabs bg-bg-page border-b border-border-lighter flex flex-col gap-2">
            <!-- 统计栏（菜单栏上方一行；小屏允许换行，≥sm 用固定间距对齐）。
                 关注 / 粉丝可点进关系详情页（对标 B 站），为 0 时不可点。 -->
            <div class="moment-space__stats flex flex-wrap items-center gap-x-4 gap-y-1 sm:flex-nowrap sm:gap-6 shrink-0 text-sm text-text-placeholder">
              <button
                type="button"
                class="moment-space__stat-item moment-space__stat-item--link cursor-pointer border-0 bg-transparent p-0 text-left transition-colors hover:text-primary"
                @click="goRelation('followings')"
              >
                <span class="font-bold text-text-primary">{{ formatNum(stats.following) }}</span>
                <span class="ml-1">关注</span>
              </button>
              <button
                type="button"
                class="moment-space__stat-item moment-space__stat-item--link cursor-pointer border-0 bg-transparent p-0 text-left transition-colors hover:text-primary"
                @click="goRelation('fans')"
              >
                <span class="font-bold text-text-primary">{{ formatNum(stats.followers) }}</span>
                <span class="ml-1">粉丝</span>
              </button>
              <div class="moment-space__stat-item">
                <span class="font-bold text-text-primary">{{ formatNum(stats.liked) }}</span>
                <span class="ml-1">获赞</span>
              </div>
              <div class="moment-space__stat-item">
                <span class="font-bold text-text-primary">{{ formatNum(stats.dynamicCount) }}</span>
                <span class="ml-1">动态</span>
              </div>
            </div>

            <!-- 菜单项依赖登录态（自己空间才有「时间线/收藏/设置」），SSR 时登录态未就绪会与客户端
                 不一致（hydration mismatch），因此整块等挂载后再渲染。 -->
            <!-- 小屏：菜单整体横向滚动（min-w-max 不被压缩），避免菜单项被压到换行/重叠。 -->
            <div class="moment-space__menu-scroll w-full min-w-0 overflow-x-auto">
            <el-menu
              v-if="mounted"
              class="moment-space__menu min-w-max sm:w-full"
              mode="horizontal"
              :ellipsis="false"
              :collapse="false"
              :router="true"
              :default-active="activeMenuIndex"
            >
              <el-menu-item
                v-for="tab in tabs"
                :key="tab.index"
                class="moment-space__menu-item"
                :index="tab.index"
                :route="tab.route"
              >
                <component :is="tab.icon" class="bili-icon w-5 h-5 shrink-0" />
                <span class="moment-space__menu-title whitespace-nowrap">{{ tab.title }}</span>
                <span v-if="tab.badge" class="moment-space__menu-badge">{{ tab.badge }}</span>
              </el-menu-item>
            </el-menu>
            </div>
          </nav>
        </div>

        <!-- 与吸顶 tab 栏拉开间距（sticky head 自带底部分隔线） -->
        <div class="moment-space__content pt-4 sm:pt-6">
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
        <!-- 2.58.0：主页按归属分流到两个独立页面组件（我的主页 / TA 的主页），
             其余子路由原样透传；不用拆两条 URL，URL 仍是 /app/space/:mid。
             归属判断依赖 user_nav.uid（异步就绪），uid 未到时先占位，避免两个主页之间跳变；
             且主页归属在 SSR 阶段必然判错（服务端无登录态），所以挂载前统一走 loading，
             不做「SSR 渲染 TA 主页 → 客户端换成我的主页」的错位渲染。 -->
        <LoadingWrap v-if="isHomeRoute && (!mounted || !authReady)" :loading="true" />
        <RouterView v-else v-slot="{ Component: TabComponent }">
          <component :is="resolveTabComponent(TabComponent)" />
        </RouterView>
        </div>
      </section>

      <!-- 统一举报弹窗（用户空间）：弹窗内容走 teleport，挂载后再挂，避免 hydration mismatch -->
      <ReportDialog
        v-if="mounted"
        v-model="reportDialogVisible"
        :biz-type="InteractionBizTypeEnum.USER"
        :biz-id="reportSpaceMid"
      />

      <!-- 设置关注分组弹窗（他人主页、已关注时）：同样挂载后再挂（对话框 teleport） -->
      <SpaceFollowTagPicker
        v-if="mounted && !isOwnSpace"
        v-model:visible="tagPickerVisible"
        :target-mid="spaceMid"
        :target-name="targetUser.name || `用户 ${spaceMid}`"
        @saved="onTagsSaved"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onActivated, watch, type Component } from 'vue'
import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router'
import { ChatDotRound, MoreFilled, Lock, Edit, View } from '@element-plus/icons-vue'
import {
  fetchUserSpaceInfo,
  fetchFavoriteFolders,
  fetchUserFavoriteFolders,
  InteractionBizTypeEnum,
} from '@/api/notify/moment-api'
import type { SpaceInfoResp, FavoriteFolderResp } from '@/api/notify/moment-api'
import ReportDialog from '@/components/moment/ReportDialog.vue'
import SpaceFollowTagPicker from '@/components/moment/SpaceFollowTagPicker.vue'
import SpaceHomeOwnTab from '@/views/moment/tabs/SpaceHomeOwnTab.vue'
import LoadingWrap from '@/components/message/LoadingWrap.vue'
import { provideMomentSpace, type SpacePreviewMode } from '@/views/moment/tabs/spaceContext'
import { formatDate } from '@/utils/dateFormat'
import { useUserNavStore } from '@/stores/user_nav'
import { BiliImg } from '@/assets/img/BiliImg'
import biliMessage from '@/utils/message'
import userApi from '@/api/user/user_api.ts'
import { isLogin } from '@/api/user/utils.ts'
import BiliErrorRouteTo from '@/components/CommonCompo/Bili-Feedback-Compo/BiliErrorRouteTo.vue'
import { BiliErrorRouteToTxt } from '@/assets/text/BiliErrorTxt.ts'
// 2.25.0：横向导航栏图标（统一使用 src/assets/svgs/space/ 下 B 站风格 SVG）
import SpaceHomeIcon from '@/assets/svgs/space/home.svg?component'
import SpaceDynamicIcon from '@/assets/svgs/space/dynamic.svg?component'
import SpaceFavoriteIcon from '@/assets/svgs/space/favorite.svg?component'
// 2.59.0：时间线 tab 图标（B 站 clock_history_line，对应 `space/history.svg`）
import SpaceTimelineIcon from '@/assets/svgs/space/history.svg?component'
import SpaceSettingIcon from '@/assets/svgs/space/setting.svg?component'
// 2.26.0：用户等级徽章（B 站风格，Lv0~Lv6 完整单色版）
import LevelBadge0 from '@/assets/svgs/space/user_level_0.svg?component'
import LevelBadge1 from '@/assets/svgs/space/user_level_1.svg?component'
import LevelBadge2 from '@/assets/svgs/space/user_level_2.svg?component'
import LevelBadge3 from '@/assets/svgs/space/user_level_3.svg?component'
import LevelBadge4 from '@/assets/svgs/space/user_level_4.svg?component'
import LevelBadge5 from '@/assets/svgs/space/user_level_5.svg?component'
import LevelBadge6 from '@/assets/svgs/space/user_level_6.svg?component'

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

/**
 * 是否已挂载（SSR / 水合门控）。
 *
 * 登录态 `user_nav.uid` 在 App.vue `onMounted` 后才就绪，SSR 与水合首次渲染时
 * `isOwnSpace` 必然与客户端不一致；直接用它做 v-if 会触发 hydration mismatch。
 * 因此所有依赖登录态的节点（我 / 预览标签、操作按钮区、最近登录）统一由它门控。
 */
const mounted = ref(false)

// `/app/space`（无 mid）且确认未登录：展示 BiliErrorRouteTo 未登录提示页（倒计时/按钮返回首页）
const loginRequired = ref(false)

// 空间主人信息（完整空间资料，对标 B 站 acc/info）
const targetUser = ref<SpaceInfoResp>({ mid: 0, mid_str: null, name: '加载中...' })
const userBanner = ref<string | undefined>(undefined)
const userBio = ref<string>('')
const isFollowed = ref(false)
// 黑名单互访拒绝状态：true 时空间页显示受限提示、不加载内容（P9-T4）
const blocked = ref(false)
// 受限方向标记：是否是我主动拉黑了对方（决定受限文案与「拉黑 / 解除拉黑」菜单）
const iBlocked = ref(false)
/** 昵称 / 等级后的「最近登录 日期 · IP 属地」短提示（仅本人空间，无记录时为空串不展示） */
const lastLoginTip = ref('')

/**
 * 视角预览（B 站的「预览」）：在**自己的空间**里模拟他人看到的样子，
 * 用于检查隐私开关 / 关注态文案是否符合预期，不会产生任何真实写操作。
 *
 * - `owner`：本人视角（默认），显示编辑资料；
 * - `visitor`：访客视角（未关注）；
 * - `fan`：粉丝视角（已关注）。
 *
 * 预览只影响头部按钮与右栏资料卡可见性（前端过滤），不改后端数据。
 */
const PREVIEW_OPTIONS: { value: SpacePreviewMode; label: string }[] = [
  { value: 'owner', label: '本人视角' },
  { value: 'visitor', label: '访客视角（未关注）' },
  { value: 'fan', label: '粉丝视角（已关注）' },
]

const previewMode = ref<SpacePreviewMode>('owner')
/** 是否处于预览态（他人视角模拟中） */
const isPreviewing = computed(() => previewMode.value !== 'owner')
const previewModeLabel = computed(
  () => PREVIEW_OPTIONS.find((opt) => opt.value === previewMode.value)?.label ?? '本人视角'
)
/** 关注按钮展示态：粉丝视角恒为已关注，访客视角恒为未关注 */
const effectiveFollowed = computed(() =>
  previewMode.value === 'fan' ? true : previewMode.value === 'visitor' ? false : isFollowed.value
)

function setPreviewMode(mode: SpacePreviewMode) {
  previewMode.value = mode
  biliMessage.success(`已切换到${previewModeLabel.value}`)
}

/** 退出预览：回到本人视角 */
function exitPreview() {
  previewMode.value = 'owner'
}

// 统计（2.32.0：全部随 /user/space/info 一次返回，不再并发 follow/stat + upstat）
const stats = ref({ following: 0, followers: 0, liked: 0, dynamicCount: 0 })

// 2.58.0：收藏 tab 相关的共享状态全部由布局壳持有（收藏夹列表唯一副本在父级）
// 2.58.0：收藏夹列表由布局壳持有（唯一副本）；2026-10-08 起收藏 tab **恒展示**，
// 不再因「他人无公开夹」隐藏（避免额外判断与请求，列表空态即可）。
const favFolders = ref<FavoriteFolderResp[]>([])
/** 空间资料版本号：资料重载后自增，子 tab 据此重新拉数据 */
const profileVersion = ref(0)

/** 2.32.0：把 `/user/space/info` 内联的聚合统计落到 stats（不再单独请求） */
function applySpaceStats(info: SpaceInfoResp | null | undefined): void {
  if (!info) return
  stats.value.following = info.follow_stat?.following_count ?? 0
  stats.value.followers = info.follow_stat?.follower_count ?? 0
  stats.value.dynamicCount = info.upstat?.dynamic_count ?? 0
  stats.value.liked = info.upstat?.like_count ?? 0
}

const LEVEL_BADGES = [LevelBadge0, LevelBadge1, LevelBadge2, LevelBadge3, LevelBadge4, LevelBadge5, LevelBadge6]

/** 2.26.0：当前用户等级徽章（越界/未知返回 undefined 不显示） */
const levelBadge = computed(() => {
  const lv = targetUser.value.level
  if (typeof lv !== 'number' || lv < 0 || lv > 6) return undefined
  return LEVEL_BADGES[lv]
})

/** 2.58.0：tab 定义（index 仅用于 el-menu 高亮，route 才是真正跳转目标） */
interface SpaceTab {
  /** el-menu-item 的 index（= 子路径片段） */
  index: string
  title: string
  icon: Component
  badge?: string
  /** 具名路由（携带 mid，收藏 tab 归位 query） */
  route: RouteLocationRaw
}
const HOME_TAB: Omit<SpaceTab, 'route'> = { index: '', title: '主页', icon: SpaceHomeIcon }
const DYNAMIC_TAB: Omit<SpaceTab, 'route'> = { index: 'dynamic', title: '动态', icon: SpaceDynamicIcon }
const TIMELINE_TAB: Omit<SpaceTab, 'route'> = { index: 'timeline', title: '时间线', icon: SpaceTimelineIcon }
const FAVORITE_TAB: Omit<SpaceTab, 'route'> = { index: 'favlist', title: '收藏', icon: SpaceFavoriteIcon, badge: '0' }
const SETTINGS_TAB: Omit<SpaceTab, 'route'> = { index: 'settings', title: '设置', icon: SpaceSettingIcon }

const SPACE_HOME_ROUTE = 'MOMENT_USER_SPACE_HOME'
/** `/app/space`（无 mid）：2.56.0 的登录态归位入口，同属「主页」语义 */
const MY_SPACE_ROUTE = 'MOMENT_MY_SPACE'
const SPACE_DYNAMIC_ROUTE = 'MOMENT_USER_SPACE_DYNAMIC'
const SPACE_TIMELINE_ROUTE = 'MOMENT_USER_SPACE_TIMELINE'
const SPACE_FAVORITES_ROUTE = 'MOMENT_USER_SPACE_FAVORITES'
const SPACE_SETTINGS_ROUTE = 'MOMENT_USER_SPACE_SETTINGS'
// 关系详情页（统计栏「关注 / 粉丝」点击进入；两条固定路由，不用 kind 参数）
const SPACE_FOLLOWINGS_ROUTE = 'MOMENT_USER_SPACE_FOLLOWINGS'
const SPACE_FANS_ROUTE = 'MOMENT_USER_SPACE_FANS'

/** 子路由 name → el-menu index（高亮完全由 URL 驱动，不再有本地 activeTab ref） */
const ROUTE_NAME_TO_INDEX: Record<string, string> = {
  // `/app/space`（无 mid）只是 2.56.0 的登录态归位入口，落地后立刻 replace 到带 uid 的主页
  [MY_SPACE_ROUTE]: HOME_TAB.index,
  [SPACE_HOME_ROUTE]: HOME_TAB.index,
  [SPACE_DYNAMIC_ROUTE]: DYNAMIC_TAB.index,
  [SPACE_TIMELINE_ROUTE]: TIMELINE_TAB.index,
  [SPACE_FAVORITES_ROUTE]: FAVORITE_TAB.index,
  [SPACE_SETTINGS_ROUTE]: SETTINGS_TAB.index,
}
const activeMenuIndex = computed(() => ROUTE_NAME_TO_INDEX[String(route.name ?? '')] ?? DYNAMIC_TAB.index)

/** 构造某个 tab 的跳转目标（收藏 tab 不带 fid，回到「默认夹由子组件回填」状态） */
function tabRoute(name: string): RouteLocationRaw {
  return { name, params: { mid: spaceMid.value }, query: {} }
}

const ownTabs = computed<SpaceTab[]>(() => [
  { ...HOME_TAB, route: tabRoute(SPACE_HOME_ROUTE) },
  { ...DYNAMIC_TAB, route: tabRoute(SPACE_DYNAMIC_ROUTE) },
  { ...TIMELINE_TAB, route: tabRoute(SPACE_TIMELINE_ROUTE) },
  { ...FAVORITE_TAB, route: tabRoute(SPACE_FAVORITES_ROUTE) },
  // 预览他人视角时「设置」是本人专属入口，隐藏（对齐 B 站预览时的菜单）
  ...(isPreviewing.value ? [] : [{ ...SETTINGS_TAB, route: tabRoute(SPACE_SETTINGS_ROUTE) }]),
])
/** 他人空间 tab 列表（对齐 B 站：主页 / 动态 / 时间线，收藏 tab 仅当主人开启「显示收藏」时才展示） */
const otherTabs = computed<SpaceTab[]>(() => {
  const base: SpaceTab[] = [
    { ...HOME_TAB, route: tabRoute(SPACE_HOME_ROUTE) },
    { ...DYNAMIC_TAB, route: tabRoute(SPACE_DYNAMIC_ROUTE) },
    { ...TIMELINE_TAB, route: tabRoute(SPACE_TIMELINE_ROUTE) },
  ]
  base.push({ ...FAVORITE_TAB, route: tabRoute(SPACE_FAVORITES_ROUTE), badge: undefined })
  return base
})
/** 收藏 tab 恒展示（2026-10-08：不再因「无公开夹」隐藏；无内容时列表空态） */
const tabs = computed<SpaceTab[]>(() => (isOwnSpace.value ? ownTabs.value : otherTabs.value))

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
  // 挂载标记：放开所有依赖登录态的节点（SSR 首屏保持与客户端一致）
  mounted.value = true
  if (routeMid.value) {
    void reloadProfile()
    return
  }
  if (currentMid.value) {
    enterOwnSpace()
    return
  }
  void confirmLoginAndEnter()
})

/** 在同一空间内从 A 用户跳到 B 用户（参数变化）时重载资料（ensureProfileLoaded 内部按 mid 去重） */
watch(
  () => route.params.mid,
  (next, prev) => {
    if (next === prev) return
    if (next) void ensureProfileLoaded()
  }
)

/**
 * App.vue 的 routeViewKey 对嵌套路由取「父路由 path」，因此 /app/space/1 与 /app/space/2
 * 会复用同一个 keep-alive 实例（onMounted 不再触发）。回到本页时按 mid 补一次加载，
 * 避免展示上一个用户的空间资料。ensureProfileLoaded 内部按 mid 去重，不会重复请求。
 */
onActivated(() => {
  void ensureProfileLoaded()
})

/** 登录态就绪后把 URL 归位到带 uid 的空间页（`/app/space/{uid}`，组件复用不重挂载） */
function enterOwnSpace() {
  // 归位到空间主页（个人空间落地页，与点头像进入一致）
  router.replace({ name: SPACE_HOME_ROUTE, params: { mid: currentMid.value } })
  void reloadProfile()
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

/**
 * 资料加载去重：子 tab 挂载时通过 ensureProfileLoaded 等待同一份请求，
 * 避免子 tab 先于父级拿到空 mid 而报错；同一 mid 已加载过则直接复用结果，不重复请求。
 */
let profileTask: Promise<void> | null = null
/** 已加载过资料的 mid（'' = 尚未加载成功） */
let loadedMid = ''

function ensureProfileLoaded(): Promise<void> {
  // mid 未就绪（`/app/space` 登录态确认中）：不请求，等 2.56.0 的 enterOwnSpace 归位后自然会重试
  if (!spaceMid.value) return Promise.resolve()
  if (loadedMid && loadedMid === spaceMid.value) return Promise.resolve()
  profileTask ??= loadProfile().finally(() => {
    profileTask = null
  })
  return profileTask
}

/** 强制重载资料（进入空间 / 切换 mid / 解除拉黑后），并通知各 tab 数据已过期 */
function reloadProfile(): Promise<void> {
  loadedMid = ''
  profileTask = null
  return ensureProfileLoaded()
}

/** 拉空间资料 + 统计 + 收藏可见性/收藏夹（收藏内容明细由收藏 tab 自己拉） */
async function loadProfile() {
  const mid = spaceMid.value
  if (!mid) {
    biliMessage.warning('请先登录')
    return
  }
  try {
    await loadProfileInner(mid)
  } finally {
    loadedMid = mid
  }
}

async function loadProfileInner(mid: string) {
  blocked.value = false
  // 先拉用户空间完整资料（对标 B 站 acc/info，公开可读），并据此做黑名单互访拦截
  const space = await fetchUserSpaceInfo(mid)
  if (space.code === 403) {
    // 黑名单互访拒绝：已拉黑对方或被对方拉黑，均不可访问其空间
    blocked.value = true
    targetUser.value = { mid: Number(mid) || 0, mid_str: mid, name: `用户 ${mid}` }
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
      mid_str: mid,
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
  // 2.32.0：关系统计 / 空间统计已随 space/info 一次返回，不再单独请求
  applySpaceStats(space.data)
  // 通知各 tab：资料已就绪（首屏由子 tab 自己等待本请求，不会重复拉取）
  profileVersion.value += 1
  // 收藏可见性 + 收藏夹列表：tab 栏要据此决定是否展示收藏入口
  await refreshFavorites()
  // 昵称 / 等级后的「最近登录」文案：仅本人空间（他人空间读不到别人的登录记录）
  void loadLastLoginTip()
}

/**
 * 拉最近一次登录记录，渲染成「最近登录 2026-10-07 · 中国 上海 移动」这样的一行短提示。
 *
 * 数据源 `GET /api/v1/user/act-log`（pptr `TUserActInfoLog`，仅最近 7 天、仅本人）：
 * 后端已做 IP 脱敏与 mmdb 属地解析，这里只取最近一条的日期（精确到日）+ 属地。
 * 请求失败 / 无记录时静默隐藏该文案，不打扰空间页。
 */
async function loadLastLoginTip() {
  if (!isOwnSpace.value) {
    lastLoginTip.value = ''
    return
  }
  try {
    const res = await userApi.ActLog(0, 1)
    const item = res.data?.items?.[0]
    if (!item) {
      lastLoginTip.value = ''
      return
    }
    const day = formatDate(item.time)
    const location = item.location?.trim()
    lastLoginTip.value = location ? `最近登录 ${day} · ${location}` : `最近登录 ${day}`
  } catch {
    lastLoginTip.value = ''
  }
}

/**
 * 加载收藏夹列表（本人全量 / 他人仅公开夹）。
 *
 * 2026-10-08：收藏 tab 恒展示，本函数只负责列表；他人无公开夹时为**空数组**（页面显示空态）。
 */
async function refreshFavorites() {
  const mid = spaceMid.value
  if (!mid) return
  try {
    favFolders.value = isOwnSpace.value
      ? await fetchFavoriteFolders()
      : ((await fetchUserFavoriteFolders(mid)) ?? [])
  } catch {
    favFolders.value = []
  }
}

/**
 * 2.58.0：主页（`MOMENT_USER_SPACE_HOME`）按归属分流到两个**独立页面组件**——
 * 自身空间渲染「我的主页」（行为记录 / 浏览历史 / 登录记录），
 * 他人空间渲染「TA 的主页」（动态摘要 / 收藏概览），其余子路由原样透传。
 *
 * 不拆两条 URL 的原因：自身空间也带自己的 mid（`/app/space` 会 302 到 `/app/space/{uid}`），
 * 两种视角共用同一个 URL 才符合「分享链接既能给自己看也能给别人看」的直觉。
 */
function resolveTabComponent(routeComponent: Component): Component {
  if (!isHomeRoute.value) return routeComponent
  return isOwnSpace.value ? SpaceHomeOwnTab : routeComponent
}

/**
 * 当前是否在主页路由：`/app/space/:mid`（SPACE_HOME_ROUTE）或 `/app/space`
 * （MOMENT_MY_SPACE 登录态确认入口，落位后 replace 到带 uid 的主页）。
 * 两者都是唯一需要按归属分流的子路由。
 */
const isHomeRoute = computed(() => route.name === SPACE_HOME_ROUTE || route.name === MY_SPACE_ROUTE)

/**
 * 归属判断是否已就绪：只有 `/app/space`（无 mid）需要等 uid ——
 * 它既可能是「我的空间」（uid = 路由 mid）也可能是未登录，必须等登录态确定。
 *
 * `/app/space/:mid`（带 mid）不需要等：uid 为空只说明未登录，此时一定不是自己，
 * 直接按「他人空间」渲染即可（否则未登录访客会卡在 loading）。
 */
const authReady = computed(() => routeMid.value !== null || currentMid.value !== '')

function goEditProfile() {
  router.push('/app/user-center/user-info-config')
}

/**
 * 统计栏「关注 / 粉丝」→ 关系详情页（对标 B 站空间头部的可点计数）。
 *
 * 不跳转的唯一情况：他人视角且主人关闭了对应可见性开关（设置页「关注列表」/「粉丝列表」）——
 * 后端会返回整类空列表，这里提前拦住并给出提示，不把用户带进空页面。
 *
 * 注：计数为 0 时**仍可进入**（列表空态）—— 2026-10-08 起不再按数字拦截，
 * 否则「0」会被误当成「不可点」，点了没有任何反馈。
 */
function goRelation(kind: 'followings' | 'fans') {
  if (!isOwnSpace.value && !relationVisible(kind)) {
    biliMessage.info(kind === 'followings' ? '对方未公开关注列表' : '对方未公开粉丝列表')
    return
  }
  if (!spaceMid.value) return
  router.push({
    name: kind === 'followings' ? SPACE_FOLLOWINGS_ROUTE : SPACE_FANS_ROUTE,
    params: { mid: spaceMid.value },
  })
}

/** 他人视角下对应关系列表是否公开（本人恒可进；后端默认全关） */
function relationVisible(kind: 'followings' | 'fans'): boolean {
  const flags = targetUser.value.privacy_flags
  return kind === 'followings'
    ? Boolean(flags?.show_follow_list)
    : Boolean(flags?.show_fans_list)
}

function handleDM() {
  if (isPreviewing.value) {
    biliMessage.info('预览模式下不会真正发送私信')
    return
  }
  biliMessage.info('私信功能开发中')
}

/** 统一举报弹窗（P11-T6，用户空间举报：bizType=user，bizId=mid） */
const reportDialogVisible = ref(false)
const reportSpaceMid = ref<string>('')

function handleReport() {
  if (isPreviewing.value) {
    biliMessage.info('预览模式下不会真正提交举报')
    return
  }
  if (!spaceMid.value) return
  reportSpaceMid.value = String(spaceMid.value) // mid 转 str，避免大整数精度丢失
  reportDialogVisible.value = true
}

function handleFollow() {
  if (isPreviewing.value) {
    biliMessage.info('预览模式下不会真正变更关注关系')
    return
  }
  isFollowed.value = !isFollowed.value
  biliMessage.success(isFollowed.value ? '已关注' : '已取消关注')
}

/** 设置分组弹窗（他人主页、已关注时才可用；对齐 B 站「已关注 → 设置分组」） */
const tagPickerVisible = ref(false)

function openTagPicker() {
  if (isPreviewing.value) {
    biliMessage.info('预览模式下不会真正修改分组')
    return
  }
  if (!effectiveFollowed.value) {
    biliMessage.info('关注对方后才能设置分组')
    return
  }
  tagPickerVisible.value = true
}

function onTagsSaved() {
  biliMessage.success('分组已更新')
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
  if (isPreviewing.value) {
    biliMessage.info('预览模式下不会真正拉黑')
    return
  }
  const mid = Number(spaceMid.value)
  if (!mid || mid <= 0 || isOwnSpace.value) return

  if (iBlocked.value) {
    // 已拉黑对方 → 解除
    const r = await userApi.BlocklistRemove(mid)
    if (!r.success) return
    biliMessage.success('已解除拉黑')
    iBlocked.value = false
    // 重载资料：blocked 复位 + profileVersion 自增，动态/收藏 tab 自行重新拉数据
    await reloadProfile()
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
}

function formatNum(n?: number | null): string {
  if (n == null || n === 0) return '0'
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w'
  return String(n)
}

provideMomentSpace({
  isOwnSpace,
  spaceMid,
  targetUser,
  userBio,
  blocked,
  iBlocked,
  favFolders,
  profileVersion,
  ensureProfileLoaded,
  refreshFavorites,
  reloadProfile,
  previewMode,
  isPreviewing,
})
</script>
