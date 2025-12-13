export interface SearchBoxProps {
  placeholder?: string // 占位符
  buttonText?: string // 按钮文字
  historyKey?: string // 历史记录存储的 key，默认为 "searchHistory"
  maxHistoryCount?: number // 最大历史记录数量
  maxLength?: number // 输入框最大长度
  clearAllText?: string // 清除所有记录按钮文字
  mode?: 'text' | 'numeric' // 搜索模式：文本或数字
  disabled?: boolean // 是否禁用
  showHistoryIcon?: boolean // 是否显示历史记录图标
  showSearchButton?: boolean // 是否显示搜索按钮
}
