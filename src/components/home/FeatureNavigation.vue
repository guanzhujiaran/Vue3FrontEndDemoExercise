<template>
  <section class="features-section">
    <div class="section-header">
      <h2 class="section-title">功能导航</h2>
      <div class="tab-navigation">
        <el-radio-group v-model="activeTab" size="large">
          <el-radio-button label="all" value="all">全部</el-radio-button>
          <el-radio-button label="lottery" value="lottery">抽奖数据</el-radio-button>
          <el-radio-button label="user" value="user">用户中心</el-radio-button>
          <el-radio-button label="shopping" value="shopping">购物助手</el-radio-button>
        </el-radio-group>
      </div>
    </div>

    <!-- 模块列表 -->
    <div class="modules-container">
      <ModuleCard
        v-for="(module, moduleIndex) in filteredModules"
        :key="moduleIndex"
        :module="module"
        @card-click="handleCardClick"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ElRadioGroup, ElRadioButton } from 'element-plus'
import ModuleCard from './ModuleCard.vue'
import type { CustomRouteMeta } from '@/router'

interface Props {
  activeTab: string
  modules: (CustomRouteMeta & {
    path?: string
    children?: (CustomRouteMeta & { path?: string; order?: number })[]
    order?: number
  })[]
  isLoggedIn: boolean
}

interface Emits {
  (e: 'update:activeTab', value: string): void
  (e: 'cardClick', path: string | undefined, requiresLogin: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const activeTab = computed({
  get: () => props.activeTab,
  set: (value) => emit('update:activeTab', value)
})

const filteredModules = computed(() => {
  if (props.activeTab === 'all') {
    return props.modules
  }
  return props.modules.filter((module) => module.id === props.activeTab)
})

const handleCardClick = (path: string | undefined, requiresLogin: boolean | undefined = false) => {
  emit('cardClick', path, requiresLogin || false)
}
</script>

<style scoped>
.features-section {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
  width: -webkit-fill-available;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  flex-wrap: wrap;
  gap: 20px;
}

.section-title {
  font-size: 28px;
  font-weight: 600;
  margin: 0;
}

.modules-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 24px;
  margin-bottom: 40px;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .section-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .modules-container {
    grid-template-columns: 1fr;
  }
}
</style>
