import type { GlobalVarsType } from '@/models/global_var/global_var_model.ts'
import type { InjectionKey, Ref } from 'vue'
import { inject, provide, ref } from 'vue'
import { ScreenTypeEnum } from '@/models/global_var/global_var_model.ts'
import type { UserNavModel } from '@/models/user/user_model.ts'

export enum KeysEnum {
  globalVars = 'globalVars',
  __Bili_User__ = '__Bili_User__',
  __Bili_Pwd_Sec__ = '__Bili_Pwd_Sec__'
}

export const ProvideKeys = {
  [KeysEnum.globalVars]: Symbol(KeysEnum.globalVars) as InjectionKey<Ref<GlobalVarsType>>,
  [KeysEnum.__Bili_User__]: Symbol(KeysEnum.__Bili_User__) as InjectionKey<Ref<UserNavModel>>,
  [KeysEnum.__Bili_Pwd_Sec__]: Symbol(KeysEnum.__Bili_Pwd_Sec__) as InjectionKey<Ref<string>>
}
const globalVarsDefaultRef = ref<GlobalVarsType>({
  screen_size: ScreenTypeEnum.large
})
const __Bili_User__DefaultRef = ref<UserNavModel>({ uid: 0, user_name: '', role: '', face: '' })
const __Bili_Pwd_Sec__DefaultRef = ref<string>('')
const default_val_gen = (key: KeysEnum) => {
  switch (key) {
    case KeysEnum.globalVars:
      provide(ProvideKeys[KeysEnum.globalVars], globalVarsDefaultRef)
      return globalVarsDefaultRef
    case KeysEnum.__Bili_User__:
      provide(ProvideKeys[KeysEnum.__Bili_User__], __Bili_User__DefaultRef)
      return __Bili_User__DefaultRef
    case KeysEnum.__Bili_Pwd_Sec__:
      provide(ProvideKeys[KeysEnum.__Bili_Pwd_Sec__], __Bili_Pwd_Sec__DefaultRef)
      return __Bili_Pwd_Sec__DefaultRef
    default:
      throw new Error(`未知provide！`)
  }
}

export const useInject = (key: KeysEnum) => {
  return inject(key, default_val_gen(key), true)
}
