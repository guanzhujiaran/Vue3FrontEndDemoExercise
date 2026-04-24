<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElTimeline, ElTimelineItem, ElCard } from 'element-plus'

interface ChangelogEntry {
  version: string
  date: string
  changes: {
    added?: string[]
    improved?: string[]
    fixed?: string[]
  }
}

const changelogData = ref<ChangelogEntry[]>([])

onMounted(() => {
  changelogData.value = [
    {
      version: '0.0.2',
      date: '2026-04-24',
      changes: {
        added: [
          '添加更新日志页面，支持版本历史查看',
          '集成 Element Plus Timeline 组件展示更新记录',
          '支持新增功能、优化改进、问题修复分类显示'
        ],
        improved: [
          '更新日志页面响应式设计优化',
          '深色/浅色主题适配完善'
        ]
      }
    },
    {
      version: '0.0.1',
      date: '2025-08-21',
      changes: {
        added: [
          '添加网站站点地图(Sitemap)支持',
          '完善山姆会员店数据过滤条件',
          '实现排行榜按抽奖类型、中奖等级、开奖日期的分类显示',
          '添加全局加载遮罩系统，支持路由切换自动显示',
          '添加主题切换功能，支持深色/浅色/自动三种模式'
        ],
        improved: [
          '登录界面背景改为透明，去掉紫色渐变',
          '替换为Element Plus UI组件，提升一致性和性能',
          '移动端适配改进，特别是登录页面',
          '代码结构和组织优化',
          '响应式设计优化，适配多种设备',
          '文档系统完善，包括使用说明和开发指南'
        ],
        fixed: [
          '修复了部分UI组件的兼容性问题',
          '解决了深色模式下的显示问题',
          '修复评论区超长评论显示问题',
          '修复Feedback区组件名称和变量相同的错误'
        ]
      }
    },
    {
      version: '0.0.0',
      date: '2025-08-19',
      changes: {
        added: [
          '全局加载遮罩系统，支持路由切换自动显示',
          '主题切换功能，支持深色/浅色/自动三种模式',
          '响应式设计优化，适配多种设备',
          '文档系统完善，包括使用说明和开发指南'
        ],
        improved: [
          '登录界面背景改为透明，去掉紫色渐变',
          '替换为Element Plus UI组件，提升一致性和性能',
          '移动端适配改进，特别是登录页面',
          '代码结构和组织优化'
        ],
        fixed: [
          '修复了部分UI组件的兼容性问题',
          '解决了深色模式下的显示问题'
        ]
      }
    },
    {
      version: '0.0.0',
      date: '2025-08-10',
      changes: {
        added: [
          '项目基础框架搭建',
          '核心功能实现',
          '基本UI组件开发'
        ]
      }
    }
  ]
})
</script>

<template>
  <div class="p-5 max-w-[800px] mx-auto">
    <div class="text-center mb-8">
      <el-text class="text-[2rem] mb-2.5" tag="h1">更新日志</el-text>
      <el-text class="text-[var(--el-text-color-secondary)]" tag="p">查看项目的更新历史和功能变更</el-text>
    </div>
    
    <div class="bg-[var(--el-bg-color-page)] rounded-lg p-5">
      <el-timeline>
        <el-timeline-item
          v-for="(entry, index) in changelogData"
          :key="index"
          :timestamp="entry.date"
          placement="top"
        >
          <el-card>
            <el-text class="text-lg font-medium text-[var(--el-text-color-primary)] mb-4" tag="h3">版本 {{ entry.version }}</el-text>
            <div v-if="entry.changes.added && entry.changes.added.length > 0" class="my-4">
              <el-text class="mt-4 mb-2.5 text-[var(--el-text-color-primary)] font-medium" tag="h4">新增功能</el-text>
              <ul class="pl-5">
                <li v-for="(item, i) in entry.changes.added" :key="i" class="mb-1.5 leading-relaxed text-[var(--el-text-color-regular)]">{{ item }}</li>
              </ul>
            </div>
            
            <div v-if="entry.changes.improved && entry.changes.improved.length > 0" class="my-4">
              <el-text class="mt-4 mb-2.5 text-[var(--el-text-color-primary)] font-medium" tag="h4">功能优化</el-text>
              <ul class="pl-5">
                <li v-for="(item, i) in entry.changes.improved" :key="i" class="mb-1.5 leading-relaxed text-[var(--el-text-color-regular)]">{{ item }}</li>
              </ul>
            </div>
            
            <div v-if="entry.changes.fixed && entry.changes.fixed.length > 0" class="my-4">
              <el-text class="mt-4 mb-2.5 text-[var(--el-text-color-primary)] font-medium" tag="h4">问题修复</el-text>
              <ul class="pl-5">
                <li v-for="(item, i) in entry.changes.fixed" :key="i" class="mb-1.5 leading-relaxed text-[var(--el-text-color-regular)]">{{ item }}</li>
              </ul>
            </div>
          </el-card>
        </el-timeline-item>
      </el-timeline>
    </div>
  </div>
</template>

