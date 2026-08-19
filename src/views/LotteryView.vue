<template>
  <FlexContainer>
    <el-page-header
      class="lot-data-header mb-5"
      :title="t('common.back')"
      :content="t('lottery.biliLotteryData')"
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
import { useI18n } from 'vue-i18n'
import router from '@/router'
const { t } = useI18n()
const use_router = useRouter()
</script>
