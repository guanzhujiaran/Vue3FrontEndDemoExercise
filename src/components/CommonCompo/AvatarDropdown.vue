<script setup lang="ts">
import { onMounted, ref, computed, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { type ThemeMode, useThemeStore } from '@/stores/theme.ts'
import { useUserPrefStore, type SizeTheme } from '@/stores/user_pref.ts'
import { useHueThemeStore } from '@/stores/hue_theme.ts'
import { BiliImg } from '@/assets/img/BiliImg.ts'
import { KeysEnum, useInject } from '@/models/base/provide_model.ts'
import type { UserNavModel } from '@/models/user/user_model.ts'
import { useRouter } from 'vue-router'
import { RouteName } from '@/models/router'
import type { ElDropdown } from 'element-plus'
import { MagicStick, User, Delete, ScaleToOriginal, Moon, Sunny, Monitor, SwitchButton, ChatDotRound } from '@element-plus/icons-vue'
import { useMessageUnreadStore } from '@/stores/message_unread'
import biliMessage from '@/utils/message'
import userApi from '@/api/user/user_api'
import { fetchUnreadSummary } from '@/api/notify/message-api'
import { useUserNavStore } from '@/stores/user_nav'
import { useJwtStore } from '@/stores/jwt_token'
import UserAvatarBox from '@/components/CommonCompo/Bili-User-Compo/UserAvatarBox.vue'
import LevelIcon from '@/components/CommonCompo/LevelIcon.vue'
import { useLocaleStore } from '@/stores/locale'
import { SUPPORTED_LOCALES, type SupportedLocale } from '@/i18n'

const router = useRouter()
const { t } = useI18n()
const isLoggedIn = computed<boolean>(() => !!user_nav_model.value.uid)
const user_nav_model = useInject(KeysEnum.BiliUser) as Ref<UserNavModel>
const themeStore = useThemeStore()
const userPrefStore = useUserPrefStore()
const hueThemeStore = useHueThemeStore()
const userNavStore = useUserNavStore()
const jwtStore = useJwtStore()
const messageUnreadStore = useMessageUnreadStore()
const totalUnread = computed(() => messageUnreadStore.totalUnread())

// 挂载时拉取跨模块未读汇总（msg_feed/unread），刷新「我的消息」未读徽标；
// 未登录时跳过，避免未授权请求
onMounted(async () => {
  if (!isLoggedIn.value) return
  const s = await fetchUnreadSummary()
  if (s) messageUnreadStore.applySummary(s)
})

// 计算当前经验进度百分比
const expProgress = computed(() => {
  const levelInfo = user_nav_model.value?.level_info
  if (!levelInfo) return 0

  // 如果已满级，返回 100%
  if (levelInfo.next_exp === '--') return 100

  // 确保所有值都是数字类型
  const currentExp = parseInt(String(levelInfo.current_exp)) - parseInt(String(levelInfo.current_min))
  const nextExp = parseInt(String(levelInfo.next_exp))

  if (nextExp <= 0) return 100
  const progress = (currentExp / nextExp) * 100
  return Math.min(Math.max(progress, 0), 100)
})

// 用于显示的转换后的数值
const displayCurrentExp = computed(() => {
  return parseInt(user_nav_model.value?.level_info?.current_exp || '0')
})

const displayNextExp = computed(() => {
  return parseInt(user_nav_model.value?.level_info?.next_exp || '0') + parseInt(user_nav_model.value?.level_info?.current_exp || '0')
})

const user_face_src = computed(() => {
  return user_nav_model.value?.face ?? BiliImg.face.noface
})

const headerAvatarDropdown = useTemplateRef<typeof ElDropdown>('headerAvatarDropdown')

const handleThemeClick = (theme: ThemeMode) => {
  themeStore.setTheme(theme)
  // 保持下拉菜单打开
  handleKeepDropdownOpen()
}

// Hue主题选项
const hueThemes = computed(() => {
  return hueThemeStore.history.map((item) => {
    // 默认主题显示为"默认主题"，其他显示为"自定义主题 {ID}"
    if (item.id === 0) {
      return {
        value: item.id,
        label: t('common.defaultTheme'),
        theme: item.theme
      }
    } else {
      return {
        value: item.id,
        label: `${t('common.theme')} ${item.id}`,
        theme: item.theme
      }
    }
  })
})

// 大小主题选项（文案随语言切换）
const sizeThemes = computed<{ value: SizeTheme; label: string }[]>(() => [
  { value: 'xs', label: t('common.sizeXs') },
  { value: 'sm', label: t('common.sizeSm') },
  { value: 'base', label: t('common.sizeBase') },
  { value: 'lg', label: t('common.sizeLg') },
  { value: 'xl', label: t('common.sizeXl') }
])

// 当前主题模式文案（如「主题：深色」），随语言切换
const themeModeText = computed(() => t('common.themeMode', { mode: t(`common.${themeStore.themeMode}`) }))

const themeVisible = ref(false)
const sizeThemeVisible = ref(false)
const hueThemeVisible = ref(false)
const langVisible = ref(false)

// 当任意一个 popover 显示时，隐藏其他 popover
const handlePopoverVisibleChange = (visible: boolean, type: 'theme' | 'size' | 'hue' | 'lang') => {
  if (visible) {
    // 关闭其他 popover
    if (type !== 'theme') themeVisible.value = false
    if (type !== 'size') sizeThemeVisible.value = false
    if (type !== 'hue') hueThemeVisible.value = false
    if (type !== 'lang') langVisible.value = false
  }
  handleKeepDropdownOpen()
}

// 处理个人中心点击
const handleUserCenterClick = () => {
  router.push({ name: RouteName.USER_CENTER })
}

// 处理下拉框大头像点击：跳转到自己的用户空间
const handleMySpaceClick = () => {
  router.push({ name: 'MOMENT_MY_SPACE' })
}

// 处理消息中心点击
const handleMessageCenterClick = () => {
  router.push({ name: 'MESSAGE_WHISPER' })
}

// 处理退出登录
const handleLogout = async () => {
  try {
    await userApi.Logout()
    biliMessage.success(t('common.logoutSuccess'))
  } catch (error) {
    console.error('退出登录失败:', error)
    biliMessage.warning(t('common.logoutFailedCleared'))
  } finally {
    // 清除用户信息和JWT token
    userNavStore.delete_user_nav()
    jwtStore.delete_jwt_token()
    // 跳转到首页
    router.push({ name: RouteName.HOME })
    // 刷新页面
    setTimeout(() => {
      window.location.reload()
    }, 100)
  }
}

// 处理主题可见性变化
const handleThemeVisibleChange = (visible: boolean) => {
  themeVisible.value = visible
  handleKeepDropdownOpen()
}

// 处理Hue主题可见性变化
const handleHueThemeVisibleChange = (visible: boolean) => {
  hueThemeVisible.value = visible
  handleKeepDropdownOpen()
}

// 处理大小主题可见性变化
const handleSizeThemeVisibleChange = (visible: boolean) => {
  sizeThemeVisible.value = visible
  // 保持下拉菜单打开
  handleKeepDropdownOpen()
}

// 设置Hue主题
const handleSetHueTheme = (id: number) => {
  hueThemeStore.currentIndex = id
  hueThemeStore.applyCurrentTheme()
  // 保持下拉菜单打开
  handleKeepDropdownOpen()
}

// 删除Hue主题
const handleDeleteHueTheme = (id: number, event: Event) => {
  event.stopPropagation()
  hueThemeStore.deleteTheme(id)
  // 保持下拉菜单打开
  handleKeepDropdownOpen()
}

// 设置大小主题
const handleSetSizeTheme = (theme: SizeTheme) => {
  userPrefStore.setSizeTheme(theme)
  // 保持下拉菜单打开
  handleKeepDropdownOpen()
}

// 随机生成主题
const handleRandomizeHueTheme = () => {
  if (hueThemeStore.canGenerate) {
    hueThemeStore.randomizeTheme()
  }
  // 保持下拉菜单打开
  handleKeepDropdownOpen()
}

// 恢复默认主题
const handleRestoreHueTheme = () => {
  hueThemeStore.restoreDefaultTheme()
  // 保持下拉菜单打开
  handleKeepDropdownOpen()
}

// 语言选项（与 SUPPORTED_LOCALES 对齐：zh-CN / en / zh-TW / ja / ko）
const localeOptions: { value: SupportedLocale; label: string }[] = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'en', label: 'English' },
  { value: 'zh-TW', label: '繁體中文' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' }
]

const localeStore = useLocaleStore()
const currentLangLabel = computed(() => localeOptions.find((o) => o.value === localeStore.locale)?.label ?? '简体中文')

const handleLangVisibleChange = (visible: boolean) => {
  langVisible.value = visible
  handleKeepDropdownOpen()
}

const handleSetLocale = (locale: SupportedLocale) => {
  localeStore.setLocale(locale)
  handleKeepDropdownOpen()
}

const handleKeepDropdownOpen = () => {
  // 保持下拉菜单打开
  headerAvatarDropdown.value?.popperRef?.onOpen()
}

const handleDropDownVisibleChange = (visible: boolean) => {
  ; (themeVisible.value || sizeThemeVisible.value || hueThemeVisible.value || visible) &&
    handleKeepDropdownOpen()
}
</script>

<template>
  <el-dropdown @mouseover=" headerAvatarDropdown?.handleOpen()" trigger="click" :hide-on-click="false"
    ref="headerAvatarDropdown" @visible-change="handleDropDownVisibleChange" :persistent="true" :teleported="true">
    <div class="header-avatar-wrapper cursor-pointer">
      <UserAvatarBox v-if="isLoggedIn" :src="user_face_src" size="default" :level-info="user_nav_model?.level_info"
        :show-exp-bar="false" />
      <div
        class="header-login-entry flex items-center justify-center px-4 py-1.5 text-sm font-medium text-[var(--el-text-color-primary)] hover:text-[var(--el-color-primary)] transition-colors"
        v-else>
        <span>{{ t('common.login') }}</span>
      </div>
    </div>
    <template #dropdown>
      <el-dropdown-menu class="dropdown-menu py-3 px-3">
        <el-dropdown-item class="login-tip hover:!text-inherit hover:!bg-inherit" v-if="!isLoggedIn">
          <HeaderDropdownLoginTip></HeaderDropdownLoginTip>
        </el-dropdown-item>
        <template v-else>
          <!-- 用户信息展示区域 -->
          <div
            class="user-info-section py-6 px-6 flex flex-col items-center border-b border-[var(--el-border-color-light)]">
            <div class="user-info-content flex justify-center">
              <div class="user-info-content__avatar cursor-pointer" @click.stop="handleMySpaceClick">
                <UserAvatarBox :src="user_face_src" size="large" :level-info="user_nav_model?.level_info"
                  :show-exp-bar="false" />
              </div>
            </div>
            <div class="user-info-text mt-4 flex flex-col items-center gap-3 w-full">
              <div class="user-name text-base font-medium text-[var(--el-text-color-primary)] mb-2">{{
                user_nav_model?.user_name }}</div>
              <LevelIcon :level="parseInt(user_nav_model?.level_info?.current_level) || 0" />
              <!-- 经验进度条（el-progress，粉色主题，展示 当前经验 / 下一级经验） -->
              <div class="user-info-exp-bar w-full max-w-[200px] mt-1">
                <el-progress class="user-info-exp-progress" :percentage="expProgress" :stroke-width="6" color="#FB7299"
                  :show-text="false" />
                <div class="user-info-exp-text mt-2 text-sm text-text-secondary text-center">
                  <template v-if="user_nav_model?.level_info?.next_exp === '--'">
                    {{ t('common.maxLevel') }}
                  </template>
                  <template v-else>
                    {{ displayCurrentExp }} / {{ displayNextExp }}
                  </template>
                </div>
              </div>
            </div>
          </div>
          <el-dropdown-item :icon="User" @click="handleUserCenterClick"
            class="dropdown-item text-sm rounded-xl my-3 group">
            <div class="flex items-center justify-between w-full">
              <HeaderAvatarDropdownItem>
                <template #text>{{ t('common.userCenter') }}</template>
              </HeaderAvatarDropdownItem>
              <el-icon-arrow-right
                class="ml-auto h-4 w-4 text-xs text-text-secondary transition-colors duration-300 group-hover:text-[var(--el-text-color-primary)]" />
            </div>
          </el-dropdown-item>
          <el-dropdown-item :icon="ChatDotRound" @click="handleMessageCenterClick"
            class="dropdown-item text-sm rounded-xl my-3 group">
            <div class="flex items-center justify-between w-full">
              <HeaderAvatarDropdownItem>
                <template #text>
                  <div class="flex items-center gap-2">
                    <span>{{ t('common.myMessage') }}</span>
                    <el-badge v-if="totalUnread > 0" :value="totalUnread > 99 ? '99+' : totalUnread" type="danger" />
                  </div>
                </template>
              </HeaderAvatarDropdownItem>
              <el-icon-arrow-right
                class="ml-auto h-4 w-4 text-xs text-text-secondary transition-colors duration-300 group-hover:text-(--el-text-color-primary)" />
            </div>
          </el-dropdown-item>
        </template>

        <!-- 主题设置 -->
        <el-dropdown-item @click="handleThemeVisibleChange(true)" @hover="handleThemeVisibleChange(true)" divided
          :icon="themeStore.getThemeIcon()" class="dropdown-item text-sm rounded-xl my-3 group">
          <el-popover width="230" popper-class="header-avatar-dropdown-popover"
            @show="handlePopoverVisibleChange(true, 'theme')" @hide="handlePopoverVisibleChange(false, 'theme')"
            v-model:visible="themeVisible" placement="left" trigger="hover" :persistent="true">
            <template #reference>
              <div class="flex items-center w-full justify-between">
                <span>{{ themeModeText }}</span>
                <el-icon-arrow-right
                  class="h-4 w-4 text-xs text-text-secondary transition-colors duration-300 group-hover:text-[var(--el-text-color-primary)]" />
              </div>
            </template>
            <template #default>
              <el-dropdown-item :class="{ activated: themeStore.themeMode === 'dark' }"
                @click="handleThemeClick('dark')" :icon="Moon" class="flex items-center justify-between group">
                <span>{{ t('common.dark') }}</span>
                <el-icon-arrow-right
                  class="ml-auto h-4 w-4 text-xs text-text-secondary transition-colors duration-300 group-hover:text-[var(--el-text-color-primary)] activated:!text-[var(--el-color-primary)]" />
              </el-dropdown-item>
              <el-dropdown-item :class="{ activated: themeStore.themeMode === 'light' }"
                @click="handleThemeClick('light')" :icon="Sunny" class="flex items-center justify-between group">
                <span>{{ t('common.light') }}</span>
                <el-icon-arrow-right
                  class="ml-auto h-4 w-4 text-xs text-text-secondary transition-colors duration-300 group-hover:text-[var(--el-text-color-primary)] activated:!text-[var(--el-color-primary)]" />
              </el-dropdown-item>
              <el-dropdown-item :class="{ activated: themeStore.themeMode === 'auto' }"
                @click="handleThemeClick('auto')" :icon="Monitor" class="flex items-center justify-between group">
                <span>{{ t('common.auto') }}</span>
                <el-icon-arrow-right
                  class="ml-auto h-4 w-4 text-xs text-text-secondary transition-colors duration-300 group-hover:text-[var(--el-text-color-primary)] activated:!text-[var(--el-color-primary)]" />
              </el-dropdown-item>
            </template>
          </el-popover>
        </el-dropdown-item>

        <!-- Hue主题设置 -->
        <el-dropdown-item @click="handleHueThemeVisibleChange(true)" @hover="handleHueThemeVisibleChange(true)"
          :icon="MagicStick" class="dropdown-item text-sm rounded-xl my-3 group">
          <el-popover width="230" popper-class="header-avatar-dropdown-popover"
            @show="handlePopoverVisibleChange(true, 'hue')" @hide="handlePopoverVisibleChange(false, 'hue')"
            v-model:visible="hueThemeVisible" placement="left" trigger="hover">
            <template #reference>
              <div class="flex items-center w-full justify-between">
                <span>{{ t('common.colorTheme') }}：{{ hueThemeStore.currentIndex === 0 ? t('common.defaultTheme') : t('common.theme') + ' ' + hueThemeStore.currentIndex }}</span>
                <el-icon-arrow-right
                  class="h-4 w-4 text-xs text-text-secondary transition-colors duration-300 group-hover:text-[var(--el-text-color-primary)]" />
              </div>
            </template>
            <template #default>
              <div class="hue-theme-items">
                <el-dropdown-item v-for="theme in hueThemes" :key="theme.value"
                  :class="{ activated: hueThemeStore.currentIndex === theme.value }"
                  @click="handleSetHueTheme(theme.value)"
                  class="hue-theme-item flex items-center justify-between group">
                  <span>{{ theme.label }}</span>
                  <div class="flex items-center">
                    <el-button v-if="theme.value !== 0 && hueThemeStore.currentIndex !== theme.value"
                      class="delete-theme-btn opacity-0 w-5 h-5 transition-opacity duration-300 hover:scale-110 hover:bg-[var(--el-color-danger)] [&_i]:mr-0"
                      size="small" type="danger" @click="handleDeleteHueTheme(theme.value, $event)" circle
                      :icon="Delete">
                    </el-button>
                    <el-icon-arrow-right v-if="hueThemeStore.currentIndex !== theme.value"
                      class="ml-auto h-4 w-4 text-xs text-text-secondary transition-colors duration-300 group-hover:text-[var(--el-text-color-primary)] activated:!text-[var(--el-color-primary)]" />
                  </div>
                </el-dropdown-item>
              </div>
              <el-dropdown-item :disabled="!hueThemeStore.canGenerate" @click="handleRandomizeHueTheme()" divided
                class="flex items-center justify-between group">
                <span>{{ hueThemeStore.canGenerate ? t('common.createRandomTheme') : t('common.limitReached') }}</span>
                <el-icon-arrow-right
                  class="ml-auto h-4 w-4 text-xs text-text-secondary transition-colors duration-300 group-hover:text-[var(--el-text-color-primary)]" />
              </el-dropdown-item>
              <el-dropdown-item @click="handleRestoreHueTheme()" divided
                class="flex items-center justify-between group">
                <span>{{ t('common.restoreDefault') }}</span>
                <el-icon-arrow-right
                  class="ml-auto h-4 w-4 text-xs text-text-secondary transition-colors duration-300 group-hover:text-[var(--el-text-color-primary)]" />
              </el-dropdown-item>
            </template>
          </el-popover>
        </el-dropdown-item>

        <!-- 大小主题设置 -->
        <el-dropdown-item @click="handleSizeThemeVisibleChange(true)" @hover="handleSizeThemeVisibleChange(true)"
          :icon="ScaleToOriginal" class="dropdown-item text-sm rounded-xl my-3 group">
          <el-popover width="230" popper-class="header-avatar-dropdown-popover"
            @show="handlePopoverVisibleChange(true, 'size')" @hide="handlePopoverVisibleChange(false, 'size')"
            v-model:visible="sizeThemeVisible" placement="left" trigger="hover">
            <template #reference>
              <div class="flex items-center w-full justify-between">
                <span>{{ t('common.sizeTheme') }}：{{ sizeThemes.find((s) => s.value === userPrefStore.sizeTheme)?.label || t('common.sizeBase') }}</span>
                <el-icon-arrow-right
                  class="h-4 w-4 text-xs text-text-secondary transition-colors duration-300 group-hover:text-[var(--el-text-color-primary)]" />
              </div>
            </template>
            <template #default>
              <el-dropdown-item v-for="theme in sizeThemes" :key="theme.value"
                :class="{ activated: userPrefStore.sizeTheme === theme.value }" @click="handleSetSizeTheme(theme.value)"
                class="flex items-center justify-between group">
                <span>{{ theme.label }}</span>
                <el-icon-arrow-right v-if="userPrefStore.sizeTheme !== theme.value"
                  class="ml-auto h-4 w-4 text-xs text-text-secondary transition-colors duration-300 group-hover:text-[var(--el-text-color-primary)] activated:!text-[var(--el-color-primary)]" />
              </el-dropdown-item>
            </template>
          </el-popover>
        </el-dropdown-item>

        <!-- 语言设置 -->
        <el-dropdown-item @click="handleLangVisibleChange(true)" @hover="handleLangVisibleChange(true)" divided
          class="dropdown-item text-sm rounded-xl my-3 group">
          <el-popover width="230" popper-class="header-avatar-dropdown-popover"
            @show="handlePopoverVisibleChange(true, 'lang')" @hide="handlePopoverVisibleChange(false, 'lang')"
            v-model:visible="langVisible" placement="left" trigger="hover">
            <template #reference>
              <div class="flex items-center w-full justify-between">
                <span class="flex items-center gap-1.5">
                  <svg viewBox="0 0 1024 1024" width="1em" height="1em" class="text-[var(--el-text-color-primary)]">
                    <path fill="currentColor"
                      d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm0 820c-205.4 0-372-166.6-372-372S306.6 140 512 140s372 166.6 372 372-166.6 372-372 372zm74.5-450.4c-25.6-9.6-44.8-22.4-57.6-38.4-12.8-16-19.2-35.2-19.2-57.6 0-25.6 6.4-46.4 19.2-62.4 12.8-16 33.6-27.2 60.8-35.2l44.8 83.2c-16 6.4-28.8 14.4-38.4 24-9.6 9.6-14.4 22.4-14.4 38.4 0 14.4 6.4 25.6 19.2 33.6 12.8 8 35.2 14.4 67.2 19.2l-25.6 60.8zM376 460.8c6.4-38.4 19.2-73.6 38.4-105.6 22.4-35.2 51.2-62.4 86.4-81.6l-44.8-83.2c-57.6 25.6-102.4 64-134.4 115.2-32 51.2-48 110.4-48 176s16 124.8 48 176c32 51.2 76.8 89.6 134.4 115.2l44.8-83.2c-35.2-19.2-64-46.4-86.4-81.6-19.2-32-32-70.4-38.4-110.4H512v-76.8H376z" />
                  </svg>
                  {{ t('common.language') }}：{{ currentLangLabel }}
                </span>
                <el-icon-arrow-right
                  class="ml-auto h-4 w-4 text-xs text-text-secondary transition-colors duration-300 group-hover:text-[var(--el-text-color-primary)]" />
              </div>
            </template>
            <template #default>
              <el-dropdown-item v-for="opt in localeOptions" :key="opt.value"
                :class="{ activated: localeStore.locale === opt.value }" @click="handleSetLocale(opt.value)"
                class="flex items-center justify-between group">
                <span>{{ opt.label }}</span>
                <el-icon-arrow-right v-if="localeStore.locale !== opt.value"
                  class="ml-auto h-4 w-4 text-xs text-text-secondary transition-colors duration-300 group-hover:text-[var(--el-text-color-primary)] activated:!text-[var(--el-color-primary)]" />
              </el-dropdown-item>
            </template>
          </el-popover>
        </el-dropdown-item>

        <!-- 退出登录按钮 -->
        <el-dropdown-item v-if="isLoggedIn" :icon="SwitchButton" @click="handleLogout"
          class="dropdown-item text-sm rounded-xl my-3 logout-dropdown-item" divided>
          <span style="color: #f56c6c;">{{ t('common.logout') }}</span>
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>