<template>
  <LoadingWrap :loading="loading && items.length === 0">
    <!-- 隐私关闭 / 无粉丝：整块由父级 v-if 决定是否渲染；组件内仅处理已挂载后的空态 -->
    <EmptyState v-if="!loading && items.length === 0" text="TA 还没有粉丝~" />
    <template v-else>
      <ul class="space-fans-grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        <li
          v-for="item in items"
          :key="item.mid_str ?? ''"
          class="space-fans-grid__item flex items-center gap-3 bg-bg-overlay border border-border-light rounded-lg px-3 py-2.5 cursor-pointer transition-colors hover:border-primary/40"
          @click="openUser(item)"
        >
          <el-avatar :size="40" :src="item.user?.face || undefined" />
          <div class="flex flex-col gap-0.5 min-w-0 flex-1">
            <span class="space-fans-grid__name text-sm text-text-primary truncate">
              {{ item.user?.name || '账号已注销' }}
            </span>
            <span v-if="item.mutual" class="space-fans-grid__mutual text-xs text-primary">
              互相关注
            </span>
          </div>
        </li>
      </ul>

      <!-- 500 窗口截断提示：total 已到上界，历史粉丝不再展示 -->
      <p
        v-if="reachedCap"
        class="space-fans-grid__cap text-center text-xs text-text-placeholder pt-3"
      >
        仅展示最新 {{ FANS_CAP }} 位粉丝
      </p>

      <div class="space-fans-grid__foot mt-3 text-center">
        <el-button
          v-if="hasMore && !reachedCap"
          size="default"
          :loading="loading"
          @click="loadMore"
        >
          加载更多
        </el-button>
        <p v-else-if="items.length > 0" class="text-sm text-text-placeholder py-1">— 没有更多了 —</p>
      </div>
    </template>
  </LoadingWrap>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { fetchSpaceFans } from '@/api/notify/moment-api'
import type { FollowListItem } from '@/api/community/hey-api'
import LoadingWrap from '@/components/message/LoadingWrap.vue'
import EmptyState from '@/components/message/EmptyState.vue'

/** 后端窗口上界（与 FollowService.SPACE_FANS_MAX 对齐）：只回看最新 500 个粉丝 */
const FANS_CAP = 500
const PAGE_SIZE = 24

/**
 * TA 主页粉丝模块（对标 B 站 /x/relation/fans）。
 *
 * 隐私由后端按 `show_fans_list` 整类门控：关闭时本组件首屏拿到空列表。父级
 * （SpaceHomeOtherTab）据 spaceInfo.privacy_flags.show_fans_list 决定是否渲染本模块。
 */
const props = defineProps<{ mid: string | number }>()

const router = useRouter()
const items = ref<FollowListItem[]>([])
const total = ref(0)
const pageNum = ref(1)
const loading = ref(false)

/** 已加载条数到没到 500 窗口上界（到顶后不再翻页） */
const reachedCap = computed(() => items.value.length >= FANS_CAP)
const hasMore = computed(() => items.value.length < total.value)

async function loadFirst() {
  if (!props.mid) return
  pageNum.value = 1
  items.value = []
  await loadPage()
}

async function loadPage() {
  if (loading.value) return
  loading.value = true
  const res = await fetchSpaceFans(props.mid, { page_num: pageNum.value, page_size: PAGE_SIZE })
  items.value = [...items.value, ...(res.items ?? [])]
  total.value = res.total ?? 0
  loading.value = false
}

function loadMore() {
  if (loading.value || !hasMore.value || reachedCap.value) return
  pageNum.value += 1
  void loadPage()
}

function openUser(item: FollowListItem) {
  if (item.mid_str) router.push({ name: 'MOMENT_USER_SPACE_HOME', params: { mid: item.mid_str } })
}

watch(
  () => props.mid,
  () => {
    void loadFirst()
  },
  { immediate: true }
)

defineExpose({ reload: loadFirst })
</script>
