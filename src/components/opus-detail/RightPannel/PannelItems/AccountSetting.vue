<script setup lang="ts">
import LotterySettingModule from '@/components/opus-detail/RightPannel/PannelItems/SettingComponent/LotterySettingModule.vue'
import { ref } from 'vue'
import { Setting } from '@element-plus/icons-vue'

defineProps<{
  account_name: string
}>()

const dialogVisible = ref(false)
</script>

<template>
  <div class="el-btn-wrap">
    <el-button type="info" @click="dialogVisible = true">
      <el-icon style="margin-right: 5px"><Setting /></el-icon>打开账号设置面板
    </el-button>
  </div>
  <el-dialog
    v-model="dialogVisible"
    width="85%"
    draggable
    :show-close="false"
    :close-delay="100"
    :center="true"
  >
    <template #header="{ titleClass }">
      <div class="lottery-setting-header">
        <h4 :class="titleClass">账号【{{ account_name }}】的设置</h4>
      </div>
    </template>
    <LotterySettingModule :account_name="account_name" @close_setting_modal="dialogVisible = false">
    </LotterySettingModule>
  </el-dialog>
</template>
<style scoped>
.lottery-setting-header {
  background-color: #f1f2f3;
  opacity: 1;
  border-radius: 6px;
}
.el-btn-wrap {
  padding: 16px;
  display: flex;
}

.el-btn-wrap button {
  width: 100%;
}
</style>
