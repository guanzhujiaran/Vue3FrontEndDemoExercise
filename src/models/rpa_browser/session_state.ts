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
 * 会话生命周期状态中文映射
 */
export const SessionLifecycleStateLabel: Record<SessionLifecycleState, string> = {
  [SessionLifecycleState.INITIALIZING]: "初始化中",
  [SessionLifecycleState.ACTIVE]: "活跃",
  [SessionLifecycleState.IDLE]: "空闲",
  [SessionLifecycleState.SUSPENDING]: "挂起中",
  [SessionLifecycleState.TERMINATING]: "终止中",
  [SessionLifecycleState.TERMINATED]: "已终止"
}

/**
 * 获取会话生命周期状态的中文标签
 */
export function getSessionLifecycleStateLabel(state: SessionLifecycleState): string {
  return SessionLifecycleStateLabel[state] || state
}
