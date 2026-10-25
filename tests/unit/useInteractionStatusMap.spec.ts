import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InteractionBizTypeEnum } from '@/api/notify/moment-api'
import type { InteractionStatusItem } from '@/api/notify/moment-api'
import { useInteractionStatusMap } from '@/composables/useInteractionStatusMap'
import { toFavoriteChanged } from '@/utils/interaction/favoriteSync'

/**
 * 列表页互动态仓库测试（mock 掉 API 层）。
 *
 * 关注点：
 * 1. ensure 的缓存过滤（只补未加载项）与 force 强制重查；
 * 2. applyFavorite：优先用后端 favoriteCount，缺省才按态翻转 ±1，同态不动计数；
 * 3. toggleLike：乐观更新 + 后端回包落定 + 失败回滚（含 interaction 模块回调）；
 * 4. 无互动态时的兜底重查。
 */

const fetchInteractionStatus = vi.fn()
const thumbMoment = vi.fn()
const errorMock = vi.fn()

vi.mock('@/api/notify/moment-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/notify/moment-api')>()
  return {
    ...actual,
    fetchInteractionStatus: (...args: unknown[]) => fetchInteractionStatus(...args),
    thumbMoment: (...args: unknown[]) => thumbMoment(...args),
  }
})

vi.mock('@/utils/message', () => ({
  default: { error: (...args: unknown[]) => errorMock(...args) },
}))

function statusItem(patch: Partial<InteractionStatusItem> = {}): InteractionStatusItem {
  return {
    bizType: InteractionBizTypeEnum.DYNAMIC,
    bizId: '9007199254740993',
    likeCount: 0,
    commentCount: 0,
    repostCount: 0,
    viewCount: 0,
    favoriteCount: 0,
    isLike: false,
    isFavorite: false,
    ...patch,
  }
}

beforeEach(() => {
  fetchInteractionStatus.mockReset()
  thumbMoment.mockReset()
  errorMock.mockReset()
})

describe('useInteractionStatusMap · ensure', () => {
  it('只请求未加载的 id', async () => {
    fetchInteractionStatus.mockResolvedValue({ items: [statusItem()] })
    const { ensure, statusOf } = useInteractionStatusMap()
    await ensure(['9007199254740993'])
    expect(statusOf('9007199254740993')).not.toBeNull()

    await ensure(['9007199254740993'])
    expect(fetchInteractionStatus).toHaveBeenCalledTimes(1)
  })

  it('force=true 强制重查（收藏后校准）', async () => {
    fetchInteractionStatus.mockResolvedValue({ items: [statusItem()] })
    const { ensure } = useInteractionStatusMap()
    await ensure(['9007199254740993'])
    await ensure(['9007199254740993'], true)
    expect(fetchInteractionStatus).toHaveBeenCalledTimes(2)
  })

  it('请求失败不抛错（弱依赖）', async () => {
    fetchInteractionStatus.mockRejectedValue(new Error('network'))
    const { ensure, statusOf } = useInteractionStatusMap()
    await expect(ensure(['9007199254740993'])).resolves.toBeUndefined()
    expect(statusOf('9007199254740993')).toBeNull()
  })
})

describe('useInteractionStatusMap · applyFavorite', () => {
  it('优先采用后端 favoriteCount', async () => {
    fetchInteractionStatus.mockResolvedValue({ items: [statusItem({ favoriteCount: 4 })] })
    const { ensure, applyFavorite, statusOf } = useInteractionStatusMap()
    await ensure(['9007199254740993'])
    applyFavorite('9007199254740993', toFavoriteChanged(['1'], 5))
    expect(statusOf('9007199254740993')?.favoriteCount).toBe(5)
    expect(statusOf('9007199254740993')?.isFavorite).toBe(true)
  })

  it('后端未带计数时按态翻转 ±1', async () => {
    fetchInteractionStatus.mockResolvedValue({ items: [statusItem({ favoriteCount: 4 })] })
    const { ensure, applyFavorite, statusOf } = useInteractionStatusMap()
    await ensure(['9007199254740993'])
    // 未收藏 → 收藏：4 → 5
    applyFavorite('9007199254740993', toFavoriteChanged(['1']))
    expect(statusOf('9007199254740993')?.favoriteCount).toBe(5)
    // 已收藏 → 取消：5 → 4
    applyFavorite('9007199254740993', toFavoriteChanged([]))
    expect(statusOf('9007199254740993')?.favoriteCount).toBe(4)
    expect(statusOf('9007199254740993')?.isFavorite).toBe(false)
  })

  it('同态重复下发不会把计数刷歪', async () => {
    fetchInteractionStatus.mockResolvedValue({ items: [statusItem({ favoriteCount: 4 })] })
    const { ensure, applyFavorite, statusOf } = useInteractionStatusMap()
    await ensure(['9007199254740993'])
    applyFavorite('9007199254740993', toFavoriteChanged([]))
    applyFavorite('9007199254740993', toFavoriteChanged([]))
    expect(statusOf('9007199254740993')?.favoriteCount).toBe(4)
  })

  it('尚无互动态时兜底强制重查', async () => {
    fetchInteractionStatus.mockResolvedValue({ items: [] })
    const { applyFavorite } = useInteractionStatusMap()
    applyFavorite('9007199254740993', toFavoriteChanged(['1']))
    expect(fetchInteractionStatus).toHaveBeenCalledWith(
      InteractionBizTypeEnum.DYNAMIC,
      ['9007199254740993']
    )
  })
})

describe('useInteractionStatusMap · toggleLike', () => {
  it('乐观置为已赞并 +1，回包后落定', async () => {
    fetchInteractionStatus.mockResolvedValue({ items: [statusItem({ likeCount: 2 })] })
    thumbMoment.mockResolvedValue({ isLike: true, likeCount: 3 })
    const { ensure, toggleLike, statusOf } = useInteractionStatusMap()
    await ensure(['9007199254740993'])

    const onLocalLike = vi.fn()
    await toggleLike('9007199254740993', onLocalLike)

    expect(onLocalLike).toHaveBeenCalledWith(true)
    expect(statusOf('9007199254740993')?.isLike).toBe(true)
    expect(statusOf('9007199254740993')?.likeCount).toBe(3)
    expect(thumbMoment).toHaveBeenCalledWith('9007199254740993', 1, {
      bizType: InteractionBizTypeEnum.DYNAMIC,
      bizId: '9007199254740993',
    })
  })

  it('已赞时发取消（up=2）并 -1', async () => {
    fetchInteractionStatus.mockResolvedValue({ items: [statusItem({ isLike: true, likeCount: 3 })] })
    thumbMoment.mockResolvedValue({ isLike: false, likeCount: 2 })
    const { ensure, toggleLike, statusOf } = useInteractionStatusMap()
    await ensure(['9007199254740993'])
    await toggleLike('9007199254740993')
    expect(thumbMoment.mock.calls[0][1]).toBe(2)
    expect(statusOf('9007199254740993')?.likeCount).toBe(2)
  })

  it('请求抛错时回滚并提示', async () => {
    fetchInteractionStatus.mockResolvedValue({ items: [statusItem({ likeCount: 2 })] })
    thumbMoment.mockRejectedValue(new Error('boom'))
    const { ensure, toggleLike, statusOf } = useInteractionStatusMap()
    await ensure(['9007199254740993'])

    const onLocalLike = vi.fn()
    await expect(toggleLike('9007199254740993', onLocalLike)).resolves.toBe(false)

    const st = statusOf('9007199254740993')
    expect(st?.isLike).toBe(false)
    expect(st?.likeCount).toBe(2)
    expect(onLocalLike).toHaveBeenLastCalledWith(false)
    expect(errorMock).toHaveBeenCalled()
  })

  it('后端返回空（未收藏到资源 / 失败）时同样回滚', async () => {
    fetchInteractionStatus.mockResolvedValue({ items: [statusItem({ likeCount: 2 })] })
    thumbMoment.mockResolvedValue(null)
    const { ensure, toggleLike, statusOf } = useInteractionStatusMap()
    await ensure(['9007199254740993'])
    await toggleLike('9007199254740993')
    expect(statusOf('9007199254740993')?.likeCount).toBe(2)
    expect(statusOf('9007199254740993')?.isLike).toBe(false)
  })
})

describe('useInteractionStatusMap · clear', () => {
  it('清空后 statusOf 回到 null', async () => {
    fetchInteractionStatus.mockResolvedValue({ items: [statusItem()] })
    const { ensure, statusOf, clear } = useInteractionStatusMap()
    await ensure(['9007199254740993'])
    clear()
    expect(statusOf('9007199254740993')).toBeNull()
  })
})