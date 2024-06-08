<!--
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-04-02 20:44:23
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-06-07 15:32:52
 * @FilePath: \BiliLottery\src\components\opus-detail\RightPannel\PannelItems\Placeholder.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<template>
  <div class="placeholder" v-if="props && props.is_show">
    <div class="placeholder-img is-im"></div>
    <div class="tip">
      {{ props.inner_text }}
    </div>
  </div>
</template>
<script setup lang="ts">
const props = defineModel<{ inner_text: string, is_show: boolean }>()

</script>