import type { GlobalVarsType } from '@/models/global_var/global_var_model.ts'
import type { InjectionKey, Ref } from 'vue'
import { inject, provide, ref } from 'vue'
import { ScreenTypeEnum } from '@/models/global_var/global_var_model.ts'

export enum KeysEnum {
  globalVars = 'globalVars'
}

export const ProvideKeys = {
  [KeysEnum.globalVars]: Symbol(KeysEnum.globalVars) as InjectionKey<Ref<GlobalVarsType>>
}
const globalVarsDefaultRef = ref<GlobalVarsType>({
  screen_size: ScreenTypeEnum.large
})
const default_val_gen = (key: KeysEnum) => {
  switch (key) {
    case KeysEnum.globalVars:
      provide(ProvideKeys[KeysEnum.globalVars], globalVarsDefaultRef)
      return globalVarsDefaultRef
    default:
      throw new Error(`未知provide！`)
  }
}

export const useInject = (key: KeysEnum) => {
  return inject(key, default_val_gen(key), true)
}
