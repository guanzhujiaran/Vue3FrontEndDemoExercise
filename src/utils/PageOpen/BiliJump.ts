import { isMobileDevice } from '@/utils/Browser/useDeviceDetect.ts'

const windowOpenFeature = 'noopener=yes,noreferrer=yes'
const is_mobile = isMobileDevice()
export const gotoBiliUserSpace = (uid: number | string | undefined) => {
  if (uid) {
    if (is_mobile === 1) {
      window.open(`https://space.bilibili.com/${uid}`, '_blank', windowOpenFeature)
    } else {
      window.open(`bilibili://space/${uid}`, '_blank', windowOpenFeature)
    }
  }
}
export const gotoOpusDynamic = (dynamic_id: string | number | undefined) => {
  if (dynamic_id) {
    if (is_mobile === 1) {
      window.open(`https://www.bilibili.com/opus/${dynamic_id}`, '_blank', windowOpenFeature)
    } else {
      window.open(`bilibili://opus/detail/${dynamic_id}`, '_blank', windowOpenFeature)
    }
  }
}

export const getBiliUserSpaceUrl = (uid: number | string | undefined | null) => {
  if (!uid) return ''
  return is_mobile == 2
    ? `bilibili://space/${uid}?defaultTab=dynamic`
    : `https://space.bilibili.com/${uid}/dynamic`
}
export const getBiliOpusUrl = (dynid: number | string | undefined) => {
  if (!dynid) return ''
  return is_mobile == 2
    ? `bilibili://opus/detail/${dynid}`
    : `https://www.bilibili.com/opus/${dynid}`
}
export const getBiliWebView = (url: string | undefined) => {
  if (!url) return ''
  return is_mobile == 2 ? `bilibili://webview?url=${url}` : url
}
export const getBiliLotteryResultUrl = (
  business_id: number | string | undefined | null,
  business_type: number | string | undefined | null
) => {
  if (!business_id || !business_type) return ''
  let ret_url = `https://www.bilibili.com/h5/lottery/result?business_id=${business_id}&business_type=${business_type}`
  return is_mobile == 2 ? getBiliWebView(ret_url) : ret_url
}
