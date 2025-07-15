<script setup lang="ts">
import { Refresh, Setting } from '@element-plus/icons-vue'
import { useBiliLotteryRecord } from '@/stores/bili_lottery_record.ts'

defineProps<{
  refresh_data: () => void
}>()
const isOpenSetting = ref(false)
const ClickedBiliLotteryId = useBiliLotteryRecord()
const form = ref({ max_record_lottery_num: ClickedBiliLotteryId.max_record_lottery_num })
const onSubmit = () => {
  ClickedBiliLotteryId.max_record_lottery_num = form.value.max_record_lottery_num
  isOpenSetting.value = false
}
</script>

<template>
  <div class="data-table-toolbar">
    <el-dialog v-model="isOpenSetting">
      <el-form :from="form">
        <el-form-item label="最大保存记录抽奖次数">
          <el-slider
            v-model="form.max_record_lottery_num"
            show-input
            :step="10"
            :min="10"
            :max="1000"
          ></el-slider>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="onSubmit">保存</el-button>
          <el-button @click="isOpenSetting = false">取消</el-button>
        </el-form-item>
      </el-form>
    </el-dialog>
    <el-button type="info" :icon="Setting" class="setting-btn" @click="isOpenSetting = true"
      >设置
    </el-button>
    <el-button type="primary" :icon="Refresh" class="refresh-btn" @click="refresh_data"
      >刷新
    </el-button>
  </div>
</template>

<style scoped>
.data-table-toolbar .refresh-btn,
.data-table-toolbar .setting-btn {
  width: auto;
}

.data-table-toolbar {
  padding: 0.2rem 0.1rem 0.3rem;
  margin: auto;
  display: flex;
  justify-content: center;
}
</style>
