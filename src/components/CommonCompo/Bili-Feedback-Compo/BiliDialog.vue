<script setup lang="ts">
const dialogVisible = defineModel<boolean>('dialogVisible', { required: true })
const props = defineProps<{
  title: string
  content: string
}>()
</script>

<template>
  <div class="dialog-wrap">
    <el-dialog
      align-center
      width="400"
      v-model="dialogVisible"
      :title="props.title"
      :draggable="true"
    >
      <template #footer>
        <div class="dialog-content">
          <div class="dialog-success-content">
            <div class="dialog-success-img"></div>
            <p class="dialog-success-explain">{{ props.content }}</p>
            <div class="dialog-btn-warp">
              <el-button class="dialog-btn" @click="dialogVisible = false">确定</el-button>
            </div>
          </div>
        </div>
      </template>
    </el-dialog>
  </div>
</template>