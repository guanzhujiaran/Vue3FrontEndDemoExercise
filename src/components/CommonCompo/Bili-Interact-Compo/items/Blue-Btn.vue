<template>
  <Transition
    enter-active-class="animate-[bounce-in_0.3s]"
    leave-active-class="animate-[bounce-in-reverse_0.3s]"
  >
    <div
      v-show="props?.is_show"
      class="reply-box-send flex justify-center items-center relative rounded-lg cursor-pointer transition-all duration-200 bg-primary w-(--spacing-40) h-10 dark:bg-primary dark:opacity-70 hover:bg-primary-light-3 hover:opacity-70"
      :class="props?.is_active ? 'bg-primary-light-3 opacity-70 dark:bg-primary dark:opacity-70' : ''"
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
