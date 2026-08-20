<template>
  <div class="moment-layout">
    <BiliSideNavLayout :nav-groups="navGroups">
      <template #header-extra>
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
      </template>
      <template #default>
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
      </template>
    </BiliSideNavLayout>

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
import { useRoute } from 'vue-router'
import {
  Grid,
  Collection,
  Edit,
  Checked,
} from '@element-plus/icons-vue'
import MomentPublishForm from '@/components/moment/MomentPublishForm.vue'
import BiliSideNavLayout from '@/components/CommonCompo/Bili-Container-Compo/BiliSideNavLayout.vue'
import { createMoment, type MomentCreateReq } from '@/api/notify/moment-api'
import { buildMomentContentNodes, type MomentAttachResource } from '@/utils/momentContent'
import { useRpaAdminStore } from '@/stores/rpa_admin'

// 必须有 name，App.vue 的外层 keep-alive 才能缓存本布局；
// 否则从详情页返回时布局被销毁重建，内部 Feed 子页会重新加载（丢失进度）
defineOptions({ name: 'MomentLayout' })

const route = useRoute()
const adminStore = useRpaAdminStore()

const publishVisible = ref(false)
const refreshKey = ref(0)

const isAdmin = computed(() => adminStore.status.is_admin || adminStore.status.is_root)

onMounted(async () => {
  if (!adminStore.loaded) {
    await adminStore.fetchStatus()
  }
})

// 通用布局菜单：动态广场 / 话题广场 + 管理员「审核队列」入口
const navGroups = computed(() => [
  {
    items: [
      { name: 'MOMENT_ALL_FEED', title: '动态广场', shortTitle: '动态', icon: Grid },
      { name: 'MOMENT_TOPIC_SQUARE', title: '话题广场', shortTitle: '话题', icon: Collection },
    ]
  },
  ...(isAdmin.value
    ? [
        {
          title: '管理',
          items: [{ name: 'ADMIN_MOMENT_AUDIT', title: '审核队列', shortTitle: '审核', icon: Checked }]
        }
      ]
    : [])
])

const showPublishBtn = computed(() =>
  ['MOMENT_ALL_FEED'].includes(String(route.name ?? ''))
)

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
  const res = await createMoment(body, {
    showSuccessToast: true,
    successMessage: '发布成功，等待审核',
  })
  if (res) refreshKey.value++
}
</script>
