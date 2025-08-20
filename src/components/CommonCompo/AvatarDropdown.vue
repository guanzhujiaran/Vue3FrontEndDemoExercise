<script setup lang="ts">
import { ref } from 'vue'
import { User } from '@element-plus/icons-vue'
import router from '@/router'
import { type ThemeMode, useThemeStore } from '@/stores/theme.ts'
import { BiliImg } from '@/assets/img/BiliImg.ts'
import { KeysEnum, useInject } from '@/models/base/provide_model.ts'
import type { UserNavModel } from '@/models/user/user_model.ts'
const isLoggedIn = computed<boolean>(() => !!user_nav_model.value.uid)
const user_nav_model = useInject(KeysEnum.__Bili_User__) as Ref<UserNavModel>
const themeStore = useThemeStore()
const user_face_src = computed(() => {
  return user_nav_model.value?.face ?? BiliImg.face.noface
})
const headerAvatarDropdown = useTemplateRef('headerAvatarDropdown')
const handleThemeClick = (theme: ThemeMode) => {
  themeStore.setTheme(theme)
  headerAvatarDropdown.value?.handleOpen()
}
const themeVisible = ref(false)
const dropdownVisible = ref(false)
</script>

<template>
  <el-dropdown
    role="tooltip"
    @mouseover.native="headerAvatarDropdown?.handleOpen"
    trigger="click"
    :hide-on-click="false"
    ref="headerAvatarDropdown"
    @visible-change="dropdownVisible = $event"
  >
    <div 
      class="header-avatar-wrapper"
      :class="{ 'header-avatar-wrapper--expanded': dropdownVisible }"
    >
      <UserAvatarBox
        class="header-entry-avatar"
        v-if="isLoggedIn"
        :src="user_face_src"
        size="default"
      />
      <div class="header-login-entry" v-else>
        <span> 登录 </span>
      </div>
    </div>
    <template #dropdown>
      <el-dropdown-menu style="width: 300px; padding: 0 24px 8px">
        <el-dropdown-item v-if="!isLoggedIn">
          <HeaderDropdownLoginTip></HeaderDropdownLoginTip>
        </el-dropdown-item>
        <el-dropdown-item :icon="User" v-else @click="router.push('/user-center')">
          <HeaderAvatarDropdownItem>
            <template #text>个人中心</template>
          </HeaderAvatarDropdownItem>
        </el-dropdown-item>
        <el-dropdown-item @click="themeVisible = true" divided :icon="themeStore.getThemeIcon()">
          <el-popover
            popper-class="header-avatar-dropdown-popover"
            @show="headerAvatarDropdown?.handleOpen"
            @click="headerAvatarDropdown?.handleOpen"
            v-model:visible="themeVisible"
            placement="right"
          >
            <template #reference
              ><HeaderAvatarDropdownItem>
                <template #text> {{ `主题：${themeStore.getThemeText()}` }}</template>
              </HeaderAvatarDropdownItem></template
            >
            <template #default>
              <el-dropdown-item
                :class="{ activated: themeStore.themeMode === 'dark' }"
                @click="handleThemeClick('dark')"
              >
                深色
              </el-dropdown-item>
              <el-dropdown-item
                :class="{ activated: themeStore.themeMode === 'light' }"
                @click="handleThemeClick('light')"
              >
                浅色
              </el-dropdown-item>
              <el-dropdown-item
                :class="{ activated: themeStore.themeMode === 'auto' }"
                @click="handleThemeClick('auto')"
              >
                自动
              </el-dropdown-item>
            </template>
          </el-popover>
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>
<style>
.header-avatar-dropdown-popover {
  --el-dropdown-menuItem-hover-fill: var(--el-color-primary-light-9);
  --el-dropdown-menuItem-hover-color: var(--el-color-primary);
  .activated {
    background-color: var(--el-dropdown-menuItem-hover-fill);
    color: var(--el-dropdown-menuItem-hover-color);
  }
}
</style>
<style scoped>
.header-entry-avatar,
.header-login-entry {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  color: #fff;
  background: #00aeec;
  text-align: center;
  letter-spacing: 0;
  font-size: 14px;
  line-height: 36px;
  font-family:
    PingFang SC,
    HarmonyOS_Medium,
    Helvetica Neue,
    Microsoft YaHei,
    sans-serif;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-avatar-wrapper {
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  transition: transform 0.3s ease;
}

.header-avatar-wrapper:hover,
.header-avatar-wrapper--expanded {
  transform: scale(1.5);
}

.header-avatar-wrapper:focus-visible {
  outline: unset;
}

:deep(
  .el-dropdown-menu__item.login-panel-popover:not(.is-disabled):focus,
  .el-dropdown-menu__item.login-panel-popover:not(.is-disabled):hover
) {
  color: unset;
}
</style>