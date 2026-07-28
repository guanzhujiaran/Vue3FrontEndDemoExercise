<template>
  <FlexContainer>
    <el-page-header
      class="lot-data-header mb-5"
      title="返回"
      content="B站抽奖数据"
      @back="() => router.back()"
    />
    <div class="flex flex-1">
      <router-view v-slot="{ Component }">
        <keep-alive>
          <component :is="Component" :key="use_router.currentRoute.value.name" />
        </keep-alive>
      </router-view>
    </div>
  </FlexContainer>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import router from '@/router'
const use_router = useRouter()
</script>
