import BaseApi from '@/api/base_axios/base_api'
import type { RootObject } from '@/models/api/base_model'
import type {
  WorkflowList,
  WorkflowListItem,
  WorkflowDetail,
  WorkflowCreate,
  WorkflowCreateResponse,
  WorkflowUpdate,
  WorkflowDuplicateResponse,
  WorkflowExecuteRequest,
  WorkflowExecuteResponse,
  WorkflowExecuteResponse as WorkflowExecResp
} from '@/types/browser-automation-api'

class WorkflowsApi extends BaseApi {
  constructor() {
    super()
    this.path = '/api/v1/rpa/browser/control'
  }

  getWorkflowsList(params: {
    browser_id: string
    page?: number
    page_size?: number
    name?: string
    tags?: string[]
  }): Promise<RootObject<any>> {
    const body = {
      req: {
        page: params.page || 1,
        page_size: params.page_size || 20,
        name: params.name || '',
        tags: params.tags || []
      },
      body: { browser_id: params.browser_id }
    }
    return this._post('/workflows/list', body)
  }

  getWorkflow(params: {
    browser_id: string
    workflow_id: number
  }): Promise<RootObject<any>> {
    const body = {
      req: { id: params.workflow_id },
      body: { browser_id: params.browser_id }
    }
    return this._post('/workflows/get', body)
  }

  createWorkflow(params: {
    browser_id: string
    name: string
    steps: Array<{
      action_id: string
      params?: Record<string, any>
      loop_count?: number | null
      loop_while?: string | null
      loop_until?: string | null
      retry?: number
      condition?: string | null
      user_data?: Record<string, any> | null
    }>
    on_error?: string
    description?: string
    tags?: string[]
    user_data?: Record<string, any> | null
  }): Promise<RootObject<any>> {
    const body = {
      req: {
        name: params.name,
        steps: params.steps,
        on_error: params.on_error || 'stop',
        description: params.description || '',
        tags: params.tags || [],
        user_data: params.user_data || null
      },
      body: { browser_id: params.browser_id }
    }
    return this._post('/workflows/create', body)
  }

  updateWorkflow(params: {
    browser_id: string
    workflow_id: number
    name?: string
    steps?: Array<{
      action_id: string
      params?: Record<string, any>
      loop_count?: number | null
      loop_while?: string | null
      loop_until?: string | null
      retry?: number
      condition?: string | null
      user_data?: Record<string, any> | null
    }>
    on_error?: string
    description?: string
    tags?: string[]
    user_data?: Record<string, any> | null
    is_enabled?: boolean
  }): Promise<RootObject<any>> {
    const req: Record<string, any> = { id: params.workflow_id }
    if (params.name !== undefined) req.name = params.name
    if (params.steps !== undefined) req.steps = params.steps
    if (params.on_error !== undefined) req.on_error = params.on_error
    if (params.description !== undefined) req.description = params.description
    if (params.tags !== undefined) req.tags = params.tags
    if (params.user_data !== undefined) req.user_data = params.user_data
    if (params.is_enabled !== undefined) req.is_enabled = params.is_enabled

    const body = {
      req,
      body: { browser_id: params.browser_id }
    }
    return this._post('/workflows/update', body)
  }

  deleteWorkflow(params: {
    browser_id: string
    workflow_id: number
  }): Promise<RootObject<any>> {
    const body = {
      req: { id: params.workflow_id },
      body: { browser_id: params.browser_id }
    }
    return this._post('/workflows/delete', body)
  }

  duplicateWorkflow(params: {
    browser_id: string
    workflow_id: number
    new_name?: string
  }): Promise<RootObject<any>> {
    const body = {
      req: {
        id: params.workflow_id,
        new_name: params.new_name || ''
      },
      body: { browser_id: params.browser_id }
    }
    return this._post('/workflows/duplicate', body)
  }

  executeWorkflow(params: {
    browser_id: string
    workflow_id?: number
    name?: string
    steps?: Array<{
      action_id: string
      params?: Record<string, any>
      loop_count?: number | null
      loop_while?: string | null
      loop_until?: string | null
      retry?: number
      condition?: string | null
      user_data?: Record<string, any> | null
    }>
    user_data?: Record<string, any> | null
    on_error?: string
  }): Promise<RootObject<any>> {
    const req: Record<string, any> = {}
    if (params.workflow_id !== undefined) req.id = params.workflow_id
    if (params.name !== undefined) req.name = params.name
    if (params.steps !== undefined) req.steps = params.steps
    if (params.user_data !== undefined) req.user_data = params.user_data
    if (params.on_error !== undefined) req.on_error = params.on_error

    const body = {
      req,
      body: { browser_id: params.browser_id }
    }
    return this._post('/workflows/execute', body)
  }

  listWorkflows(params?: {
    skip?: number
    limit?: number
  }): Promise<RootObject<WorkflowListItem[]>> {
    const requestBody: WorkflowList = {
      skip: params?.skip || 0,
      limit: params?.limit || 100
    }
    return this._post('/workflows/list', requestBody)
  }
}

const workflowsApi = new WorkflowsApi()
export default workflowsApi
export { WorkflowsApi }
