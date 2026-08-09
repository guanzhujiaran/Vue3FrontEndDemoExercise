<template>
  <div class="user-card w-80 max-w-full rounded-lg bg-msg-card p-4 shadow-lg">
    <div class="user-card__header flex gap-3">
      <div class="user-card__avatar-wrap h-16 w-16 shrink-0 overflow-hidden rounded-full border border-msg-border">
        <img
          v-if="card?.avatar"
          :src="card.avatar"
          class="user-card__avatar h-full w-full object-cover"
          alt="avatar"
        />
        <div v-else class="user-card__avatar-placeholder flex h-full w-full items-center justify-center bg-msg-muted">
          <el-icon class="text-msg-card" size="24"><UserFilled /></el-icon>
        </div>
      </div>

      <div class="user-card__info flex flex-1 flex-col justify-center gap-1 overflow-hidden">
        <div class="user-card__name-row flex items-center gap-2">
          <span class="truncate text-base font-bold text-msg-text-active">
            {{ card?.uname || card?.mid || '-' }}
          </span>
          <el-icon v-if="sexIcon" :class="sexClass" size="14">
            <component :is="sexIcon" />
          </el-icon>
          <span
            v-if="levelText"
            class="user-card__level rounded px-1 text-xs font-bold text-white bg-msg-pink"
          >
            LV{{ levelText }}
          </span>
          <span
            v-if="isVip"
            class="user-card__vip rounded px-1 text-xs font-bold text-black bg-warning"
          >
            大会员
          </span>
        </div>

        <div class="user-card__stats flex items-center gap-2 text-sm text-msg-muted">
          <span>{{ followingText }} 关注</span>
          <span class="text-msg-divider">|</span>
          <span>{{ followerText }} 粉丝</span>
          <span class="text-msg-divider">|</span>
          <span>{{ likeText }} 获赞</span>
        </div>

        <div v-if="roleText" class="user-card__role text-xs text-msg-link">
          {{ roleText }}
        </div>

        <div v-if="card?.sign" class="user-card__sign truncate text-xs text-msg-muted">
          {{ card.sign }}
        </div>
      </div>
    </div>

    <div v-if="extraLines.length" class="user-card__extra mt-2 flex flex-col gap-1 border-t border-msg-divider pt-2 text-xs text-msg-muted">
      <div v-for="(line, i) in extraLines" :key="i" class="user-card__extra-line">
        {{ line }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Female, Male, UserFilled } from '@element-plus/icons-vue'

export interface UserCardData {
  mid?: number | null
  uname?: string | null
  avatar?: string | null
  level?: number
  sex?: string | null
  sign?: string | null
  follower_count?: number
  following_count?: number
  like_count?: number
  nameplate_name?: string | null
  nameplate_image?: string | null
  nameplate_level?: string | null
  official_title?: string | null
  // ===== pptr 现有表真实存在的扩展字段 =====
  vip_status?: string | null
  vip_type?: number
  vip_due_date?: number | null
  exp?: number | null
  role?: string | null
  email?: string | null
}

const props = withDefaults(
  defineProps<{
    card?: UserCardData | null
    showActions?: boolean
  }>(),
  {
    card: null,
    showActions: true
  }
)

const sexIcon = computed(() => {
  if (props.card?.sex === '男') return Male
  if (props.card?.sex === '女') return Female
  return null
})

const sexClass = computed(() =>
  props.card?.sex === '女' ? 'text-msg-pink' : 'text-msg-link'
)

const levelText = computed(() => (props.card?.level ? String(props.card.level) : ''))

const isVip = computed(() => {
  const vt = props.card?.vip_type
  if (vt !== undefined && vt !== null && vt > 0) return true
  return props.card?.vip_status === '1'
})

const roleText = computed(() => {
  const r = props.card?.role
  if (!r) return ''
  if (r === 'root') return '系统管理员'
  if (r.startsWith('level')) return `普通用户 (Lv${r.slice(5)})`
  return r
})

const extraLines = computed<string[]>(() => {
  const lines: string[] = []
  if (props.card?.exp != null) lines.push(`经验值：${props.card.exp}`)
  if (isVip.value && props.card?.vip_due_date) {
    const d = new Date(props.card.vip_due_date)
    if (!isNaN(d.getTime())) lines.push(`大会员到期：${d.toLocaleDateString()}`)
  }
  if (props.card?.email) lines.push(`邮箱：${props.card.email}`)
  return lines
})

function formatCount(n?: number | null): string {
  if (n === undefined || n === null) return '0'
  if (n < 10000) return String(n)
  const w = n / 10000
  return `${w.toFixed(1).replace(/\.0$/, '')}万`
}

const followingText = computed(() => formatCount(props.card?.following_count))
const followerText = computed(() => formatCount(props.card?.follower_count))
const likeText = computed(() => formatCount(props.card?.like_count))
</script>
