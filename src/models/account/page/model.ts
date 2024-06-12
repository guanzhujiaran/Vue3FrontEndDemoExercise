import type { AccountInfoModel } from '@/models/account/account_model';


export interface PageShowModel 
  {
  info: AccountInfoModel,
  is_show: boolean,
  actived:boolean
}