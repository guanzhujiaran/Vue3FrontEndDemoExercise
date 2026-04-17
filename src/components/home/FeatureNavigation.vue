<template>
  <section class="mx-auto w-full max-w-[93.75rem] px-4 py-8 md:py-16 md:px-8">
    <div class="mb-16 flex flex-wrap items-center justify-between gap-8 max-md:flex-col max-md:items-start">
      <h2 class="m-0 text-lg font-semibold md:text-xl">功能导航</h2>
      <div class="tab-navigation">
        <el-radio-group v-model="activeTab" size="large">
        <el-radio-button label="all" value="all">全部</el-radio-button>
        <el-radio-button label="lottery" value="lottery">抽奖数据</el-radio-button>
        <el-radio-button label="user" value="user">浏览器管理</el-radio-button>
        <el-radio-button label="shopping" value="shopping">山姆会员商店</el-radio-button>
        </el-radio-group>
      </div>
    </div>

    <!-- 模块列表 -->
    <div class="mb-16 grid grid-cols-[repeat(auto-fill,minmax(17.5rem,1fr))] gap-12 max-md:grid-cols-1">
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
import type { CustomRouteMeta } from '@/models/router'

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