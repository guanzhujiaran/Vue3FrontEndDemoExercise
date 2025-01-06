<script setup lang="ts">
import type { BaseSettingDatePicker } from '@/models/base/base_setting_model.ts'
import { useTemplateRef } from 'vue'

const props = defineModel<BaseSettingDatePicker>({
  required: true
})
</script>

<template>
  <div class="date-picker">
    <span v-if="props.date_props.label">{{ props.date_props.label }}</span>
    <el-date-picker
      v-model="props.value"
      :value-format="props.date_props.format"
      :format="props.date_props.format"
      type="date"
      :disabled-date="
        (time: Date) => {
          return time.getTime() > props.date_props.disabled_date
        }
      "
      @keydown.prevent.self
    >
    </el-date-picker>
  </div>
</template>

<style scoped></style>
