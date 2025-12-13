<script setup lang="ts">
import { RouteName } from '@/models/router'
import { RouterLink } from 'vue-router'
import { ElIcon } from 'element-plus'
import { Tickets } from '@element-plus/icons-vue'
import { ref } from 'vue'
import type { PageShowModel } from '@/models/account/page/model.ts'
let AccountInfos = ref<PageShowModel[]>([])

</script>

<template>
  <div class="accounts-panel">
    <div v-if="AccountInfos.length === 0" class="empty-state">
      <el-icon :size="48"><Tickets /></el-icon>
      <p>您还没有添加账号</p>
      <RouterLink :to="{ name: RouteName.USER_INFO_CONFIG }">
        <el-button type="primary"> 添加账号 </el-button>
      </RouterLink>
    </div>

    <div v-else class="accounts-content">
      <div class="account-list">
        <RouterLink
          v-for="account in AccountInfos"
          :key="account.info.account_name"
          :to="{
            name: RouteName.ACCOUNT_DETAIL,
            params: { account_name: account.info.account_name }
          }"
          custom
          v-slot="{ navigate }"
        >
          <div :class="['account-item', { active: account.is_show }]" @click="navigate">
            <div class="account-avatar">
              <el-avatar :size="40">{{
                account.info.account_name.charAt(0).toUpperCase()
              }}</el-avatar>
            </div>
            <div class="account-info" v-if="!isSidebarCollapsed">
              <div class="account-name">{{ account.info.account_name }}</div>
              <div class="account-status">
                <el-tag :type="account.info.info ? 'success' : 'danger'" size="small">
                  {{ account.info.info ? '有效' : '无效' }}
                </el-tag>
              </div>
            </div>
          </div>
        </RouterLink>
      </div>

      <div class="account-detail">
        <router-view />
      </div>
    </div>
  </div>
</template>

<style scoped>
@import '@/assets/components/user/user-center-tailwind.css';
</style>
