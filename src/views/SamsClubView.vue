<template>
  <FlexContainer v-loading="isLoading" style="padding: 10px">
    <SamsClubFilter
      v-model:query-params="samsClubFilterOpt"
      :submit-form="
        () => {
          samsClubFilterOpt.pn = 1
          handle_fetch_gql()
        }
      "
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
        <el-space
          wrap
          size="large"
          :fill-ratio="20"
          alignment="stretch"
          style="justify-content: center"
        >
          <SpuItem
            :spu-info="spu_item"
            :key="spu_item.spuId"
            v-for="(spu_item, idx) in dataItems"
          ></SpuItem>
        </el-space>
      </template>
    </BiliPaginationDataView>
    <BiliEmpty v-if="isEmpty && !isError" txt="没有商品数据" v-loading="isLoading"></BiliEmpty>
    <BiliError v-if="isError" @click-retry="handle_fetch_gql" v-loading="isLoading"></BiliError>
  </FlexContainer>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { gql } from '@urql/vue'
import { query } from '@/api/samsclub/gql.ts'
import type { PageInfoType, QueryGetSpuInfosArgs, SpuInfoType } from '@/gql/samsclub/graphql.ts'
import emitter from '@/utils/mitt.ts'

const GET_SAMSCLUB_SPU = gql`
  query getSpuInfos(
    $priceAsc: Boolean
    $priceDiffCurAsc: Boolean
    $priceDiffMaxAsc: Boolean
    $priceDiffLatestAsc: Boolean
    $pn: Int
    $ps: Int
    $priceMax: Int
    $spuId: Int
    $spuInfoTitle: String
    $priceMin: Int
    $spuInfoUpdateAsc: Boolean
    $spuInfoCreateAsc: Boolean
    $spuNewTagTagMarkList: [String!]
    $lastUpdateAfterTss: Int
    $lastUpdateBeforeTss: Int
    $lastCreateAfterTss: Int
    $lastCreateBeforeTss: Int
  ) {
    getSpuInfos(
      priceAsc: $priceAsc
      priceDiffCurAsc: $priceDiffCurAsc
      priceDiffMaxAsc: $priceDiffMaxAsc
      priceDiffLatestAsc: $priceDiffLatestAsc
      pn: $pn
      priceMax: $priceMax
      spuId: $spuId
      spuInfoTitle: $spuInfoTitle
      ps: $ps
      priceMin: $priceMin
      spuInfoUpdateAsc: $spuInfoUpdateAsc
      spuInfoCreateAsc: $spuInfoCreateAsc
      spuNewTagTagMarkList: $spuNewTagTagMarkList
      lastUpdateAfterTss: $lastUpdateAfterTss
      lastUpdateBeforeTss: $lastUpdateBeforeTss
      lastCreateAfterTss: $lastCreateAfterTss
      lastCreateBeforeTss: $lastCreateBeforeTss
    ) {
      items {
        zoneTypeList
        viceBizType
        venderCode
        updateTime
        unknowField
        title
        subTitle
        storeId
        spuSpecInfo
        spuId
        specList
        specInfo
        smallPackagePriceDisplay
        seriesId
        serialId
        onlyStoreSale
        newTagInfos {
          beginTime
          endTime
          createTime
          id
          logoImageCn
          logoImageEn
          logoImageWide
          originalPrice
          logoImageHigh
          logoImageZhCn
          placeType
          priorityValue
          promotionPrice
          promotionTag
          savedMoney
          styleType
          styleCode
          tagMark
          tagManageId
          tagPlace
          tagStyleId
          titleCn
          tagSortType
          title
          updateTime
          unknowField
        }
        commonOuterService
        maxPriceDiff
        masterBizType
        limitInfo
        latestPriceDiff
        isStoreExtent
        isShowXPlusTag
        isSerial
        isImport
        isGlobalDirectPurchase
        isAvailable
        image
        hostItemId
        hasVideo
        giveSpuList
        exclusiveSpu
        deliveryMethod
        deliveryAttr
        curPriceDiff
        createTime
        cityCodes
        categoryOuterService
        brandId
        beltInfo
        availableStores
        latestPriceInfo {
          price
          priceType
          priceTypeName
          unknowField
          updateTime
          createTime
        }
        allPriceInfos {
          price
          priceType
          priceTypeName
          unknowField
          updateTime
        }
        categories {
          categoryId
        }
        stockInfo {
          safeStockQuantity
          soldQuantity
          stockQuantity
          unknowField
          updateTime
        }
        tagInfos {
          beginTime
          createTime
          priorityValue
          promotionTag
          tagMark
          tagPlace
          tagSortType
          title
          unknowField
          updateTime
        }
        videoInfos {
          duration
          unknowField
          updateTime
          videoCover
          videoUrl
        }
      }
      pageInfo {
        hasNextPage
        page
        pageSize
        total
      }
    }
  }
`
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
  spuNewTagTagMarkList: undefined,
  lastUpdateAfterTss: undefined,
  lastUpdateBeforeTss: undefined,
  lastCreateAfterTss: undefined,
  lastCreateBeforeTss: undefined
})
const isError = ref(false)
const isEmpty = ref(false)
const dataItems = ref<Array<SpuInfoType>>([])
const pageInfo = ref<PageInfoType>({
  hasNextPage: true,
  page: 1,
  pageSize: 10,
  total: 0
})
const isLoading = ref(true)
const handle_fetch_gql = () => {
  isLoading.value = true
  query(GET_SAMSCLUB_SPU, samsClubFilterOpt.value)
    .then((data) => {
      if (data && data.data) {
        dataItems.value = data.data.getSpuInfos.items
        pageInfo.value = data.data.getSpuInfos.pageInfo
        isError.value = false
        isEmpty.value = data.data.getSpuInfos.items.length === 0
        window.scrollTo(0, 0)
        return
      }
      throw data
    })
    .catch((err) => {
      isError.value = true
      dataItems.value = []
      console.error(err)
      emitter.emit('toast', { t: err.error.message, e: 'error' })
    })
    .finally(() => {
      isLoading.value = false
    })
}

onMounted(() => {
  handle_fetch_gql()
})
watch(
  () => samsClubFilterOpt.value.pn,
  () => {
    handle_fetch_gql()
  }
)
</script>

<style scoped></style>
