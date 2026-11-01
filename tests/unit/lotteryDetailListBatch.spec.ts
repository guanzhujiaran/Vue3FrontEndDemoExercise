import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getListMock } = vi.hoisted(() => ({ getListMock: vi.fn() }))

vi.mock('@/api/bili_lottery_data/hey-api', () => ({
  V1BiliService: {
    getLotteryDetailListApiV1LotteryDatabaseBiliGetLotteryDetailListGet: (options: unknown) =>
      getListMock(options),
  },
}))
vi.mock('@/api/bili_lottery_data/hey-api/client.gen', () => ({ client: {} }))

import lotteryDataBaseApi, {
  LOTTERY_DETAIL_BATCH_LIMIT,
} from '@/api/lottery_data/bili/lottery_database_bili_api'

function fakeResp(ids: number[]) {
  return {
    code: 0,
    msg: 'success',
    data: { items: ids.map((id) => ({ raw: { lottery_id: id } })) },
  }
}

describe('getLotteryDetailListByIds', () => {
  beforeEach(() => {
    getListMock.mockReset()
    getListMock.mockImplementation(async (options: any) => {
      const ids = String(options.query.lottery_ids).split(',').map(Number)
      return fakeResp(ids.slice().reverse())
    })
  })

  it('空 / 非法 id 不发请求', async () => {
    expect((await lotteryDataBaseApi.getLotteryDetailListByIds([])).data).toEqual([])
    expect((await lotteryDataBaseApi.getLotteryDetailListByIds(['abc', ''])).data).toEqual([])
    expect(getListMock).not.toHaveBeenCalled()
  })

  it('去重保序 + 后端乱序返回也按请求顺序合并', async () => {
    const res = await lotteryDataBaseApi.getLotteryDetailListByIds([3, 1, 3, 2])
    expect(getListMock).toHaveBeenCalledTimes(1)
    expect(getListMock.mock.calls[0][0].query.lottery_ids).toBe('3,1,2')
    expect(res.data.map((i: any) => i.raw.lottery_id)).toEqual([3, 1, 2])
  })

  it('超过上限自动分片，且每片不超过上限', async () => {
    const ids = Array.from({ length: LOTTERY_DETAIL_BATCH_LIMIT * 2 + 7 }, (_, i) => i + 1)
    const res = await lotteryDataBaseApi.getLotteryDetailListByIds(ids)
    expect(getListMock).toHaveBeenCalledTimes(3)
    for (const call of getListMock.mock.calls) {
      expect(String(call[0].query.lottery_ids).split(',').length).toBeLessThanOrEqual(
        LOTTERY_DETAIL_BATCH_LIMIT
      )
    }
    expect(res.data.map((i: any) => i.raw.lottery_id)).toEqual(ids)
  })

  it('单个分片失败只丢该片数据，不抛错', async () => {
    getListMock.mockImplementationOnce(async () => {
      throw new Error('boom')
    })
    getListMock.mockImplementation(async (options: any) => {
      const ids = String(options.query.lottery_ids).split(',').map(Number)
      return fakeResp(ids)
    })
    const res = await lotteryDataBaseApi.getLotteryDetailListByIds([1, 2])
    expect(res.code).toBe(0)
    expect(res.data).toEqual([])
  })
})
