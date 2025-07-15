<script setup lang="ts">
import { query } from '@/api/samsclub/gql.ts'
import { gql } from '@urql/vue'
import { SortUp, SortDown, Search, RemoveFilled } from '@element-plus/icons-vue'
import type { QueryGetSpuInfosArgs } from '@/gql/samsclub/graphql.ts'
import { useSamsclubStore } from '@/stores/samsclub.ts'

const queryParams = defineModel<QueryGetSpuInfosArgs>('queryParams', { required: true })
const props = defineProps<{
  submitForm: () => void
}>()

interface ListItem {
  value: string
  label: string
}
const samsclubStore = useSamsclubStore()
const orderByMap = {
  // 这个是不变的固定字段
  priceAsc: '价格',
  priceDiffCurAsc: '当前差价',
  priceDiffLatestAsc: '最新差价',
  priceDiffMaxAsc: '最大差价',
  spuInfoUpdateAsc: '更新时间'
}
const orderByAsc = ref(true)
const spuInfoMaxPrice = ref(0)
const spuNewTagTagMarkSelectOptions = ref<ListItem[]>([])
const priceMin = ref()
const priceMax = ref()
const oderBySelect = ref<string>('')
const handleResetForm = () => {
  Object.assign(queryParams.value, {
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
    spuNewTagTagMarkList: []
  })
  oderBySelect.value = ''
}
const handleRemoteTagGroup = () => {
  query(gql`
    query MyQuery {
      SpuNewTagInfoTagMarkGroup {
        tagMark
        title
      }
    }
  `).then((data) => {
    spuNewTagTagMarkSelectOptions.value = data.data?.SpuNewTagInfoTagMarkGroup.map((el: any) => {
      return { value: el.tagMark, label: el.title.replace(/\d+(?:\.\d+)?/g, ' xx ') }
    })
  })
}
const handleGetMaxPrice = () => {
  query(gql`
    query MyQuery {
      getMaxPrice
    }
  `).then((data) => {
    spuInfoMaxPrice.value = Math.round(data.data?.getMaxPrice / 100) + 1
  })
}
const handlePriceLimit = () => {
  if (priceMin.value > priceMax.value) {
    queryParams.value.priceMin = undefined
    queryParams.value.priceMax = undefined
    return
  }
  queryParams.value.priceMin = priceMin.value * 100
  queryParams.value.priceMax = priceMax.value * 100
}
const handleQueryParamsOrderBy = () => {
  switch (oderBySelect.value) {
    case 'priceAsc':
      queryParams.value.priceAsc = orderByAsc.value
      break
    case 'priceDiffCurAsc':
      queryParams.value.priceDiffCurAsc = orderByAsc.value
      break
    case 'priceDiffLatestAsc':
      queryParams.value.priceDiffLatestAsc = orderByAsc.value
      break
    case 'priceDiffMaxAsc':
      queryParams.value.priceDiffMaxAsc = orderByAsc.value
      break
    case 'spuInfoUpdateAsc':
      queryParams.value.spuInfoUpdateAsc = orderByAsc.value
      break
  }
}
const handleOrderByClick = () => {
  orderByAsc.value = !orderByAsc.value
  handleQueryParamsOrderBy()
}
const handleOrderBy = (value: any) => {
  Object.assign(queryParams.value, {
    priceAsc: undefined,
    priceDiffCurAsc: undefined,
    priceDiffLatestAsc: undefined,
    priceDiffMaxAsc: undefined,
    spuInfoUpdateAsc: undefined
  })
  handleQueryParamsOrderBy()
}
onMounted(() => {
  handleRemoteTagGroup()
  handleGetMaxPrice()
})
</script>

<template>
  <el-descriptions :column="2" border>
    <el-descriptions-item label="SPU ID">
      <el-input v-model.number="queryParams.spuId" placeholder="请输入SPU ID" />
    </el-descriptions-item>
    <el-descriptions-item label="SPU标题">
      <el-input v-model="queryParams.spuInfoTitle" placeholder="请输入SPU标题" />
    </el-descriptions-item>
    <!-- 标签筛选 -->
    <el-descriptions-item label="标签筛选">
      <el-select
        v-model="queryParams.spuNewTagTagMarkList!"
        multiple
        placeholder="请选择标签"
        clearable
      >
        <el-option
          v-for="(tag, idx) in spuNewTagTagMarkSelectOptions"
          :key="idx"
          :label="tag.label"
          :value="tag.value"
        >
          <span style="float: left">{{ tag.label }}</span>
          <span style="float: right; color: var(--el-text-color-secondary); font-size: 13px">
            {{ tag.value }}
          </span>
        </el-option>
      </el-select>
    </el-descriptions-item>
    <el-descriptions-item label="排序选择">
      <el-select
        v-model="oderBySelect"
        placeholder="请选择排序方式"
        clearable
        @change="handleOrderBy"
      >
        <el-option
          v-for="(tag, idx) in Object.entries(orderByMap)"
          :key="idx"
          :label="tag[1]"
          :value="tag[0]"
        />
        <template #label="{ label, value }">
          <span>{{ label }} </span>
          <el-tag :type="orderByAsc ? 'primary' : 'warning'"
            >{{ orderByAsc ? '升序' : '降序' }}
          </el-tag>
        </template>
        <template #footer>
          <el-button @click="handleOrderByClick" size="large">
            {{ orderByAsc ? '升序' : '降序' }}
            <el-icon>
              <SortUp v-if="orderByAsc" />
              <SortDown v-else />
            </el-icon>
          </el-button>
        </template>
      </el-select>
    </el-descriptions-item>
    <el-descriptions-item label="最低价格限制" :span="2">
      <el-slider
        v-model="priceMin"
        @change="handlePriceLimit"
        :max="spuInfoMaxPrice"
        show-input
        show-input-controls
      />
    </el-descriptions-item>
    <el-descriptions-item label="最高价格限制" :span="2">
      <el-slider
        v-model="priceMax"
        @change="handlePriceLimit"
        :max="spuInfoMaxPrice"
        show-input
        show-input-controls
      />
    </el-descriptions-item>
    <el-descriptions-item align="center">
      <div class="op-area">
        <el-switch
          v-model="samsclubStore.isShowPriceEcharts"
          class="op"
          inline-prompt
          active-text="展示价格图"
          inactive-text="隐藏价格图"
          style="--el-switch-on-color: #13ce66; --el-switch-off-color: #ff4949"
        ></el-switch>
        <el-button class="op" size="large" @click="handleResetForm" :icon="RemoveFilled"
          >重置
        </el-button>
        <el-button
          class="op"
          size="large"
          type="primary"
          @click="props.submitForm()"
          :autofocus="true"
          :icon="Search"
          @keydown.enter="props.submitForm()"
          >查询
        </el-button>
      </div>
    </el-descriptions-item>
  </el-descriptions>
</template>

<style scoped>
.op-area .op + .op {
  margin-left: 15px;
}
</style>
