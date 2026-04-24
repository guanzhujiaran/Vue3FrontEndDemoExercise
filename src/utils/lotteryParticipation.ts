import { useBiliLotteryRecord } from '@/stores/bili_lottery_record'

const getLotteryRecordStore = () => useBiliLotteryRecord()

export const handleLotteryLinkClick = (lotteryId: string) => {
  const store = getLotteryRecordStore()
  if (store.auto_save_lottery && !store.contains(lotteryId)) {
    store.enqueue(lotteryId)
  }
}

export const setLotteryParticipation = (lotteryId: string, participate: boolean) => {
  const store = getLotteryRecordStore()
  if (participate) {
    if (!store.contains(lotteryId)) {
      store.enqueue(lotteryId)
    }
  } else {
    store.remove(lotteryId)
  }
}

export const isLotteryParticipated = (lotteryId: string) => {
  return getLotteryRecordStore().contains(lotteryId)
}