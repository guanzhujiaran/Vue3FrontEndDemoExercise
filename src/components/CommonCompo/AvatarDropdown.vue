<script setup lang="ts">
import { ref, computed, type Ref } from 'vue'
import { type ThemeMode, useThemeStore } from '@/stores/theme.ts'
import { useUserPrefStore, type SizeTheme } from '@/stores/user_pref.ts'
import { useHueThemeStore } from '@/stores/hue_theme.ts'
import { BiliImg } from '@/assets/img/BiliImg.ts'
import { KeysEnum, useInject } from '@/models/base/provide_model.ts'
import type { UserNavModel } from '@/models/user/user_model.ts'
import { useRouter } from 'vue-router'
import { RouteName } from '@/models/router'
import type { ElDropdown } from 'element-plus'
import { MagicStick, User, Delete, ScaleToOriginal, Moon, Sunny, Monitor, SwitchButton } from '@element-plus/icons-vue'
import biliMessage from '@/utils/message'
import userApi from '@/api/user/user_api'
import { useUserNavStore } from '@/stores/user_nav'
import { useJwtStore } from '@/stores/jwt_token'
import UserAvatarBox from '@/components/CommonCompo/Bili-User-Compo/UserAvatarBox.vue'
import LevelIcon from '@/components/CommonCompo/LevelIcon.vue'

const router = useRouter()
const isLoggedIn = computed<boolean>(() => !!user_nav_model.value.uid)
const user_nav_model = useInject(KeysEnum.BiliUser) as Ref<UserNavModel>
const themeStore = useThemeStore()
const userPrefStore = useUserPrefStore()
const hueThemeStore = useHueThemeStore()
const userNavStore = useUserNavStore()
const jwtStore = useJwtStore()


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
  return parseInt(user_nav_model.value?.level_info?.next_exp || '0')
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
        label: '默认主题',
        theme: item.theme
      }
    } else {
      return {
        value: item.id,
        label: `主题 ${item.id}`,
        theme: item.theme
      }
    }
  })
})

const sizeThemes: { value: SizeTheme; label: string }[] = [
  { value: 'xs', label: '超小' },
  { value: 'sm', label: '小号' },
  { value: 'base', label: '标准' },
  { value: 'lg', label: '大号' },
  { value: 'xl', label: '超大' }
]

const themeVisible = ref(false)
const sizeThemeVisible = ref(false)
const hueThemeVisible = ref(false)

// 当任意一个 popover 显示时，隐藏其他 popover
const handlePopoverVisibleChange = (visible: boolean, type: 'theme' | 'size' | 'hue') => {
  if (visible) {
    // 关闭其他 popover
    if (type !== 'theme') themeVisible.value = false
    if (type !== 'size') sizeThemeVisible.value = false
    if (type !== 'hue') hueThemeVisible.value = false
  }
  handleKeepDropdownOpen()
}

// 处理个人中心点击
const handleUserCenterClick = () => {
  router.push({ name: RouteName.USER_CENTER })
}

// 处理退出登录
const handleLogout = async () => {
  try {
    await userApi.Logout()
    biliMessage.success('退出登录成功')
  } catch (error) {
    console.error('退出登录失败:', error)
    biliMessage.warning('退出登录失败，但已清除本地状态')
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
  <el-dropdown @mouseover="headerAvatarDropdown?.handleOpen()" trigger="click" :hide-on-click="false"
    ref="headerAvatarDropdown" @visible-change="handleDropDownVisibleChange" :persistent="true" :teleported="true">
    <div class="header-avatar-wrapper cursor-pointer">
      <UserAvatarBox v-if="isLoggedIn" :src="user_face_src" size="default" :level-info="user_nav_model?.level_info"
        :show-exp-bar="false" />
      <div class="header-login-entry flex items-center justify-center px-4 py-1.5 text-sm font-medium text-[var(--el-text-color-primary)] hover:text-[var(--el-color-primary)] transition-colors" v-else>
        <span> 登录 </span>
      </div>
    </div>
    <template #dropdown>
      <el-dropdown-menu class="dropdown-menu py-3 px-3" :effect="themeStore.isDark ? 'dark' : 'light'">
        <el-dropdown-item class="login-tip hover:!text-inherit hover:!bg-inherit" v-if="!isLoggedIn">
          <HeaderDropdownLoginTip></HeaderDropdownLoginTip>
        </el-dropdown-item>
        <template v-else>
          <!-- 用户信息展示区域 -->
          <div class="user-info-section py-6 px-6 flex flex-col items-center border-b border-[var(--el-border-color-light)]">
            <div class="user-info-content flex justify-center">
              <UserAvatarBox :src="user_face_src" size="large" :level-info="user_nav_model?.level_info" :show-exp-bar="false"/>
            </div>
            <div class="user-info-text mt-4 flex flex-col items-center gap-3 w-full">
              <div class="user-name text-base font-medium text-[var(--el-text-color-primary)] mb-2">{{ user_nav_model?.user_name }}</div>
              <LevelIcon :level="parseInt(user_nav_model?.level_info?.current_level) || 0" />
              <!-- 经验进度条 -->
              <div class="exp-progress-container w-full max-w-[200px] flex flex-col gap-2">
                <div class="exp-progress-bar w-full h-2 bg-[var(--el-border-color-light)] rounded overflow-hidden">
                  <div class="exp-progress-fill h-full bg-gradient-to-r from-[#FB7299] to-[#FF9EB9] rounded transition-all duration-300" :style="{ width: expProgress + '%' }"></div>
                </div>
                <div class="exp-progress-text text-sm text-[var(--el-text-color-secondary)] text-center">
                  <template v-if="user_nav_model?.level_info?.next_exp === '--'">
                    已满级
                  </template>
                  <template v-else>
                    {{ displayCurrentExp }} / {{ displayNextExp }}
                  </template>
                </div>
              </div>
            </div>
          </div>
        <el-dropdown-item :icon="User" @click="handleUserCenterClick" class="dropdown-item text-sm rounded-xl my-3 group">
          <div class="flex items-center justify-between w-full">
            <HeaderAvatarDropdownItem>
              <template #text>个人中心</template>
            </HeaderAvatarDropdownItem>
            <el-icon-arrow-right class="ml-auto h-4 w-4 text-xs text-[var(--el-text-color-secondary)] transition-colors duration-300 group-hover:text-[var(--el-text-color-primary)]" />
          </div>
        </el-dropdown-item>
        </template>

        <!-- 主题设置 -->
        <el-dropdown-item @click="handleThemeVisibleChange(true)" @hover="handleThemeVisibleChange(true)" divided
          :icon="themeStore.getThemeIcon()" class="dropdown-item text-sm rounded-xl my-3 group">
          <el-popover popper-class="header-avatar-dropdown-popover" @show="handlePopoverVisibleChange(true, 'theme')"
            @hide="handlePopoverVisibleChange(false, 'theme')" v-model:visible="themeVisible" placement="left"
            trigger="hover" :persistent="true" :effect="themeStore.isDark ? 'dark' : 'light'">
            <template #reference>
              <div class="flex items-center w-full justify-between">
                <span>{{ `主题：${themeStore.getThemeText()}` }}</span>
                <el-icon-arrow-right class="h-4 w-4 text-xs text-[var(--el-text-color-secondary)] transition-colors duration-300 group-hover:text-[var(--el-text-color-primary)]" />
              </div>
            </template>
            <template #default>
              <el-dropdown-item :class="{ activated: themeStore.themeMode === 'dark' }"
                @click="handleThemeClick('dark')" :icon="Moon" class="flex items-center justify-between group">
                <span>深色</span>
                <el-icon-arrow-right class="ml-auto h-4 w-4 text-xs text-[var(--el-text-color-secondary)] transition-colors duration-300 group-hover:text-[var(--el-text-color-primary)] activated:!text-[var(--el-color-primary)]" />
              </el-dropdown-item>
              <el-dropdown-item :class="{ activated: themeStore.themeMode === 'light' }"
                @click="handleThemeClick('light')" :icon="Sunny" class="flex items-center justify-between group">
                <span>浅色</span>
                <el-icon-arrow-right class="ml-auto h-4 w-4 text-xs text-[var(--el-text-color-secondary)] transition-colors duration-300 group-hover:text-[var(--el-text-color-primary)] activated:!text-[var(--el-color-primary)]" />
              </el-dropdown-item>
              <el-dropdown-item :class="{ activated: themeStore.themeMode === 'auto' }"
                @click="handleThemeClick('auto')" :icon="Monitor" class="flex items-center justify-between group">
                <span>自动</span>
                <el-icon-arrow-right class="ml-auto h-4 w-4 text-xs text-[var(--el-text-color-secondary)] transition-colors duration-300 group-hover:text-[var(--el-text-color-primary)] activated:!text-[var(--el-color-primary)]" />
              </el-dropdown-item>
            </template>
          </el-popover>
        </el-dropdown-item>

        <!-- Hue主题设置 -->
        <el-dropdown-item @click="handleHueThemeVisibleChange(true)" @hover="handleHueThemeVisibleChange(true)"
          :icon="MagicStick" class="dropdown-item text-sm rounded-xl my-3 group">
          <el-popover popper-class="header-avatar-dropdown-popover" @show="handlePopoverVisibleChange(true, 'hue')"
            @hide="handlePopoverVisibleChange(false, 'hue')" v-model:visible="hueThemeVisible" placement="left"
            trigger="hover" :effect="themeStore.isDark ? 'dark' : 'light'">
            <template #reference>
              <div class="flex items-center w-full justify-between">
                <span>色彩主题：{{ `主题 ${hueThemeStore.currentIndex === 0 ? '默认' : hueThemeStore.currentIndex}` }}</span>
                <el-icon-arrow-right class="h-4 w-4 text-xs text-[var(--el-text-color-secondary)] transition-colors duration-300 group-hover:text-[var(--el-text-color-primary)]" />
              </div>
            </template>
            <template #default>
              <div class="hue-theme-items">
                <el-dropdown-item v-for="theme in hueThemes" :key="theme.value"
                  :class="{ activated: hueThemeStore.currentIndex === theme.value }"
                  @click="handleSetHueTheme(theme.value)" class="hue-theme-item flex items-center justify-between group">
                  <span>{{ theme.label }}</span>
                  <div class="flex items-center">
                    <el-button v-if="theme.value !== 0 && hueThemeStore.currentIndex !== theme.value"
                      class="delete-theme-btn opacity-0 w-5 h-5 transition-opacity duration-300 hover:scale-110 hover:bg-[var(--el-color-danger)] [&_i]:mr-0"
                      size="small" type="danger"
                      @click="handleDeleteHueTheme(theme.value, $event)" circle :icon="Delete">
                    </el-button>
                    <el-icon-arrow-right v-if="hueThemeStore.currentIndex !== theme.value" class="ml-auto h-4 w-4 text-xs text-[var(--el-text-color-secondary)] transition-colors duration-300 group-hover:text-[var(--el-text-color-primary)] activated:!text-[var(--el-color-primary)]" />
                  </div>
                </el-dropdown-item>
              </div>
              <el-dropdown-item :disabled="!hueThemeStore.canGenerate" @click="handleRandomizeHueTheme()" divided class="flex items-center justify-between group">
                <span>{{ hueThemeStore.canGenerate ? '创建随机主题' : '已达上限' }}</span>
                <el-icon-arrow-right class="ml-auto h-4 w-4 text-xs text-[var(--el-text-color-secondary)] transition-colors duration-300 group-hover:text-[var(--el-text-color-primary)]" />
              </el-dropdown-item>
              <el-dropdown-item @click="handleRestoreHueTheme()" divided class="flex items-center justify-between group">
                <span>恢复默认</span>
                <el-icon-arrow-right class="ml-auto h-4 w-4 text-xs text-[var(--el-text-color-secondary)] transition-colors duration-300 group-hover:text-[var(--el-text-color-primary)]" />
              </el-dropdown-item>
            </template>
          </el-popover>
        </el-dropdown-item>

        <!-- 大小主题设置 -->
        <el-dropdown-item @click="handleSizeThemeVisibleChange(true)" @hover="handleSizeThemeVisibleChange(true)"
          :icon="ScaleToOriginal" class="dropdown-item text-sm rounded-xl my-3 group">
          <el-popover popper-class="header-avatar-dropdown-popover" @show="handlePopoverVisibleChange(true, 'size')"
            @hide="handlePopoverVisibleChange(false, 'size')" v-model:visible="sizeThemeVisible" placement="left"
            trigger="hover" :effect="themeStore.isDark ? 'dark' : 'light'">
            <template #reference>
              <div class="flex items-center w-full justify-between">
                <span>大小主题：{{ sizeThemes.find((t) => t.value === userPrefStore.sizeTheme)?.label || '标准' }}</span>
                <el-icon-arrow-right class="h-4 w-4 text-xs text-[var(--el-text-color-secondary)] transition-colors duration-300 group-hover:text-[var(--el-text-color-primary)]" />
              </div>
            </template>
            <template #default>
              <el-dropdown-item v-for="theme in sizeThemes" :key="theme.value"
                :class="{ activated: userPrefStore.sizeTheme === theme.value }"
                @click="handleSetSizeTheme(theme.value)" class="flex items-center justify-between group">
                <span>{{ theme.label }}</span>
                <el-icon-arrow-right v-if="userPrefStore.sizeTheme !== theme.value" class="ml-auto h-4 w-4 text-xs text-[var(--el-text-color-secondary)] transition-colors duration-300 group-hover:text-[var(--el-text-color-primary)] activated:!text-[var(--el-color-primary)]" />
              </el-dropdown-item>
            </template>
          </el-popover>
        </el-dropdown-item>

        <!-- 退出登录按钮 -->
        <el-dropdown-item v-if="isLoggedIn" :icon="SwitchButton" @click="handleLogout"
          class="dropdown-item text-sm rounded-xl my-3 logout-dropdown-item" divided>
          <span style="color: #f56c6c;">退出登录</span>
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>