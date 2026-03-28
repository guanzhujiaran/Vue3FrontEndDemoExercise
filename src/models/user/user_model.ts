export interface LoginModel {
  uid: number
  user_name: string
  jwt_token: string
}

export interface UserNavModel {
  uid: string // 这里是 string，因为有可能是 bigint，所以直接用 string 表示
  user_name: string
  role: string
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
  current_level: string
  current_min: string
  next_exp: string
}

export interface UserVipinfo {
  vip_due_date: number // 秒级时间戳
  vip_pay_type: number
  vip_status: number
  vip_type: number
}
