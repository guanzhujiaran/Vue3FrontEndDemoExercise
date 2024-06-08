import type { BaseSettingRadioList, BaseSettingType } from '@/models/base/base_setting_model'

export interface UserSettingConfigItemModel {
  /**
   * 按钮的设置属性名
   */
  name: String
  /**
   * 设置的标题
   */
  titile: String
  /**
   * 设置的提示
   */
  tips: String
  /**
   * 设置类型，类型在enum里面
   */
  setting_type: BaseSettingType
  /**
   * 设置的内容，根据设置类型扩展
   */
  setting_content: BaseSettingRadioList // 写各种不同的设置类型
}
