<template>
  <!-- 关注分组设置弹窗（对标 B 站「设置分组」）：勾选分组 + 内联新建分组。
       分组列表每次打开重拉（可能在别的入口新建/删除过），打开时回填该用户当前分组。 -->
  <el-dialog
    class="space-follow-tag-picker"
    :model-value="visible"
    :title="`设置分组：${targetName}`"
    width="420px"
    @update:model-value="close"
  >
    <div v-loading="loading" class="space-follow-tag-picker__body flex flex-col gap-3">
      <!-- 新建分组：虚线按钮在列表**上方**（对齐 B 站），点击后原位变输入框；成功后自动勾选 -->
      <div v-if="showCreate" class="space-follow-tag-picker__create flex items-center gap-2">
        <el-input
          v-model="newTagName"
          class="space-follow-tag-picker__create-input flex-1"
          size="default"
          maxlength="20"
          placeholder="新建分组（最多 20 字）"
          @keyup.enter="handleCreateTag"
        />
        <el-button
          class="space-follow-tag-picker__create-btn"
          size="default"
          :loading="creating"
          @click="handleCreateTag"
        >
          新建
        </el-button>
      </div>
      <el-button
        v-else
        class="space-follow-tag-picker__create-entry w-full"
        size="default"
        :icon="Plus"
        @click="showCreate = true"
      >
        新建分组
      </el-button>

      <el-checkbox-group v-model="checked" class="space-follow-tag-picker__group flex flex-col gap-2">
        <el-checkbox
          v-for="tag in selectableTags"
          :key="tag.tagid"
          class="space-follow-tag-picker__item"
          :value="tag.tagid"
          :label="`${tag.name}（${tag.count}）`"
        />
      </el-checkbox-group>

      <el-text class="space-follow-tag-picker__hint" size="default" type="info">
        不勾选任何分组即回到「默认分组」；分组只对自己可见。
      </el-text>
    </div>

    <template #footer>
      <el-button size="default" @click="close(false)">取消</el-button>
      <el-button
        class="space-follow-tag-picker__save"
        type="primary"
        size="default"
        :loading="saving"
        @click="handleSave"
      >
        保存
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  fetchFollowTags,
  fetchAssignedFollowTags,
  createFollowTag,
  assignFollowTags,
} from '@/api/notify/moment-api'
import { Plus } from '@element-plus/icons-vue'
import type { FollowTagResp } from '@/api/community/hey-api'
import biliMessage from '@/utils/message'

/**
 * 某关注对象的分组设置弹窗（自己视角的「关注」列表用）。
 *
 * - 可勾选分组 = 特别关注（`-10`）+ 自建分组；「默认分组（0）」是合成值，不参与勾选；
 * - 保存走覆盖式 `assign`：以本次勾选集合为准，空集合 = 回到默认分组；
 * - 新建分组后自动勾选，省一步操作。
 */
const props = defineProps<{
  visible: boolean
  /** 被分组的用户 mid（字符串，避免雪花 ID 精度丢失） */
  targetMid: string
  /** 被分组用户昵称（弹窗标题用） */
  targetName: string
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  /** 保存成功（父级据此决定是否重拉列表） */
  (e: 'saved'): void
}>()

const tags = ref<FollowTagResp[]>([])
const checked = ref<number[]>([])
const loading = ref(false)
const saving = ref(false)
const creating = ref(false)
const newTagName = ref('')
/** 新建分组输入态（对齐 B 站：虚线按钮 → 点击后原位变输入框） */
const showCreate = ref(false)

/** 可勾选分组：排除「默认分组」合成值 */
const selectableTags = computed(() => tags.value.filter((t) => t.tagid !== 0))

async function load() {
  loading.value = true
  const [list, assigned] = await Promise.all([fetchFollowTags(), fetchAssignedFollowTags(props.targetMid)])
  tags.value = list
  checked.value = assigned
  loading.value = false
}

function close(next: boolean) {
  emit('update:visible', next)
}

async function handleCreateTag() {
  const name = newTagName.value.trim()
  if (!name) {
    biliMessage.warning('请输入分组名')
    return
  }
  creating.value = true
  const created = await createFollowTag(name, undefined, { showSuccessToast: true, successMessage: '分组已创建' })
  creating.value = false
  if (!created) return
  tags.value = [...tags.value, created]
  checked.value = [...checked.value, created.tagid]
  newTagName.value = ''
}

async function handleSave() {
  saving.value = true
  const res = await assignFollowTags(props.targetMid, checked.value, {
    showSuccessToast: false,
  })
  saving.value = false
  if (!res) return
  emit('saved')
  close(false)
}

// 打开时重拉（分组可能在别的入口变化）+ 回填该用户当前分组
watch(
  () => [props.visible, props.targetMid] as const,
  ([visible]) => {
    if (visible) {
      showCreate.value = false
      newTagName.value = ''
      void load()
    }
  },
  { immediate: true }
)
</script>
