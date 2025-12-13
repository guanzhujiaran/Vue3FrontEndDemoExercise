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
  // 模拟从 CHANGELOG.md 解析的数据
  changelogData.value = [
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
  <div class="changelog-container">
    <div class="header">
      <h1>更新日志</h1>
      <p>查看项目的更新历史和功能变更</p>
    </div>
    
    <div class="content">
      <el-timeline>
        <el-timeline-item
          v-for="(entry, index) in changelogData"
          :key="index"
          :timestamp="entry.date"
          placement="top"
        >
          <el-card>
            <h3>版本 {{ entry.version }}</h3>
            <div v-if="entry.changes.added && entry.changes.added.length > 0" class="change-section">
              <h4>新增功能</h4>
              <ul>
                <li v-for="(item, i) in entry.changes.added" :key="i">{{ item }}</li>
              </ul>
            </div>
            
            <div v-if="entry.changes.improved && entry.changes.improved.length > 0" class="change-section">
              <h4>功能优化</h4>
              <ul>
                <li v-for="(item, i) in entry.changes.improved" :key="i">{{ item }}</li>
              </ul>
            </div>
            
            <div v-if="entry.changes.fixed && entry.changes.fixed.length > 0" class="change-section">
              <h4>问题修复</h4>
              <ul>
                <li v-for="(item, i) in entry.changes.fixed" :key="i">{{ item }}</li>
              </ul>
            </div>
          </el-card>
        </el-timeline-item>
      </el-timeline>
    </div>
  </div>
</template>

<style scoped>
.changelog-container {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.header {
  text-align: center;
  margin-bottom: 30px;
}

.header h1 {
  font-size: 2rem;
  margin-bottom: 10px;
}

.content {
  background-color: var(--el-bg-color-page);
  border-radius: 8px;
  padding: 20px;
}

.change-section {
  margin: 15px 0;
}

.change-section h4 {
  margin-top: 15px;
  margin-bottom: 10px;
  color: var(--el-text-color-primary);
}

.change-section ul {
  padding-left: 20px;
}

.change-section li {
  margin-bottom: 5px;
  line-height: 1.5;
}
</style>