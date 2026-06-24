import { client } from '@/api/bili_lottery_data/hey-api/client.gen'
import type { RootObject } from '@/models/api/base_model.ts'
import type {
  ReplyItem,
  ReplyMainResp,
  ReplyReplyResp,
} from '@/models/api/communication/comment_model.ts'

class FeedbackCommentApi {
  add(
    oid: string | number,
    type: string | number,
    root: string | number,
    parent: string | number,
    content: string,
  ): Promise<RootObject<ReplyItem>> {
    return client.post({
      url: '/api/v1/feedback/comment/add',
      body: { oid, type, root, parent, content },
      headers: { 'Content-Type': 'application/json' },
    }) as Promise<RootObject<ReplyItem>>
  }

  reply_main(
    oid: number | string,
    type: number | string,
    page_size = 10,
    page_num: number,
    order_by: 'hot' | 'time',
  ): Promise<RootObject<ReplyMainResp>> {
    return client.get({
      url: '/api/v1/feedback/comment/reply/main',
      query: { oid, type, page_size, page_num, order_by },
    }) as Promise<RootObject<ReplyMainResp>>
  }

  reply_reply(
    oid: number | string,
    type: number | string,
    root: number | string,
    page_size = 10,
    page_num: number,
  ): Promise<RootObject<ReplyReplyResp>> {
    return client.get({
      url: '/api/v1/feedback/comment/reply/reply',
      query: { oid, type, root, page_size, page_num },
    }) as Promise<RootObject<ReplyReplyResp>>
  }

  action(rpid: number | string, action: 0 | 1 | 2): Promise<RootObject<null>> {
    return client.post({
      url: '/api/v1/feedback/comment/action',
      body: { rpid, action },
      headers: { 'Content-Type': 'application/json' },
    }) as Promise<RootObject<null>>
  }

  del(oid: number | string, type: number | string, rpid: number | string) {
    return client.post({
      url: '/api/v1/feedback/comment/del',
      body: { oid, type, rpid },
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

const feedbackCommentApi = new FeedbackCommentApi()

export default feedbackCommentApi