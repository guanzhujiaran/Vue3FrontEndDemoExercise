import BaseApi from '@/api/base_axios/base_api'
import type { RootObject } from '@/models/api/base_model'

export interface ExecuteStepRequest {
  browser_id: string
  action_id: string
  params: Record<string, any>
  step_index?: number
  page_index?: number
  user_data?: any
  enabled_plugins?: string[]
  dry_run?: boolean
}

export interface ExecuteStepResponse {
  success: boolean
  error?: string
  execution_time: number
  logs: Array<{
    level: 'info' | 'warn' | 'error' | 'debug' | 'plugin'
    message: string
    timestamp: number
    source?: string
  }>
  result?: any
  screenshot?: string
  network_requests?: Array<{
    url: string
    method: string
    status: number
    duration: number
  }>
}

export interface PreviewParamsRequest {
  params: Record<string, any>
  variables: Record<string, any>
  template?: string
}

export interface PreviewParamsResponse {
  resolved_params: Record<string, any>
  resolved_template?: string
  warnings?: string[]
}

export interface DebugBreakpoint {
  step_index: number
  enabled: boolean
  condition?: string
}

export interface DebugSessionState {
  session_id: string
  status: 'running' | 'paused' | 'completed' | 'error'
  current_step: number
  total_steps: number
  variables: Record<string, any>
  user_data: any
  breakpoints: DebugBreakpoint[]
  execution_trace: Array<{
    step_index: number
    action_id: string
    status: 'pending' | 'running' | 'success' | 'failed' | 'skipped' | 'paused'
    start_time?: number
    end_time?: number
    error?: string
    logs: Array<{ level: string; message: string; timestamp: number }>
  }>
}

class DebugApi extends BaseApi {
  constructor() {
    super()
    this.path = '/api/v1/rpa/browser/control'
  }

  executeStep(params: ExecuteStepRequest): Promise<RootObject<ExecuteStepResponse>> {
    return this._post('/actions/execute-step', {
      request: {
        action_id: params.action_id,
        params: params.params || {},
        step_index: params.step_index ?? 0,
        page_index: params.page_index ?? 0,
      },
      body: {
        browser_id: params.browser_id,
      },
    })
  }

  previewParams(params: PreviewParamsRequest): Promise<RootObject<PreviewParamsResponse>> {
    return this._post('/actions/preview', {
      body: {},
      request: params,
    })
  }

  validateAction(params: {
    browser_id: string
    action_id: string
    params?: Record<string, any>
  }): Promise<RootObject<any>> {
    return this._post('/actions/validate', {
      body: { browser_id: params.browser_id },
      request: {
        action_id: params.action_id,
        params: params.params || {},
      },
    })
  }

  executeAction(params: {
    browser_id: string
    action_id: string
    params?: Record<string, any>
    user_data?: Record<string, any>
  }): Promise<RootObject<ExecuteStepResponse>> {
    return this._post('/actions/execute', {
      body: { browser_id: params.browser_id },
      request: {
        action_id: params.action_id,
        params: params.params || {},
        user_data: params.user_data,
      },
    })
  }

  executeBatch(params: {
    browser_id: string
    actions: Array<{
      action_id: string
      params?: Record<string, any>
      user_data?: Record<string, any>
    }>
  }): Promise<RootObject<any>> {
    return this._post('/actions/batch', {
      body: { browser_id: params.browser_id },
      request: {
        actions: params.actions,
      },
    })
  }

  getRegisteredActions(): Promise<RootObject<any[]>> {
    return this._post('/actions/registered', {})
  }
}

const debugApi = new DebugApi()
export default debugApi
export { DebugApi }