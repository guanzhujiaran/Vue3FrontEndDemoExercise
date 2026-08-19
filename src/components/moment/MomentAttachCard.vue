<template>
  <div
    class="moment-attach-card flex items-center gap-3 rounded-lg border border-border-light bg-fill-lighter p-3 cursor-pointer hover:bg-fill transition-colors"
    @click.stop="handleClick"
  >
    <!-- 封面（无封面时占位图标） -->
    <div class="moment-attach-card__cover shrink-0 w-16 h-16 rounded overflow-hidden bg-msg-sidebar flex items-center justify-center">
      <img
        v-if="bizType === 'lottery' && cover"
        :src="cover"
        class="w-full h-full object-cover"
        referrerpolicy="no-referrer"
        :alt="title"
      />
      <el-icon v-else :size="24" class="text-msg-muted">
        <Collection />
      </el-icon>
    </div>
    <div class="moment-attach-card__body flex-1 min-w-0">
      <div class="moment-attach-card__title text-sm font-bold text-msg-text-active line-clamp-2">
        {{ title }}
      </div>
      <div class="moment-attach-card__type mt-1">
        <el-tag size="default" type="info" effect="plain">{{ typeLabel }}</el-tag>
      </div>
    </div>
    <div class="moment-attach-card__cta shrink-0">
      <el-button size="default" type="primary" plain>去看看</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Collection } from '@element-plus/icons-vue'

const props = withDefaults(
  defineProps<{
    /** 资源类型（lottery / rpa_* / dynamic） */
    bizType?: string | null
    /** 资源 ID（字符串，避免 19 位雪花 ID 精度丢失） */
    bizId?: string | null
    /** 标题（后端 RPC 实时获取，可能缺失，弱依赖降级） */
    name?: string | null
    /** 封面链接（后端 RPC 实时获取，可能缺失） */
    cover?: string | null
    /** 落地页链接（后端 RPC 实时获取，可选；缺省按 bizType 前端跳转） */
    jumpUrl?: string | null
  }>(),
  {
    bizType: null,
    bizId: null,
    name: null,
    cover: null,
    jumpUrl: null,
  }
)

const router = useRouter()

const title = computed(() => props.name || `资源 ${props.bizId || ''}`)

const typeLabel = computed(() => {
  switch (props.bizType) {
    case 'lottery':
      return '抽奖'
    case 'rpa_action':
      return 'RPA动作'
    case 'rpa_workflow':
      return 'RPA工作流'
    case 'rpa_browser':
      return 'RPA浏览器'
    case 'dynamic':
      return '动态'
    default:
      return '资源'
  }
})

function handleClick() {
  const bizType = props.bizType
  const bizId = props.bizId
  if (!bizType || !bizId) return
  switch (bizType) {
    case 'lottery':
      router.push({ path: '/app/lot-data/card-detail', query: { id: bizId } })
      break
    case 'rpa_browser':
      router.push({ path: `/app/rpa-browser/stream/${bizId}` })
      break
    case 'rpa_action':
      router.push({ path: '/app/rpa-browser/actions' })
      break
    case 'rpa_workflow':
      router.push({ path: '/app/rpa-browser/workflows' })
      break
    case 'dynamic':
      router.push({ name: 'MOMENT_DETAIL', params: { momentId: bizId } })
      break
    default:
      if (props.jumpUrl) window.open(props.jumpUrl, '_blank')
  }
}
</script>
