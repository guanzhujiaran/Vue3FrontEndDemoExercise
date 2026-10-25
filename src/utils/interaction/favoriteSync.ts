/**
 * 收藏态同步载荷：收藏夹弹窗操作成功后上抛，父组件据此把收藏态写回状态机。
 *
 * 此前弹窗的 `changed` 事件不带任何数据，父组件只能整页重查互动态接口，
 * 既多一次请求，又存在「重查回来前按钮还是旧态」的窗口；这里改为事件驱动同步。
 */
export interface FavoriteChangedPayload {
  /** 操作后该资源被当前用户收藏在哪些收藏夹（已去重，全量而非增量） */
  folderIds: string[]
  /** 是否已收藏（收藏在任一收藏夹即为 true） */
  isFavorite: boolean
  /** 后端返回的最新收藏数（用户去重）；缺省时由调用方沿用旧值 */
  favoriteCount?: number
}

/** 依据「已收藏的收藏夹 id 全集」构造同步载荷 */
export function toFavoriteChanged(
  folderIds: Iterable<string>,
  favoriteCount?: number
): FavoriteChangedPayload {
  const ids = [...new Set(folderIds)].filter((id) => id !== '')
  return {
    folderIds: ids,
    isFavorite: ids.length > 0,
    ...(favoriteCount == null ? {} : { favoriteCount }),
  }
}