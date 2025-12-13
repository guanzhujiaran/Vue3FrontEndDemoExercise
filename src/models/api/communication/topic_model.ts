export interface TopicItem {
  title: string
  mid: number
  uname: string
  pub_ts: number //秒级时间戳
  click_num: number //点击数
  comment_num: number //评论数
  like_num: number //点赞数
  dislike_num: number //点踩数
  is_like: boolean //是否点赞
  is_dislike: boolean //是否点踩
  is_collect: boolean //是否收藏
  genre_id: number
  genre: string // 话题分区
}
