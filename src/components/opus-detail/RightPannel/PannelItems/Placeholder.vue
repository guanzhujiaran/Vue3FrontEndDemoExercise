<!--
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-04-02 20:44:23
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-04-03 19:10:21
 * @FilePath: \BiliLottery\src\components\opus-detail\RightPannel\PannelItems\Placeholder.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<template>
  <div class="placeholder">
    <div class="placeholder-img is-im"></div>
    <div class="tip">
      没有当前账号【{{ $route.params.account_name ? $route.params.account_name : '' }} 】的信息！！( ゜- ゜)つロ
    </div>
  </div>
</template>
