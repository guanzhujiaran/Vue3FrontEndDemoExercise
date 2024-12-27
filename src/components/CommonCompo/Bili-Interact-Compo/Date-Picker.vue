<script setup lang="ts">
import type { BaseSettingDatePicker } from '@/models/base/base_setting_model.ts'

const props = defineModel<BaseSettingDatePicker>({
  required: true
})
</script>

<template>
  <div class="date-picker">
    <span v-if="props.date_props.label">{{ props.date_props.label }}</span>
    <el-date-picker
      :value-format="props.date_props.format"
      :format="props.date_props.format"
      :editable="false"
    >
    </el-date-picker>
  </div>
</template>

<style scoped></style>
