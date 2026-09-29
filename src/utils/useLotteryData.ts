import { ref } from 'vue';
import lotteryDataBaseApi, {
  type LotteryPaginationParams,
  type LotteryAdvancedQueryParams,
  type OthersLotDynListParams
} from '@/api/lottery_data/bili/lottery_database_bili_api';
import biliMessage from '@/utils/message';
import { collectSsrData, getSsrData } from '@/app/ssrData';

/** SSR 预取数据快照的键（与页面 onServerPrefetch 写入的键保持一致） */
export const ssrDataKeyOf = (lotName: string) => `lot:${lotName}`;
/** 筛选参数元数据快照的键（列表页筛选栏也要两端一致，否则水合不匹配） */
export const ssrFilterKeyOf = (lotName: string) => `lotfilter:${lotName}`;

/** 服务端没有 DOM：轻提示依赖 Element Plus，SSR 下只能打日志 */
const notifyError = (msg: string) => {
  if (import.meta.env.SSR) {
    console.error('[SSR] 抽奖数据加载失败:', msg);
    return;
  }
  biliMessage.error(msg);
};

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

export interface ExtraFilterParams {
  [key: string]: any;
}

export const useLotteryData = (lotName: string) => {
  const page_size = ref(10);
  const extraFilters = ref<ExtraFilterParams>({});
  // 复用静态 HTML 里注入的快照：首屏直接有内容（不会先空后满），随后仍会请求最新数据
  const ssrSnapshot = getSsrData<LotteryDataProps['lot_data']>(ssrDataKeyOf(lotName));
  const lotteryDataProps = ref<LotteryDataProps>({
    lot_name: lotName,
    lot_data: ssrSnapshot ?? {
      items: [],
      total: 0,
    },
    lot_page: 1,
    loading: false,
    error: false,
    error_msg: '',
  });

  /**
   * 请求失败时**不要**清掉已在展示的列表：首屏可能来自静态 HTML 里的快照，
   * 或者上一次已成功加载的数据——因一次刷新失败就清空会让页面反而变空。
   */
  const clearOnlyWhenEmpty = () => {
    if (!lotteryDataProps.value.lot_data?.items?.length) {
      lotteryDataProps.value.lot_data = { items: [], total: 0 };
    }
  };

  const getLotData = async (page_num: number, page_size_val: number) => {
    lotteryDataProps.value.loading = true;
    try {
      let resp;

      const postPaginationMethods = [
        'GetOfficialLottery',
        'GetReserveLottery',
        'GetChargeLottery',
        'GetLiveLottery',
        'GetTopicLottery'
      ];

      if (postPaginationMethods.includes(lotName)) {
        const params: LotteryAdvancedQueryParams = {
          page_num,
          page_size: page_size_val,
          start_ts: extraFilters.value.start_ts ?? null,
          end_ts: extraFilters.value.end_ts ?? null,
          sender_uid: extraFilters.value.sender_uid ?? null,
          min_participants: extraFilters.value.min_participants ?? null,
          max_participants: extraFilters.value.max_participants ?? null,
          status: extraFilters.value.status ?? null,
          is_grand_prize: extraFilters.value.is_grand_prize ?? null,
          keyword: extraFilters.value.keyword ?? null,
          sort_by: extraFilters.value.sort_by ?? null,
          sort_order: extraFilters.value.sort_order ?? null,
          created_at_preset: extraFilters.value.created_at_preset ?? null,
          pub_time_preset: extraFilters.value.pub_time_preset ?? null,
        };

        switch (lotName) {
          case 'GetOfficialLottery':
            resp = await lotteryDataBaseApi.getOfficialLottery(params);
            break;
          case 'GetReserveLottery':
            resp = await lotteryDataBaseApi.getReserveLottery(params);
            break;
          case 'GetChargeLottery':
            resp = await lotteryDataBaseApi.getChargeLottery(params);
            break;
          case 'GetLiveLottery':
          case 'GetTopicLottery':
            resp = lotName === 'GetLiveLottery'
              ? await lotteryDataBaseApi.getLiveLottery(params)
              : await lotteryDataBaseApi.getTopicLottery(params);
            break;
          default:
            resp = await lotteryDataBaseApi.handle_lottery_data({ page_num, page_size: page_size_val }, lotName);
        }
      } else if (lotName === 'GetOthersLotDynList') {
        const params: OthersLotDynListParams = {
          page_num,
          page_size: page_size_val,
          sort_by: extraFilters.value.sort_by ?? null,
          sort_order: extraFilters.value.sort_order ?? null,
          is_lot: extraFilters.value.is_lot ?? null,
          created_at_preset: extraFilters.value.created_at_preset ?? null,
          pub_time_preset: extraFilters.value.pub_time_preset ?? null,
          pub_time_start: extraFilters.value.pub_time_start ?? null,
          pub_time_end: extraFilters.value.pub_time_end ?? null,
          created_at_start: extraFilters.value.created_at_start ?? null,
          created_at_end: extraFilters.value.created_at_end ?? null,
        };
        resp = await lotteryDataBaseApi.getOthersLotDynList(params);
      } else {
        resp = await lotteryDataBaseApi.handle_lottery_data({ page_num, page_size: page_size_val }, lotName);
      }

      if (resp.code === -9999 || resp.code < 0) {
        lotteryDataProps.value.error = true;
        lotteryDataProps.value.error_msg = resp.msg || '网络异常';
        clearOnlyWhenEmpty();
        notifyError(resp.msg || '加载数据失败');
        return { is_succ: false, msg: resp.msg || '加载数据失败' };
      }

      if (resp.code !== 0) {
        lotteryDataProps.value.error = true;
        lotteryDataProps.value.error_msg = resp.msg || '业务错误';
        clearOnlyWhenEmpty();
        notifyError(resp.msg || '业务错误');
        return { is_succ: false, msg: resp.msg || '业务错误' };
      }

      lotteryDataProps.value.lot_data = resp.data ?? { items: [], total: 0 };
      lotteryDataProps.value.error = false;
      lotteryDataProps.value.error_msg = '';
      // 预渲染采集：把真实数据登记给无头浏览器脚本，注入静态 HTML 供客户端首屏复用
      collectSsrData(ssrDataKeyOf(lotName), lotteryDataProps.value.lot_data);
      return { is_succ: true, msg: resp.msg };
    } catch (error) {
      console.error('获取抽奖数据失败:', error);
      lotteryDataProps.value.error = true;
      lotteryDataProps.value.error_msg = '加载数据失败';
      clearOnlyWhenEmpty();
      notifyError('加载数据失败');
      return { is_succ: false, msg: '加载数据失败' };
    } finally {
      lotteryDataProps.value.loading = false;
    }
  };

  return {
    page_size,
    lotteryDataProps,
    getLotData,
    extraFilters,
  };
};
