import type { LoginModel, UserNavModel } from '@/models/user/user_model'
import BaseApi from '../base_axios/base_api'
import type { RootObject } from '@/models/api/base_model.ts'

class FeedbackContentApi extends BaseApi {
  constructor() {
    super()
    this.path = '/api/v1/feedback/content/'
  }

  pub_content(
    title: String,
    content: String,
    desc: String = '',
    type: number
  ): Promise<RootObject<LoginModel>> {
    return this._post('pub_content', { title, content, desc, type })
  }

  get_list(
    page_num: number,
    page_size: number,
    order_by: 'hot' | 'time'
  ): Promise<RootObject<UserNavModel>> {
    return this._get('get_list', { page_num, page_size, order_by })
  }
}

const feedbackContentApi = new FeedbackContentApi()

export default feedbackContentApi
