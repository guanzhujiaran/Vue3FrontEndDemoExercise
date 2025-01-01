import type { LoginModel } from '@/models/user/user_model'
import BaseApi from '../base_axios/base_api'
import type { RootObject } from '@/models/base_model'
import type { ReplyItem, ReplyResp } from '@/models/communication/comment_model.ts'

class FeedbackCommentApi extends BaseApi {
  constructor() {
    super()
    this.path = '/api/v1/feedback/comment/'
  }

  async add(
    oid: string | number,
    type: string | number,
    root: string | number,
    parent: string | number,
    content: string
  ): Promise<RootObject<ReplyItem>> {
    return await this._post('add', { oid, type, root, parent, content })
  }

  async reply_main(
    oid: number | string,
    type: number | string,
    page_size = 10,
    page_num: number,
    order_by: 'hot' | 'time'
  ): Promise<RootObject<ReplyResp>> {
    return await this._get('reply_main', { oid, type, page_size, page_num, order_by })
  }

  async action(rpid: number | string, action: 0 | 1 | 2): Promise<RootObject<null>> {
    return await this._post('action', { rpid, action })
  }
  async del(oid: number | string, type: number | string, rpid: number | string) {
    return await this._post('del', { oid, type, rpid })
  }
}

const feedbackCommentApi = new FeedbackCommentApi()

export default feedbackCommentApi
