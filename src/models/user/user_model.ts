export interface LoginModel {
  uid: number
  user_name: string
  jwt_token: string
}

export interface UserNavModel {
  uid: number | string
  user_name: string
  role: string
}

export interface UserInfo {
  avatar: string
  level_info: UserLevelInfo
  mid: number
  uname: string
  sign: string
  sex: string
  vip: UserVipinfo
}

export interface UserLevelInfo {
  current_exp: number
  current_level: number
  current_min: number
  next_exp: number
}

export interface UserVipinfo {
  vip_due_date: number // 秒级时间戳
  vip_pay_type: number
  vip_status: number
  vip_type: number
}
