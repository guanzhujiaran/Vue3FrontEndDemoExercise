<script setup lang="ts">
import { ref } from 'vue'
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
.data-table-toolbar {
  padding: 0.5rem 0.5rem 0.8rem;
  margin: 0 auto 1rem;
  display: flex;
  justify-content: center;
  gap: 1rem;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  border: 1px solid var(--el-border-color-lighter);
}

.data-table-toolbar .refresh-btn,
.data-table-toolbar .setting-btn {
  width: auto;
  border-radius: 20px;
  padding: 8px 16px;
  transition: all 0.3s ease;
}

.data-table-toolbar .refresh-btn {
  border-color: var(--el-color-primary);
}

.data-table-toolbar .refresh-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 161, 214, 0.2);
}

.data-table-toolbar .setting-btn {
  border-color: var(--el-border-color);
  color: var(--el-text-color-regular);
}

.data-table-toolbar .setting-btn:hover {
  border-color: var(--el-border-color-darker);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

:deep(.el-dialog__header) {
  border-bottom: 1px solid #eaeaea;
  padding-bottom: 15px;
}

:deep(.el-dialog__body) {
  padding-top: 20px;
}

:deep(.el-slider__runway) {
  margin: 16px 0;
}

:deep(.el-slider__button) {
  border-color: #00a1d6;
}

:deep(.el-slider__bar) {
  background-color: #00a1d6;
}
</style>
