<script setup lang="ts">
import { RouterView } from 'vue-router'
import HeaderView from '@/components/header-bar/HeaderBarView.vue'
import { nextTick, onMounted, ref } from 'vue'
import { useDeviceSystemStore } from '@/stores/device_system.ts'
import { Device, Theme } from '@/models/store/device_system.ts'
import { useDebounceFn } from '@vueuse/core'

const isInit = ref(false)

function setDeviceClass() {
  // 根据 window.innerWidth 设置 DeviceClass
  useDeviceSystemStore().deviceClass = window.innerWidth >= 700 ? Device.desktop : Device.phone
}

const setFontSize = useDebounceFn(() => {
  const n = document.documentElement
  const t = n.clientWidth > 540 ? 540 : n.clientWidth,
    e = t / 10
  n.style.fontSize = e + 'px'
}, 100)

function setThemeClassWithSystem() {
  // 根据 window.matchMedia 设置 setThemeClass
  useDeviceSystemStore().systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
    ? Theme.dark
    : Theme.light
}

onMounted(() => {
  // 窗口宽度监听功能
  setDeviceClass()
  setFontSize()
  isInit.value = true
  window.addEventListener('resize', () => {
    setDeviceClass()
    setFontSize()
  })

  // 系统主题查询
  setThemeClassWithSystem()
  // 监听系统主题是否发生变化
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    setThemeClassWithSystem()
  })
})
</script>

<template>
  <div
    class="white-background"
    v-if="!isInit && useDeviceSystemStore().systemTheme === Theme.light"
  ></div>
  <div
    class="black-background"
    v-if="!isInit && useDeviceSystemStore().systemTheme === Theme.dark"
  ></div>
  <HeaderView v-if="isInit" />
  <RouterView v-if="isInit" />
</template>

<style>
.white-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: white;
  z-index: 9999;
}
.black-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: black;
  z-index: 9999;
}
</style>
