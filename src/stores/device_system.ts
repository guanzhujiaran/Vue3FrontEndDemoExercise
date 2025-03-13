import { ref } from 'vue'
import { defineStore } from 'pinia'
import { Device, Theme } from '@/models/store/device_system.ts'

export const useDeviceSystemStore = defineStore(
  'device-system',
  () => {
    const deviceClass = ref(Device.desktop)
    const systemTheme = ref(Theme.light)
    return { deviceClass, systemTheme }
  },
  {
    persist: {
      key: 'device-system',
      storage: localStorage
    }
  }
)
