/*
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-05-31 12:18:13
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-06-12 23:44:25
 * @FilePath: \Vue3FrontEndDemoExercise\src\models\account\account_model.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

export interface AccountInfoModel {
  account_name: string
  uid: string
  info?: {
    uname?: string
    vip?: string
    level?: number
    face?: string | null,
    settings?: AccountSettingModel,
    uid?: number|string,
  } | null
}

export interface AccountSettingModel {
  lottery_setting: {
    CONFIG: {
      COOKIENAME: string //就是account_name，不允许变更！
      AUTO_DailyReward: boolean
      lottery_sep_time_type: number //抽奖间隔模式：1为总运行时间，2为等间隔.
      CommonLottery_switch: boolean //普通抽奖开关，打开后执行一般抽奖动态id内的动态id
      Only_Comment_Lottery_Switch: boolean //只参加评论抽奖
      PersistStore: boolean //持久化存储用户信息，启动时自动登录，一般设置为true
      ProfileDir: string //尽量都用Default，更改userdatadir
      proxy: string
      LIVE_SEND_DM: boolean
    }
    copy_reply_module: {
      comment_copy_chance: number
      comment_paraphrase_chance: number
      AI_reply_chance: number
    }
    prevent_module: {
      share_video_num: number
      share_video_sleep_time: number[]
      share_video_url: string | null
      share_video_switch: boolean
      share_video_chance: number
      share_copy_chance: number
      create_word_dynamic_chp: string[]
      create_word_dynamic_chp_switch: boolean
      share_video_while_repost_chance: number
      share_video_while_repost_sepnum: number
    }
    official_lottery_switch: boolean //执行官方抽奖时自动开启
    user_name: string
    user_mid: string
    Working_clearance_time: number[]
    lottery_run_time: number
    lottery_sep_time: number[] //后续会重新赋值，阶段式运行时间
    at_member: string[] //评论时需要@的对象
    replycontent: string[] //对官方的评论
    non_official_chp: string[] //对非官方的说辞
    defined_reply_msg: string[] //获取评论失败时的默认评论
    repostchance: number //转发动态时，转发内容为评论内容的几率 为0时所有转发的东西都是转发动态
    comment_thumb_chance: number //评论动态时点赞自己评论的几率
    key_word_comment: {
      //关键词回复内容
      red_pocket: number //红包大小
      favorite_food: string[]
      favorite_color: string[]
      birthday_congratulation: string[]
      newyear_congratulation: string[]
      qiafan_promotion: string[]
    }
  }
}


export interface AccountMsgSessionModel {
  content: string
  msg_key: string
  msg_type: string
  receiver_id: string
  timestamp: number
  msg_tips: string
}

export interface AccountRunningStatus{
  is_running:boolean
  last_start_ts:number
  running_msg:string
  

}

