<script setup lang="ts">
import { useLocaleStore } from '@/stores/locale'
import { SUPPORTED_LOCALES, type SupportedLocale } from '@/i18n'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const localeStore = useLocaleStore()

const localeOptions: { value: SupportedLocale; label: string }[] = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'en', label: 'English' },
  { value: 'zh-TW', label: '繁體中文' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' }
]

const currentLabel = computed(() => localeOptions.find((o) => o.value === localeStore.locale)?.label ?? '简体中文')
</script>

<template>
  <el-dropdown trigger="click" class="language-switcher" @command="localeStore.setLocale">
    <span class="language-switcher__trigger flex items-center gap-1 cursor-pointer text-text-primary px-2 py-1 hover:text-primary">
      <el-icon><svg viewBox="0 0 1024 1024" width="1em" height="1em"><path fill="currentColor" d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm0 820c-205.4 0-372-166.6-372-372S306.6 140 512 140s372 166.6 372 372-166.6 372-372 372zm74.5-450.4c-25.6-9.6-44.8-22.4-57.6-38.4-12.8-16-19.2-35.2-19.2-57.6 0-25.6 6.4-46.4 19.2-62.4 12.8-16 33.6-27.2 60.8-35.2l44.8 83.2c-16 6.4-28.8 14.4-38.4 24-9.6 9.6-14.4 22.4-14.4 38.4 0 14.4 6.4 25.6 19.2 33.6 12.8 8 35.2 14.4 67.2 19.2l-25.6 60.8zM376 460.8c6.4-38.4 19.2-73.6 38.4-105.6 22.4-35.2 51.2-62.4 86.4-81.6l-44.8-83.2c-57.6 25.6-102.4 64-134.4 115.2-32 51.2-48 110.4-48 176s16 124.8 48 176c32 51.2 76.8 89.6 134.4 115.2l44.8-83.2c-35.2-19.2-64-46.4-86.4-81.6-19.2-32-32-70.4-38.4-110.4H512v-76.8H376z"/></svg></el-icon>
      <span class="language-switcher__label text-sm">{{ currentLabel }}</span>
    </span>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item
          v-for="opt in localeOptions"
          :key="opt.value"
          :command="opt.value"
          :class="{ 'is-active': localeStore.locale === opt.value }"
        >
          {{ opt.label }}
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>
