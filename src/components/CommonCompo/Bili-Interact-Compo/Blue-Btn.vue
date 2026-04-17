<template>
  <Transition name="bounce">
    <div
      v-show="props?.is_show"
      class="reply-box-send flex justify-center items-center relative rounded-lg cursor-pointer transition-all duration-200 bg-[var(--el-color-primary)] w-[var(--spacing-40)] h-10"
      :class="props?.is_active ? `send-active` : ``"
    >
      <div class="send-text absolute z-10 text-white font-normal text-base">{{ props?.btn_text }}</div>
    </div>
  </Transition>
</template>
<script setup lang="ts">
const props = defineModel<{
  btn_text: string
  is_active: boolean
  is_show: boolean
}>()
</script>
<style scoped>
.bounce-enter-active {
  animation: bounce-in 0.3s;
}

.bounce-leave-active {
  animation: bounce-in 0.3s reverse;
}

@keyframes bounce-in {
  0% {
    transform: scale(0);
  }

  100% {
    transform: scale(1);
  }
}

.reply-box-send:hover,
.reply-box-send .send-active {
  background-color: var(--el-color-primary-light-3);
  opacity: 0.7;
}

@media (prefers-color-scheme: dark) {
  .reply-box-send:hover,
  .reply-box-send .send-active {
    background-color: var(--el-color-primary);
  }
}
</style>