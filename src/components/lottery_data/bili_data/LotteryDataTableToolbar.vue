<template>
  <div class="bili-data-table-toolbar flex w-full flex-col gap-3 xl:w-auto">
    <el-dialog v-model="isOpenSetting" class="setting-dialog" width="500px" :close-on-click-modal="true">
      <div class="dialog-content">
        <el-alert
          title="注意：以下设置和数据均保存在本地浏览器中，清除浏览器缓存会导致设置丢失。"
          type="warning"
          show-icon
          :closable="false"
          class="local-storage-notice"
        />
        <el-form class="mt-4" :model="form">
          <el-form-item label="最大保存记录抽奖次数">
            <el-slider
              v-model="form.max_record_lottery_num"
              show-input
              :step="10"
              :min="10"
              :max="1000"
            ></el-slider>
          </el-form-item>
          <el-form-item label="是否自动保存跳转过去的抽奖">
            <el-switch v-model="form.auto_save_lottery"></el-switch>
          </el-form-item>
          <el-form-item label="默认显示模式">
            <el-radio-group v-model="form.lottery_view_mode">
              <el-radio-button value="card">卡片视图</el-radio-button>
              <el-radio-button value="table">表格视图</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item class="button-group">
            <el-button type="primary" @click="onSubmit">保存</el-button>
            <el-button @click="isOpenSetting = false">取消</el-button>
          </el-form-item>
        </el-form>
      </div>
    </el-dialog>

    <div class="toolbar-buttons flex w-full flex-row flex-wrap items-center justify-center gap-3 sm:justify-end xl:w-auto">

      <div class="button-row flex flex-wrap items-center justify-center gap-3 sm:flex-none sm:justify-end">

        <el-button round type="info" :icon="Setting" class="setting-btn" @click="isOpenSetting = true">
          设置
        </el-button>
        <el-button round type="primary" :icon="Refresh" class="refresh-btn" @click="refresh_data">
          刷新
        </el-button>
        <el-button-group class="view-toggle">
          <el-button
            round
            :type="viewMode === 'card' ? 'primary' : 'default'"
            :icon="Grid"
            @click="toggleViewMode('card')"
            title="卡片视图"
          />
          <el-button
            round
            :type="viewMode === 'table' ? 'primary' : 'default'"
            :icon="List"
            @click="toggleViewMode('table')"
            title="表格视图"
          />
        </el-button-group>
      </div>
      <div class="button-row flex flex-wrap items-center justify-center gap-3 sm:flex-none sm:justify-end">
        <slot name="submit-button"></slot>
        <SubmitFeedbackModal />
      </div>



    </div>
  </div>
</template>


<script setup lang="ts">
import { ref } from 'vue'
import { useBiliLotteryRecord } from '@/stores/bili_lottery_record.ts'
import { Setting, Refresh, Grid, List } from '@element-plus/icons-vue'
import SubmitFeedbackModal from './SubmitFeedbackModal.vue'

defineProps<{
  refresh_data: () => void
  showSubmitButton?: boolean
  viewMode: 'card' | 'table'
}>()

const emit = defineEmits<{
  'update:viewMode': [mode: 'card' | 'table']
  'on-click-submit': []
}>()

const isOpenSetting = ref(false)
const ClickedBiliLotteryId = useBiliLotteryRecord()
const form = ref({
  max_record_lottery_num: ClickedBiliLotteryId.max_record_lottery_num,
  auto_save_lottery: ClickedBiliLotteryId.auto_save_lottery,
  lottery_view_mode: ClickedBiliLotteryId.lottery_view_mode
})
const onSubmit = () => {
  ClickedBiliLotteryId.max_record_lottery_num = form.value.max_record_lottery_num
  ClickedBiliLotteryId.auto_save_lottery = form.value.auto_save_lottery
  ClickedBiliLotteryId.lottery_view_mode = form.value.lottery_view_mode as 'card' | 'table'
  isOpenSetting.value = false
}

const toggleViewMode = (mode: 'card' | 'table') => {
  ClickedBiliLotteryId.lottery_view_mode = mode
  emit('update:viewMode', mode)
}
</script>



