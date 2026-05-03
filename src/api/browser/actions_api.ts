import BaseApi from '@/api/base_axios/base_api'
import type { RootObject } from '@/models/api/base_model'
import type {
  ActionExecuteRequest,
  ActionResultResponse,
  ActionPreviewRequest,
  ActionPreviewResponse,
  ActionValidateRequest,
  ActionValidateResponse,
  ExecuteStepRequest,
  ExecuteStepResponse,
  BatchActionRequest,
  ActionMetadataResponse
} from '@/types/browser-automation-api'

class ActionsApi extends BaseApi {
  constructor() {
    super()
    this.path = '/api/v1/rpa/browser/control'
  }

  getRegisteredActions(params: {
    browser_id: string
  }): Promise<RootObject<any>> {
    return this._post('/actions/registered', { browser_id: params.browser_id })
  }

  executeAction(params: {
    browser_id: string
    action_id: string
    params?: Record<string, any>
    user_data?: Record<string, any> | null
  }): Promise<RootObject<any>> {
    const body = {
      req: {
        action_id: params.action_id,
        params: params.params || {},
        user_data: params.user_data || null
      },
      body: { browser_id: params.browser_id }
    }
    return this._post('/actions/execute', body)
  }

  executeActionsBatch(params: {
    browser_id: string
    actions: Array<{
      action_id: string
      params?: Record<string, any>
      user_data?: Record<string, any> | null
    }>
  }): Promise<RootObject<any>> {
    const body = {
      req: { actions: params.actions },
      body: { browser_id: params.browser_id }
    }
    return this._post('/actions/batch', body)
  }

  previewAction(params: {
    browser_id: string
    action_id: string
    params?: Record<string, any>
  }): Promise<RootObject<any>> {
    const body = {
      req: {
        action_id: params.action_id,
        params: params.params || {}
      },
      body: { browser_id: params.browser_id }
    }
    return this._post('/actions/preview', body)
  }

  validateAction(params: {
    browser_id: string
    action_id: string
    params?: Record<string, any>
  }): Promise<RootObject<any>> {
    const body = {
      req: {
        action_id: params.action_id,
        params: params.params || {}
      },
      body: { browser_id: params.browser_id }
    }
    return this._post('/actions/validate', body)
  }

  executeActionStep(params: {
    browser_id: string
    action_id: string
    params?: Record<string, any>
  }): Promise<RootObject<any>> {
    const body = {
      req: {
        action_id: params.action_id,
        params: params.params || {}
      },
      body: { browser_id: params.browser_id }
    }
    return this._post('/actions/execute-step', body)
  }

  listRegisteredActions(): Promise<RootObject<ActionMetadataResponse[]>> {
    return this._post('/actions/registered', {})
  }
}

const actionsApi = new ActionsApi()
export default actionsApi
export { ActionsApi }
