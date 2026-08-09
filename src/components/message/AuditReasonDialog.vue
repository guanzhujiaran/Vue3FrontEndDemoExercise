<template>
  <el-dialog
    v-model="visible"
    class="audit-reason-dialog max-w-[920px]"
    :title="`${actionLabel}（共 ${items.length} 条）`"
    width="90%"
    top="5vh"
    append-to-body
    :close-on-click-modal="false"
    @closed="onClosed"
  >
    <div class="audit-reason-dialog__body flex flex-col gap-3">
      <div class="text-sm text-msg-muted">
        以下为本次{{ targetText }}审核对象，请逐条填写{{ actionLabel }}原因（该原因会通知给对应作者）
      </div>

      <div class="audit-reason-dialog__table h-[60vh] min-h-75">
        <el-auto-resizer>
          <template #default="{ height, width }">
            <el-table-v2
              :columns="columns"
              :data="items"
              :width="width"
              :height="height"
              :row-height="84"
            />
          </template>
        </el-auto-resizer>
      </div>
    </div>

    <template #footer>
      <el-button size="default" @click="visible = false">取消</el-button>
      <el-button
        type="danger"
        size="default"
        :disabled="!involvedMids.length"
        @click="emit('ban', involvedMids)"
      >
        封禁涉及用户（{{ involvedMids.length }}）
      </el-button>
      <el-button
        type="primary"
        size="default"
        :disabled="!allFilled"
        @click="confirm"
      >
        确定{{ actionLabel }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, h, ref } from 'vue'
import { ElAutocomplete, ElButton, ElPopover, ElTag } from 'element-plus'
import UserCard from '@/components/message/UserCard.vue'
import { useAuditReasons } from '@/composables/useAuditReasons'
import type { CommentUserBrief } from '@/api/notify/hey-api'

export interface AuditReasonItem {
  /** 唯一标识：评论 rpid / 私信 msgkey */
  id: string
  /** 内容预览文本 */
  preview?: string
  /** 发布者 mid */
  mid?: number | null
  /** 发布者信息（用户详情卡片数据） */
  brief?: CommentUserBrief | null
}

const props = defineProps<{
  modelValue: boolean
  /** 操作标签：驳回 / 下架 */
  actionLabel: string
  /** 审核对象文案：评论 / 私信 */
  targetText?: string
  /** 待审核条目列表（每条单独选择原因） */
  items: AuditReasonItem[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [reasons: Record<string, string>]
  ban: [mids: number[]]
}>()

const { reasons: defaultReasons, removeReason, ensureSaved } = useAuditReasons()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

// 每条对应的原因：{ [id]: string }
const reasons = ref<Record<string, string>>({})

const involvedMids = computed(() => {
  const set = new Set<number>()
  for (const it of props.items) {
    if (it.mid) set.add(it.mid)
  }
  return [...set]
})

const allFilled = computed(
  () => props.items.length > 0 && props.items.every((it) => (reasons.value[it.id] ?? '').trim())
)

const fetchSuggestions = (queryString: string, cb: (items: { value: string }[]) => void) => {
  const q = queryString.trim().toLowerCase()
  const list = defaultReasons.value
    .filter((r) => (q ? r.toLowerCase().includes(q) : true))
    .map((r) => ({ value: r }))
  cb(list)
}

function renderReasonCell(rowData: AuditReasonItem) {
  return h(
    ElAutocomplete,
    {
      modelValue: reasons.value[rowData.id] ?? '',
      'onUpdate:modelValue': (v: string) => {
        reasons.value = { ...reasons.value, [rowData.id]: v }
      },
      placeholder: '选择或输入原因',
      triggerOnFocus: true,
      clearable: true,
      fetchSuggestions,
      class: 'w-full'
    },
    {
      default: ({ item }: { item: { value: string } }) =>
        h('div', { class: 'flex items-center justify-between gap-2' }, [
          h('span', { class: 'truncate' }, item.value),
          h(
            ElButton,
            {
              type: 'danger',
              link: true,
              size: 'small',
              onClick: (e: MouseEvent) => {
                e.stopPropagation()
                removeReason(item.value)
              }
            },
            () => '删除'
          )
        ])
    }
  )
}

function renderUserCell(rowData: AuditReasonItem) {
  const brief = rowData.brief
  const uname = brief?.uname || rowData.mid || '-'
  return h(
    ElPopover,
    { placement: 'right', width: 320, trigger: 'hover', popperClass: 'user-brief-popover' },
    {
      reference: () =>
        h(
          'span',
          { class: 'cursor-default truncate text-sm text-msg-text-active' },
          uname as string
        ),
      default: () => h(UserCard, { card: brief ?? null, showActions: false })
    }
  )
}

const columns = computed(() => [
  {
    key: 'preview',
    title: '内容',
    width: 420,
    cellRenderer: ({ rowData }: { rowData: AuditReasonItem }) =>
      h(
        'div',
        { class: 'flex flex-col gap-1 px-2 py-2' },
        [
          h('span', { class: 'text-xs text-msg-muted' }, rowData.id),
          h('span', { class: 'line-clamp-2 text-sm text-msg-text' }, rowData.preview || '[图片/系统消息]')
        ]
      )
  },
  {
    key: 'user',
    title: '用户',
    width: 160,
    cellRenderer: ({ rowData }: { rowData: AuditReasonItem }) => renderUserCell(rowData)
  },
  {
    key: 'reason',
    title: '审核原因',
    width: 240,
    cellRenderer: ({ rowData }: { rowData: AuditReasonItem }) => renderReasonCell(rowData)
  }
])

function onClosed() {
  reasons.value = {}
}

function confirm() {
  const result: Record<string, string> = {}
  for (const it of props.items) {
    const v = (reasons.value[it.id] ?? '').trim()
    if (!v) return
    result[it.id] = v
  }
  // 逐条保存为默认原因（去重）
  new Set(Object.values(result)).forEach((v) => ensureSaved(v))
  emit('confirm', result)
  visible.value = false
}
</script>
