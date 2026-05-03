import BaseApi from '@/api/base_axios/base_api'
import type { RootObject } from '@/models/api/base_model'
import type {
  CustomActionList,
  CustomActionListItem,
  CustomActionDetail,
  CustomActionCreate,
  CustomActionCreateResponse,
  CustomActionUpdate,
  ReloadActionsResponse
} from '@/types/browser-automation-api'

class CustomActionsApi extends BaseApi {
  constructor() {
    super()
    this.path = '/api/v1/rpa/browser/control'
  }

  listCustomActions(params?: {
    skip?: number
    limit?: number
  }): Promise<RootObject<CustomActionListItem[]>> {
    const requestBody: CustomActionList = {
      skip: params?.skip || 0,
      limit: params?.limit || 100
    }
    return this._post('/custom-actions/list', requestBody)
  }

  getCustomAction(params: {
    browser_id: string
    action_id: string
  }): Promise<RootObject<any>> {
    return this._post('/custom-actions/get', {
      req: { action_id: params.action_id },
      body: { browser_id: params.browser_id }
    })
  }

  createCustomAction(params: {
    browser_id: string
    action_id: string
    name?: string
    description?: string
    params?: Record<string, any>
    code?: string
    enabled?: boolean
  }): Promise<RootObject<any>> {
    const req: Record<string, any> = { action_id: params.action_id }
    if (params.name !== undefined) req.name = params.name
    if (params.description !== undefined) req.description = params.description
    if (params.params !== undefined) req.params = params.params
    if (params.code !== undefined) req.code = params.code
    if (params.enabled !== undefined) req.enabled = params.enabled

    return this._post('/custom-actions/create', {
      req,
      body: { browser_id: params.browser_id }
    })
  }

  updateCustomAction(params: {
    browser_id: string
    action_id: string
    name?: string
    description?: string
    params?: Record<string, any>
    code?: string
    enabled?: boolean
  }): Promise<RootObject<any>> {
    const req: Record<string, any> = { action_id: params.action_id }
    if (params.name !== undefined) req.name = params.name
    if (params.description !== undefined) req.description = params.description
    if (params.params !== undefined) req.params = params.params
    if (params.code !== undefined) req.code = params.code
    if (params.enabled !== undefined) req.enabled = params.enabled

    return this._post('/custom-actions/update', {
      req,
      body: { browser_id: params.browser_id }
    })
  }

  deleteCustomAction(params: {
    browser_id: string
    action_id: string
  }): Promise<RootObject<any>> {
    return this._post('/custom-actions/delete', {
      req: { action_id: params.action_id },
      body: { browser_id: params.browser_id }
    })
  }

  reloadCustomActions(params: {
    browser_id: string
  }): Promise<RootObject<any>> {
    return this._post('/custom-actions/reload', { browser_id: params.browser_id })
  }

  reloadCustomActionsCache(): Promise<RootObject<ReloadActionsResponse>> {
    return this._post('/custom-actions/reload', {})
  }
}

const customActionsApi = new CustomActionsApi()
export default customActionsApi
export { CustomActionsApi }
