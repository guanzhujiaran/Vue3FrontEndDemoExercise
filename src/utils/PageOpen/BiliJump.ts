import { isMobileDevice } from '@/utils/Browser/useDeviceDetect.ts'
const windowOpenFeature = 'noopener=yes,noreferrer=yes'
export const gotoBiliUserSpace = (uid: number | string | undefined) => {
  if (uid) {
    const is_mobile = isMobileDevice()
    console.log(is_mobile)
    if (is_mobile === 1) {
      window.open(`https://space.bilibili.com/${uid}`, '_blank', windowOpenFeature)
    } else {
      window.open(`bilibili://space/${uid}`, '_blank', windowOpenFeature)
    }
  }
}
export const gotoOpusDynamic = (dynamic_id: string | number | undefined) => {
  if (dynamic_id) {
    const is_mobile = isMobileDevice()
    console.log(is_mobile)
    if (is_mobile === 1) {
      window.open(`https://www.bilibili.com/opus/${dynamic_id}`, '_blank', windowOpenFeature)
    } else {
      window.open(`bilibili://opus/detail/${dynamic_id}`, '_blank', windowOpenFeature)
    }
  }
}
