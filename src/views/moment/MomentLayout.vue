<template>
  <div class="moment-layout flex-1 h-full flex flex-col overflow-hidden bg-msg-main text-msg-text-active">
    <div class="moment-layout__body flex-1 min-h-0 flex">
      <!-- 侧边导航 -->
      <el-menu
        :default-active="activeIndex"
        class="moment-layout__nav shrink-0 overflow-y-auto border-r-0! bg-msg-sidebar! py-4"
        style="--el-menu-text-color: var(--color-msg-text); --el-menu-hover-bg-color: var(--color-msg-sidebar-hover); --el-menu-active-color: var(--color-msg-link);"
        @select="handleSelect"
      >
        <el-menu-item
          v-for="item in navItems"
          :key="item.name"
          :index="item.name"
          class="moment-layout__nav-item h-7 mb-3 text-lg last:mb-0"
        >
          <el-icon><component :is="item.icon" /></el-icon>
          <template #title>
            <span class="moment-layout__nav-text flex-1 truncate text-lg">{{ item.title }}</span>
          </template>
        </el-menu-item>

        <!-- 管理员入口 -->
        <el-menu-item
          v-if="isAdmin"
          index="ADMIN_MOMENT_AUDIT"
          class="moment-layout__nav-item moment-layout__nav-item--admin h-7 mb-3 text-lg"
        >
          <el-icon><Checked /></el-icon>
          <template #title>
            <span class="moment-layout__nav-text flex-1 truncate text-lg">审核队列</span>
          </template>
        </el-menu-item>
      </el-menu>

      <!-- 主内容区 -->
      <main class="moment-layout__main flex-1 min-h-0 flex flex-col overflow-hidden">
        <header class="moment-layout__header flex items-center justify-between border-b border-msg-divider px-6 py-4 shrink-0">
          <h1 class="moment-layout__title text-base font-bold">{{ pageTitle }}</h1>
          <el-button
            v-if="showPublishBtn"
            class="moment-layout__publish-btn"
            type="primary"
            size="default"
            :icon="Edit"
            @click="openPublish"
          >
            发布动态
          </el-button>
        </header>
        <div class="moment-layout__content flex-1 min-h-0 overflow-hidden">
          <div class="moment-layout__content-inner px-6 pb-0 pt-4 h-full">
            <!-- keep-alive 缓存 Feed 子页面（动态广场/话题流），跳详情返回后保留加载进度 -->
            <router-view v-slot="{ Component }">
              <keep-alive :include="['AllFeedView', 'TopicFeedView']">
                <component
                  :is="Component"
                  @open-publish="openPublish"
                  @refresh="refreshKey++"
                  :key="refreshKey"
                />
              </keep-alive>
            </router-view>
          </div>
        </div>
      </main>
    </div>

    <!-- 发布动态弹窗 -->
    <MomentPublishForm
      ref="publishFormRef"
      v-model:visible="publishVisible"
      @submit="handlePublish"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Grid,
  Collection,
  Edit,
  Checked,
} from '@element-plus/icons-vue'
import MomentPublishForm from '@/components/moment/MomentPublishForm.vue'
import { createMoment, type MomentCreateReq } from '@/api/notify/moment-api'
import { buildMomentContentNodes, type MomentAttachResource } from '@/utils/momentContent'
import { useRpaAdminStore } from '@/stores/rpa_admin'
import biliMessage from '@/utils/message'

// 必须有 name，App.vue 的外层 keep-alive 才能缓存本布局；
// 否则从详情页返回时布局被销毁重建，内部 Feed 子页会重新加载（丢失进度）
defineOptions({ name: 'MomentLayout' })

const route = useRoute()
const router = useRouter()
const adminStore = useRpaAdminStore()

const publishVisible = ref(false)
const refreshKey = ref(0)

const isAdmin = computed(() => adminStore.status.is_admin || adminStore.status.is_root)

onMounted(async () => {
  if (!adminStore.loaded) {
    await adminStore.fetchStatus()
  }
})

const navItems = [
  { name: 'MOMENT_ALL_FEED', title: '动态广场', icon: Grid },
  { name: 'MOMENT_TOPIC_SQUARE', title: '话题广场', icon: Collection },
]

const activeIndex = computed(() => (route.name ? String(route.name) : ''))

const showPublishBtn = computed(() =>
  ['MOMENT_ALL_FEED'].includes(activeIndex.value)
)

const pageTitle = computed(() => String(route.meta?.title ?? '动态广场'))

function handleSelect(index: string) {
  router.push({ name: index })
}

function openPublish() {
  publishVisible.value = true
}

async function handlePublish(payload: {
  content: string
  topics?: { topicId: number }[]
  images?: string[]
  atNameToMid?: Record<string, number>
  attachResource?: MomentAttachResource
}) {
  // 复用统一编辑器节点构建工具：纯文本 → WORDS/AT + 图片 LINK 节点（2.22.0 正文不再解析 #话题#）
  const content = buildMomentContentNodes(payload)
  const body: MomentCreateReq = {
    scene: 'WORD',
    content: content.length ? content : [{ type: 'WORDS', text: payload.content }],
    // 2.22.0：多话题经 MomentCreateReq.topics 单独提交
    topics: payload.topics?.length ? payload.topics : undefined,
    // 位置不再由前端传入：服务端按请求 IP 自动解析属地（GeoIP）
  }
  const res = await createMoment(body)
  if (res) {
    biliMessage.success('发布成功，等待审核')
    refreshKey.value++
  }
}
</script>
