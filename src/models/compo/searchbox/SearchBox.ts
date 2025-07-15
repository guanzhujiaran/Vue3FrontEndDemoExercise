export interface SearchBoxProps {
  placeholder?: string // 占位符
  historyKey?: string // 历史记录存储的 key，默认为 "searchHistory"
  maxHistoryCount?: number
  maxLength?: number
}
