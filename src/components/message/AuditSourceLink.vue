<template>
  <div class="audit-source-link flex flex-col gap-1">
    <template v-if="source">
      <!-- 站内可跳转：默认 router.push，父组件可拦截 navigate 事件自行处理 -->
      <el-link
        v-if="source.url"
        class="audit-source-link__inner"
        type="primary"
        underline="never"
        @click="onNavigate"
      >
        {{ source.label }}
      </el-link>
      <!-- 站外原始内容：新标签页打开 -->
      <el-link
        v-else-if="source.external_url"
        class="audit-source-link__external"
        type="primary"
        underline="never"
        :href="source.external_url"
        target="_blank"
        rel="noopener noreferrer"
      >
        {{ source.label }}
        <el-icon class="audit-source-link__external-icon ml-1"><TopRight /></el-icon>
      </el-link>
      <!-- 无落地页：仅展示来源名 -->
      <el-text v-else class="audit-source-link__plain" size="default" type="info">
        {{ source.label }}
      </el-text>

      <el-text v-if="source.up_mid" class="audit-source-link__up" size="small" type="info">
        {{ t('message.upPrefix') }}{{ source.up_mid }}
      </el-text>
    </template>
    <el-text v-else class="audit-source-link__empty" size="default" type="info">{{ t('message.unknownSource') }}</el-text>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { TopRight } from '@element-plus/icons-vue'
import type { AuditSourceInfo } from '@/api/notify/hey-api'

const { t } = useI18n()

const props = defineProps<{
  source?: AuditSourceInfo | null
  /** 由父组件接管跳转（如私信在当前页打开会话上下文抽屉），不再执行 router.push */
  interceptNavigate?: boolean
}>()

const emit = defineEmits<{ navigate: [source: AuditSourceInfo] }>()

const router = useRouter()

function onNavigate() {
  const src = props.source
  if (!src) return
  emit('navigate', src)
  if (props.interceptNavigate || !src.url) return
  router.push(src.url)
}
</script>
