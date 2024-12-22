import type { LoginModel, UserNavModel } from '@/models/user/user_model'
import BaseApi from '../base_axios/base_api'
import type { RootObject } from '@/models/base_model'

class FeedbackContentApi extends BaseApi {
  constructor() {
    super()
    this.path = '/api/v1/feedback/content/'
  }

  async pub_content(
    title: String,
    content: String,
    desc: String = '',
    type: number
  ): Promise<RootObject<LoginModel>> {
    return await this._post('pub_content', { title, content, desc, type })
  }

  async get_list(
    page_num: number,
    page_size: number,
    order_by: 'hot' | 'time'
  ): Promise<RootObject<UserNavModel>> {
    return await this._get('get_list', { page_num, page_size, order_by })
  }
}

const feedbackContentApi = new FeedbackContentApi()

export default feedbackContentApi
