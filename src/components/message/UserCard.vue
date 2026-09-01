<template>
  <div class="user-card w-80 max-w-full rounded-lg bg-bg-overlay p-4 shadow-lg">
    <div class="user-card__header flex gap-3">
      <div
        class="user-card__avatar-wrap h-16 w-16 shrink-0 overflow-hidden rounded-full border border-border-light cursor-pointer hover:opacity-90 transition-opacity"
        @click.stop="goUserSpace"
      >
        <img
          v-if="card?.avatar"
          :src="card.avatar"
          class="user-card__avatar h-full w-full object-cover"
          alt="avatar"
          referrerpolicy="no-referrer"
        />
        <div v-else class="user-card__avatar-placeholder flex h-full w-full items-center justify-center bg-text-placeholder">
          <el-icon class="text-bg-overlay" size="24"><UserFilled /></el-icon>
        </div>
      </div>

      <div class="user-card__info flex flex-1 flex-col justify-center gap-1 overflow-hidden">
        <div class="user-card__name-row flex items-center gap-2">
          <span
            class="user-card__name truncate text-base font-bold text-text-primary cursor-pointer hover:text-primary transition-colors"
            @click.stop="goUserSpace"
          >
            {{ card?.uname || card?.mid || '-' }}
          </span>
          <el-icon v-if="sexIcon" :class="sexClass" size="14">
            <component :is="sexIcon" />
          </el-icon>
          <LevelIcon
            v-if="levelText"
            class="user-card__level"
            :level="Number(levelText)"
          />
          <span
            v-if="isVip"
            class="user-card__vip rounded px-1 text-xs font-bold text-black bg-warning"
          >
            {{ t('message.ucVip') }}
          </span>
        </div>

        <div class="user-card__stats flex items-center gap-2 text-sm text-text-placeholder">
          <span>{{ followingText }} {{ t('message.ucFollowing') }}</span>
          <span class="text-border-lighter">|</span>
          <span>{{ followerText }} {{ t('message.ucFollower') }}</span>
          <span class="text-border-lighter">|</span>
          <span>{{ likeText }} {{ t('message.ucLiked') }}</span>
        </div>

        <div v-if="roleText" class="user-card__role text-xs text-primary">
          {{ roleText }}
        </div>

        <div v-if="card?.sign" class="user-card__sign truncate text-xs text-text-placeholder">
          {{ card.sign }}
        </div>
      </div>
    </div>

    <!-- 操作按钮：关注/取关 + 发消息（对齐 B 站：本人也显示关注按钮，点击由后端返回"不能关注自己"） -->
    <div v-if="showActions" class="user-card__actions mt-3 flex gap-2">
      <el-button
        class="user-card__follow-btn flex-1"
        :type="isFollowing ? 'default' : 'primary'"
        size="large"
        :loading="actionLoading"
        @click.stop="handleFollow"
      >
        {{ isFollowing ? t('message.ucFollowed') : t('message.ucFollow') }}
      </el-button>
      <el-button
        class="user-card__message-btn flex-1"
        size="large"
        @click.stop="handleMessage"
      >
        {{ t('message.ucSendMessage') }}
      </el-button>
    </div>

    <div v-if="extraLines.length" class="user-card__extra mt-2 flex flex-col gap-1 border-t border-border-lighter pt-2 text-xs text-text-placeholder">
      <div v-for="(line, i) in extraLines" :key="i" class="user-card__extra-line">
        {{ line }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Female, Male, UserFilled } from '@element-plus/icons-vue'
import LevelIcon from '@/components/CommonCompo/LevelIcon.vue'

const { t } = useI18n()

/** 外部 chat 应用基地址：发送消息按钮直接按卡片 uid 跳转对应会话（B 站 whisper 风格） */
const CHAT_BASE_URL = 'http://localhost/app/message/whisper'

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
  /** 我是否已关注对方（来自 /follow/relation 或卡片初始化） */
  is_following?: boolean
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

const emit = defineEmits<{
  follow: [mid: number]
  unfollow: [mid: number]
}>()

const actionLoading = ref(false)

/** 是否已关注（外部传入 is_following，或随操作本地切换） */
const isFollowing = ref(false)
watch(
  () => props.card?.is_following,
  (v) => {
    if (v !== undefined) isFollowing.value = !!v
  },
  { immediate: true }
)

const sexIcon = computed(() => {
  if (props.card?.sex === '男') return Male
  if (props.card?.sex === '女') return Female
  return null
})

const sexClass = computed(() =>
  props.card?.sex === '女' ? 'text-msg-pink' : 'text-primary'
)

/** level 可能为 0（Lv0 是合法等级，不能用 truthy 判断） */
const levelText = computed(() => {
  const lv = props.card?.level
  return lv !== undefined && lv !== null ? String(lv) : ''
})

const isVip = computed(() => {
  const vt = props.card?.vip_type
  if (vt !== undefined && vt !== null && vt > 0) return true
  return props.card?.vip_status === '1'
})

const roleText = computed(() => {
  const r = props.card?.role
  if (!r) return ''
  if (r === 'root') return t('message.ucAdmin')
  if (r.startsWith('level')) return `${t('message.ucNormalUser')} (Lv${r.slice(5)})`
  return r
})

const extraLines = computed<string[]>(() => {
  const lines: string[] = []
  if (props.card?.exp != null) lines.push(`${t('message.ucExp')}${props.card.exp}`)
  if (isVip.value && props.card?.vip_due_date) {
    const d = new Date(props.card.vip_due_date)
    if (!isNaN(d.getTime())) lines.push(`${t('message.ucVipExpire')}${d.toLocaleDateString()}`)
  }
  if (props.card?.email) lines.push(`${t('message.ucEmail')}${props.card.email}`)
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

async function handleFollow() {
  const mid = props.card?.mid
  if (!mid) return
  // 仅触发事件并展示 loading；关注状态切换由父组件（MomentCard）在接口成功后
  // 通过更新 card.is_following 驱动，失败（如"不能关注自己"）则不切换
  actionLoading.value = true
  try {
    if (isFollowing.value) {
      emit('unfollow', mid)
    } else {
      emit('follow', mid)
    }
  } finally {
    actionLoading.value = false
  }
}

/** 发送消息：直接按卡片 uid 跳转到对应 chat 用户（外部 chat 应用，新标签打开） */
function handleMessage() {
  const mid = props.card?.mid
  if (!mid) return
  const name = props.card?.uname || ''
  const url = `${CHAT_BASE_URL}/${mid}?name=${encodeURIComponent(name)}`
  window.open(url, '_blank')
}

const router = useRouter()

/** 点击大头像 / 昵称跳转用户空间页 */
function goUserSpace() {
  const mid = props.card?.mid
  if (!mid) return
  router.push({ name: 'MOMENT_USER_SPACE', params: { mid: String(mid) } })
}
</script>
