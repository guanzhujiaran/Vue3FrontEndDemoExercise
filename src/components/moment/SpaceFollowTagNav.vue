<template>
  <!-- 关注分组导航（对标 B 站关系页左侧分组栏）：新建分组 → 全部关注 → 特别关注 → 默认分组 → 自建分组。
       分组是私域数据，只在本人视角的「关注」列表里出现。 -->
  <nav class="space-follow-tag-nav w-full flex flex-col gap-0.5">
    <!-- 新建分组：B 站位置在列表最上方（虚线按钮）；点开后在原位输入，不弹窗 -->
    <div v-if="creating" class="space-follow-tag-nav__create-row flex items-center gap-2 px-1 pb-1">
      <el-input
        v-model="newName"
        class="space-follow-tag-nav__create-input flex-1"
        size="default"
        maxlength="20"
        placeholder="分组名"
        @keyup.enter="handleCreate"
      />
      <el-button
        class="space-follow-tag-nav__create-btn"
        size="default"
        type="primary"
        :loading="saving"
        @click="handleCreate"
      >
        建
      </el-button>
    </div>
    <el-button
      v-else
      class="space-follow-tag-nav__add mb-1 w-full"
      size="default"
      :icon="Plus"
      @click="creating = true"
    >
      新建分组
    </el-button>

    <button
      v-for="item in visibleItems"
      :key="item.key"
      type="button"
      class="space-follow-tag-nav__item flex items-center justify-between gap-2 border-l-2 rounded-r-md px-3 py-2 text-left text-sm transition-colors"
      :class="
        item.tagId === activeTagId
          ? 'space-follow-tag-nav__item--active border-primary bg-bg-secondary text-primary font-medium'
          : 'border-transparent text-text-primary hover:bg-bg-secondary'
      "
      @click="selectItem(item)"
    >
      <span class="space-follow-tag-nav__name truncate">{{ item.name }}</span>
      <span class="space-follow-tag-nav__count shrink-0 text-xs text-text-placeholder">{{ item.count }}</span>
      <!-- 自建分组可删：hover 才出现，避免误点 -->
      <el-icon
        v-if="(item.tagId ?? 0) > 0"
        class="space-follow-tag-nav__remove hidden md:inline-flex shrink-0 text-text-placeholder hover:text-danger"
        :title="`删除分组「${item.name}」`"
        @click.stop="handleRemove(item.tagId!, item.name)"
      >
        <Delete />
      </el-icon>
    </button>

    <!-- 分组过多时折叠（对齐 B 站「显示剩余 N 个」） -->
    <button
      v-if="hiddenCount > 0"
      type="button"
      class="space-follow-tag-nav__show-more px-3 py-1.5 text-left text-xs text-text-placeholder transition-colors hover:text-primary"
      @click="expanded = true"
    >
      显示剩余 {{ hiddenCount }} 个
    </button>
  </nav>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Delete, Plus } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import { fetchFollowTags, createFollowTag, deleteFollowTag } from '@/api/notify/moment-api'
import type { FollowTagResp } from '@/api/community/hey-api'
import biliMessage from '@/utils/message'

/**
 * 关注分组导航（左侧分组栏）。
 *
 * 分组数据源是 `GET /follow/tags`（特别关注 `-10` → 默认分组 `0` → 自建分组）；
 * 计数由后端单条查询算好，「全部关注」用各分组计数无法推导，因此额外取一次
 * 关注总数（`total` 只在「全部关注」项展示，避免误导）。
 */
interface NavItem {
  key: string
  /** null = 全部关注（不带 tagid 过滤） */
  tagId: number | null
  name: string
  count: number | null
}

/** `activeTagId` 传 `undefined` 表示「当前不在关注列表页」：任何分组都不高亮（含「全部关注」） */
const props = defineProps<{ activeTagId: number | null | undefined; total: number }>()
const emit = defineEmits<{
  (e: 'update:activeTagId', value: number | null): void
  /** 选中项名称：右栏大标题跟随（对齐 B 站「全部关注 / 分组名」） */
  (e: 'update:activeTagName', value: string): void
  /** 每次点击分组都触发（值可能未变）：供父级做「切回关注列表」等副作用 */
  (e: 'select', value: number | null): void
  /** 分组增删后通知父级重拉列表（当前过滤分组可能已被删除） */
  (e: 'changed'): void
}>()

const tags = ref<FollowTagResp[]>([])
const creating = ref(false)
const saving = ref(false)
const newName = ref('')

const navItems = computed<NavItem[]>(() => [
  { key: 'all', tagId: null, name: '全部关注', count: props.total },
  ...tags.value.map((t) => ({ key: `tag-${t.tagid}`, tagId: t.tagid, name: t.name, count: t.count })),
])

/** 折叠时最多展示的条目数（含「全部关注」），对齐 B 站「显示剩余 N 个」 */
const COLLAPSED_LIMIT = 5
/** 是否已点开「显示剩余 N 个」 */
const expanded = ref(false)

const visibleItems = computed(() =>
  expanded.value ? navItems.value : navItems.value.slice(0, COLLAPSED_LIMIT)
)
const hiddenCount = computed(() =>
  Math.max(navItems.value.length - visibleItems.value.length, 0)
)

/** 选中分组：同时把名称抛给父级（右栏大标题跟随选中项，对齐 B 站） */
function selectItem(item: NavItem) {
  emit('update:activeTagId', item.tagId)
  emit('update:activeTagName', item.name)
  emit('select', item.tagId)
}

async function loadTags() {
  tags.value = await fetchFollowTags()
}

async function handleCreate() {
  const name = newName.value.trim()
  if (!name) {
    biliMessage.warning('请输入分组名')
    return
  }
  saving.value = true
  const created = await createFollowTag(name, undefined, {
    showSuccessToast: true,
    successMessage: '分组已创建',
  })
  saving.value = false
  if (!created) return
  newName.value = ''
  creating.value = false
  await loadTags()
}

async function handleRemove(tagId: number, name: string) {
  try {
    await ElMessageBox.confirm(`删除分组「${name}」后，组内成员会回到默认分组。`, '删除分组', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  const ok = await deleteFollowTag(tagId, { showSuccessToast: true, successMessage: '分组已删除' })
  if (!ok) return
  // 删的正是当前过滤的分组时，回到「全部关注」
  if (props.activeTagId === tagId) emit('update:activeTagId', null)
  await loadTags()
  emit('changed')
}

onMounted(() => {
  void loadTags()
})

defineExpose({ reload: loadTags })
</script>
