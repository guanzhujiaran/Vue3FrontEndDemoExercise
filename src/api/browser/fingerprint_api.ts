import BaseApi from '@/api/base_axios/base_api'
import type { RootObject } from '@/models/api/base_model'
import type {
  BrowserFingerprintCreateParams,
  BrowserFingerprintUpsertParams,
  BrowserFingerprintQueryParams,
  BrowserFingerprintDeleteParams,
  BrowserFingerprintListParams,
  BrowserFingerprintCreateResp,
  BrowserFingerprintQueryResp,
  BrowserFingerprintDeleteResp,
  BrowserFingerprintRenameParams,
  BrowserFingerprintRenameResp,
  BasePaginationResp,
  BaseFingerprintBrowserInitParams,
  UserBrowserInfoWithoutPlugin
} from '@/types/browser-automation-api'

class FingerprintApi extends BaseApi {
  constructor() {
    super()
    this.path = '/api/v1/rpa/browser'
  }

  genRandFingerprint(
    params: BrowserFingerprintCreateParams
  ): Promise<RootObject<BaseFingerprintBrowserInitParams>> {
    return this._post('/gen_rand_fingerprint', params)
  }

  upsertFingerprint(
    params: BrowserFingerprintUpsertParams
  ): Promise<RootObject<BrowserFingerprintCreateResp>> {
    return this._post('/upsert_fingerprint', params)
  }

  readFingerprint(
    params: BrowserFingerprintQueryParams
  ): Promise<RootObject<BrowserFingerprintQueryResp | null>> {
    return this._post('/read_fingerprint', params)
  }

  deleteFingerprint(
    params: BrowserFingerprintDeleteParams
  ): Promise<RootObject<BrowserFingerprintDeleteResp>> {
    return this._post('/delete_fingerprint', params)
  }

  countFingerprint(): Promise<RootObject<number>> {
    return this._post('/count_fingerprint', {})
  }

  listFingerprint(
    params: BrowserFingerprintListParams
  ): Promise<RootObject<BasePaginationResp<UserBrowserInfoWithoutPlugin>>> {
    return this._post('/list_fingerprint', params)
  }

  renameFingerprint(
    params: BrowserFingerprintRenameParams
  ): Promise<RootObject<BrowserFingerprintRenameResp>> {
    return this._post('/rename_fingerprint', params)
  }
}

const fingerprintApi = new FingerprintApi()
export default fingerprintApi
export { FingerprintApi }
