export enum BaseSettingType {
  /**
   * 已实现  BaseSettingRadioList
   */
  Radio,
  RichText, //未实现
  /**
   * 已实现  BaseSettingTextList
   */
  Text,
  Checkbox, //未实现
  Switch, //未实现
  Date = 5
}

export interface BaseSettingModel {
  /**
   * 当前设置的值
   */
  value: any
  /**
   * 控件类型
   */
  type: BaseSettingType
}

export interface BaseSettingRadioList extends BaseSettingModel {
  radio_props: {
    /**
     * 可以选择的值
     */
    value: string | boolean | number
    /**
     * 显示在页面上的内容
     */
    content: string
    label?: string
  }[]
}

export interface BaseSettingTextList extends BaseSettingModel {
  text_props: {
    readonly: boolean
    label: string
    placeholder: string
  }[]
}

export interface BaseSettingDatePicker extends BaseSettingModel {
  date_props: {
    format: string
    disabled_date: number // 时间戳(ms
    label?: string
  }
}
