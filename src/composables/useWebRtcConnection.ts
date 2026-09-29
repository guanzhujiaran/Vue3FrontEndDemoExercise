import { ref, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { WebRtc视频流Service } from '@/api/browser/hey-api'
import biliMessage from '@/utils/message'
import type { LiveWebrtcStatus } from '@/models/rpa_browser/live_stream'

/**
 * WebRTC 连接层（多观看者并发直播，见 docs/rpa-多观看者并发直播计划书.md）
 *
 * 只负责「一条 PeerConnection 的生死」：offer / answer / ICE 上报 / 等待连通 / 关闭，
 * 不含业务编排（自动重连、看门狗、清晰度等都在 `useLiveStream` 里）。
 *
 * `viewer_id` 由本层持有：**同一组件实例内只生成一枚**，重连复用 ——
 * 后端 `start_stream` 对同 id 做「复用并重建」，不会残留等待回收的僵尸连接，
 * 因此「一个人的重连」不会被算成多个人。
 */

/** 等本端 ICE 候选收集完成的超时（收集不完也照发，trickle 兜底） */
const ICE_GATHER_TIMEOUT_MS = 3000
/** 判定媒体链路真正连通的超时（HTTP 层成功 ≠ 媒体连通） */
const PEER_CONNECT_TIMEOUT_MS = 10000
/** trickle 候选的攒批窗口：覆盖 Chrome 陆续产出候选的间隔 */
const ICE_BATCH_FLUSH_MS = 200

interface StandardResponse {
  code?: number
  msg?: string
}

interface WebrtcOfferResponse {
  code?: number
  msg?: string
  data?: {
    stream_key?: string
    sdp?: string
    type?: string
  }
}

export interface UseWebRtcConnectionOptions {
  browserId: () => string
  /** 播放器 <video> 元素（挂载后才可取到，故用 getter） */
  videoEl: () => HTMLVideoElement | null
  /** 观看的页面索引（offer 时上报） */
  pageIndex: () => number
  /** 连接状态（与 UI 共享） */
  webrtcStatus: Ref<LiveWebrtcStatus>
  /** 是否直播中：收到首帧 / 链路连通时置 true，断开时置 false（与页面共享的 ref） */
  isStreaming: Ref<boolean>
}

export function useWebRtcConnection(options: UseWebRtcConnectionOptions) {
  const { t } = useI18n()

  const peerConnection = ref<RTCPeerConnection | null>(null)
  const localStream = ref<MediaStream | null>(null)
  const viewerId = ref<string>('')
  const streamKey = ref<string>('')

  /** answer 是否已提交给后端（提交前收集到的候选先入队，之后补发） */
  let answerPosted = false
  /** answer 提交前收集到的候选 */
  const pendingCandidates: RTCIceCandidate[] = []
  /** trickle 候选的攒批队列 */
  const candidateQueue: RTCIceCandidate[] = []
  let candidateFlushTimer: number | null = null

  /** 清空攒批队列与定时器（重连时避免把旧候选发给新流） */
  const resetCandidateQueues = () => {
    pendingCandidates.length = 0
    candidateQueue.length = 0
    if (candidateFlushTimer !== null) {
      window.clearTimeout(candidateFlushTimer)
      candidateFlushTimer = null
    }
  }

  /** 等待本端 ICE 候选收集完成（或超时） */
  const waitForIceGatheringComplete = (timeoutMs = ICE_GATHER_TIMEOUT_MS): Promise<void> => {
    const pc = peerConnection.value
    if (!pc || pc.iceGatheringState === 'complete') return Promise.resolve()

    return new Promise<void>((resolve) => {
      let settled = false
      const finish = () => {
        if (settled) return
        settled = true
        window.clearTimeout(timer)
        pc.removeEventListener('icegatheringstatechange', onChange)
        resolve()
      }
      const onChange = () => {
        if (pc.iceGatheringState === 'complete') finish()
      }
      const timer = window.setTimeout(finish, timeoutMs)
      pc.addEventListener('icegatheringstatechange', onChange)
    })
  }

  /** 等待 WebRTC 真正连通（ICE / DTLS 完成） */
  const waitForPeerConnected = (timeoutMs = PEER_CONNECT_TIMEOUT_MS): Promise<boolean> => {
    const pc = peerConnection.value
    if (!pc) return Promise.resolve(false)
    if (pc.connectionState === 'connected') return Promise.resolve(true)

    return new Promise<boolean>((resolve) => {
      let settled = false
      const finish = (ok: boolean) => {
        if (settled) return
        settled = true
        window.clearTimeout(timer)
        pc.removeEventListener('connectionstatechange', onChange)
        resolve(ok)
      }
      const onChange = () => {
        if (pc.connectionState === 'connected') finish(true)
        else if (pc.connectionState === 'failed' || pc.connectionState === 'closed') finish(false)
      }
      const timer = window.setTimeout(() => finish(false), timeoutMs)
      pc.addEventListener('connectionstatechange', onChange)
    })
  }

  /**
   * 上报单个 ICE 候选（trickle）
   *
   * 502 / 网络抖动重试一次：候选丢了会让后端 ICE 停在 `checking`（实测遇到过 502）。
   * answer SDP 里已经带了候选，这里是双保险，所以失败只记日志、不阻断流程。
   */
  const sendIceCandidate = async (candidate: RTCIceCandidate) => {
    const body = {
      // 归属校验（见计划书 §2.5）：后端按 viewer_id + stream_key 双重定位，
      // 避免延迟到达的候选打到别人的流上
      viewer_id: viewerId.value,
      stream_key: streamKey.value || '',
      candidate: candidate.candidate,
      sdpMid: candidate.sdpMid || '',
      sdpMLineIndex: candidate.sdpMLineIndex ?? 0
    }
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        await WebRtc视频流Service.addIceCandidateApiV1RpaBrowserControlWebrtcIceCandidatePost({
          query: { browser_id: options.browserId() },
          body
        })
        return
      } catch (error) {
        if (attempt === 2) {
          console.error('[useWebRtcConnection] 上报 ICE 候选失败:', error)
          return
        }
        await new Promise((resolve) => window.setTimeout(resolve, 300))
      }
    }
  }

  /** 批量上报 ICE 候选（见后端计划书 §10.9）；失败由调用方回退逐个上报 */
  const sendIceCandidates = async (candidates: RTCIceCandidate[]): Promise<boolean> => {
    if (candidates.length === 0) return true
    try {
      const response = (await WebRtc视频流Service.addIceCandidatesApiV1RpaBrowserControlWebrtcIceCandidatesPost({
        query: { browser_id: options.browserId() },
        body: {
          viewer_id: viewerId.value,
          stream_key: streamKey.value || '',
          candidates: candidates.map((c) => ({
            candidate: c.candidate,
            sdpMid: c.sdpMid || '',
            sdpMLineIndex: c.sdpMLineIndex ?? 0
          }))
        }
      })) as unknown as StandardResponse | undefined
      return response?.code === 0
    } catch (error) {
      console.warn('[useWebRtcConnection] 批量上报 ICE 候选失败:', error)
      return false
    }
  }

  /** 把攒下的候选一次性上报；失败回退逐个（候选不能丢，否则后端 ICE 会停在 checking） */
  const flushIceCandidates = async (source: string) => {
    const batch = candidateQueue.splice(0)
    if (batch.length === 0) return
    const ok = await sendIceCandidates(batch)
    if (!ok) {
      console.warn(`[useWebRtcConnection] 批量上报候选失败，回退逐个上报: ${batch.length} 个 (${source})`)
      for (const cand of batch) void sendIceCandidate(cand)
    }
  }

  const queueIceCandidate = (candidate: RTCIceCandidate) => {
    candidateQueue.push(candidate)
    if (candidateFlushTimer !== null) return
    candidateFlushTimer = window.setTimeout(() => {
      candidateFlushTimer = null
      void flushIceCandidates('trickle')
    }, ICE_BATCH_FLUSH_MS)
  }

  /** 释放本地连接资源（不请求后端） */
  const disposeLocal = () => {
    resetCandidateQueues()
    if (localStream.value) {
      localStream.value.getTracks().forEach((track) => track.stop())
      localStream.value = null
    }
    if (peerConnection.value) {
      try {
        peerConnection.value.close()
      } catch {
        // 忽略：旧连接可能已处于 closed
      }
      peerConnection.value = null
    }
    const video = options.videoEl()
    if (video) video.srcObject = null
  }

  /**
   * 关闭后端观看者流（**只关本观看者**，不影响其他人）
   *
   * @param silent true 用于「切页 / 离开页面」这类连带动作：只记日志，不打扰用户
   */
  const closeBackendStream = async (silent = false) => {
    try {
      const response = (await WebRtc视频流Service.closeWebrtcStreamApiV1RpaBrowserControlWebrtcClosePost({
        query: { browser_id: options.browserId() },
        body: { stream_key: streamKey.value || '', viewer_id: viewerId.value }
      })) as unknown as StandardResponse | undefined

      if (response?.code === 0) {
        if (!silent) biliMessage.success(t('rpa.closeWebrtcSuccess'))
      } else if (!silent) {
        biliMessage.error(response?.msg || t('rpa.closeWebrtcFailed'))
      } else {
        console.warn('[useWebRtcConnection] 关闭 WebRTC 流失败:', response)
      }
    } catch (error) {
      console.error('[useWebRtcConnection] 关闭 WebRTC 流异常:', error)
      if (!silent) biliMessage.error(t('rpa.closeWebrtcFailed'))
    }
  }

  /**
   * 释放「已建流但本端判定失败」的观看者
   *
   * offer / answer 一旦成功，后端就已经挂上了观看者；本端随后判定拉流失败
   * （ICE 超时 / answer 被拒 / 异常）却不关掉它，它会一直挂在会话上被算进
   * 「N 人在观看」—— 一个人的重连于是被算成多个人。
   */
  const releaseViewer = async () => {
    // streamKey 为空说明 offer 都没成功，后端自然没有挂上观看者
    if (!streamKey.value) return
    const key = streamKey.value
    streamKey.value = ''
    await closeBackendStream(true)
    console.warn('[useWebRtcConnection] 建流失败，已释放后端观看者:', key)
  }

  /** 建立 WebRTC 连接；返回是否真正连通（ICE/DTLS connected） */
  const initWebRTC = async (): Promise<boolean> => {
    if (!options.videoEl()) return false

    if (!viewerId.value) viewerId.value = crypto.randomUUID()

    options.webrtcStatus.value = 'connecting'
    answerPosted = false
    resetCandidateQueues()

    try {
      // 重连 / 重开流时先释放上一个 PeerConnection，避免旧连接继续占着后端流
      if (peerConnection.value) {
        try {
          peerConnection.value.close()
        } catch {
          // 忽略：旧连接可能已处于 closed
        }
        peerConnection.value = null
      }

      peerConnection.value = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      })

      peerConnection.value.ontrack = (event) => {
        const video = options.videoEl()
        if (video && event.streams[0]) {
          video.srcObject = event.streams[0]
          localStream.value = event.streams[0]
          options.webrtcStatus.value = 'connected'
          options.isStreaming.value = true
        }
      }

      peerConnection.value.onicecandidate = (event) => {
        if (!event.candidate) return

        // ⚠️ 候选**不能**在 answer 提交之前上报：那时后端 PeerConnection 还没有
        // remote description，addIceCandidate 会直接失败（实测：候选 POST 拿到 502 /
        // 业务码非 0 被静默忽略）。而 Chrome 的候选恰恰是在 setLocalDescription 时
        // 就开始逐个回调的 —— 所以先入队，等 answer 提交成功后再补发。
        if (!answerPosted) {
          pendingCandidates.push(event.candidate)
          return
        }
        queueIceCandidate(event.candidate)
      }

      peerConnection.value.onconnectionstatechange = () => {
        const pc = peerConnection.value
        if (!pc) return
        if (pc.connectionState === 'connected') {
          options.webrtcStatus.value = 'connected'
          options.isStreaming.value = true
        } else if (
          pc.connectionState === 'disconnected' ||
          pc.connectionState === 'closed' ||
          pc.connectionState === 'failed'
        ) {
          options.webrtcStatus.value = 'disconnected'
          options.isStreaming.value = false
        }
      }

      // viewer_id 决定流的归属：后端据此为「本观看者」建流，**不再淘汰**同页其他人的流
      const offerResponse = (await WebRtc视频流Service.createWebrtcOfferApiV1RpaBrowserControlWebrtcOfferPost({
        query: { browser_id: options.browserId() },
        body: { page_index: options.pageIndex(), viewer_id: viewerId.value }
      })) as unknown as WebrtcOfferResponse | undefined

      // 业务数据在信封的 data 层：{code, msg, data:{stream_key, sdp}}
      const offerData = offerResponse?.data

      if (offerResponse?.code === 0 && offerData?.stream_key && offerData?.sdp) {
        streamKey.value = offerData.stream_key

        await peerConnection.value.setRemoteDescription({ type: 'offer', sdp: offerData.sdp })

        const answer = await peerConnection.value.createAnswer()
        await peerConnection.value.setLocalDescription(answer)
        // 等候选收集完成：让下面发的 SDP 自带候选，不依赖 trickle 通路
        await waitForIceGatheringComplete()

        const localSdp = peerConnection.value.localDescription?.sdp || answer.sdp || ''
        const localCandidateCount = localSdp.split('a=candidate').length - 1

        // 浏览器一个候选都没产出 → ICE 永远不会连通（后端拿不到任何远端候选），
        // 典型原因是浏览器被 WebRTC 防护 / 代理策略 / 指纹伪装限制。
        if (localCandidateCount === 0) {
          console.error(
            '[useWebRtcConnection] 本端 ICE 候选数为 0：浏览器可能开启了 WebRTC 防护（disable_non_proxied_udp / mockWebRTC / 隐私扩展）'
          )
          biliMessage.error(t('rpa.streamNoIceCandidate'))
          options.webrtcStatus.value = 'disconnected'
          options.isStreaming.value = false
          return false
        }

        // 发送 answer（用 localDescription：它含刚收集到的候选）
        const answerResponse = (await WebRtc视频流Service.handleWebrtcAnswerApiV1RpaBrowserControlWebrtcAnswerPost({
          query: { browser_id: options.browserId() },
          body: {
            viewer_id: viewerId.value,
            stream_key: offerData.stream_key,
            sdp: localSdp,
            type: 'answer'
          }
        })) as unknown as StandardResponse | undefined

        if (answerResponse?.code === 0) {
          // answer 已被后端接受：现在才补发前面入队的候选（合并为一次批量请求）
          answerPosted = true
          if (pendingCandidates.length > 0) {
            candidateQueue.push(...pendingCandidates.splice(0))
          }
          void flushIceCandidates('post-answer')
        } else {
          console.warn('[useWebRtcConnection] WebRTC answer 处理失败:', answerResponse?.msg)
        }

        // ⚠️ Answer 被后端接受 ≠ 媒体链路可用：必须等 connectionState 真正 connected，
        // 否则界面会显示直播中而画面永远黑屏。
        const connected = await waitForPeerConnected()
        if (!connected) {
          console.warn('[useWebRtcConnection] ICE/DTLS 未在超时内连通，判定拉流失败')
          options.webrtcStatus.value = 'disconnected'
          options.isStreaming.value = false
        }
        return connected
      }

      // 后端未返回可用的 offer（浏览器会话未就绪 / 页面不存在等）
      console.warn('[useWebRtcConnection] WebRTC offer 响应异常:', offerResponse)
      options.webrtcStatus.value = 'disconnected'
      options.isStreaming.value = false
      return false
    } catch (error) {
      console.error('[useWebRtcConnection] 建立 WebRTC 连接失败:', error)
      options.webrtcStatus.value = 'disconnected'
      options.isStreaming.value = false
      return false
    }
  }

  /**
   * 连接层复位：释放本地连接 + 关闭后端观看者 + 清空标识
   * （用户主动停播 / 组件卸载都走这里；自动重连**不**走，它复用同一 viewer_id）
   */
  const reset = async (silent = false) => {
    disposeLocal()
    if (streamKey.value) {
      await closeBackendStream(silent)
      streamKey.value = ''
    }
    viewerId.value = ''
    options.webrtcStatus.value = 'disconnected'
  }

  return {
    peerConnection,
    viewerId,
    streamKey,
    initWebRTC,
    reset,
    releaseViewer,
    disposeLocal
  }
}
