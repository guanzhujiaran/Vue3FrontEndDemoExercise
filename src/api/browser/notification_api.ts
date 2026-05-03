import BaseApi from '@/api/base_axios/base_api'
import type { RootObject } from '@/models/api/base_model'
import type {
  NotificationConfigCreate,
  NotificationConfigUpsertResp,
  NotifyConfigReadRequest,
  NotificationConfig,
  NotificationConfigDeleteResp
} from '@/types/browser-automation-api'

class NotificationApi extends BaseApi {
  constructor() {
    super()
    this.path = '/api/v1/rpa/browser'
  }

  upsertNotifyConfig(
    params: NotificationConfigCreate
  ): Promise<RootObject<NotificationConfigUpsertResp>> {
    return this._post('/notify/conf/upsert', params)
  }

  readNotifyConfig(
    request: NotifyConfigReadRequest
  ): Promise<RootObject<NotificationConfig | null>> {
    return this._post('/notify/conf/read', request || {})
  }

  deleteNotifyConfig(
    request: NotifyConfigReadRequest
  ): Promise<RootObject<NotificationConfigDeleteResp>> {
    return this._post('/notify/conf/delete', request || {})
  }

  testNotifyConfig(request: {
    title?: string
    content?: string
    browser_id?: string | null
  }): Promise<RootObject<any>> {
    return this._post('/notify/test', request)
  }

  readGlobalNotifyConfig(): Promise<RootObject<NotificationConfig | null>> {
    return this.readNotifyConfig({})
  }

  deleteGlobalNotifyConfig(): Promise<RootObject<NotificationConfigDeleteResp>> {
    return this.deleteNotifyConfig({})
  }
}

const notificationApi = new NotificationApi()
export default notificationApi
export { NotificationApi }
