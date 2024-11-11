export interface LotDataView<T>{
    items:T[],
    total:number,
  }

export interface LotDataWrapperProps{
  lot_name:'GetOfficialLottery' | 'GetReserveLottery' | 'GetChargeLottery' | 'GetLiveLottery'|'GetTopicLottery' | string,
  lot_data:LotDataView<any>,
  lot_page:number,
  loading:boolean
}
export interface LotUploadAreaProps{
  title:string,
  placeholder:string,
  is_textarea_able:boolean
}