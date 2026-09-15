import type { Component } from 'vue'
import {
  Mouse,
  Edit,
  Top,
  View,
  Timer,
  Camera,
  Connection,
  SetUp,
  RefreshRight,
  Star,
  Grid,
  Cpu,
  Link,
  QuestionFilled,
} from '@element-plus/icons-vue'

/**
 * 动作的「内置图标」与默认图标
 *
 * 用途：**未选择自定义图标**（`icon_series = 0 || icon_id = 0`）或所选系列/编号
 * 在 `src/assets/action-icons/` 中无对应资源时，展示这里的结果。
 *
 * 口径说明（经需求确认）：默认图标**沿用前端既有实现**（即先前 `ActionCard` 的行为）——
 * 内置动作按 `action_id` 取类型图标，其余（自定义动作 `ca_xxx`、未知类型）回落到
 * `QuestionFilled`，因此图库**无需**再提供 `s_0_*` 默认资源。
 */

/** 内置动作类型图标（按 `action_id` 匹配） */
export const ACTION_TYPE_ICONS: Record<string, Component> = {
  click: Mouse,
  input: Edit,
  navigation: Top,
  navigate: Top,
  new_page: Top,
  screenshot: Camera,
  wait: Timer,
  scroll: View,
  hover: Mouse,
  evaluate: Cpu,
  select: Grid,
  keyboard: SetUp,
  mouse: Mouse,
  llm: Star,
  loop: RefreshRight,
  if_else: Connection,
  composite: Grid,
  custom: Grid,
  plugin: Link,
}

/** 默认动作图标（沿用前端既有默认） */
export const DEFAULT_ACTION_ICON: Component = QuestionFilled

/** 按 `action_id` 解析内置图标；未命中回落默认图标 */
export function resolveActionTypeIcon(actionId?: string | null): Component {
  if (!actionId) return DEFAULT_ACTION_ICON
  return ACTION_TYPE_ICONS[actionId] || DEFAULT_ACTION_ICON
}
