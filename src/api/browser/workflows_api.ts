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
  WorkflowStepRequest,
  ListFilterParams,
  BasePaginationResp,
  LikeResponse,
  ReportRequest,
  ReportResponse,
  EnabledPlugin
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
    filter_type?: ListFilterParams['filter_type']
    sort_by?: ListFilterParams['sort_by']
    sort_order?: ListFilterParams['sort_order']
  }): Promise<RootObject<any>> {
    const req: Record<string, any> = {
      page: params.page || 1,
      page_size: params.page_size || 20,
      name: params.name || '',
      tags: params.tags || [],
      filter_type: params.filter_type ?? 'all',
      sort_by: params.sort_by ?? 'updated_at',
      sort_order: params.sort_order ?? 'desc'
    }
    const body = {
      req,
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
    steps: WorkflowStepRequest[]
    on_error?: string
    description?: string
    tags?: string[]
    user_data?: Record<string, any> | null
    is_public?: boolean
    enabled_plugins?: EnabledPlugin[]
  }): Promise<RootObject<any>> {
    const body = {
      req: {
        name: params.name,
        steps: params.steps,
        on_error: params.on_error || 'stop',
        description: params.description || '',
        tags: params.tags || [],
        user_data: params.user_data || null,
        is_public: params.is_public ?? false,
        enabled_plugins: params.enabled_plugins || []
      },
      body: { browser_id: params.browser_id }
    }
    return this._post('/workflows/create', body)
  }

  updateWorkflow(params: {
    browser_id: string
    workflow_id: number
    name?: string
    steps?: WorkflowStepRequest[]
    on_error?: string
    description?: string
    tags?: string[]
    user_data?: Record<string, any> | null
    is_enabled?: boolean
    is_public?: boolean
    enabled_plugins?: EnabledPlugin[]
  }): Promise<RootObject<any>> {
    const req: Record<string, any> = { id: params.workflow_id }
    if (params.name !== undefined) req.name = params.name
    if (params.steps !== undefined) req.steps = params.steps
    if (params.on_error !== undefined) req.on_error = params.on_error
    if (params.description !== undefined) req.description = params.description
    if (params.tags !== undefined) req.tags = params.tags
    if (params.user_data !== undefined) req.user_data = params.user_data
    if (params.is_enabled !== undefined) req.is_enabled = params.is_enabled
    if (params.is_public !== undefined) req.is_public = params.is_public
    if (params.enabled_plugins !== undefined) req.enabled_plugins = params.enabled_plugins

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
    steps?: WorkflowStepRequest[]
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

  listWorkflows(params?: ListFilterParams): Promise<RootObject<BasePaginationResp<WorkflowListItem>>> {
    const requestBody: Record<string, any> = {
      page: params?.page ?? 1,
      per_page: params?.per_page ?? 10,
      filter_type: params?.filter_type ?? 'all',
      sort_by: params?.sort_by ?? 'updated_at',
      sort_order: params?.sort_order ?? 'desc'
    }
    return this._post('/workflows/list', requestBody)
  }

  // ===== 社区互动接口 =====

  likeWorkflow(params: { browser_id: string; workflow_id: number }): Promise<RootObject<LikeResponse>> {
    return this._post('/workflows/like', {
      req: { id: params.workflow_id },
      body: { browser_id: params.browser_id }
    })
  }

  unlikeWorkflow(params: { browser_id: string; workflow_id: number }): Promise<RootObject<LikeResponse>> {
    return this._post('/workflows/unlike', {
      req: { id: params.workflow_id },
      body: { browser_id: params.browser_id }
    })
  }

  reportWorkflow(params: { browser_id: string } & ReportRequest): Promise<RootObject<ReportResponse>> {
    return this._post('/workflows/report', {
      req: { resource_id: params.resource_id, reason: params.reason, detail: params.detail },
      body: { browser_id: params.browser_id }
    })
  }
}

const workflowsApi = new WorkflowsApi()
export default workflowsApi
export { WorkflowsApi }
