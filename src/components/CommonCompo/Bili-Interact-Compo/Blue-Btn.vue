<template>
  <Transition name="bounce">
    <div
      v-show="props?.is_show"
      class="reply-box-send"
      :class="props?.is_active ? `send-active` : ``"
    >
      <div class="send-text">{{ props?.btn_text }}</div>
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
@import '@/assets/components/interact/blue-btn-tailwind.css';
</style>