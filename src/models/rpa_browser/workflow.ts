/**
 * 工作流列表项模型
 *
 * 对应后端工作流列表接口 `list_workflows` 返回的 item 结构
 * （hey-api 生成的类型未展开 item 结构，故在此手工声明）。
 * 供工作流管理页（WorkflowManagement.vue）与工作流卡片组件
 * （components/rpa-browser/WorkflowCard.vue）共用。
 */
export interface WorkflowItem {
  id: number
  workflow_id: string
  name: string
  custom_action_id: string | null
  description: string
  browser_id: number | null
  trigger_type: string
  trigger_config: Record<string, unknown> | null
  is_enabled: boolean
  is_public: boolean
  likes_count: number
  reports_count: number
  is_verified: boolean
  forks_count: number
  forked_from_id: number | null
  /** 上游是否有新版本可同步（仅 Fork 副本有意义） */
  has_upstream_update?: boolean
  /** 上游最近更新时间（秒级时间戳，转本地时间展示） */
  upstream_updated_at?: number | null
  /** 最近一次同步上游的时间（秒级时间戳；null = 从未同步过） */
  last_synced_at?: number | null
  /** 是否开启上游自动同步（仅 Fork 副本有意义） */
  auto_sync_upstream?: boolean
  /** 是否有会被同步覆盖的本地修改（true 时自动同步会跳过） */
  local_steps_modified?: boolean
  /** 当前进行中的运行ID（RUNNING）：有值即正在运行，卡片会显示「停止」 */
  running_run_id?: string | null
  last_run_at: string | null
  last_run_status: string | null
  next_run_at: string | null
  created_at: string | null
  updated_at: string | null
  /** 执行日志开关（三态：true=显式开 / false=显式关 / null=未设置，跟随动作级/项目级开关） */
  log_enabled: boolean | null
  /** 调试模式（三态：true=全量采集——入参/结果/变量池全记、成功也记、不截断；null=未设置） */
  log_debug: boolean | null
  /** 服务重启后是否自动恢复被中断的运行 */
  resume_on_restart?: boolean
  /** 执行目标浏览器ID列表（多浏览器；为空时用 browser_id） */
  browser_ids?: number[] | null
  /** 多浏览器时是否并发执行 */
  concurrent_exec?: boolean
}
