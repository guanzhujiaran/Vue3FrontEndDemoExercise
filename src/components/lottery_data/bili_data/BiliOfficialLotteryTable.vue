<script setup lang="ts">
import { computed, ref } from 'vue'
import type { AnyLotteryData, NormalizedLottery } from '@/models/api/lottery/lottery_card'
import { gotoBiliUserSpace } from '@/utils/PageOpen/BiliJump';
import { handleLotteryLinkClick, setLotteryParticipation, isLotteryParticipated } from '@/utils/lotteryParticipation'
import { normalizeLotteryData, formatTimestamp } from '@/utils/lotteryNormalization'

const props = withDefaults(
  defineProps<{
    data: AnyLotteryData[]
  }>(),
  {
    data: () => []
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

const imageViewerVisible = ref(false)
const currentImage = ref('')

const handleImageClick = (imageUrl: string | null | undefined) => {
  if (imageUrl) {
    currentImage.value = imageUrl
    imageViewerVisible.value = true
  }
}
</script>

<template>
  <div class="bili-official-lottery-table w-full overflow-x-auto">
    <el-table class="w-full" border table-layout="auto" :data="tableData" stripe size="default">
      <el-table-column prop="id" label="ID" width="70" fixed />
      <el-table-column prop="displayType" label="类型" width="80" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag size="small" :type="row.statusType" effect="plain" round>
            {{ row.statusText }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="参与人数" width="80" align="right">
        <template #default="{ row }">
          {{ row.participants ?? '-' }}
        </template>
      </el-table-column>
      <el-table-column label="一等奖" width="180">
        <template #default="{ row }">
          <template v-if="row.prizes[0]">
            <el-popover v-if="row.prizes[0].img" trigger="hover" placement="top">
              <template #reference>
                <span class="prize-name cursor-pointer" @click="handleImageClick(row.prizes[0]!.img)">
                  {{ row.prizes[0].description }} × {{ row.prizes[0].count }}
                </span>
              </template>
              <el-image :src="row.prizes[0].img" fit="contain" style="width: 120px; height: 120px" referrerpolicy="no-referrer" />
            </el-popover>
            <span v-else class="prize-name">{{ row.prizes[0].description }} × {{ row.prizes[0].count }}</span>
          </template>
          <span v-else class="text-text-secondary">-</span>
        </template>
      </el-table-column>
      <el-table-column label="二等奖" width="180">
        <template #default="{ row }">
          <template v-if="row.prizes[1]">
            <el-popover v-if="row.prizes[1].img" trigger="hover" placement="top">
              <template #reference>
                <span class="prize-name cursor-pointer" @click="handleImageClick(row.prizes[1]!.img)">
                  {{ row.prizes[1].description }} × {{ row.prizes[1].count }}
                </span>
              </template>
              <el-image :src="row.prizes[1].img" fit="contain" style="width: 120px; height: 120px" referrerpolicy="no-referrer" />
            </el-popover>
            <span v-else class="prize-name">{{ row.prizes[1].description }} × {{ row.prizes[1].count }}</span>
          </template>
          <span v-else class="text-text-secondary">-</span>
        </template>
      </el-table-column>
      <el-table-column label="三等奖" width="180">
        <template #default="{ row }">
          <template v-if="row.prizes[2]">
            <el-popover v-if="row.prizes[2].img" trigger="hover" placement="top">
              <template #reference>
                <span class="prize-name cursor-pointer" @click="handleImageClick(row.prizes[2]!.img)">
                  {{ row.prizes[2].description }} × {{ row.prizes[2].count }}
                </span>
              </template>
              <el-image :src="row.prizes[2].img" fit="contain" style="width: 120px; height: 120px" referrerpolicy="no-referrer" />
            </el-popover>
            <span v-else class="prize-name">{{ row.prizes[2].description }} × {{ row.prizes[2].count }}</span>
          </template>
          <span v-else class="text-text-secondary">-</span>
        </template>
      </el-table-column>
      <el-table-column label="开奖时间" width="160">
        <template #default="{ row }">
          {{ row.endTime ? formatTimestamp(row.endTime) : '-' }}
        </template>
      </el-table-column>
      <el-table-column label="发起人UID" width="150">
        <template #default="{ row }">
          <template v-if="row.senderInfo.uid">
            <el-link type="primary" @click="gotoBiliUserSpace(row.senderInfo.uid)">{{ row.senderInfo.uid }}</el-link>
          </template>
          <span v-else class="text-text-secondary">-</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <div class="flex items-center justify-center gap-2">
            <!-- 查看详情按钮 -->
            <template v-if="getRowDetailUrl(row)">
              <el-link
                type="primary"
                size="small"
                :href="getRowDetailUrl(row)"
                target="_blank"
                rel="noreferrer"
                @click.stop="handleLotteryLinkClick(String(row.id))"
                class="text-xs"
                underline="never"
              >
                <el-icon><Link /></el-icon>
                <span>详情</span>
              </el-link>
            </template>
            <template v-else>
              <el-button type="info" size="small" disabled class="text-xs">
                <el-icon><link /></el-icon>
                <span>无链接</span>
              </el-button>
            </template>
            
            <!-- 参加/不参加开关 -->
            <el-tooltip
              :content="getRowParticipated(row) ? '取消标记参加' : '标记为已参加'"
              placement="top"
            >
              <el-switch
                :model-value="getRowParticipated(row)"
                size="small"
                @change="handleParticipateSwitch(row, $event)"
                class="mt-1"
              />
            </el-tooltip>
          </div>
        </template>
      </el-table-column>
    </el-table>
    <el-image-viewer v-if="imageViewerVisible" :url-list="[currentImage]" @close="imageViewerVisible = false" referrerpolicy="no-referrer" />
  </div>
</template>
