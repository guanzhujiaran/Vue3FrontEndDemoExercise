import BaseApi from '@/api/base_axios/base_api'
import type { RootObject } from '@/models/api/base_model'
import type {
  CustomActionList,
  CustomActionListItem,
  CustomActionDetail,
  CustomActionCreate,
  CustomActionCreateResponse,
  CustomActionUpdate,
  CompositeActionStep,
  ActionParameterDef,
  ReloadActionsResponse,
  ListFilterParams,
  BasePaginationResp,
  LikeResponse,
  ReportRequest,
  ReportResponse,
  ForkRequest,
  ForkResponse
} from '@/types/browser-automation-api'

class CustomActionsApi extends BaseApi {
  constructor() {
    super()
    this.path = '/api/v1/rpa/browser/control/custom-actions'
  }

  listCustomActions(params?: ListFilterParams): Promise<RootObject<BasePaginationResp<CustomActionListItem>>> {
    const requestBody: Record<string, any> = {
      page: params?.page ?? 1,
      per_page: params?.per_page ?? 10,
      filter_type: params?.filter_type ?? 'all',
      sort_by: params?.sort_by ?? 'updated_at',
      sort_order: params?.sort_order ?? 'desc'
    }
    return this._post('/list', requestBody)
  }

  getCustomAction(id: number): Promise<RootObject<CustomActionDetail>> {
    return this._post('/get', { id })
  }

  createCustomAction(params: {
    name: string
    action_type?: string
    description?: string
    parameters_schema?: ActionParameterDef[]
    steps?: CompositeActionStep[]
    tags?: string[]
    user_data?: Record<string, any> | null
    is_public?: boolean
  }): Promise<RootObject<CustomActionCreateResponse>> {
    return this._post('/create', {
      ...params,
      action_type: params.action_type || 'composite',
    })
  }

  updateCustomAction(params: {
    id: number
    name?: string | null
    description?: string | null
    parameters_schema?: ActionParameterDef[] | null
    steps?: CompositeActionStep[] | null
    tags?: string[] | null
    user_data?: Record<string, any> | null
    is_enabled?: boolean | null
    is_public?: boolean | null
  }): Promise<RootObject<any>> {
    return this._post('/update', params)
  }

  deleteCustomAction(id: number): Promise<RootObject<any>> {
    return this._post('/delete', { id })
  }

  reloadCustomActions(): Promise<RootObject<ReloadActionsResponse>> {
    return this._post('/reload', {})
  }

  // ===== 社区互动接口 =====

  likeAction(id: number): Promise<RootObject<LikeResponse>> {
    return this._post('/like', { id })
  }

  unlikeAction(id: number): Promise<RootObject<LikeResponse>> {
    return this._post('/unlike', { id })
  }

  reportAction(params: ReportRequest): Promise<RootObject<ReportResponse>> {
    return this._post('/report', params)
  }

  cloneAction(id: number): Promise<RootObject<CustomActionCreateResponse>> {
    return this._post('/clone', { id })
  }

  // ===== Fork 功能接口 =====

  forkAction(params: ForkRequest): Promise<RootObject<ForkResponse>> {
    return this._post('/fork', params)
  }

  getActionForks(id: number, skip = 0, limit = 50): Promise<RootObject<CustomActionListItem[]>> {
    return this._post(`/${id}/forks`, { skip, limit })
  }
}

const customActionsApi = new CustomActionsApi()
export default customActionsApi
export { CustomActionsApi }
