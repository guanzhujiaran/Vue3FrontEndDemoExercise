<template>
  <el-dialog
    v-model="visible"
    class="moment-publish-form"
    :title="dialogTitle"
    width="600px"
    :close-on-click-modal="false"
    destroy-on-close
    @closed="resetForm"
  >
    <div class="moment-publish-form__body space-y-4">
      <!-- 内容输入：el-mention 支持 @用户，服务端解析 #话题# -->
      <div class="moment-publish-form__field">
        <label class="moment-publish-form__label block text-sm font-bold text-text-primary mb-2">内容</label>
        <el-mention
          v-model="content"
          type="textarea"
          class="moment-publish-form__content"
          :options="mentionOptions"
          :loading="mentionLoading"
          prefix="@"
          split=" "
          placeholder="分享你的想法... 输入 @ 提及用户"
          :rows="5"
          :maxlength="2000"
          show-word-limit
          @search="handleMentionSearch"
        >
          <template #label="{ item }">
            <div class="moment-publish-form__mention-option flex items-center gap-2">
              <el-avatar :size="24" :src="item.avatar || BiliImg.face.noface" referrerpolicy="no-referrer">
                <img :src="item.avatar || BiliImg.face.noface" referrerpolicy="no-referrer" alt="avatar" />
              </el-avatar>
              <span class="moment-publish-form__mention-name text-sm text-text-primary">{{ item.value }}</span>
            </div>
          </template>
        </el-mention>
        <p class="moment-publish-form__hint text-xs text-text-placeholder mt-1">
          输入 @ 提及用户（需选择）；话题请在下方从已创建且通过审核的话题中选择（最多 5 个），正文中不可直接添加 #话题#
        </p>
      </div>

      <!-- 图片（可选，最多 18 张；仅允许站外 http(s) 图片链接，不支持本地上传） -->
      <div class="moment-publish-form__field">
        <label class="moment-publish-form__label block text-sm font-bold text-text-primary mb-2">
          图片（可选，最多 18 张）
        </label>
        <div class="moment-publish-form__images space-y-2">
          <div
            v-for="(url, idx) in imageUrls"
            :key="idx"
            class="moment-publish-form__image-row flex items-center gap-2"
          >
            <el-input
              v-model="imageUrls[idx]"
              class="moment-publish-form__image-url flex-1"
              placeholder="https://example.com/image.jpg（站外图片链接）"
              clearable
              @keyup.enter="addImageUrl"
            />
            <el-button
              class="moment-publish-form__image-remove shrink-0"
              size="default"
              type="danger"
              text
              @click="removeImageUrl(idx)"
            >
              删除
            </el-button>
          </div>
        </div>
        <el-button
          class="moment-publish-form__image-add mt-2"
          size="default"
          :disabled="imageUrls.length >= 18"
          @click="addImageUrl"
        >
          添加图片链接
        </el-button>
        <p class="moment-publish-form__hint text-xs text-text-placeholder mt-1">
          最多 18 张，展示时九宫格布局（超出 9 张折叠为「更多」）；仅支持站外图片链接，不提供本地上传
        </p>
      </div>

      <!-- 话题（2.22.0 多选：最多 5 个，仅可选已过审话题；正文不可 #话题# 标记） -->
      <div class="moment-publish-form__field">
        <label class="moment-publish-form__label block text-sm font-bold text-text-primary mb-2">
          话题（可选，最多 5 个）
        </label>
        <el-select
          v-model="topicIds"
          class="moment-publish-form__topic w-full"
          placeholder="搜索并选择话题（最多 5 个）"
          filterable
          remote
          remote-show-suffix
          clearable
          multiple
          collapse-tags
          collapse-tags-tooltip
          :multiple-limit="5"
          :remote-method="searchTopics"
          :loading="topicLoading"
        >
          <el-option
            v-for="t in topicOptions"
            :key="t.topicId"
            :label="t.topicName"
            :value="t.topicId"
          >
            <div class="flex items-center justify-between w-full">
              <span>{{ t.topicName }}</span>
              <el-tag v-if="t.isHot" size="default" type="danger">热门</el-tag>
            </div>
          </el-option>
        </el-select>
      </div>

      <!-- 转发模式：原动态摘要（只读预览） -->
      <div
        v-if="isRepost"
        class="moment-publish-form__src bg-bg-page rounded-md border border-border-lighter p-3"
      >
        <div class="moment-publish-form__src-author flex items-center gap-2 mb-2">
          <el-avatar
            class="moment-publish-form__src-avatar shrink-0"
            :size="24"
            :src="srcAuthorFace || BiliImg.face.noface"
          />
          <span class="moment-publish-form__src-username text-sm font-bold text-text-primary truncate">
            {{ srcAuthorName || '未知用户' }}
          </span>
        </div>
        <el-text class="moment-publish-form__src-summary text-sm text-text-placeholder block whitespace-pre-line break-all">
          {{ srcSummary || '原动态内容不可见' }}
        </el-text>
      </div>

      <!-- attach 资源贴卡（对标 B 站动态下方贴卡：缩略图 + 标题 + 去看看） -->
      <div
        v-if="attachResource"
        class="moment-publish-form__attach flex items-center gap-3 rounded-lg border border-border-light bg-fill-lighter p-3"
      >
        <div class="moment-publish-form__attach-cover shrink-0 w-20 h-20 rounded overflow-hidden bg-bg">
          <img
            v-if="attachResource.cover"
            :src="attachResource.cover"
            class="w-full h-full object-cover"
            referrerpolicy="no-referrer"
          />
        </div>
        <div class="moment-publish-form__attach-body flex-1 min-w-0">
          <div class="moment-publish-form__attach-title text-sm font-bold text-text-primary line-clamp-2">
            {{ attachResource.name || `资源 ${attachResource.bizId}` }}
          </div>
        </div>
        <div class="moment-publish-form__attach-cta shrink-0">
          <el-button size="default" type="primary" plain disabled>去看看</el-button>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="moment-publish-form__footer flex justify-end gap-3">
        <el-button size="default" @click="visible = false">取消</el-button>
        <el-button
          size="default"
          type="primary"
          :loading="submitting"
          :disabled="isRepost ? (requireText && !content.trim()) : !content.trim()"
          @click="handleSubmit"
        >
          {{ submitLabel }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  createMoment,
  fetchTopicHotSearch,
  repostMoment,
  type MomentCreateReq,
  type MomentTopicInfo,
} from '@/api/notify/moment-api'
import biliMessage, { ElMessageBox } from '@/utils/message'
import commentApi from '@/api/lottery_comment'
import { BiliImg } from '@/assets/img/BiliImg.ts'
import {
  buildMomentContentNodes,
  type MomentAttachResource,
} from '@/utils/momentContent'
import type { CommentUserBrief } from '@/api/notify/hey-api'

const visible = defineModel<boolean>('visible', { default: false })

const props = withDefaults(
  defineProps<{
    isEdit?: boolean
    /** 转发模式：true 时使用统一编辑器转发动态（内部调 repostMoment） */
    isRepost?: boolean
    /** 转发源动态 ID（字符串，避免 19 位 ID 精度丢失） */
    srcDynId?: string
    /** 转发源作者昵称 / 头像 / 正文摘要 */
    srcAuthorName?: string
    srcAuthorFace?: string
    srcSummary?: string
    /** 转发模式是否强制填写转发语（默认 false，允许空转发） */
    requireText?: boolean
    /** attach 资源（可选）：发布模式传入时底部渲染贴卡，提交时在正文追加 RESOURCE 节点（如抽奖卡片转发） */
    attachResource?: MomentAttachResource
    initialContent?: string
    topicList?: MomentTopicInfo[]
  }>(),
  {
    isEdit: false,
    isRepost: false,
    srcDynId: '',
    srcAuthorName: '',
    srcAuthorFace: '',
    srcSummary: '',
    requireText: false,
    attachResource: undefined,
    initialContent: '',
    topicList: () => [],
  }
)

const emit = defineEmits<{
  submit: [payload: {
    content: string
    /** 2.22.0 多话题（[{topicId}]，最多 5 个） */
    topics?: { topicId: number }[]
    images?: string[]
    atNameToMid?: Record<string, number>
    attachResource?: MomentAttachResource
  }]
  success: [dynId: number]
}>()

const content = ref('')
/** 2.22.0：多选话题 id 数组（最多 5 个） */
const topicIds = ref<number[]>([])
const submitting = ref(false)

const dialogTitle = computed(() => {
  if (props.isRepost) return '转发动态'
  return props.isEdit ? '编辑动态' : '发布动态'
})

const submitLabel = computed(() => {
  if (props.isRepost) return '转发'
  return props.isEdit ? '保存' : '发布'
})

/** @ 提及候选：远程搜索用户 */
const mentionOptions = ref<Array<{ value: string; avatar?: string; mid?: number }>>([])
const mentionLoading = ref(false)
/** 已选中的 @昵称 → mid 映射（提交时供服务端归一化） */
const atNameToMid = ref<Record<string, number>>({})

async function handleMentionSearch(pattern: string) {
  if (!pattern.trim()) {
    mentionOptions.value = []
    return
  }
  mentionLoading.value = true
  try {
    const res = await commentApi.searchAt(pattern.trim(), 20)
    if (res && res.code === 0 && res.data) {
      mentionOptions.value = (res.data as CommentUserBrief[])
        .filter((u) => u.mid != null)
        .map((u) => ({
          value: u.uname || `用户${u.mid}`,
          avatar: u.avatar || undefined,
          mid: u.mid
        }))
    }
  } finally {
    mentionLoading.value = false
  }
}

/** 监听内容里的 @昵称 是否存在于选项，若用户手动删除则清理映射 */
watch(content, (val) => {
  const keys = Object.keys(atNameToMid.value)
  for (const name of keys) {
    if (!val.includes(`@${name}`)) {
      delete atNameToMid.value[name]
    }
  }
})

const topicOptions = ref<MomentTopicInfo[]>([])
const topicLoading = ref(false)

/** 图片站外 URL 列表（仅 http/https，不支持本地上传） */
const imageUrls = ref<string[]>([])

/** 添加一个图片链接输入框（最多 18 个） */
function addImageUrl() {
  if (imageUrls.value.length >= 18) return
  imageUrls.value.push('')
}

function removeImageUrl(idx: number) {
  imageUrls.value.splice(idx, 1)
}

/** 收集有效图片 URL（站外 http(s) 链接，去空） */
function collectImageUrls(): string[] {
  return imageUrls.value
    .map((u) => u.trim())
    .filter((u) => u.startsWith('http://') || u.startsWith('https://'))
    .slice(0, 18)
}

watch(
  () => props.initialContent,
  (v) => {
    if (v) content.value = v
  },
  { immediate: true }
)

watch(
  () => props.topicList,
  (v) => {
    if (v?.length) topicOptions.value = v
  },
  { immediate: true }
)

async function searchTopics(query: string) {
  topicLoading.value = true
  try {
    // 复用热搜接口模糊匹配
    const res = await fetchTopicHotSearch({ page: 1, page_size: 10 })
    topicOptions.value = (res.items || []).filter(
      (t) => !query || t.topicName.includes(query)
    )
  } finally {
    topicLoading.value = false
  }
}

/** 从正文提取所有 @昵称，映射到 mid（优先用 el-mention 选中的映射） */
function buildAtNameToMid(): Record<string, number> {
  const map: Record<string, number> = { ...atNameToMid.value }
  // 正则匹配正文里的 @昵称（不含空格/换行）
  const re = /@([^\s@#]+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(content.value || '')) !== null) {
    const name = m[1]
    if (!name || map[name]) continue
    const opt = mentionOptions.value.find((o) => o.value === name)
    if (opt?.mid != null) map[name] = opt.mid
  }
  return map
}

async function handleSubmit() {
  // 发布/编辑：正文必填（attach 资源模式正文可为空）；转发：正文可选（requireText=true 时必填）
  if (!props.isRepost && !props.attachResource && !content.value.trim()) return
  if (props.isRepost && props.requireText && !content.value.trim()) return
  submitting.value = true
  try {
    const images = collectImageUrls()
    const payload = {
      content: content.value.trim(),
      topics: topicIds.value.length ? topicIds.value.map((t) => ({ topicId: t })) : undefined,
      images,
      atNameToMid: buildAtNameToMid(),
      attachResource: props.attachResource,
    }
    // 转发模式：复用统一编辑器 + 共享节点构建，内部调 repostMoment
    if (props.isRepost) {
      if (!props.srcDynId) {
        biliMessage.warning('缺少转发源动态')
        return
      }
      const nodes = buildMomentContentNodes(payload)
      const res = await repostMoment({
        srcDynId: props.srcDynId,
        content: nodes.length ? nodes : undefined,
      })
      if (res) {
        showPublishSuccessBox('转发成功，等待审核')
        emit('success', res.dynIdStr)
        visible.value = false
      }
      return
    }
    // attach 资源模式：发布新动态（scene=WORD），attach 卡经 MomentCreateReq.attach 独立提交
    // （2.21.0：只存 bizType+bizId，不再写入正文 RESOURCE 节点），内部提交并 emit success
    if (props.attachResource) {
      const nodes = buildMomentContentNodes(payload)
      const body: MomentCreateReq = {
        scene: 'WORD',
        content: nodes.length ? nodes : [{ type: 'WORDS', text: payload.content }],
        attach: props.attachResource
          ? { bizType: props.attachResource.bizType, bizId: props.attachResource.bizId }
          : undefined,
        // 2.22.0：attach 资源模式下同样支持多话题
        topics: payload.topics?.length ? payload.topics : undefined,
      }
      const res = await createMoment(body)
      if (res) {
        showPublishSuccessBox('动态已发布，审核通过后公开展示')
        emit('success', res.dynIdStr)
        visible.value = false
      }
      return
    }
    emit('submit', payload)
    visible.value = false
  } finally {
    submitting.value = false
  }
}

/** 发布/转发成功提示：messagebox 展示，5s 后自动关闭；用户手动关闭时取消定时器，避免泄漏 */
function showPublishSuccessBox(message: string) {
  const box = ElMessageBox.alert(message, '发布成功', {
    confirmButtonText: '确定',
    closeOnClickModal: false,
    showClose: false,
  })
  const timer = setTimeout(() => {
    ElMessageBox.close()
  }, 5000)
  box
    .then(() => clearTimeout(timer))
    .catch(() => clearTimeout(timer))
}

function resetForm() {
  content.value = ''
  topicIds.value = []
  imageUrls.value = []
  atNameToMid.value = {}
}
</script>
