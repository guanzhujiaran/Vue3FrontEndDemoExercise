<script setup lang="ts">
import { ref } from 'vue'
import VueJsonPretty from 'vue-json-pretty'
import 'vue-json-pretty/lib/styles.css'
import type { SpuInfoType } from '@/gql/samsclub/graphql.ts'

const props = defineProps<{
  spuInfo: SpuInfoType
}>()

// 对话框控制
const dialogTableVisible = ref(false)
</script>

<template>
  <div class="action-buttons">
    <el-button @click="dialogTableVisible = true" type="info" size="small">
      <el-icon><InfoFilled /></el-icon>查看原始数据
    </el-button>
    <el-dialog
      v-model="dialogTableVisible"
      :title="spuInfo.title"
      width="75%"
      draggable
    >
      <VueJsonPretty
        :showDoubleQuotes="false"
        :data="spuInfo"
        :indent="2"
        :deep="3"
        showIcon
        showLineNumber
        showLength
      ></VueJsonPretty>
    </el-dialog>
  </div>
</template>


