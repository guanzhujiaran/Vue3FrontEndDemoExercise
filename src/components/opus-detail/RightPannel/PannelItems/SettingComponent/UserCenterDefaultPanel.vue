<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'
import userApi from '@/api/user/user_api.ts'
import { fetchAvatarAuditMine } from '@/api/notify/moment-api'
import { useUserNavStore } from '@/stores/user_nav'
import { BiliImg } from '@/assets/img/BiliImg.ts'
import BiliStyleExpBar from '@/components/CommonCompo/BiliStyleExpBar.vue'
import LevelPrivilegePopover from '@/components/CommonCompo/LevelPrivilegePopover.vue'
import type { User_base_info_config_form } from '@/models/user/user_setting/user_base_info_config_model.ts'
import type { CasdoorUserModel } from '@/models/user/casdoor/casdoor_user_model.ts'

// 直接读取 pinia user_nav store（由 App.vue 的 isLogin -> save_user_nav 写入），
// 避免经由 provide/inject 单例 ref 的响应式同步时序问题。
const userNavStore = useUserNavStore()
const { user_nav: userNavRef } = storeToRefs(userNavStore)

// 本地 nav 副本：所有 nav 字段均从此读取，确保顶部卡片与下方表格
// 始终基于同一份数据，避免两侧因 store 同步时机差异而出现不一致。
const navInfo = ref<any>(null)
const syncNavInfo = () => {
  navInfo.value = userNavRef.value ?? null
}

// 让本地副本始终跟随 store 的 user_nav（store 可能在 isLogin / 兜底补拉后才写入）
watch(userNavRef, syncNavInfo, { deep: true, immediate: true })

// ==================== 数据状态 ====================
const loading = ref(true)
const errMsg = ref('')

const profile = ref<User_base_info_config_form | null>(null)
// 后端直接透传 Casdoor 原始用户对象，使用宽松模型
const casdoor = ref<CasdoorUserModel | null>(null)

const loadDetail = async () => {
  loading.value = true
  errMsg.value = ''
  try {
    // nav 中的角色(role_info)/等级(level_info)/邮箱等仅由 /nav 返回，
    // 这里确保 store 中的 nav 数据已就绪：若缺失则主动补拉一次
    // （后端 add_daily_login_exp 已做「当天已领」去重，重复调用不会重复加经验）。
    if (!userNavRef.value?.uid) {
      try {
        const navRes = await userApi.Nav()
        const navData = (navRes.data ?? navRes.error) as
          | { code: number; data?: any; msg?: string }
          | undefined
        if (navData?.code === 0 && navData.data) {
          userNavStore.save_user_nav(navData.data)
        }
      } catch (_) {
        // nav 补拉失败不影响其余资料展示
      }
    }
    // 不管走 store 还是兜底补拉，最终都以本地副本为准
    syncNavInfo()

    // 并行拉取本系统用户资料 + Casdoor 账户信息（均走本系统 JWT）
    const [infoRes, casdoorRes] = await Promise.all([
      userApi.UserInfo(),
      userApi.CasdoorInfo(),
    ])

    if (infoRes?.data) {
      profile.value = infoRes.data
    }
    if (casdoorRes?.data) {
      casdoor.value = casdoorRes.data as CasdoorUserModel
    }
  } catch (e: any) {
    errMsg.value = e?.msg || e?.message || '获取用户信息失败'
  } finally {
    loading.value = false
  }
}

const fmt = (v: any): string => {
  if (v == null || v === '') return '—'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

// 统一从本地 navInfo 读取等级信息，顶部卡片与表格共用，保证一致
const navLevel = computed(() => navInfo.value?.level_info ?? null)
const levelCurrent = computed(() => navLevel.value?.current_level ?? navLevel.value?.current_level_exp)
const levelExp = computed(() => navLevel.value?.current_level_exp ?? navLevel.value?.current_exp)
const levelNext = computed(() => navLevel.value?.current_exp_to_next_level ?? navLevel.value?.next_exp)

// Casdoor 只读账户：仅挑选几个最重要的字段展示（余额 / 积分 / 等级 等）
const casdoorHighlights = computed(() => {
  if (!casdoor.value) return []
  return [
    { label: '账户余额', value: casdoor.value.balance },
    { label: '积分', value: casdoor.value.score },
    { label: '等级', value: casdoor.value.rank },
    { label: '货币', value: casdoor.value.currency },
  ].filter((it) => it.value !== undefined && it.value !== null && it.value !== '')
})

// Casdoor 只读账户：基础身份信息（同样从原始对象直接取，不重排）
const casdoorIdentities = computed(() => {
  if (!casdoor.value) return []
  return [
    { label: 'Casdoor 用户名', value: casdoor.value.name },
    { label: '显示名称', value: casdoor.value.displayName },
    { label: '邮箱', value: casdoor.value.email },
    { label: 'Casdoor ID', value: casdoor.value.id },
  ].filter((it) => it.value !== undefined && it.value !== null && it.value !== '')
})

// ==================== 修改头像（2.16.0：仅支持图片 URL） ====================
const avatarDialogVisible = ref(false)
const avatarUrl = ref('')
const avatarSubmitting = ref(false)
const avatarErrMsg = ref('')
// 头像更换审核状态（先审后发）：pending 时展示待审核徽标，不改变公开头像
const avatarAudit = ref<{ auditStatus: string; newAvatar?: string } | null>(null)

const loadAvatarAudit = async () => {
  try {
    const res = await fetchAvatarAuditMine()
    avatarAudit.value = res ? { auditStatus: res.auditStatus, newAvatar: res.newAvatar } : null
  } catch (_) {
    avatarAudit.value = null
  }
}

const openAvatarDialog = () => {
  avatarUrl.value = navInfo?.value?.face || ''
  avatarErrMsg.value = ''
  avatarDialogVisible.value = true
}

const submitAvatar = async () => {
  const url = avatarUrl.value.trim()
  if (!url) {
    avatarErrMsg.value = '请输入头像图片链接'
    return
  }
  avatarSubmitting.value = true
  avatarErrMsg.value = ''
  const res = await userApi.UpdateUserInfo({ avatar: url })
  // businessHandler 对 code !== 0 的响应不会抛出异常，而是返回 { success:false, msg }
  // 需主动检查，失败时展示后端 msg 并保持弹窗打开，不能直接关闭/更新头像
  if (!res.success) {
    avatarErrMsg.value = res.msg || '头像更新失败'
    avatarSubmitting.value = false
    return
  }
  avatarDialogVisible.value = false
  avatarSubmitting.value = false
  // 头像走「先审后发」：avatar_status=pending 表示已提交审核，未即时生效，
  // 不更新本地 nav 头像（仍显示旧头像），审核通过后由服务端写入公开头像。
  if (res.data?.avatar_status === 'pending') {
    await loadAvatarAudit()
    ElMessage.success('头像更换申请已提交，审核通过后生效')
    return
  }
  // 非头像审核场景（理论不会走到）：头像即时生效，更新本地 nav 展示
  if (navInfo.value) {
    navInfo.value.face = url
  }
  await loadDetail()
}

onMounted(() => {
  loadDetail()
  loadAvatarAudit()
})
</script>

<template>
  <div class="user-center-default-panel flex flex-col gap-6">
    <!-- 加载中 -->
    <div v-if="loading" class="user-center-loading flex justify-center py-10">
      <el-icon class="user-center-loading__spinner animate-spin text-3xl text-primary">
        <svg viewBox="0 0 1024 1024" width="1em" height="1em">
          <path
            fill="currentColor"
            d="M512 64a32 32 0 0 1 32 32v128a32 32 0 0 1-64 0V96a32 32 0 0 1 32-32zm0 640a160 160 0 1 1 0 320 160 160 0 0 1 0-320zm0 64a96 96 0 1 0 0 192 96 96 0 0 0 0-192zM128 512a32 32 0 0 1 0-64h128a32 32 0 0 1 0 64H128zm640 0a32 32 0 0 1 0-64h128a32 32 0 0 1 0 64h-128zM179.2 179.2a32 32 0 0 1 45.2 0l90.5 90.5a32 32 0 0 1-45.2 45.2l-90.5-90.5a32 32 0 0 1 0-45.2zm579.1 0a32 32 0 0 1 0 45.2l-90.5 90.5a32 32 0 0 1-45.2-45.2l90.5-90.5a32 32 0 0 1 45.2 0zM179.2 844.8a32 32 0 0 1 0-45.2l90.5-90.5a32 32 0 0 1 45.2 45.2l-90.5 90.5a32 32 0 0 1-45.2 0zm579.1 0a32 32 0 0 1-45.2 0l-90.5-90.5a32 32 0 0 1 45.2-45.2l90.5 90.5a32 32 0 0 1 0 45.2z"
          />
        </svg>
      </el-icon>
    </div>

    <!-- 出错 -->
    <el-alert
      v-else-if="errMsg"
      class="user-center-error"
      :title="errMsg"
      type="warning"
      :closable="false"
      show-icon
    />

    <!-- 数据展示 -->
    <div v-else class="user-center-body flex flex-col gap-6">
      <!-- 头像与基础标识（头像取本系统 nav 的 face，即审核通过后的公开头像） -->
      <el-card class="user-center-profile-card" shadow="never">
        <div class="user-center-profile-card__body flex flex-wrap items-start gap-4">
          <div class="user-center-profile-card__avatar-wrap flex flex-col items-start gap-3 shrink-0">
            <el-avatar
              class="user-center-profile-card__avatar"
              :size="64"
              :src="navInfo?.face || BiliImg.face.noface"
            >
              {{ profile?.uname || userNavRef.value?.user_name || 'U' }}
            </el-avatar>
            <div class="user-center-profile-card__avatar-actions flex flex-col gap-2">
              <el-button
                class="user-center-profile-card__avatar-edit"
                size="large"
                @click="openAvatarDialog"
              >
                修改头像
              </el-button>
              <el-tag
                v-if="avatarAudit?.auditStatus === 'pending'"
                class="user-center-profile-card__avatar-audit-tag"
                type="warning"
                size="default"
                effect="light"
              >
                头像审核中
              </el-tag>
            </div>
          </div>
          <div class="user-center-profile-card__meta flex flex-col flex-1 gap-1 min-w-48">
            <div class="user-center-profile-card__meta-head flex items-center gap-2 min-w-0">
              <span class="user-center-profile-card__name text-xl font-bold text-text-primary wrap-break-word min-w-0">
                {{ profile?.uname || casdoor?.displayName || navInfo?.user_name || '—' }}
              </span>
              <el-button
                class="user-center-profile-card__refresh"
                size="small"
                @click="loadDetail"
              >
                刷新
              </el-button>
            </div>
            <span class="user-center-profile-card__sub text-sm text-text-secondary">
              @{{ navInfo?.user_name || '—' }} · UID {{ navInfo?.uid ?? '—' }}
            </span>
          </div>
          <div class="user-center-profile-card__level flex flex-col items-end gap-1 min-w-65 md:ml-auto">
            <el-popover
              v-if="navLevel"
              class="user-center-profile-card__exp-popover"
              placement="bottom-end"
              :width="320"
              :show-arrow="true"
              trigger="hover"
              :persistent="false"
              popper-class="user-center-exp-popover"
            >
              <template #reference>
                <BiliStyleExpBar
                  :level-info="navLevel"
                  size="large"
                  :show-text="true"
                  class="user-center-profile-card__exp"
                />
              </template>
              <LevelPrivilegePopover :current-level="Number(levelCurrent) || 0" />
            </el-popover>
            <span v-else class="user-center-profile-card__exp text-xs text-text-secondary">
              暂无等级信息
            </span>
          </div>
        </div>
      </el-card>

      <!-- 本系统账户（user_info + nav 合并展示） -->
      <el-card class="user-center-local-account-card" shadow="never">
        <template #header>
          <span class="user-center-local-account-card__title text-lg font-bold text-text-primary">
            本系统账户
          </span>
        </template>
        <el-descriptions class="user-center-local-account-card__desc" :column="2" border size="default">
          <el-descriptions-item label="昵称">
            {{ fmt(profile?.uname) }}
          </el-descriptions-item>
          <el-descriptions-item label="用户名(userid)">
            {{ fmt(profile?.userid) }}
          </el-descriptions-item>
          <el-descriptions-item label="UID">{{ fmt(navInfo?.uid) }}</el-descriptions-item>
          <el-descriptions-item label="MID">{{ fmt(profile?.mid ?? navInfo?.uid) }}</el-descriptions-item>
          <el-descriptions-item label="角色标识">
            {{ fmt(navInfo?.role_info?.role) }}
          </el-descriptions-item>
          <el-descriptions-item label="角色名称">
            {{ fmt(navInfo?.role_info?.role_name) }}
          </el-descriptions-item>
          <el-descriptions-item label="角色描述" :span="2">
            {{ fmt(navInfo?.role_info?.role_description) }}
          </el-descriptions-item>
          <el-descriptions-item label="邮箱">{{ fmt(profile?.email || navInfo?.email) }}</el-descriptions-item>
          <el-descriptions-item label="等级">
            {{ fmt(levelCurrent) }}
          </el-descriptions-item>
          <el-descriptions-item label="经验值">
            {{ fmt(levelExp) }}
          </el-descriptions-item>
          <el-descriptions-item label="距下一级所需经验">
            {{ fmt(levelNext) }}
          </el-descriptions-item>
          <el-descriptions-item label="性别">{{ fmt(profile?.sex) }}</el-descriptions-item>
          <el-descriptions-item label="生日">{{ fmt(profile?.birthday) }}</el-descriptions-item>
          <el-descriptions-item label="头像地址" :span="2">
            <span class="break-all">{{ fmt(navInfo?.face) }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="个性签名" :span="2">
            {{ fmt(profile?.usersign) }}
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- 账户（来自第三方 Casdoor，只读） -->
      <el-card class="user-center-casdoor-card" shadow="never">
        <template #header>
          <div class="user-center-casdoor-card__header flex items-center gap-2">
            <span class="user-center-casdoor-card__title text-lg font-bold text-text-primary">
              账户
            </span>
            <el-tag size="small" type="info" effect="plain">第三方 Casdoor · 只读</el-tag>
          </div>
        </template>

        <!-- 核心指标（余额 / 积分 / 等级 / 货币） -->
        <div
          v-if="casdoorHighlights.length"
          class="user-center-casdoor-card__stats grid grid-cols-2 gap-4"
        >
          <div
            v-for="item in casdoorHighlights"
            :key="item.label"
            class="user-center-stat-item bg-primary-light-9 rounded-md p-4 flex flex-col gap-1"
          >
            <span class="user-center-stat-item__label text-sm text-text-secondary">{{ item.label }}</span>
            <span class="user-center-stat-item__value text-2xl font-bold text-primary">
              {{ item.value != null ? item.value : '—' }}
            </span>
          </div>
        </div>

        <!-- 基础身份信息 -->
        <el-descriptions
          v-if="casdoorIdentities.length"
          class="user-center-casdoor-card__identities mt-4"
          :column="2"
          border
          size="default"
        >
          <el-descriptions-item
            v-for="it in casdoorIdentities"
            :key="it.label"
            :label="it.label"
          >
            {{ fmt(it.value) }}
          </el-descriptions-item>
        </el-descriptions>

        <el-empty
          v-if="!casdoorHighlights.length && !casdoorIdentities.length"
          description="暂无关联的第三方账户信息"
          :image-size="80"
        />
      </el-card>

    </div>

    <!-- 修改头像弹窗（仅支持图片 URL） -->
    <el-dialog
      v-model="avatarDialogVisible"
      class="user-center-avatar-dialog"
      title="修改头像"
      width="480px"
    >
      <div class="user-center-avatar-dialog__body flex flex-col gap-3">
        <el-input
          v-model="avatarUrl"
          class="user-center-avatar-dialog__url"
          size="large"
          placeholder="请输入图片链接（http/https，≤1MB）"
          clearable
        />
        <el-text v-if="avatarErrMsg" class="user-center-avatar-dialog__err text-danger" tag="p">
          {{ avatarErrMsg }}
        </el-text>
        <el-text class="user-center-avatar-dialog__tip text-text-secondary text-sm" tag="p">
          头像仅支持图片 URL 链接；后端将校验图片在 1s 内可下载且大小不超过 1MB。
          提交后将进入审核，审核通过后新头像才会公开显示。
        </el-text>
      </div>
      <template #footer>
        <div class="user-center-avatar-dialog__footer flex justify-end gap-2">
          <el-button class="user-center-avatar-dialog__cancel" size="large" @click="avatarDialogVisible = false">
            取消
          </el-button>
          <el-button
            class="user-center-avatar-dialog__submit"
            type="primary"
            size="large"
            :loading="avatarSubmitting"
            @click="submitAvatar"
          >
            保存
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>
