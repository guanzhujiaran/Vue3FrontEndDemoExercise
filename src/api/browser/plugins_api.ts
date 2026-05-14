import BaseApi from '@/api/base_axios/base_api'
import type { RootObject } from '@/models/api/base_model'
import type {
  PluginListItem,
  PluginDetail,
  PluginCreateRequest,
  PluginUpdateRequest,
  PluginListRequest,
  PluginSchemaResponse,
  BasePaginationResp
} from '@/types/browser-automation-api'

class PluginsApi extends BaseApi {
  constructor() {
    super()
    this.path = '/api/v1/rpa/browser/control'
  }

  listPlugins(params?: PluginListRequest): Promise<RootObject<BasePaginationResp<PluginListItem>>> {
    const requestBody: Record<string, any> = {
      page: params?.page ?? 1,
      per_page: params?.per_page ?? 10,
      filter_type: params?.filter_type ?? 'all',
      sort_by: params?.sort_by ?? 'updated_at',
      sort_order: params?.sort_order ?? 'desc'
    }
    if (params?.browser_info_id !== undefined) {
      requestBody.browser_info_id = params.browser_info_id
    }
    return this._post('/plugins/list', requestBody)
  }

  getPlugin(pluginId: string): Promise<RootObject<PluginDetail>> {
    return this._post('/plugins/get', { plugin_id: pluginId })
  }

  getPluginSchema(pluginId: string): Promise<RootObject<PluginSchemaResponse>> {
    return this._post('/plugins/schema', { plugin_id: pluginId })
  }

  createPlugin(params: PluginCreateRequest): Promise<RootObject<{ id: number; plugin_id: string; message: string }>> {
    return this._post('/plugins/create', params)
  }

  updatePlugin(params: PluginUpdateRequest): Promise<RootObject<any>> {
    return this._post('/plugins/update', params)
  }

  deletePlugin(pluginId: string): Promise<RootObject<any>> {
    return this._post('/plugins/delete', { plugin_id: pluginId })
  }
}

const pluginsApi = new PluginsApi()
export default pluginsApi
export { PluginsApi }