import { ref } from 'vue';
import lotteryDataBaseApi from '@/api/lottery_data/bili/lottery_database_bili_api';
import emitter from '@/utils/mitt';

export interface LotteryDataProps {
  lot_name: string;
  lot_data: {
    items: any[];
    total: number;
  };
  lot_page: number;
  loading: boolean;
  error: boolean;
  error_msg: string;
}

export const useLotteryData = (lotName: string) => {
  const page_size = ref(10);
  const lotteryDataProps = ref<LotteryDataProps>({
    lot_name: lotName,
    lot_data: {
      items: [],
      total: 0,
    },
    lot_page: 1,
    loading: false,
    error: false,
    error_msg: '',
  });

  const getLotData = async (page_num: number, page_size: number) => {
    lotteryDataProps.value.loading = true;
    try {
      const resp = await lotteryDataBaseApi.handle_lottery_data(
        { page_num, page_size },
        lotName
      );
      
      // 检查是否是网络错误（axios 拦截器返回的错误码）
      if (resp.code === -9999 || resp.code < 0) {
        lotteryDataProps.value.error = true;
        lotteryDataProps.value.error_msg = resp.msg || '网络异常';
        lotteryDataProps.value.lot_data = { items: [], total: 0 };
        emitter.emit('toast', { t: resp.msg || '加载数据失败', e: 'error' });
        return { is_succ: false, msg: resp.msg || '加载数据失败' };
      }
      
      // 检查业务错误
      if (resp.code !== 0) {
        lotteryDataProps.value.error = true;
        lotteryDataProps.value.error_msg = resp.msg || '业务错误';
        lotteryDataProps.value.lot_data = { items: [], total: 0 };
        emitter.emit('toast', { t: resp.msg, e: 'error' });
        return { is_succ: false, msg: resp.msg };
      }
      
      lotteryDataProps.value.lot_data = resp.data ?? { items: [], total: 0 };
      lotteryDataProps.value.error = false;
      lotteryDataProps.value.error_msg = '';
      return { is_succ: true, msg: resp.msg };
    } catch (error) {
      lotteryDataProps.value.error = true;
      lotteryDataProps.value.error_msg = '加载数据失败';
      lotteryDataProps.value.lot_data = { items: [], total: 0 };
      emitter.emit('toast', { t: '加载数据失败', e: 'error' });
      return { is_succ: false, msg: '加载数据失败' };
    } finally {
      lotteryDataProps.value.loading = false;
    }
  };

  return {
    page_size,
    lotteryDataProps,
    getLotData,
  };
};