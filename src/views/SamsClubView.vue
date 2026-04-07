<template>
  <FlexContainer v-loading="isLoading" style="padding: 10px">
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
      <div class="account-banned-content">
        <el-icon class="warning-icon" :size="60" color="#f56c6c">
          <WarningFilled />
        </el-icon>
        <h3 class="warning-title">服主 Sam's Club 账号已被封禁</h3>
        <p class="warning-text">
          由于服主(管理员)的 Sam's Club 账号被封禁，商品数据无法正常更新。
        </p>
        <p class="warning-subtext">
          这可能导致商品价格、库存等信息不是最新的。服主正在努力恢复服务，请您耐心等待。
        </p>
        <el-divider></el-divider>
        <div class="info-box">
          <p class="info-text">
            <el-icon><InfoFilled /></el-icon>
            您可以继续浏览已有的商品信息，但请注意数据可能不是最新的。
          </p>
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer">
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

<style scoped>
@import '@/assets/components/samsclub/samsclub-filter-tailwind.css';
@import '@/assets/components/samsclub/spu-item-tailwind.css';

.account-banned-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 20px 0;
}

.warning-icon {
  margin-bottom: 20px;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

.warning-title {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 16px;
}

.warning-text {
  font-size: 15px;
  color: #606266;
  line-height: 1.6;
  margin-bottom: 12px;
  padding: 0 20px;
}

.warning-subtext {
  font-size: 13px;
  color: #909399;
  line-height: 1.5;
  padding: 0 20px;
}

.info-box {
  background-color: #ecf5ff;
  border: 1px solid #d9ecff;
  border-radius: 4px;
  padding: 12px 16px;
  width: 100%;
  margin-top: 10px;
}

.info-text {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 13px;
  color: #409eff;
  margin: 0;
}

.dialog-footer {
  display: flex;
  justify-content: center;
  gap: 12px;
}
</style>
