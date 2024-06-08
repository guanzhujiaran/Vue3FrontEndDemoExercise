import type { BaseSettingRadioList, BaseSettingTextList } from '@/models/base/base_setting_model'

export interface AccountSettingConfigItemModel {
  /**
   * 按钮的设置属性名
   */
  name: string
  /**
   * 设置的标题
   */
  title: string
  /**
   * 设置的提示
   */
  tips: string

  /**
   * 设置的内容，根据设置类型扩展
   */
  setting_content: BaseSettingRadioList | BaseSettingTextList // 写各种不同的设置类型
}
