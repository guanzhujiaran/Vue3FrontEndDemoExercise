export interface BaseSettingModel {
  /**
   * 键名
   */
  name: string
  /**
   * 当前设置的值
   */
  value: any
  /**
   * 控件类型
   */
  type: BaseSettingType
}

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
  Switch //未实现
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
  }[]
}
export interface BaseSettingTextList extends BaseSettingModel {
  text_props: {
    name:string,
    value: string
    label: string
    placeholder: string
  }[]
}
