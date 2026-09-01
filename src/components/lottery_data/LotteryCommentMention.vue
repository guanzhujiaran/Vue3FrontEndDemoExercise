<script setup lang="ts">
import { ref, watch } from 'vue'
import commentApi from '@/api/lottery_comment'
import { BiliImg } from '@/assets/img/BiliImg.ts'
import type { CommentUserBrief } from '@/api/community/hey-api'

export interface MentionOption {
  value: string
  avatar?: string
  mid?: number
}

const props = withDefaults(
  defineProps<{
    modelValue: string
    placeholder?: string
    rows?: number
    /** 本地候选用户（如评论区已渲染用户），@ 后空搜索时展示；不传则仅远程搜索 */
    localOptions?: MentionOption[]
  }>(),
  {
    placeholder: '发一条友善的评论',
    rows: 2,
    localOptions: () => []
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const options = ref<MentionOption[]>([])
const loading = ref(false)
const atNameToMid = ref<Record<string, number>>({})

/** 用本地候选初始化，并在候选变化时同步（不覆盖用户已触发的远程搜索结果，除非回到空搜索） */
function syncLocal() {
  options.value = [...(props.localOptions || [])]
}
syncLocal()

watch(
  () => props.localOptions,
  () => syncLocal(),
  { deep: true }
)

async function handleSearch(pattern: string) {
  if (!pattern.trim()) {
    syncLocal()
    return
  }
  loading.value = true
  try {
    const res = await commentApi.searchAt(pattern.trim(), 20)
    if (res && res.code === 0 && res.data) {
      options.value = (res.data as CommentUserBrief[])
        .filter((u) => u.mid != null)
        .map((u) => ({
          value: u.uname || `用户${u.mid}`,
          avatar: u.avatar || undefined,
          mid: u.mid
        }))
    }
  } finally {
    loading.value = false
  }
}

function onSelect(opt: { value?: string; mid?: number }) {
  if (!opt?.value || opt.mid == null) return
  atNameToMid.value[opt.value] = opt.mid
}

/** 提交前从正文提取所有 @昵称，补全未记录的映射（尽量匹配已搜索/已渲染的用户） */
function buildAtNameToMid(message: string): Record<string, number> {
  const map: Record<string, number> = { ...atNameToMid.value }
  const re = /@([^\s@#]+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(message || '')) !== null) {
    const name = m[1]
    if (!name || map[name]) continue
    const opt = options.value.find((o) => o.value === name)
    if (opt?.mid != null) map[name] = opt.mid
  }
  return map
}

function reset() {
  emit('update:modelValue', '')
  atNameToMid.value = {}
}

defineExpose({ buildAtNameToMid, reset })
</script>

<template>
  <el-mention
    :model-value="modelValue"
    type="textarea"
    class="w-full"
    :options="options"
    :loading="loading"
    prefix="@"
    split=" "
    :placeholder="placeholder"
    :rows="rows"
    resize="vertical"
    @update:model-value="(v) => emit('update:modelValue', v)"
    @search="handleSearch"
    @select="onSelect"
  >
    <template #label="{ item }">
      <div class="flex items-center gap-2">
        <el-avatar :size="24" :src="item.avatar || BiliImg.face.noface" referrerpolicy="no-referrer">
          <img :src="item.avatar || BiliImg.face.noface" referrerpolicy="no-referrer" alt="avatar" />
        </el-avatar>
        <span class="text-sm text-text-primary">{{ item.value }}</span>
      </div>
    </template>
  </el-mention>
</template>
