import { gql } from '@urql/vue'

export const GET_SAMSCLUB_SPU = gql`
  query getSpuInfos(
    $priceAsc: Boolean
    $priceDiffCurAsc: Boolean
    $priceDiffMaxAsc: Boolean
    $priceDiffLatestAsc: Boolean
    $pn: Int!
    $ps: Int!
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

export const GET_TAG_GROUPS = gql`
  query GetTagGroups {
    SpuNewTagInfoTagMarkGroup {
      tagMark
      title
    }
  }
`
export const GET_MAX_PRICE = gql`
  query GetMaxPrice {
    getMaxPrice
  }
`
