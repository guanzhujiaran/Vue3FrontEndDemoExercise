import { useDeviceSystemStore } from '@/stores/device_system.ts'
import { Device, Theme } from '@/models/store/device_system.ts'
import { useDebounceFn } from '@vueuse/core'

export const setDeviceClass = () => {
  // 根据 window.innerWidth 设置 DeviceClass
  useDeviceSystemStore().deviceClass = window.innerWidth >= 700 ? Device.desktop : Device.phone
}
export const setFontSize = useDebounceFn(() => {
  const n = document.documentElement
  const t = n.clientWidth > 600 ? 600 : n.clientWidth,
    e = t / 10
  n.style.fontSize = e + 'px'
}, 100)

export const setThemeClassWithSystem = () => {
  // 根据 window.matchMedia 设置 setThemeClass
  useDeviceSystemStore().systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
    ? Theme.dark
    : Theme.light
}
