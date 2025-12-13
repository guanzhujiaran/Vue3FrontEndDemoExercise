<template>
  <FlexContainer v-loading="isLoading" style="padding: 10px">
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
import { ref } from 'vue'
import type { PageInfoType, QueryGetSpuInfosArgs, SpuInfoType } from '@/gql/samsclub/graphql.ts'
import emitter from '@/utils/mitt.ts'
import { GET_SAMSCLUB_SPU } from '@/gql/samsclub/queries.ts'
import { useQuery } from '@urql/vue'

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
const shouldPause = ref<boolean>(true)
const getSamsclubSpuResult = useQuery({
  query: GET_SAMSCLUB_SPU,
  variables: samsClubFilterOpt,
  pause: shouldPause
})
const dataItems = computed<SpuInfoType[]>(() => {
  if (getSamsclubSpuResult.data.value && getSamsclubSpuResult.data.value.getSpuInfos) {
    return getSamsclubSpuResult.data.value.getSpuInfos.items
  }
  return []
})
const isError = computed<boolean>(() => {
  if (getSamsclubSpuResult.error.value) {
    console.error(getSamsclubSpuResult.error.value)
    emitter.emit('toast', { t: JSON.stringify(getSamsclubSpuResult.error.value), e: 'error' })
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
  getSamsclubSpuResult.executeQuery()
}
</script>

<style scoped>
@import '@/assets/components/samsclub/samsclub-filter-tailwind.css';
@import '@/assets/components/samsclub/spu-item-tailwind.css';
</style>
