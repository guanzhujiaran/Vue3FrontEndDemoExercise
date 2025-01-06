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

<style scoped>
.dialog-wrap:deep(.el-dialog__header) {
  border-bottom: 1px solid #e5e9ef;
}

.dialog-btn-warp {
  text-align: center;
}

.dialog-btn {
  width: 120px;
  height: 32px;
  background: #00a1d6;
  border-radius: 4px;
  color: #fff;
  line-height: 32px;
  text-align: center;
  font-size: 14px;
  margin: 32px auto 0;
  cursor: pointer;
}

.dialog-success-explain {
  margin-top: 32px;
  text-align: center;
  font-size: 14px;
  color: #212121;
}

.dialog-success-img {
  width: 118px;
  height: 124px;
  margin: 0 auto;
  background: url(//s1.hdslb.com/bfs/static/jinkela/account/assets/success.png) no-repeat;
  background-size: 100% 100%;
}

.dialog-content {
  padding-top: 15px;
  padding-left: 20px;
  padding-right: 20px;
}
</style>
