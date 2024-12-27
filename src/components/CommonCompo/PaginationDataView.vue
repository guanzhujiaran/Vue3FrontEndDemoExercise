<template>
  <div class="data-table-wrapper" v-loading="loading">
    <div class="data-table-toolbar">
      <el-tag type="primary" size="large">
        每列最多显示
        <el-select v-model="max_col_num" placeholder="Select" style="width: 4rem">
          <el-option
            v-for="item in [
              ...Array(max_col_num > origin_data_length ? max_col_num : origin_data_length).keys()
            ].map((i) => i + 1)"
            :key="item"
            :label="item"
            :value="item"
          />
        </el-select>
        个数据列
      </el-tag>
      <el-button type="primary" :icon="Refresh" @click="fresh_data">刷新</el-button>
    </div>
    <div v-show="preprocessed_data && preprocessed_data.length > 0" style="overflow: auto">
      <el-table
        :data="preprocessed_data"
        border
        stripe
        highlight-current-row
        empty-text="空数据"
        ref="expandableTable"
        @row-click="handleRowClick"
      >
        <el-table-column v-if="is_table_expandable" type="expand">
          <template #default="props">
            <div class="more-info-view-card">
              <el-card :body-style="more_info_view_card_style" style="">
                <template #header>
                  <div class="card-header">
                    <span>详细信息</span>
                  </div>
                </template>
                <div class="card-content">
                  <div
                    v-for="(da_key, idx) in Object.keys(props.row).slice(max_col_num)"
                    :key="`data-${idx}`"
                  >
                    <el-link
                      v-if="/http|bili:\/\//gim.test(props.row[da_key])"
                      :href="props.row[da_key]"
                      target="_blank"
                      type="primary"
                      rel="noreferrer"
                      >{{ translate_key_map[da_key] ?? da_key }}: 跳转
                    </el-link>
                    <el-text
                      v-else
                      class="text item"
                      type="primary"
                      size="large"
                      tag="b"
                      style="line-height: 1.5rem"
                    >
                      {{ translate_key_map[da_key] ?? da_key }}:
                      {{ utils.formatTimeOrReturnOriginal(props.row[da_key]) }}
                    </el-text>
                  </div>
                </div>
              </el-card>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          v-for="(data_key, idx) in Object.keys(preprocessed_data[0] ?? {}).slice(0, max_col_num)"
          :prop="data_key"
          :label="translate_key_map[data_key] ?? data_key"
          :key="`${data_key}_${idx}`"
          show-overflow-tooltip
          sortable
          :min-width="translate_key_map[data_key]?.includes('链接') ? '80rem' : '180rem'"
        >
          <template #default="scope">
            <el-link
              v-if="/http|bili:\/\//gim.test(scope.row[data_key])"
              :href="scope.row[data_key]"
              target="_blank"
              type="primary"
              rel="noreferrer"
              >跳转
            </el-link>
            <el-text v-else type="primary" size="large" tag="b">{{ scope.row[data_key] }}</el-text>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        size="small"
        background
        :layout="paginationLayout"
        :total="data4show.total"
        v-model:current-page="current_page"
        style="padding-top: 0.5rem; padding-bottom: 1rem"
        :pager-count="5"
      />
    </div>
    <Placeholder v-model="placeholder_props" />
  </div>
</template>
<style scoped>
.data-table-wrapper {
  display: contents;
}

.data-table-wrapper .data-table-toolbar {
  margin-bottom: 0.5rem;
  display: flex;
  gap: 1rem;
}

@media (max-width: 620px) {
  .more-info-view-card {
    width: calc(90vw - 2rem);
    position: sticky;
    left: 0;
  }

  .data-table-wrapper .data-table-toolbar {
    margin-bottom: 0.5rem;
    display: grid;
    gap: 0.5rem;
  }

  .data-table-wrapper :deep(.el-pagination) {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
}
</style>
<script setup lang="ts">
import { Refresh } from '@element-plus/icons-vue'
import Placeholder from '@/components/opus-detail/RightPannel/PannelItems/Placeholder.vue'
import emitter from '@/utils/mitt'
import utils from '@/utils/mixin.ts'
import { computed, inject, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
import { useLotDataStore } from '@/stores/lot_data'
import { storeToRefs } from 'pinia'
import { ScreenTypeEnum } from '@/models/global_var/global_var_model.ts'
import { KeysEnum, useInject } from '@/models/base/provide_model.ts'

const more_info_view_card_style = ref<string>(
  `display: flex;justify-content: space-between;align-items: flex-start;gap: 0.5rem;flex-direction: column;`
)
const globalVars = useInject(KeysEnum.globalVars)
const isSmallScreen = computed(() => {
  return globalVars.value.screen_size !== ScreenTypeEnum.large
})

const paginationLayout = computed(() => {
  return isSmallScreen.value ? 'prev, pager, next, total' : 'prev, pager, next, jumper, total'
})

const expandableTable = useTemplateRef('expandableTable')
const handleRowClick = (row: any, column: any, event: any) => {
  if (is_table_expandable.value) expandableTable.value?.toggleRowExpansion(row)
}
const store = useLotDataStore()
const { max_col_num } = storeToRefs(store)
const origin_data_length = computed<number>(() => Object.keys(data4show.data[0] ?? {}).length)
const preprocess_data = (da_arr: any[]) => {
  return da_arr.map((els) =>
    Object.fromEntries(
      Object.entries(els).map((el) => [el[0], utils.formatTimeOrReturnOriginal(el[1])])
    )
  )
}
const preprocessed_data = computed(() => {
  return preprocess_data(data4show.data)
})
const is_table_expandable = computed(
  () => Object.keys(data4show.data[0] ?? {}).length > max_col_num.value
)
const translate_key_map = ref<{ [key: string]: string }>({
  dynId: '动态id',
  lottery_time: '抽奖时间',
  sender_uid: '抽奖up',
  lottery_id: '抽奖id',
  lottery_text: '奖品信息',
  jump_url: '链接',
  app_sche: 'app链接',
  title: '标题',
  end_date_str: '截止时间',
  lot_type_text: '抽奖类型',
  lottery_pool_text: '奖池信息（部分）',
  lottery_sid: '抽奖id',
  live_room_url: '链接',
  app_schema: 'app链接',
  award_name: '奖品名称',
  type: '抽奖类型',
  end_time: '结束时间',
  total_price: '参与花费（金瓜子）',
  danmu: '参加弹幕内容',
  anchor_uid: '发起者uid',
  room_id: '房间号',
  lot_id: '抽奖号',
  require_type: '参与条件',
  upower_level_str: '充电等级要求',
  reserve_url: '链接',
  lottery_prize_info: '奖品信息',
  etime: '结束时间',
  reserve_sid: '预约sid',
  available: '是否可预约'
})
const data4show = withDefaults(
  defineProps<{
    data: any[]
    total: number
    page_size: number
  }>(),
  {
    data: () => [],
    total: 0,
    page_size: 10
  }
)
const current_page = defineModel<number>('CurrentPage', { default: 0 })
const loading = defineModel<boolean>('Loading', { default: true })
const placeholder_props = ref({
  inner_text: `无数据`,
  is_show: computed(() => !(data4show?.data && data4show?.data?.length > 0))
})
onMounted(() => {
  emitter.emit('toast', { t: '加载数据中！', e: 'info' })
  current_page.value = 1
})
const fresh_data = () => {
  current_page.value = current_page.value === 1 ? 0 : 1
}
</script>
