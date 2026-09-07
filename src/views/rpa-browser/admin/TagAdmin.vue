<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElMessageBox } from 'element-plus'
import { Plus, CollectionTag, Check, Close } from '@element-plus/icons-vue'
import { useRpaAdminStore } from '@/stores/rpa_admin.ts'
import { businessHandler } from '@/utils/businessHandler'
import biliMessage from '@/utils/message'
import { 管理员管理Service, type TagItemResp as TagItem } from '@/api/browser/hey-api'

const adminStore = useRpaAdminStore()
const isAdmin = computed(() => adminStore.status.is_admin || adminStore.status.is_root)

const tagList = ref<TagItem[]>([])
const tagTotal = ref(0)
const tagPage = ref(1)
const tagDialogVisible = ref(false)
const tagForm = ref({ id: 0, name: '', color: '#409EFF' })
const attachDialogVisible = ref(false)
const attachForm = ref({ tag_id: 0, target_type: 'action', target_id: '' })

const loadTags = async () => {
  const res = await businessHandler(
    管理员管理Service.listTagsApiAdminRpaTagListPost({ body: { page: tagPage.value, per_page: 100 } }),
    { showSuccessToast: false, errorMessage: '获取标签失败' }
  )
  if (res.success && res.data) {
    tagList.value = res.data.items || []
    tagTotal.value = res.data.total || 0
  }
}

const openCreateTag = () => {
  tagForm.value = { id: 0, name: '', color: '#409EFF' }
  tagDialogVisible.value = true
}

const openEditTag = (tag: TagItem) => {
  tagForm.value = { id: tag.id, name: tag.name, color: tag.color }
  tagDialogVisible.value = true
}

const handleSaveTag = async () => {
  if (!tagForm.value.name) {
    biliMessage.error('请输入标签名称')
    return
  }
  if (tagForm.value.id) {
    await businessHandler(
      管理员管理Service.updateTagApiAdminRpaTagUpdatePost({ body: { id: tagForm.value.id, name: tagForm.value.name, color: tagForm.value.color } }),
      { successMessage: '标签已更新', errorMessage: '更新失败' }
    )
  } else {
    await businessHandler(
      管理员管理Service.createTagApiAdminRpaTagCreatePost({ body: { name: tagForm.value.name, color: tagForm.value.color } }),
      { successMessage: '标签已创建', errorMessage: '创建失败' }
    )
  }
  tagDialogVisible.value = false
  loadTags()
}

const handleDeleteTag = async (tag: TagItem) => {
  try {
    await ElMessageBox.confirm(`确定删除标签「${tag.name}」吗？关联也会一并清除。`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }
  await businessHandler(管理员管理Service.deleteTagApiAdminRpaTagDeletePost({ body: { id: tag.id } }), {
    successMessage: '标签已删除',
    errorMessage: '删除失败',
  })
  loadTags()
}

const openAttach = () => {
  attachForm.value = { tag_id: tagList.value[0]?.id || 0, target_type: 'action', target_id: '' }
  attachDialogVisible.value = true
}

const handleAttach = async () => {
  if (!attachForm.value.tag_id || !attachForm.value.target_id) {
    biliMessage.error('请选择标签并填写资源 ID')
    return
  }
  await businessHandler(
    管理员管理Service.attachTagApiAdminRpaTagAttachPost({
      body: {
        tag_id: attachForm.value.tag_id,
        target_type: attachForm.value.target_type,
        target_id: attachForm.value.target_id,
      },
    }),
    { successMessage: '已关联标签', errorMessage: '关联失败' }
  )
  attachDialogVisible.value = false
}

onMounted(async () => {
  await adminStore.fetchStatus()
  if (isAdmin.value) loadTags()
})
</script>

<template>
  <div class="rpa-tag-admin">
    <h2 class="mb-4 text-lg font-bold text-text-primary">标签管理</h2>

    <el-empty v-if="!isAdmin" description="无权限访问，需要 RPA 管理员或 root 权限" />

    <template v-else>
      <div class="mb-3 flex justify-end gap-2">
        <el-button :icon="Plus" type="primary" @click="openCreateTag">新建标签</el-button>
        <el-button :icon="CollectionTag" @click="openAttach">关联标签到资源</el-button>
      </div>

      <el-card class="rpa-admin-card" shadow="never">
        <template #header>
          <div class="flex items-center gap-2 text-base font-bold">
            <el-icon><CollectionTag /></el-icon>
            <span>标签列表</span>
          </div>
        </template>
        <el-table :data="tagList" class="rpa-admin-table" size="large">
          <el-table-column label="颜色" width="80">
            <template #default="{ row }">
              <span class="inline-block w-5 h-5 rounded" :style="{ backgroundColor: row.color }"></span>
            </template>
          </el-table-column>
          <el-table-column prop="name" label="名称" min-width="140" />
          <el-table-column prop="created_by" label="创建者" width="100" />
          <el-table-column label="操作" width="160" v-if="isAdmin">
            <template #default="{ row }">
              <el-button :icon="Check" text @click="openEditTag(row)">编辑</el-button>
              <el-button :icon="Close" type="danger" text @click="handleDeleteTag(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-pagination
          v-model:current-page="tagPage"
          :page-size="100"
          :total="tagTotal"
          layout="prev, pager, next, total"
          class="mt-3"
          @current-change="loadTags"
        />
      </el-card>

      <!-- 标签编辑弹窗 -->
      <el-dialog v-model="tagDialogVisible" title="标签" width="420px">
        <el-form label-position="top">
          <el-form-item label="名称">
            <el-input v-model="tagForm.name" placeholder="标签名称" />
          </el-form-item>
          <el-form-item label="颜色">
            <el-color-picker v-model="tagForm.color" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="tagDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSaveTag">保存</el-button>
        </template>
      </el-dialog>

      <!-- 关联标签弹窗 -->
      <el-dialog v-model="attachDialogVisible" title="关联标签到资源" width="420px">
        <el-form label-position="top">
          <el-form-item label="标签">
            <el-select v-model="attachForm.tag_id" class="w-full">
              <el-option v-for="t in tagList" :key="t.id" :label="t.name" :value="t.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="资源类型">
            <el-select v-model="attachForm.target_type" class="w-full">
              <el-option label="复合操作" value="action" />
              <el-option label="工作流" value="workflow" />
              <el-option label="插件" value="plugin" />
            </el-select>
          </el-form-item>
          <el-form-item label="资源 ID">
            <el-input v-model="attachForm.target_id" placeholder="资源 ID" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="attachDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleAttach">关联</el-button>
        </template>
      </el-dialog>
    </template>
  </div>
</template>
