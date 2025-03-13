export type BaseSimpleUserInfo = {
  name: string
  uid: number | string
  face?: string
}
export type BaseRankItem = {
  user: BaseSimpleUserInfo
  rank: number
  score: number
}
