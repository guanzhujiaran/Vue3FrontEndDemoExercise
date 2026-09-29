<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElTimeline, ElTimelineItem, ElCard } from 'element-plus'

const { t } = useI18n()

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

// 数据是本地常量：必须直接在 setup 阶段赋值（原来放在 onMounted，
// SSR / 预渲染时读到的是空数组，更新日志页就成了空壳）
  changelogData.value = [
    {
      version: '0.0.3',
      date: '2026-09-22',
      changes: {
        added: [
          '迁移到 Nuxt 4 + nuxt generate（SSG）：收录页在构建期渲染出带真实数据的静态 HTML，不再依赖无头浏览器预渲染',
          '新增 5 语言国际化（简体中文 / English / 繁體中文 / 日本語 / 한국어），表头可切换并记忆选择，Element Plus 组件文案同步联动',
          'SEO 能力升级：按路由输出 title / description / canonical / OG / Twitter / robots，并注入 JSON-LD 结构化数据（WebSite / BreadcrumbList / ItemList / SocialMediaPosting）',
          '新增 sitemap.xml 与 robots.txt 构建产物，收录清单与站内配置同源',
          '抽奖列表页（官方 / 充电 / 预约 / 话题）支持服务端取数，首屏 HTML 即包含列表数据与实时收录条数',
          '更新日志页改为服务端取数，静态 HTML 即包含版本记录',
          '新增页脚不蒜子访问统计（全站 PV / UV）展示'
        ],
        improved: [
          '部署产物由 589MB / 4665 个文件瘦身到约 6.6MB / 260 个文件；action-icons 素材移出产物目录单独同步',
          '首屏数据改在 setup 阶段获取并随 HTML 下发，客户端 hydration 直接复用，不再重复请求接口',
          '页面时间展示统一使用固定时区与 locale，避免构建机与用户浏览器渲染出不同文本',
          'API 层统一为 hey-api 自动生成的 SDK，按业务域拆分调用入口',
          '站外跳转统一 no-referrer 策略，避免通过 Referer 泄露当前页地址',
          '消息中心、管理端审核队列与动态模块持续重构，弹窗滚动与响应式布局优化'
        ],
        fixed: [
          '修复首页、消息中心、动态广场、话题广场、RPA 浏览器、第三方抽奖等页面因登录态来自 localStorage 导致的两端首帧结构不一致（hydration 告警）',
          '修复英文浏览器下首页文案与静态 HTML 不一致的水合告警（挂载后再按浏览器语言切换）',
          '修复时间文本在服务端与客户端渲染不一致的水合告警',
          '修复列表 / 排行榜在客户端水合后渲染为空的问题',
          '修复抽奖列表接口请求失败时清空已有列表的问题'
        ]
      }
    },
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
</script>

<template>
  <div class="p-5 mx-auto">
    <div class="text-center mb-8">
      <el-text class="text-[2rem] mb-2.5" tag="h1">{{ t('changelog.title') }}</el-text>
      <el-text class="text-text-secondary" tag="p">{{ t('changelog.subtitle') }}</el-text>
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
              <el-text class="mt-4 mb-2.5 text-[var(--el-text-color-primary)] font-medium" tag="h4">{{ t('changelog.added') }}</el-text>
              <ul class="pl-5">
                <li v-for="(item, i) in entry.changes.added" :key="i" class="mb-1.5 leading-relaxed text-text-regular">{{ item }}</li>
              </ul>
            </div>
            
            <div v-if="entry.changes.improved && entry.changes.improved.length > 0" class="my-4">
              <el-text class="mt-4 mb-2.5 text-[var(--el-text-color-primary)] font-medium" tag="h4">{{ t('changelog.improved') }}</el-text>
              <ul class="pl-5">
                <li v-for="(item, i) in entry.changes.improved" :key="i" class="mb-1.5 leading-relaxed text-text-regular">{{ item }}</li>
              </ul>
            </div>
            
            <div v-if="entry.changes.fixed && entry.changes.fixed.length > 0" class="my-4">
              <el-text class="mt-4 mb-2.5 text-[var(--el-text-color-primary)] font-medium" tag="h4">{{ t('changelog.fixed') }}</el-text>
              <ul class="pl-5">
                <li v-for="(item, i) in entry.changes.fixed" :key="i" class="mb-1.5 leading-relaxed text-text-regular">{{ item }}</li>
              </ul>
            </div>
          </el-card>
        </el-timeline-item>
      </el-timeline>
    </div>
  </div>
</template>

