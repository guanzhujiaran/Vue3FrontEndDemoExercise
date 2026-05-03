import BaseApi from '@/api/base_axios/base_api'
import type { RootObject } from '@/models/api/base_model'
import type {
  UserBrowserDefaultSettingRequest,
  UserBrowserDefaultSettingResponse,
  ApplySettingsRequest
} from '@/types/browser-automation-api'

class DefaultSettingsApi extends BaseApi {
  constructor() {
    super()
    this.path = '/api/v1/rpa/browser'
  }

  getDefaultSettings(): Promise<RootObject<UserBrowserDefaultSettingResponse | null>> {
    return this._post('/default-settings/get', {})
  }

  createOrUpdateDefaultSettings(
    params: UserBrowserDefaultSettingRequest
  ): Promise<RootObject<UserBrowserDefaultSettingResponse>> {
    return this._post('/default-settings/create-or-update', params)
  }

  deleteDefaultSettings(): Promise<RootObject<boolean>> {
    return this._post('/default-settings/delete', {})
  }

  applyDefaultSettingsToBrowser(
    params: ApplySettingsRequest
  ): Promise<RootObject<boolean>> {
    return this._post('/default-settings/apply', params)
  }

  getServerDefaultSettings(): Promise<RootObject<any>> {
    return this._post('/default-settings/server-defaults/get', {})
  }
}

const defaultSettingsApi = new DefaultSettingsApi()
export default defaultSettingsApi
export { DefaultSettingsApi }
