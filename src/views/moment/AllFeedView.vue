<template>
    <div class="all-feed h-full flex flex-col">
        <LoadingMoreContainer class="mb-0!" :handle-load="handleLoad" v-model:is-more="isMore"
            v-model:is-loading="isLoading" v-model:is-error="isError" :height-ratio="0.9"
            :show-end-text="items.length > 0">
            <template #content>
                <EmptyState v-if="!isLoading && !isError && items.length === 0" text="还没有动态，快来发布第一条吧 ~" />
                <div v-else class="all-feed__list space-y-4 max-w-2xl mx-auto pb-4">
                    <MomentCard v-for="item in items" :key="item.dynIdStr" :item="item"
                        :show-more-actions="true" @click="openDetail"
                        @src-click="openDetail" @avatar-click="openUserSpace" @thumb="handleThumb(item)"
                        @report="handleReport(item)" @remove="handleRemove(item)" @message="openMessage" />
                </div>
            </template>
        </LoadingMoreContainer>
        <ReportDialog v-model="reportDialogVisible" biz-type="dynamic" :biz-id="reportDynId" />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { fetchAllFeed, thumbMoment } from '@/api/notify/moment-api'
import type { MomentFeedItem } from '@/api/notify/moment-api'
import LoadingMoreContainer from '@/components/CommonCompo/Bili-Container-Compo/LoadingMoreContainer.vue'
import EmptyState from '@/components/message/EmptyState.vue'
import MomentCard from '@/components/moment/MomentCard.vue'
import ReportDialog from '@/components/moment/ReportDialog.vue'
import biliMessage from '@/utils/message'

defineOptions({ name: 'AllFeedView' })

const router = useRouter()

// 统一举报弹窗（P11-T6）
const reportDialogVisible = ref(false)
const reportDynId = ref<number>(0)

const items = ref<MomentFeedItem[]>([])
const isLoading = ref(false)
const isMore = ref(true)
const isError = ref(false)
let historyOffset: number | undefined

/** 首屏加载 / 触底加载统一入口（LoadingMoreContainer 触底回调） */
const handleLoad = async () => {
    isError.value = false
    isLoading.value = true
    try {
        const isFirst = items.value.length === 0
        const res = await fetchAllFeed(
            isFirst ? { page_size: 20 } : { page_size: 20, history_offset: historyOffset }
        )
        const newItems = res.items || []
        if (isFirst) {
            items.value = newItems
        } else {
            items.value.push(...newItems)
        }
        isMore.value = res.hasMore ?? false
        historyOffset = res.historyOffset
    } catch (e) {
        console.error('加载动态失败:', e)
        isError.value = true
    } finally {
        isLoading.value = false
    }
}

onMounted(handleLoad)

function openDetail(item: MomentFeedItem) {
    router.push({ name: 'MOMENT_DETAIL', params: { momentId: item.dynIdStr } })
}

function openUserSpace(item: MomentFeedItem) {
    router.push({ name: 'MOMENT_USER_SPACE', params: { mid: String(item.mid) } })
}

/** 发消息：跳转私信会话 */
function openMessage(mid: number) {
    router.push({ name: 'MESSAGE_DM_CHAT', params: { talkerMid: String(mid) } })
}

async function handleThumb(item: MomentFeedItem) {
    const up = item.modules?.find((m) => m.moduleType === 'interaction')?.isLike ? 2 : 1
    const res = await thumbMoment(item.dynIdStr, up)
    if (res) {
        // 乐观更新 stat
        const interMod = item.modules?.find((m) => m.moduleType === 'interaction')
        if (interMod) interMod.isLike = up === 1
        if (item.stat) {
            const delta = up === 1 ? 1 : -1
            item.stat.likeCount = (item.stat.likeCount || 0) + delta
        }
    }
}

function handleReport(item: MomentFeedItem) {
    // 打开统一举报弹窗（bizType=dynamic，bizId=dynId）
    reportDynId.value = Number(item.dynIdStr)
    reportDialogVisible.value = true
}

/** 2.22.1：删除确认与 API 已下沉 MomentCard，父组件仅移除列表项 */
function handleRemove(item: MomentFeedItem) {
    items.value = items.value.filter((i) => i.dynIdStr !== item.dynIdStr)
}

defineExpose({ refresh: handleLoad })
</script>
