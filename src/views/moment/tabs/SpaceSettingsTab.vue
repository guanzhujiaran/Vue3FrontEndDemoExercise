<template>
  <div class="moment-space-settings-tab max-w-2xl mx-auto flex flex-col gap-6">
    <!-- 空间资料可见性：对应后端 TUserSpacePrivacy 四个开关（全量覆盖，每次切换立即提交）；
         收藏不在设置页 —— 2026-10-08 起改为每个收藏夹各自公开 / 隐藏（在收藏 tab 内切换） -->
    <section class="moment-space-settings-tab__card bg-bg-overlay border border-border-light rounded-lg p-4">
      <h2 class="moment-space-settings-tab__section-title text-base font-bold text-text-primary">
        空间资料可见性
      </h2>
      <div class="moment-space-settings-tab__hint text-xs text-text-placeholder mt-1">
        默认全部不展示。开启后，别人能在空间主页与右侧资料卡看到对应内容；可用顶部「视角预览」检查效果
      </div>

      <LoadingWrap :loading="privacyLoading">
        <ul class="moment-space-settings-tab__privacy-list mt-3 flex flex-col">
          <li
            v-for="item in PRIVACY_ITEMS"
            :key="item.key"
            class="moment-space-settings-tab__privacy-item flex items-center justify-between gap-4 py-3 border-b border-border-lighter last:border-b-0"
          >
            <div class="min-w-0">
              <div class="moment-space-settings-tab__label font-medium">{{ item.label }}</div>
              <div class="moment-space-settings-tab__hint text-xs text-text-placeholder mt-1">
                {{ item.hint }}
              </div>
            </div>
            <el-switch
              :model-value="privacy[item.key]"
              :class="`moment-space-settings-tab__switch--${item.key}`"
              @change="(v) => onPrivacyChange(item.key, Boolean(v))"
            />
          </li>
        </ul>
      </LoadingWrap>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import LoadingWrap from '@/components/message/LoadingWrap.vue'
import { fetchMySpacePrivacy, updateMySpacePrivacy } from '@/api/notify/moment-api'
import biliMessage from '@/utils/message'
import { useMomentSpace } from '@/views/moment/tabs/spaceContext'

/**
 * 个人空间「设置」tab（`/app/space/:mid/settings`，仅自身空间可见）。
 *
 * 空间资料可见性：对应后端 `TUserSpacePrivacy` 的五个开关，**全量覆盖**语义，
 * 因此每次切换都带上五项一起提交，返回值即最新开关状态。
 *
 * 注：收藏已不在本页 —— 2026-10-08 起改为**每个收藏夹各自公开 / 隐藏**
 * （在收藏 tab 内切换），不再有全局开关。
 */
const { ensureProfileLoaded, reloadProfile } = useMomentSpace()

/** 五个开关的展示信息（key 与后端 SpacePrivacyUpdateReq 字段一一对应） */
const PRIVACY_ITEMS = [
  {
    key: 'showPersonalInfo',
    label: '个人资料（性别 / 生日 / 邮箱）',
    hint: '关闭后，别人在空间页看不到这些字段',
  },
  {
    key: 'showTimeline',
    label: '时间线',
    hint: '关闭后，别人看不到你的时间线（关注 / 点赞 / 收藏记录）',
  },
  {
    key: 'showFollowList',
    label: '关注列表',
    hint: '关闭后，别人看不到你关注了谁（统计栏「关注」入口也会被拦下）',
  },
  {
    key: 'showLikeList',
    label: '点赞列表',
    hint: '关闭后，别人看不到你点赞了什么',
  },
  {
    key: 'showFansList',
    label: '粉丝列表',
    hint: '关闭后，别人看不到你的粉丝列表（主页粉丝模块与统计栏「粉丝」入口一并隐藏）',
  },
] as const

type PrivacyKey = (typeof PRIVACY_ITEMS)[number]['key']

/** 开关本地状态（camelCase 便于模板 v-model 风格绑定），提交时映射回后端 snake_case */
const privacy = reactive<Record<PrivacyKey, boolean>>({
  showPersonalInfo: false,
  showTimeline: true,
  showFollowList: false,
  showLikeList: false,
  showFansList: false,
})
const privacyLoading = ref(false)

function applyFlags(flags: {
  show_personal_info?: boolean
  show_timeline?: boolean
  show_follow_list?: boolean
  show_like_list?: boolean
  show_fans_list?: boolean
} | null) {
  if (!flags) return
  privacy.showPersonalInfo = Boolean(flags.show_personal_info)
  privacy.showTimeline = Boolean(flags.show_timeline ?? true)
  privacy.showFollowList = Boolean(flags.show_follow_list)
  privacy.showLikeList = Boolean(flags.show_like_list)
  privacy.showFansList = Boolean(flags.show_fans_list)
}

async function loadPrivacy() {
  privacyLoading.value = true
  try {
    applyFlags(await fetchMySpacePrivacy())
  } catch {
    biliMessage.warning('空间资料可见性设置加载失败')
  } finally {
    privacyLoading.value = false
  }
}

async function onPrivacyChange(key: PrivacyKey, value: boolean) {
  const prev = privacy[key]
  privacy[key] = value
  // 后端全量覆盖：必须带上五项一起提交
  const saved = await updateMySpacePrivacy({
    show_personal_info: privacy.showPersonalInfo,
    show_timeline: privacy.showTimeline,
    show_follow_list: privacy.showFollowList,
    show_like_list: privacy.showLikeList,
    show_fans_list: privacy.showFansList,
  })
  if (!saved) {
    privacy[key] = prev
    biliMessage.warning('保存失败，请稍后重试')
    return
  }
  applyFlags(saved)
  // 隐私开关变了：让布局壳重拉空间资料（privacy_flags 变化，主页资料卡 / 粉丝模块立即按新状态渲染）
  void reloadProfile()
  biliMessage.success('已保存')
}

onMounted(() => {
  // 确保空间资料已加载（tab 栏与本页共用同一份状态）
  void ensureProfileLoaded()
  void loadPrivacy()
})
</script>