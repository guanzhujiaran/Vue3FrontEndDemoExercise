import { describe, expect, it } from 'vitest'
import { toFavoriteChanged } from '@/utils/interaction/favoriteSync'

/**
 * 收藏态同步载荷测试。
 *
 * 这个载荷是「收藏夹弹窗 → 按钮态」的唯一通道：
 * folderIds 决定勾选态，isFavorite 决定星标高亮，favoriteCount 决定计数。
 */
describe('toFavoriteChanged', () => {
  it('空集合 → 未收藏', () => {
    expect(toFavoriteChanged([])).toEqual({ folderIds: [], isFavorite: false })
  })

  it('非空集合 → 已收藏', () => {
    expect(toFavoriteChanged(['101', '102'])).toEqual({
      folderIds: ['101', '102'],
      isFavorite: true,
    })
  })

  it('去重且剔除空串（后端偶发空 folderId_str）', () => {
    expect(toFavoriteChanged(['101', '101', '', '102'])).toEqual({
      folderIds: ['101', '102'],
      isFavorite: true,
    })
  })

  it('携带后端收藏数时透传', () => {
    expect(toFavoriteChanged(['101'], 12)).toEqual({
      folderIds: ['101'],
      isFavorite: true,
      favoriteCount: 12,
    })
  })

  it('favoriteCount 为 undefined 时不带该字段（由调用方按态翻转兜底）', () => {
    expect('favoriteCount' in toFavoriteChanged(['101'], undefined)).toBe(false)
  })

  it('接受任意可迭代集合', () => {
    expect(toFavoriteChanged(new Set(['a', 'b'])).folderIds).toEqual(['a', 'b'])
  })
})