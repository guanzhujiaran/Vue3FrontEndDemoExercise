<template>
  <div class="bili-data-table-toolbar">
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
          <el-form-item class="button-group">
            <el-button type="primary" @click="onSubmit">保存</el-button>
            <el-button @click="isOpenSetting = false">取消</el-button>
          </el-form-item>
        </el-form>
      </div>
    </el-dialog>

    <div class="toolbar-buttons">
      <div class="button-row">
        <el-button round type="info" :icon="Setting" class="setting-btn" @click="isOpenSetting = true">
          设置
        </el-button>
        <el-button round type="primary" :icon="Refresh" class="refresh-btn" @click="refresh_data">
          刷新
        </el-button>
      </div>
      <div class="button-row">
        <slot name="submit-button"></slot>
        <SubmitFeedbackModal />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useBiliLotteryRecord } from '@/stores/bili_lottery_record.ts'
import { Setting, Refresh } from '@element-plus/icons-vue'
import SubmitFeedbackModal from './SubmitFeedbackModal.vue'

defineProps<{
  refresh_data: () => void
  showSubmitButton?: boolean
}>()

defineEmits<{
  'on-click-submit': []
}>()

const isOpenSetting = ref(false)
const ClickedBiliLotteryId = useBiliLotteryRecord()
const form = ref({
  max_record_lottery_num: ClickedBiliLotteryId.max_record_lottery_num,
  auto_save_lottery: ClickedBiliLotteryId.auto_save_lottery
})
const onSubmit = () => {
  ClickedBiliLotteryId.max_record_lottery_num = form.value.max_record_lottery_num
  ClickedBiliLotteryId.auto_save_lottery = form.value.auto_save_lottery
  isOpenSetting.value = false
}
</script>

<style scoped>
@import '@/assets/components/data-table/bili-data-table-toolbar-tailwind.css';
</style>
