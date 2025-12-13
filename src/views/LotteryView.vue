<template>
  <FlexContainer>
    <el-page-header
      style="margin-bottom: 20px"
      title="返回"
      content="B站抽奖数据"
      @back="() => router.back()"
    />
    <router-view v-slot="{ Component }">
      <keep-alive>
        <component :is="Component" :key="use_router.currentRoute.value.name" />
      </keep-alive>
    </router-view>
  </FlexContainer>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import router from '@/router'
import { RouteName } from '@/models/router'
const use_router = useRouter()
</script>

<style scoped>
@import '@/assets/views/lottery-data-stat-tailwind.css';
</style>
