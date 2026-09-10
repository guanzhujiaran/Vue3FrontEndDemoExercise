import type { ComposerTranslation } from 'vue-i18n'

/**
 * 会话生命周期状态枚举
 * 
 * 对应后端 SessionLifecycleState 枚举
 */
export enum SessionLifecycleState {
  INITIALIZING = "initializing",
  ACTIVE = "active",
  IDLE = "idle",
  SUSPENDING = "suspending",
  TERMINATING = "terminating",
  TERMINATED = "terminated"
}

/**
 * 会话生命周期状态 → i18n key 映射
 *
 * 模型层不依赖 vue-i18n，只给出 key，由 setup 上下文的 t() 负责翻译。
 */
export const SessionLifecycleStateI18nKey: Record<SessionLifecycleState, string> = {
  [SessionLifecycleState.INITIALIZING]: "rpa.lifecycleInitializing",
  [SessionLifecycleState.ACTIVE]: "rpa.lifecycleActive",
  [SessionLifecycleState.IDLE]: "rpa.lifecycleIdle",
  [SessionLifecycleState.SUSPENDING]: "rpa.lifecycleSuspending",
  [SessionLifecycleState.TERMINATING]: "rpa.lifecycleTerminating",
  [SessionLifecycleState.TERMINATED]: "rpa.lifecycleTerminated"
}

/**
 * 获取会话生命周期状态的本地化标签
 *
 * @param state 生命周期状态
 * @param t     vue-i18n 翻译函数（需在 setup 上下文中经 useI18n() 获取）
 */
export function getSessionLifecycleStateLabel(
  state: SessionLifecycleState,
  t: ComposerTranslation
): string {
  const key = SessionLifecycleStateI18nKey[state]
  return key ? t(key) : state
}
