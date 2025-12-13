export type Hue =
  | 'slate' | 'gray' | 'neutral' | 'stone'
  | 'red' | 'orange' | 'amber' | 'yellow'
  | 'lime' | 'green' | 'emerald' | 'teal' | 'cyan'
  | 'sky' | 'blue' | 'indigo' | 'violet' | 'purple' | 'fuchsia' | 'pink' | 'rose'

export interface ElTheme {
  primary: Hue
  success: Hue
  warning: Hue
  danger: Hue
  error: Hue
  info: Hue
}

export type ThemeHistory = ElTheme[]