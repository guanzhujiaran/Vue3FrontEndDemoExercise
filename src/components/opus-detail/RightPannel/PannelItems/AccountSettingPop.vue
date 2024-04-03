<script setup lang="ts">
//TODO 这边需要ajax获取一下账号的设置，然后保存的时候再上传回去
import { type TAccountInfo } from '../../type'

defineProps<{
  // 账号设置
  account_info: TAccountInfo
}>()
</script>

<template>
  <div class="share-step">
    <div class="title">{{ account_info.account_name }} 的设置</div>
    <div class="close"></div>
    <div class="btn-field">
      <button class="share-btn">保存</button>
    </div>
  </div>
</template>
