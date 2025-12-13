<script setup lang="ts"></script>

<template>
  <div class="lottery__desc">
    <div class="lottery__desc__label"><slot name="label"></slot></div>
    <div class="lottery__desc__value"><slot name="value"></slot></div>
  </div>
</template>

<style scoped>
@import '@/assets/components/lottery/bili-lottery-card-desc-tailwind.css';
</style>
