export interface User_base_info_config_form {
  uname: string
  userid: string
  usersign: string
  sex: string
  birthday: string
  // 以下字段由后端 /api/v1/user/user_info 一并返回，但原模型未声明
  mid?: string | number
  email?: string
  avatar?: string
}

// 设置用户角色（赋予管理员权限等）的请求参数
export interface Set_user_role_form {
  target_uid: string | number
  role: string
}
