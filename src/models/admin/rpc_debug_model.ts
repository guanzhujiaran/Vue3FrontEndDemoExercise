/**
 * 管理端「RPC 调试」页模型（be-message `/api/v1/message/admin/rpc-debug`，计划书 §5.22）。
 *
 * 字段均为 snake_case（与后端契约一致）。
 */

/** 一个可测试的 RPC 方法（后端 `RpcDebugMethod`） */
export interface RpcDebugMethodItem {
  /** 方法名（snake_case，契约表键） */
  method_name: string
  /** 提供该 RPC 的服务（be-message / rpa-browser / be-bilibili-crawler） */
  server: string
  /** 实际调用的队列名（= routing_key） */
  routing_key: string
  /** 请求参数模型类名 */
  params_model: string
  /** 请求参数模型的 JSON Schema（JSON 字符串，前端 JSON.parse 后渲染表单） */
  params_schema_json: string
}

/** 一次真实 RPC 调用的结果（后端 `RpcInvokeResult`） */
export interface RpcInvokeResultItem {
  method_name: string
  routing_key: string
  /** 耗时（毫秒，含 MQ 往返） */
  duration_ms: number
  /** RPC 服务端返回的 StandardResponse 信封（失败也原样回显） */
  reply: { code?: number; msg?: string; data?: unknown }
}

/** 发起调试调用的请求体（后端 `RpcInvokeReq`） */
export interface RpcInvokeReqModel {
  method_name: string
  /** 参数的原始 JSON 文本（后端按该方法契约严格校验） */
  payload_json: string
  /** 超时秒数（1~30，默认 5） */
  timeout: number
}
