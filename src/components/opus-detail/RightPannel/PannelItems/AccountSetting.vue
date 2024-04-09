<script setup lang="ts">
//TODO 这边需要ajax获取一下账号的设置，然后保存的时候再上传回去
import LoadingCard from '@/components/CommonCompo/LoadingCard.vue'
import SettingClickBar from './SettingComponent/ClickBar.vue'
import { onMounted } from 'vue';
defineProps<{
  // 账号设置
  account_name: string
}>()

onMounted(
  ()=>{
    //TODO 通过API获取账号设置

  }
)
</script>

<template>
  <div class="config">
    <div class="config-item">
      <SettingClickBar :title="`11`"></SettingClickBar>
    </div>
  </div>
  <LoadingCard />
</template>
