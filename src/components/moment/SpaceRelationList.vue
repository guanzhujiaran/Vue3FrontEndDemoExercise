<template>
  <!-- 关注 / 粉丝列表（对标 B 站 /space/followings、/space/fans）。
       分页统一走 LoadingMoreContainer（BiliScrollbar + 触底加载），不手写「加载更多」按钮。 -->
  <LoadingMoreContainer
    class="space-relation-list-more mb-0!"
    :handle-load="loadMore"
    v-model:is-more="hasMore"
    v-model:is-loading="loading"
    v-model:is-error="loadError"
    :show-end-text="showEndText"
  >
    <template #content>
      <EmptyState v-if="!loading && !loadError && items.length === 0" :text="emptyText" />
      <!-- 多列网格卡片（对标 B 站关系页）：无边框透明卡片，头像 + 昵称 + 关系态 + 操作 -->
      <ul
        v-else-if="items.length > 0"
        class="space-relation-list grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3"
      >
        <li
          v-for="item in items"
          :key="item.mid_str ?? ''"
          class="space-relation-list__item flex items-start gap-3 min-w-0"
        >
          <el-avatar
            class="space-relation-list__avatar shrink-0 cursor-pointer"
            :size="56"
            :src="item.user?.face || undefined"
            @click="openUser(item)"
          />
          <div class="space-relation-list__info flex flex-col gap-1 min-w-0 flex-1">
            <span
              class="space-relation-list__name text-sm text-primary truncate cursor-pointer hover:underline"
              @click="openUser(item)"
            >
              {{ item.user?.name || '账号已注销' }}
            </span>
            <span
              v-if="item.user?.sign"
              class="space-relation-list__sign text-xs text-text-placeholder truncate"
            >
              {{ item.user.sign }}
            </span>
            <span
              v-if="item.mutual"
              class="space-relation-list__mutual text-xs text-text-placeholder truncate"
            >
              互相关注
            </span>

            <!-- 自己视角才有操作：关注态来自 `mutual`；他人视角只读，不猜关系 -->
            <div
              v-if="isOwnView"
              class="space-relation-list__actions mt-0.5 flex flex-wrap items-center gap-2"
            >
              <el-button
                v-if="relationType === 'followings'"
                class="space-relation-list__unfollow"
                size="default"
                @click="handleUnfollow(item)"
              >
                已关注
              </el-button>
              <el-button
                v-else
                class="space-relation-list__follow"
                size="default"
                :type="item.mutual ? 'default' : 'primary'"
                @click="item.mutual ? handleUnfollow(item) : handleFollow(item)"
              >
                {{ item.mutual ? '互相关注' : '回关' }}
              </el-button>
              <el-button
                v-if="relationType === 'followings'"
                class="space-relation-list__tag-btn"
                size="default"
                @click="openTagPicker(item)"
              >
                设置分组
              </el-button>
            </div>
          </div>
        </li>
      </ul>

      <!-- 他人视角的可见性窗口提示：后端第 6 页起返回空列表，这里如实说明，不显示空白页 -->
      <p
        v-if="isWindowLimited"
        class="space-relation-list__window-tip pt-3 text-center text-xs text-text-placeholder"
      >
        仅展示最新 {{ items.length }} 条（共 {{ total }} 条），完整列表仅本人可见
      </p>

      <p
        v-if="loadError"
        class="space-relation-list__retry mt-3 cursor-pointer text-center text-sm text-text-placeholder"
        @click="retryLoad"
      >
        加载失败，点击重试
      </p>
    </template>
  </LoadingMoreContainer>

  <!-- 分组设置弹窗（仅自己视角的「关注」列表用） -->
  <SpaceFollowTagPicker
    v-if="isOwnView"
    v-model:visible="tagPickerVisible"
    :target-mid="tagPickerTarget"
    :target-name="tagPickerName"
    @saved="onTagsSaved"
  />
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { fetchFollowings, fetchFans, followUser, unfollowUser } from '@/api/notify/moment-api'
import type { FollowListItem } from '@/api/community/hey-api'
import LoadingMoreContainer from '@/components/CommonCompo/Bili-Container-Compo/LoadingMoreContainer.vue'
import EmptyState from '@/components/message/EmptyState.vue'
import SpaceFollowTagPicker from '@/components/moment/SpaceFollowTagPicker.vue'
import biliMessage from '@/utils/message'

/**
 * 关注 / 粉丝列表（关系详情页的主体，自己 / 他人视角共用）。
 *
 * 分工：本组件只负责「拉数据 + 分页 + 关系操作」，页面壳（`SpaceRelationTab`）负责
 * 标题、分组导航与布局，分组弹窗交给 `SpaceFollowTagPicker`。
 *
 * 可见性窗口：`isOwnView=false` 时后端最多放行 `VISIBLE_LIMIT`（5）页，第 6 页返回空列表，
 * 因此前端把页码夹到 5 页并给出说明文案 —— 窗口大小由后端强制，前端不做安全假设。
 */
const props = withDefaults(
  defineProps<{
    /** 被查看用户 mid */
    mid: string | number
    /** 列表类型：followings 关注 / fans 粉丝 */
    relationType: 'followings' | 'fans'
    /** 是否本人视角（决定能否操作关注 / 分组） */
    isOwnView: boolean
    /** 分组过滤（仅自己视角的关注列表有效；null=全部） */
    tagId?: number | null
  }>(),
  { tagId: null }
)

const emit = defineEmits<{
  /** 每次拉取后上报总数：分组导航的「全部关注」项展示用 */
  (e: 'update:total', value: number): void
}>()

/** 每页条数（与后端默认 ps 对齐） */
const PAGE_SIZE = 24
/** 他人视角可见页数上限（与后端 `FollowService.VISIBLE_PAGE_LIMIT` 对齐） */
const VISIBLE_LIMIT = 5

const router = useRouter()
const items = ref<FollowListItem[]>([])
const total = ref(0)
const pageNum = ref(1)
const loading = ref(false)
const loadError = ref(false)
const hasMore = ref(false)

/** 本人视角不限页；他人视角夹到 5 页（`VISIBLE_LIMIT`） */
const maxPage = computed(() => (props.isOwnView ? Number.POSITIVE_INFINITY : VISIBLE_LIMIT))
const emptyText = computed(() =>
  props.relationType === 'followings' ? '还没有关注任何人~' : '还没有粉丝~'
)
/** 他人视角下「后端还有更多、但窗口不允许继续翻」时给出说明（自己视角不显示） */
const isWindowLimited = computed(() => !props.isOwnView && total.value > items.value.length)
/** 底部文案：他人视角到窗口底就换成说明行，避免「到底了喵~」造成误解 */
const showEndText = computed(() => props.isOwnView && items.value.length > 0)

async function loadFirst() {
  pageNum.value = 1
  items.value = []
  total.value = 0
  loadError.value = false
  await loadPage()
}

async function loadPage() {
  if (loading.value) return
  loading.value = true
  loadError.value = false
  try {
    const params = { vmid: props.mid, pn: pageNum.value, ps: PAGE_SIZE }
    const res =
      props.relationType === 'followings'
        ? await fetchFollowings({ ...params, tagid: props.tagId })
        : await fetchFans(params)
    const page = res.items ?? []
    items.value = pageNum.value === 1 ? page : [...items.value, ...page]
    total.value = res.total ?? 0
    emit('update:total', total.value)
    // 他人视角：翻到第 5 页即停止（即使后端还有数据，也不越过可见性窗口）
    const reachedLimit = pageNum.value >= maxPage.value
    hasMore.value = page.length > 0 && !reachedLimit
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

/** 触底加载（LoadingMoreContainer 回调，组件内已做节流 + isMore/isError 守卫） */
function loadMore() {
  if (loading.value || !hasMore.value || pageNum.value >= maxPage.value) return
  pageNum.value += 1
  void loadPage()
}

/** 失败重试（游标未推进，等价于重试当前页） */
function retryLoad() {
  if (loading.value) return
  loadError.value = false
  void loadPage()
}

function openUser(item: FollowListItem) {
  if (item.mid_str) {
    router.push({ name: 'MOMENT_USER_SPACE_HOME', params: { mid: item.mid_str } })
  }
}

/** 取消关注（自己视角）：成功后直接移出当前列表 */
async function handleUnfollow(item: FollowListItem) {
  if (!item.mid_str) return
  const res = await unfollowUser(Number(item.mid_str), {
    showSuccessToast: true,
    successMessage: '已取消关注',
  })
  if (!res) return
  items.value = items.value.filter((it) => it.mid_str !== item.mid_str)
  if (props.relationType === 'followings') {
    total.value = Math.max(total.value - 1, 0)
  } else if (item.mutual) {
    // 粉丝列表里取消回关：关系从「互相关注」变回「仅对方关注我」，行保留但按钮回到「回关」
    item.mutual = false
  }
}

/** 回关（自己视角的粉丝列表） */
async function handleFollow(item: FollowListItem) {
  if (!item.mid_str) return
  const res = await followUser(Number(item.mid_str), {
    showSuccessToast: true,
    successMessage: '已关注',
  })
  if (!res) return
  item.mutual = true
}

// ---- 分组设置 ----
const tagPickerVisible = ref(false)
const tagPickerTarget = ref<string>('')
const tagPickerName = ref<string>('')

function openTagPicker(item: FollowListItem) {
  if (!item.mid_str) return
  tagPickerTarget.value = item.mid_str
  tagPickerName.value = item.user?.name || `用户 ${item.mid_str}`
  tagPickerVisible.value = true
}

/** 分组保存成功：当前正在按某个分组过滤时，成员可能已不属于该分组，直接重拉 */
function onTagsSaved() {
  biliMessage.info('分组已更新')
  if (props.tagId != null) void loadFirst()
}

watch(
  () => [props.mid, props.relationType, props.tagId] as const,
  () => {
    void loadFirst()
  },
  { immediate: true }
)

defineExpose({ reload: loadFirst })
</script>
