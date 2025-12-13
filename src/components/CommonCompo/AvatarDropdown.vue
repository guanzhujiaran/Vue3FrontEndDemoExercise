<script setup lang="ts">
import { ref, computed, type Ref } from 'vue'
import {
  User,
  Delete,
  Moon,
  Sunny,
  Monitor,
  MagicStick,
  ScaleToOriginal
} from '@element-plus/icons-vue'
import { type ThemeMode, useThemeStore } from '@/stores/theme.ts'
import { useUserPrefStore, type SizeTheme } from '@/stores/user_pref.ts'
import { useHueThemeStore } from '@/stores/hue_theme.ts'
import { BiliImg } from '@/assets/img/BiliImg.ts'
import { KeysEnum, useInject } from '@/models/base/provide_model.ts'
import type { UserNavModel } from '@/models/user/user_model.ts'
import { useRouter } from 'vue-router'
import { RouteName } from '@/models/router'
import type { ElDropdown } from 'element-plus'

const router = useRouter()
const isLoggedIn = computed<boolean>(() => !!user_nav_model.value.uid)
const user_nav_model = useInject(KeysEnum.BiliUser) as Ref<UserNavModel>
const themeStore = useThemeStore()
const userPrefStore = useUserPrefStore()
const hueThemeStore = useHueThemeStore()

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
const dropdownVisible = ref(false)

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
  ;(themeVisible.value || sizeThemeVisible.value || hueThemeVisible.value || visible) &&
    handleKeepDropdownOpen()
}
</script>

<template>
  <el-dropdown
    role="tooltip"
    @mouseover="headerAvatarDropdown?.handleOpen()"
    trigger="click"
    :hide-on-click="false"
    ref="headerAvatarDropdown"
    @visible-change="handleDropDownVisibleChange"
    :persistent="true"
    :teleported="false"
  >
    <div class="header-avatar-wrapper">
      <UserAvatarBox v-if="isLoggedIn" :src="user_face_src" size="default" />
      <div class="header-login-entry" v-else>
        <span> 登录 </span>
      </div>
    </div>
    <template #dropdown>
      <el-dropdown-menu class="dropdown-menu">
        <el-dropdown-item class="login-tip" v-if="!isLoggedIn">
          <HeaderDropdownLoginTip></HeaderDropdownLoginTip>
        </el-dropdown-item>
        <el-dropdown-item :icon="User" v-else @click="handleUserCenterClick" class="dropdown-item">
          <HeaderAvatarDropdownItem>
            <template #text>个人中心</template>
          </HeaderAvatarDropdownItem>
        </el-dropdown-item>

        <!-- 主题设置 -->
        <el-dropdown-item
          @click="handleThemeVisibleChange(true)"
          @hover="handleThemeVisibleChange(true)"
          divided
          :icon="themeStore.getThemeIcon()"
          class="dropdown-item"
        >
          <el-popover
            popper-class="header-avatar-dropdown-popover"
            @show="handlePopoverVisibleChange(true, 'theme')"
            @hide="handlePopoverVisibleChange(false, 'theme')"
            v-model:visible="themeVisible"
            placement="left"
            trigger="hover"
            :persistent="true"
          >
            <template #reference>
              <div class="popover-reference">
                <span> {{ `主题：${themeStore.getThemeText()}` }}</span>
                <el-icon-arrow-right class="dropdown-arrow" />
              </div>
            </template>
            <template #default>
              <el-dropdown-item
                :class="{ activated: themeStore.themeMode === 'dark' }"
                @click="handleThemeClick('dark')"
                :icon="Moon"
              >
                深色
              </el-dropdown-item>
              <el-dropdown-item
                :class="{ activated: themeStore.themeMode === 'light' }"
                @click="handleThemeClick('light')"
                :icon="Sunny"
              >
                浅色
              </el-dropdown-item>
              <el-dropdown-item
                :class="{ activated: themeStore.themeMode === 'auto' }"
                @click="handleThemeClick('auto')"
                :icon="Monitor"
              >
                自动
              </el-dropdown-item>
            </template>
          </el-popover>
        </el-dropdown-item>

        <!-- Hue主题设置 -->
        <el-dropdown-item
          @click="handleHueThemeVisibleChange(true)"
          @hover="handleHueThemeVisibleChange(true)"
          :icon="MagicStick"
          class="dropdown-item"
        >
          <el-popover
            popper-class="header-avatar-dropdown-popover"
            @show="handlePopoverVisibleChange(true, 'hue')"
            @hide="handlePopoverVisibleChange(false, 'hue')"
            v-model:visible="hueThemeVisible"
            placement="left"
            trigger="hover"
          >
            <template #reference>
              <div class="popover-reference">
                <span>
                  色彩主题：{{
                    `主题 ${hueThemeStore.currentIndex === 0 ? '默认' : hueThemeStore.currentIndex}`
                  }}
                </span>
                <el-icon-arrow-right class="dropdown-arrow" />
              </div>
            </template>
            <template #default>
              <div class="hue-theme-items">
                <el-dropdown-item
                  v-for="theme in hueThemes"
                  :key="theme.value"
                  :class="{ activated: hueThemeStore.currentIndex === theme.value }"
                  @click="handleSetHueTheme(theme.value)"
                  class="hue-theme-item"
                >
                  <div class="hue-theme-content">
                    <span>{{ theme.label }}</span>
                    <el-button
                      v-if="theme.value !== 0 && hueThemeStore.currentIndex !== theme.value"
                      class="delete-theme-btn"
                      size="small"
                      type="danger"
                      @click="handleDeleteHueTheme(theme.value, $event)"
                      circle
                      :icon="Delete"
                    >
                    </el-button>
                  </div>
                </el-dropdown-item>
              </div>
              <el-dropdown-item
                :disabled="!hueThemeStore.canGenerate"
                @click="handleRandomizeHueTheme()"
                divided
              >
                {{ hueThemeStore.canGenerate ? '创建随机主题' : '已达上限' }}
              </el-dropdown-item>
              <el-dropdown-item @click="handleRestoreHueTheme()" divided>
                恢复默认
              </el-dropdown-item>
            </template>
          </el-popover>
        </el-dropdown-item>

        <!-- 大小主题设置 -->
        <el-dropdown-item
          @click="handleSizeThemeVisibleChange(true)"
          @hover="handleSizeThemeVisibleChange(true)"
          :icon="ScaleToOriginal"
          class="dropdown-item"
        >
          <el-popover
            popper-class="header-avatar-dropdown-popover"
            @show="handlePopoverVisibleChange(true, 'size')"
            @hide="handlePopoverVisibleChange(false, 'size')"
            v-model:visible="sizeThemeVisible"
            placement="left"
            trigger="hover"
          >
            <template #reference>
              <div class="popover-reference">
                <span>
                  大小主题：{{
                    sizeThemes.find((t) => t.value === userPrefStore.sizeTheme)?.label || '标准'
                  }}
                </span>
                <el-icon-arrow-right class="dropdown-arrow" />
              </div>
            </template>
            <template #default>
              <el-dropdown-item
                v-for="theme in sizeThemes"
                :key="theme.value"
                :class="{ activated: userPrefStore.sizeTheme === theme.value }"
                @click="handleSetSizeTheme(theme.value)"
              >
                {{ theme.label }}
              </el-dropdown-item>
            </template>
          </el-popover>
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<style>
@import '@/assets/components/dropdown/avatar-dropdown-tailwind.css';
</style>
