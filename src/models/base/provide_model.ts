import type { GlobalVarsType } from '@/models/global_var/global_var_model.ts'
import type { InjectionKey, Ref } from 'vue'
import { inject, provide, ref } from 'vue'
import { ScreenTypeEnum } from '@/models/global_var/global_var_model.ts'
import type { UserNavModel } from '@/models/user/user_model.ts'

// 将 enum 改为 const 对象和类型别名，提供更好的 IDE 支持
export const KeysEnum = {
  GlobalVars: 'GlobalVars',
  BiliUser: 'BiliUser',
  BiliPwdSec: 'BiliPwdSec'
} as const

// 添加类型定义
export type KeysEnumType = typeof KeysEnum[keyof typeof KeysEnum]

type ProvideValTypes = Ref<GlobalVarsType | UserNavModel | string>

export const ProvideKeys = {
  [KeysEnum.GlobalVars]: Symbol(KeysEnum.GlobalVars) as InjectionKey<Ref<GlobalVarsType>>,
  [KeysEnum.BiliUser]: Symbol(KeysEnum.BiliUser) as InjectionKey<Ref<UserNavModel>>,
  [KeysEnum.BiliPwdSec]: Symbol(KeysEnum.BiliPwdSec) as InjectionKey<Ref<string>>
}
const globalVarsDefaultRef = ref<GlobalVarsType>({
  screen_size: ScreenTypeEnum.large
})

let __Bili_User__DefaultRef: Ref<UserNavModel> | null = null
const getBiliUserDefaultRef = () => {
  if (!__Bili_User__DefaultRef) {
    __Bili_User__DefaultRef = ref<UserNavModel>({
      uid: '',
      user_name: '',
      role: '',
      face: '',
      level_info: {
        current_exp: 0,
        current_level: 0,
        current_min: 0,
        next_exp: '--'
      }
    })
  }
  return __Bili_User__DefaultRef
}

const __Bili_Pwd_Sec__DefaultRef = ref<string>('')
const default_val_gen = (key: KeysEnumType): ProvideValTypes => {
  switch (key) {
    case KeysEnum.GlobalVars:
      provide(ProvideKeys[KeysEnum.GlobalVars], globalVarsDefaultRef)
      return globalVarsDefaultRef
    case KeysEnum.BiliUser:
      // 直接返回全局 ref，不在 default_val_gen 中 provide
      const biliUserRef = getBiliUserDefaultRef()
      return biliUserRef
    case KeysEnum.BiliPwdSec:
      provide(ProvideKeys[KeysEnum.BiliPwdSec], __Bili_Pwd_Sec__DefaultRef)
      return __Bili_Pwd_Sec__DefaultRef
    default:
      throw new Error(`未知provide！`)
  }
}

export const useInject = (key: KeysEnumType): ProvideValTypes => {
  const injected = inject(key, null, false)

  let result: ProvideValTypes
  if (injected !== null) {
    // 如果已经 inject 到值，直接返回
    result = injected
  } else {
    // 否则返回全局 ref
    result = default_val_gen(key)
  }

  return result
}