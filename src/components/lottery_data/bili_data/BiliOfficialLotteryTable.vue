<script setup lang="ts">
import { computed, ref } from 'vue'
import { type Column } from 'element-plus'
import TableV2FixableHeaderCell from '@/components/CommonCompo/TableV2Compo/TableV2FixableHeaderCell.vue'
import { useTableV2FixedColumns } from '@/utils/useTableV2FixedColumns'
import type { AnyLotteryData, NormalizedLottery } from '@/models/api/lottery/lottery_card'
import { gotoBiliUserSpace } from '@/utils/PageOpen/BiliJump';
import { handleLotteryLinkClick, setLotteryParticipation, isLotteryParticipated } from '@/utils/lotteryParticipation'
import { normalizeLotteryData, formatTimestamp } from '@/utils/lotteryNormalization'
import LotteryActionsDropdown from '@/components/lottery_data/bili_data/LotteryActionsDropdown.vue'
import MomentPublishForm from '@/components/moment/MomentPublishForm.vue'
import MomentFavoriteDialog from '@/components/moment/MomentFavoriteDialog.vue'
import { useLotteryInteractions } from '@/utils/useLotteryInteractions'

const props = withDefaults(
  defineProps<{
    data: AnyLotteryData[]
    /** 固定列偏好的 localStorage key，不同模块传不同值以互相隔离 */
    storageKey?: string
  }>(),
  {
    data: () => [],
    storageKey: 'bili-official-lottery-table:fixed-columns'
  }
)

const tableData = computed<NormalizedLottery[]>(() => {
  return props.data.map((item) => normalizeLotteryData(item))
})

const getRowParticipated = (row: NormalizedLottery) => isLotteryParticipated(String(row.id))
const getRowDetailUrl = (row: NormalizedLottery) => row.sourceLink || row.resultLink || ''
const handleParticipateSwitch = (row: NormalizedLottery, val: boolean | number | string) => {
  setLotteryParticipation(String(row.id), Boolean(val))
}

// 抽奖互动（点赞）：批量拉取本页全部行互动状态
const { statusOf, like, loadAll, loading: interactionLoading } = useLotteryInteractions(
  () => tableData.value.map((r) => String(r.id)).filter(Boolean)
)

// 收藏到收藏夹：弹出收藏夹选择弹窗（多夹），选择/新建收藏夹后收藏
const favDialogVisible = ref(false)
const favRow = ref<NormalizedLottery | null>(null)
function openFavoriteDialog(row: NormalizedLottery) {
  favRow.value = row
  favDialogVisible.value = true
}
async function handleFavChanged() {
  await loadAll()
}

// 转发到动态：弹窗显示当前选中行的抽奖信息
const forwardVisible = ref(false)
const forwardingRow = ref<NormalizedLottery | null>(null)
function openForwardDialog(row: NormalizedLottery) {
  forwardingRow.value = row
  forwardVisible.value = true
}

const imageViewerVisible = ref(false)
const currentImage = ref('')

const handleImageClick = (imageUrl: string | null | undefined) => {
  if (imageUrl) {
    currentImage.value = imageUrl
    imageViewerVisible.value = true
  }
}

const ROW_HEIGHT = 54
const HEADER_HEIGHT = 50

const baseColumns: Column<NormalizedLottery>[] = [
  { key: 'id', dataKey: 'id', title: 'ID', width: 70 },
  { key: 'displayType', dataKey: 'displayType', title: '类型', width: 80 },
  { key: 'status', title: '状态', width: 100 },
  { key: 'participants', title: '参与人数', width: 80, align: 'right' },
  { key: 'prize0', title: '一等奖', width: 180 },
  { key: 'prize1', title: '二等奖', width: 180 },
  { key: 'prize2', title: '三等奖', width: 180 },
  { key: 'endTime', title: '开奖时间', width: 160 },
  { key: 'senderUid', title: '发起人UID', width: 150 },
  { key: 'actions', title: '操作', width: 160 }
]

// 固定列偏好（默认固定：ID 左、操作 右），持久化到 localStorage
const { columns, isColumnFixed, toggleColumnFixed } = useTableV2FixedColumns<NormalizedLottery>(
  baseColumns,
  {
    storageKey: props.storageKey,
    defaultFixed: { id: true, actions: true },
    rightFixedKeys: ['actions']
  }
)

const prizeIndexOf = (columnKey: PropertyKey | undefined) =>
  Number(String(columnKey ?? '').replace('prize', ''))
</script>

<template>
  <div class="bili-official-lottery-table w-full h-[640px] max-h-[calc(100vh-220px)]">
    <el-auto-resizer>
      <template #default="{ height, width }">
        <el-table-v2
          :columns="columns"
          :data="tableData"
          :width="width"
          :height="height"
          :row-height="ROW_HEIGHT"
          :header-height="HEADER_HEIGHT"
          fixed
        >
          <template #header-cell="{ column }">
            <TableV2FixableHeaderCell
              :title="column.title"
              :column-key="column.key"
              :align="column.align"
              :fixed="isColumnFixed(column.key)"
              @toggle-fixed="toggleColumnFixed"
            />
          </template>

          <template #cell="{ column, rowData }">
            <!-- 状态 -->
            <template v-if="column.key === 'status'">
              <el-tag size="default" :type="rowData.statusType" effect="plain" round>
                {{ rowData.statusText }}
              </el-tag>
            </template>

            <!-- 参与人数 -->
            <template v-else-if="column.key === 'participants'">
              {{ rowData.participants ?? '-' }}
            </template>

            <!-- 一 / 二 / 三等奖 -->
            <template v-else-if="String(column.key).startsWith('prize')">
              <template v-if="rowData.prizes[prizeIndexOf(column.key)]">
                <el-popover
                  v-if="rowData.prizes[prizeIndexOf(column.key)].img"
                  trigger="hover"
                  placement="top"
                >
                  <template #reference>
                    <span
                      class="prize-name cursor-pointer"
                      @click="handleImageClick(rowData.prizes[prizeIndexOf(column.key)].img)"
                    >
                      {{ rowData.prizes[prizeIndexOf(column.key)].description }} ×
                      {{ rowData.prizes[prizeIndexOf(column.key)].count }}
                    </span>
                  </template>
                  <el-image
                    :src="rowData.prizes[prizeIndexOf(column.key)].img"
                    fit="contain"
                    class="h-[120px] w-[120px]"
                    referrerpolicy="no-referrer"
                  />
                </el-popover>
                <span v-else class="prize-name">
                  {{ rowData.prizes[prizeIndexOf(column.key)].description }} ×
                  {{ rowData.prizes[prizeIndexOf(column.key)].count }}
                </span>
              </template>
              <span v-else class="text-text-secondary">-</span>
            </template>

            <!-- 开奖时间 -->
            <template v-else-if="column.key === 'endTime'">
              {{ rowData.endTime ? formatTimestamp(rowData.endTime) : '-' }}
            </template>

            <!-- 发起人UID -->
            <template v-else-if="column.key === 'senderUid'">
              <el-link
                v-if="rowData.senderInfo.uid"
                type="primary"
                @click="gotoBiliUserSpace(rowData.senderInfo.uid)"
              >
                {{ rowData.senderInfo.uid }}
              </el-link>
              <span v-else class="text-text-secondary">-</span>
            </template>

            <!-- 操作 -->
            <template v-else-if="column.key === 'actions'">
              <div class="flex items-center justify-center gap-2">
                <!-- 查看详情按钮 -->
                <template v-if="getRowDetailUrl(rowData)">
                  <el-link
                    type="primary"
                    size="default"
                    :href="getRowDetailUrl(rowData)"
                    target="_blank"
                    rel="noreferrer"
                    @click.stop="handleLotteryLinkClick(String(rowData.id))"
                    class="text-xs"
                    underline="never"
                  >
                    <el-icon><Link /></el-icon>
                    <span>详情</span>
                  </el-link>
                </template>
                <template v-else>
                  <el-button type="info" size="default" disabled class="text-xs">
                    <el-icon><link /></el-icon>
                    <span>无链接</span>
                  </el-button>
                </template>

                <!-- 参加/不参加开关 -->
                <el-tooltip
                  :content="getRowParticipated(rowData) ? '取消标记参加' : '标记为已参加'"
                  placement="top"
                >
                  <el-switch
                    :model-value="getRowParticipated(rowData)"
                    size="default"
                    @change="handleParticipateSwitch(rowData, $event)"
                    class="mt-1"
                  />
                </el-tooltip>

                <!-- 点赞 / 收藏 / 转发到动态（三个点下拉框） -->
                <LotteryActionsDropdown
                  :lottery-id="String(rowData.id)"
                  :status="statusOf(String(rowData.id))"
                  :loading="interactionLoading"
                  @like="like(String(rowData.id))"
                  @favorite="openFavoriteDialog(rowData)"
                  @forward="openForwardDialog(rowData)"
                />
              </div>
            </template>

            <!-- 默认列（ID / 类型） -->
            <template v-else>
              {{ column.dataKey ? rowData[column.dataKey as keyof NormalizedLottery] : '-' }}
            </template>
          </template>

          <template #empty>
            <div class="flex h-full items-center justify-center">
              <el-empty description="暂无数据" :image-size="80" />
            </div>
          </template>
        </el-table-v2>
      </template>
    </el-auto-resizer>
    <el-image-viewer v-if="imageViewerVisible" :url-list="[currentImage]" @close="imageViewerVisible = false" referrerpolicy="no-referrer" />

    <!-- 转发抽奖到动态：复用统一动态编辑器（attach 资源模式） -->
    <MomentPublishForm
      v-model:visible="forwardVisible"
      :attach-resource="{
        bizType: 'lottery',
        bizId: forwardingRow ? String(forwardingRow.id) : '',
        name: forwardingRow?.title || undefined,
      }"
    />

    <!-- 收藏到收藏夹：选择/新建收藏夹 -->
    <MomentFavoriteDialog
      v-model="favDialogVisible"
      :dyn-id="favRow ? String(favRow.id) : ''"
      biz-type="lottery"
      :biz-id="favRow ? String(favRow.id) : ''"
      @changed="handleFavChanged"
    />
  </div>
</template>

