<template>
  <FlexContainer v-loading="isLoading" class="p-[var(--spacing-2)]">
    <!-- 账号被封提示 Modal -->
    <el-dialog
      v-model="showAccountBannedModal"
      title="重要提示"
      width="500px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="true"
      center
    >
      <div class="flex flex-col items-center py-[var(--spacing-5)] text-center">
        <el-icon class="mb-[var(--spacing-5)] animate-pulse text-danger" :size="60">
          <WarningFilled />
        </el-icon>
        <el-text class="mb-4 text-xl font-semibold text-[var(--el-text-color-primary)]" tag="h3">服主 Sam's Club 账号已被封禁</el-text>
        <el-text class="mb-3 px-5 text-[15px] leading-relaxed text-[var(--el-text-color-regular)]" tag="p">
          由于服主(管理员)的 Sam's Club 账号被封禁，商品数据无法正常更新。
        </el-text>
        <el-text class="px-5 text-sm leading-snug text-[var(--el-text-color-secondary)]" tag="p">
          这可能导致商品价格、库存等信息不是最新的。服主正在努力恢复服务，请您耐心等待。
        </el-text>
        <el-divider></el-divider>
        <div class="mt-2.5 w-full rounded border border-[var(--el-color-primary-light-7)] bg-[var(--el-color-primary-light-9)] px-4 py-3">
          <el-text class="m-0 flex items-center justify-center gap-2 text-sm text-[var(--el-color-primary)]" tag="p">
            <el-icon><InfoFilled /></el-icon>
            您可以继续浏览已有的商品信息，但请注意数据可能不是最新的。
          </el-text>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-center gap-3">
          <el-button type="primary" @click="handleCloseModal">我知道了</el-button>
          <el-button @click="handleDontShowAgain">不再提示</el-button>
        </div>
      </template>
    </el-dialog>

    <SamsClubFilter
      v-model:query-params="samsClubFilterOpt"
      :submit-form="handleSubmitForm"
    ></SamsClubFilter>
    <el-divider></el-divider>
    <BiliPaginationDataView
      v-if="!(isEmpty || isError)"
      v-model:CurrentPage="samsClubFilterOpt.pn"
      v-model:Loading="isLoading"
      :page_size="samsClubFilterOpt.ps!"
      :total="pageInfo.total"
      v-model:data="dataItems"
    >
      <template #toolbar>
        <div></div>
      </template>
      <template #contents>
        <grid-container item-width="400px">
          <SpuItem
            :spu-info="spu_item"
            :key="spu_item.spuId"
            v-for="(spu_item, idx) in dataItems"
          ></SpuItem>
        </grid-container>
      </template>
    </BiliPaginationDataView>
    <BiliEmpty v-if="isEmpty && !isError" txt="没有商品数据" v-loading="isLoading"></BiliEmpty>
    <BiliError v-if="isError" @click-retry="handleSubmitForm" v-loading="isLoading"></BiliError>
  </FlexContainer>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { WarningFilled, InfoFilled } from '@element-plus/icons-vue'
import type { PageInfoType, QueryGetSpuInfosArgs, SpuInfoType } from '@/gql/samsclub/graphql.ts'
import biliMessage from '@/utils/message'
import { GET_SAMSCLUB_SPU } from '@/gql/samsclub/queries.ts'
import { useQuery } from '@urql/vue'

// Modal 控制
const showAccountBannedModal = ref<boolean>(false)
const MODAL_STORAGE_KEY = 'samsclub_account_banned_modal_dismissed'

const samsClubFilterOpt = ref<QueryGetSpuInfosArgs>({
  pn: 1,
  priceAsc: undefined,
  priceDiffCurAsc: undefined,
  priceDiffLatestAsc: undefined,
  priceDiffMaxAsc: undefined,
  priceMax: undefined,
  priceMin: undefined,
  ps: 10,
  spuId: undefined,
  spuInfoTitle: undefined,
  spuInfoUpdateAsc: undefined,
  spuInfoCreateAsc: undefined,
  spuNewTagTagMarkList: [],
  lastUpdateAfterTss: undefined,
  lastUpdateBeforeTss: undefined,
  lastCreateAfterTss: undefined,
  lastCreateBeforeTss: undefined
})
const shouldPause = ref<boolean>(true)
const getSamsclubSpuResult = useQuery({
  query: GET_SAMSCLUB_SPU,
  variables: samsClubFilterOpt,
  pause: shouldPause
})

// 初始化时触发查询
onMounted(() => {
  // 检查是否已经选择不再提示
  const isDismissed = localStorage.getItem(MODAL_STORAGE_KEY)
  if (!isDismissed) {
    // 延迟显示 Modal，等待页面加载完成
    setTimeout(() => {
      showAccountBannedModal.value = true
    }, 1000)
  }

  shouldPause.value = false
  handleSubmitForm()
})

// 关闭 Modal
const handleCloseModal = () => {
  showAccountBannedModal.value = false
}

// 不再提示
const handleDontShowAgain = () => {
  localStorage.setItem(MODAL_STORAGE_KEY, 'true')
  showAccountBannedModal.value = false
}
const dataItems = computed<SpuInfoType[]>(() => {
  if (getSamsclubSpuResult.data.value && getSamsclubSpuResult.data.value.getSpuInfos) {
    return getSamsclubSpuResult.data.value.getSpuInfos.items
  }
  return []
})
const isError = computed<boolean>(() => {
  if (getSamsclubSpuResult.error.value) {
    console.error(getSamsclubSpuResult.error.value)
    biliMessage.error(JSON.stringify(getSamsclubSpuResult.error.value))
    return true
  }
  return false
})
const isEmpty = computed<boolean>(() => {
  if (getSamsclubSpuResult.data.value && getSamsclubSpuResult.data.value.getSpuInfos) {
    return getSamsclubSpuResult.data.value.getSpuInfos.items.length === 0
  }
  return false
})
const isLoading = computed<boolean>(() => getSamsclubSpuResult.fetching.value)
const pageInfo = computed<PageInfoType>(() => {
  if (getSamsclubSpuResult.data.value && getSamsclubSpuResult.data.value.getSpuInfos) {
    return getSamsclubSpuResult.data.value.getSpuInfos.pageInfo
  }
  return {
    hasNextPage: true,
    page: 1,
    pageSize: 10,
    total: 0
  }
})
const handleSubmitForm = () => {
  shouldPause.value = false
  getSamsclubSpuResult.executeQuery()
}
</script>
