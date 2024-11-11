export interface RootObject<T>{
    code: number
    data: T
    msg: string
    ttl?: number
  }