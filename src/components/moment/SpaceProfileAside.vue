<template>
  <!-- 空间右栏「个人资料」窄条（对标 B 站空间右侧信息栏）：只展示后端按隐私开关下发的字段，
       字段缺省即代表主人未对外展示，这里直接不渲染，不做任何兜底猜测。
       行内不写「性别 / 生日」这类 KV 文案，改成「图标 + 值」（B 站窄条就是纯图标行），
       值过长时整段换行而不是省略号折叠；宽度跟随外层 aside，无需固定宽。 -->
  <aside class="space-profile-aside w-full">
    <section
      class="space-profile-aside__card bg-bg-overlay border border-border-light rounded-lg p-2.5 sm:p-3 md:p-4 flex flex-col gap-2 md:gap-3"
    >
      <h3 class="space-profile-aside__title text-sm md:text-base font-bold text-text-primary">个人资料</h3>
      <EmptyState v-if="rows.length === 0" text="暂无公开资料" />
      <ul v-else class="space-profile-aside__list flex flex-col gap-1.5 md:gap-2 text-sm">
        <li
          v-for="row in rows"
          :key="row.key"
          class="space-profile-aside__row flex items-start gap-1.5 md:gap-2 min-w-0"
          :title="`${row.label}：${row.value}`"
        >
          <component :is="row.icon" class="space-profile-aside__icon w-4 h-4 md:w-5 md:h-5 shrink-0 mt-0.5" />
          <!--窄栏里不做省略号折叠（邮箱 / IP / 时间一折就只剩「guanzh…」），改为整段换行 -->
          <span class="space-profile-aside__value text-text-primary break-all">{{ row.value }}</span>
        </li>
      </ul>
    </section>
  </aside>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue'
import { Message, Location } from '@element-plus/icons-vue'
import EmptyState from '@/components/message/EmptyState.vue'
import { formatDate } from '@/utils/dateFormat'
import { useMomentSpace } from '@/views/moment/tabs/spaceContext'
// 右栏图标：统一走 src/assets/svgs/space/ 下的 B 站风格 SVG（无对应 SVG 的用element plus 图标）
import MaleIcon from '@/assets/svgs/space/male.svg?component'
import FemaleIcon from '@/assets/svgs/space/female.svg?component'
import CakeIcon from '@/assets/svgs/space/cake.svg?component'
import HistoryIcon from '@/assets/svgs/space/history.svg?component'
import EyeIcon from '@/assets/svgs/space/eye.svg?component'
import UserInfoIcon from '@/assets/svgs/space/user_info.svg?component'

/**
 * 空间右栏个人资料卡（我的主页 / TA 的主页共用）。
 *
 * 数据源：布局壳已持有的 `SpaceInfoResp`（`GET /user/space/info`），不额外发请求。
 * 隐私：他人视角下后端在开关关闭时**不下发**对应字段（`email` / `last_login_at` /
 * `ip_location`，性别 / 生日同理），因此只按「有值才渲染」处理。
 * 预览态例外：自己的空间后端会照旧下发本人字段，这里按 `privacy_flags` 复核一次，
 * 让「访客 / 粉丝视角」预览到的内容与真实他人一致。
 *
 * 每行 = 一个语义图标 + 值（label 只留 title 悬浮提示），窄栏也能读。
 */
interface ProfileRow {
  /** 行标识（v-for key） */
  key: string
  /** 语义标签：仅用于 title 悬浮提示，不占视觉空间 */
  label: string
  /** 展示值 */
  value: string
  /** 行首图标 */
  icon: Component
}

const { targetUser, isPreviewing } = useMomentSpace()

/** B 站 sex 取值：male / female，其余（含空）视为保密 */
function sexLabel(sex?: string): string {
  if (sex === 'male') return '男'
  if (sex === 'female') return '女'
  return ''
}

const rows = computed<ProfileRow[]>(() => {
  const user = targetUser.value
  const flags = user.privacy_flags
  // 预览他人视角时，只有开关打开的敏感字段才算「对方能看到」
  // （上次登录 / IP 属地不设开关、固定公开，故不参与预览过滤）
  const personalVisible = !isPreviewing.value || Boolean(flags?.show_personal_info)
  const list: ProfileRow[] = []
  const push = (row: ProfileRow, visible = true) => {
    if (!visible) return
    const value = row.value.trim()
    if (value) list.push({ ...row, value })
  }
  const sex = sexLabel(user.sex)
  push({ key: 'sex', label: '性别', value: sex, icon: sex === '女' ? FemaleIcon : MaleIcon }, personalVisible && !!sex)
  push({ key: 'birthday', label: '生日', value: user.birthday ? formatDate(user.birthday) : '', icon: CakeIcon }, personalVisible)
  push({ key: 'email', label: '邮箱', value: user.email ?? '', icon: Message })
  push({ key: 'ip_location', label: 'IP 属地', value: user.ip_location ?? '', icon: Location })
  push({
    key: 'last_login_at',
    label: '上次登录',
    value: user.last_login_at ? formatDate(user.last_login_at) : '',
    icon: HistoryIcon
  })
  if (typeof user.view_count === 'number') {
    push({ key: 'view_count', label: '空间访问', value: String(user.view_count), icon: EyeIcon })
  }
  if (user.jointime) {
    push({
      key: 'jointime',
      label: '注册时间',
      value: formatDate(user.jointime),
      icon: UserInfoIcon
    })
  }
  return list
})
</script>