export interface LoginModel {
  uid: number
  user_name: string
  jwt_token: string
}

export interface UserNavModel {
  uid: string
  user_name: string
  level?: string
  role?: string
  face: string
  email: string
  level_info: UserLevelInfo
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
  current_exp: string
  current_level: string | number
  current_min: string
  next_exp: string
}

export interface UserVipinfo {
  vip_due_date: number // 秒级时间戳
  vip_pay_type: number
  vip_status: number
  vip_type: number
}
