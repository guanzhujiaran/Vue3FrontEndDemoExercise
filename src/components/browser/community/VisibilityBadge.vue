<!--
 * @FilePath: \Vue3FrontEndDemoExercise\src\components\browser\community\VisibilityBadge.vue
 * @Description: 可见性标识组件 - 私有🔒/公开🌍
-->
<template>
  <el-tag
    :type="tagType"
    size="small"
    effect="plain"
    class="shrink-0"
  >
    <span class="mr-0.5">{{ icon }}</span>
    {{ label }}
  </el-tag>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CommunityResourceMixin } from '@/types/browser-automation-api'
import { useCommunity } from '@/composables/useCommunity'

const props = defineProps<{
  resource: Partial<CommunityResourceMixin>
}>()

const { visibilityIcon, visibilityLabel, visibilityTagType, isOwner } = useCommunity()

const icon = computed(() => visibilityIcon(props.resource))
const label = computed(() => visibilityLabel(props.resource))
const tagType = computed(() => visibilityTagType(props.resource))
</script>
