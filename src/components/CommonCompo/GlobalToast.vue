<script setup lang="ts">
import emitter from '@/utils/mitt'
import { computed, onBeforeUnmount, onMounted, onUnmounted, ref } from 'vue'
const id = ref<string>('')
const show = ref<boolean>(!1)
const type = ref<string>('loading')
const position = ref<string>('')
const showTime = ref<number>(0)
const text = ref<string>('')
const timmer = ref<number>(0)
const getCls = computed(() => {
  return 'loading' === type.value
    ? {
        background: 'rgba(0,0,0,0.3)'
      }
    : ''
})
const methods = {
  /**
   *
   * @param t 消息类别：info  success error loading
   * @param e
   */
  showDialog: function (t: string, e: string, ...args: any[]) {
    var n = this,
      s = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : {},
      i = s.showTime,
      o = void 0 === i ? 1500 : i,
      r = s.position,
      a = void 0 === r ? 'center' : r
    this.closeDialog()
    var u = Math.random().toString(36).substring(3, 6)
    ;(id.value = u),
      (type.value = t),
      (position.value = a),
      (show.value = !0),
      e && (text.value = e),
      'loading' !== t &&
        (timmer.value = setTimeout(function () {
          return n.closeDialog(u)
        }, o))
    return true
  },
  /**
   *
   * @param t toast的id
   */
  closeDialog: function (t?: string) {
    t && t === id.value && (show.value = !1) && this.clear(),
      !t && (show.value = !1) && this.clear()
  },
  clear: function () {
    timmer.value && clearTimeout(timmer.value)
  }
}
const showDialogSetting = {
  showTime: 1500,
  timeout: 1500,
  position: 'center'
}
onBeforeUnmount(() => {
  methods.clear()
})
const toast_events = {
  info: function (t: string) {
    let e = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {}
    return (e = showDialogSetting), methods.showDialog('info', t, e)
  },
  success: function (t: string) {
    let e = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {}
    return (e = showDialogSetting), methods.showDialog('success', t, e)
  },
  error: function (t: string) {
    let e = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {}
    return (e = showDialogSetting), methods.showDialog('error', t, e)
  },
  /**
   * loading和stop是一组的，loading结束之后要调用stop，其他不需要
   */
  loading: function (t: string) {
    methods.showDialog('loading', t || 'loading...')
  },
  stop: function () {
    methods.closeDialog()
  }
}

defineExpose(toast_events)

onMounted(() => {
  emitter.on('toast', (params) => {
    let { t, e } = params
    switch (e) {
      case 'info':
        toast_events.info(t)
        break
      case 'success':
        toast_events.success(t)
        break
      case 'error':
        toast_events.error(t)
        break
      case 'loading':
        toast_events.loading(t)
        break
      default:
        toast_events.info(t)
    }
    return true
  })
})
onUnmounted(() => {
  emitter.off('toast')
})
</script>

<template>
  <div v-if="show" class="toast__mask">
    <div class="toast_wp toast-pos_center">
      <div :class="`toast__img toast__img_` + type"></div>
      <div class="toast__content">{{ text }}</div>
    </div>
  </div>
</template>

<style scoped>
.toast__mask {
  position: fixed;
  left: 0;
  top: 0;
  width: 100vw;
  height: 100%;
  background-color: hsla(0, 0%, 88.2%, 0);
  z-index: 2999;
}

.toast_wp {
  position: fixed;
  left: 50%;
  display: -webkit-box;
  display: -webkit-flex;
  display: -moz-box;
  display: -ms-flexbox;
  display: flex;
  -webkit-box-align: center;
  -webkit-align-items: center;
  -moz-box-align: center;
  -ms-flex-align: center;
  align-items: center;
  text-align: center;
  padding: 8px 12px;
  max-width: 240px;
  -webkit-transform: translate(-50%, -50%);
  -moz-transform: translate(-50%, -50%);
  -ms-transform: translate(-50%, -50%);
  transform: translate(-50%, -50%);
  background: rgba(51, 51, 51, 0.8);
  border-radius: 4px;
  z-index: 3000;
}

.toast_wp .toast__img {
  width: 16px;
  height: 16px;
  background-repeat: no-repeat;
  background-size: 100%;
  margin-right: 10px;
}

.toast_wp .toast__img_info {
  display: none;
}

.toast_wp .toast__img_success {
  background-image: url(data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iaWNvbiIgdmlld0JveD0iMCAwIDEwMjQgMTAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCI+PGRlZnM+PHN0eWxlPkBmb250LWZhY2V7Zm9udC1mYW1pbHk6ZmVlZGJhY2staWNvbmZvbnQ7c3JjOnVybCgvL2F0LmFsaWNkbi5jb20vdC9mb250XzEwMzExNThfdTY5dzh5aHhkdS53b2ZmMj90PTE2MzAwMzM3NTk5NDQpIGZvcm1hdCgmcXVvdDt3b2ZmMiZxdW90OyksdXJsKC8vYXQuYWxpY2RuLmNvbS90L2ZvbnRfMTAzMTE1OF91Njl3OHloeGR1LndvZmY/dD0xNjMwMDMzNzU5OTQ0KSBmb3JtYXQoJnF1b3Q7d29mZiZxdW90OyksdXJsKC8vYXQuYWxpY2RuLmNvbS90L2ZvbnRfMTAzMTE1OF91Njl3OHloeGR1LnR0Zj90PTE2MzAwMzM3NTk5NDQpIGZvcm1hdCgmcXVvdDt0cnVldHlwZSZxdW90Oyl9PC9zdHlsZT48L2RlZnM+PHBhdGggZD0iTTEyMi4yODEgNTM2LjYyM2MtOS45NDEtOS45MjYtMTEuNTQ5LTI1LjM2LTIuNzg1LTM2LjQwN2wyMC40ODctMjUuODI5YzguMzk4LTEwLjU4OCAyNC4xMDgtMTMuMjQ2IDM1LjIxMS01LjgzNUwzNTIuNTI1IDU4Ni45MWM5LjM1NCA2LjI0MyAyNS40NTMgNS40MyAzNC4xODYtMS42NTVsNDY4LjU4Mi0zODAuMTZjMTAuNTMzLTguNTQ1IDI3LjAzLTcuODE3IDM2LjI2MiAxLjRsMTEuNTQyIDExLjUyNmMxMC4wNDYgMTAuMDMgOS4zMTUgMjUuOTUxLTEuMjE1IDM2LjQ2NkwzOTguOTU0IDc1Ni42N2MtMTUuNjQ2IDE1LjYyNS00MS4zMzcgMTQuOTQtNTcuNDQ1LTEuMTQyTDEyMi4yODEgNTM2LjYyM3oiIGZpbGw9IiNmZmYiLz48L3N2Zz4=);
}

.toast_wp .toast__img_error {
  background-image: url(data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iaWNvbiIgdmlld0JveD0iMCAwIDEwMjQgMTAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCI+PGRlZnM+PHN0eWxlPkBmb250LWZhY2V7Zm9udC1mYW1pbHk6ZmVlZGJhY2staWNvbmZvbnQ7c3JjOnVybCgvL2F0LmFsaWNkbi5jb20vdC9mb250XzEwMzExNThfdTY5dzh5aHhkdS53b2ZmMj90PTE2MzAwMzM3NTk5NDQpIGZvcm1hdCgmcXVvdDt3b2ZmMiZxdW90OyksdXJsKC8vYXQuYWxpY2RuLmNvbS90L2ZvbnRfMTAzMTE1OF91Njl3OHloeGR1LndvZmY/dD0xNjMwMDMzNzU5OTQ0KSBmb3JtYXQoJnF1b3Q7d29mZiZxdW90OyksdXJsKC8vYXQuYWxpY2RuLmNvbS90L2ZvbnRfMTAzMTE1OF91Njl3OHloeGR1LnR0Zj90PTE2MzAwMzM3NTk5NDQpIGZvcm1hdCgmcXVvdDt0cnVldHlwZSZxdW90Oyl9PC9zdHlsZT48L2RlZnM+PHBhdGggZD0iTTg2Ni4wMTYgNzQwLjk5MnEyOC45OTIgMzAuMDE2IDQyLjQ5NiA1NS4wMDhUOTA0IDg1Mi45OTJxLTQgNi4wMTYtMTEuMDA4IDE0LjQ5NlQ4NzguNDk2IDg4NHQtMTUuMDA4IDE0LjQ5NlQ4NTAuOTc2IDkwOHEtMjQuOTkyIDE1LjAwOC01OS4wMDggOHQtNjAuOTkyLTM0LjAxNmwtMjM2LTIzNi0xMjggMTI4cS01OS4wMDggNTkuMDA4LTk2IDk2Ljk5Mi0zOC4wMTYgMzguMDE2LTc1LjQ4OCA0Ny4wMDh0LTY2LjQ5Ni0xNi45OTJMMTAwIDg3MnEtNi4wMTYtNi4wMTYtNy4wMDgtOFE4MS45ODQgODQ5Ljk4NCA4MCA4MzUuNDg4dDIuNDk2LTI4LjUxMlQ5NiA3NzkuOTY4dDIwLTI0cTguOTkyLTggMzItMzAuMDE2bDU0LjAxNi01NnEzMi45OTItMzIgNzMuNTA0LTcydDg0LjUxMi04NHEtNDgtNDgtOTEuNDg4LTkxLjAwOHQtNzguMDE2LTc2Ljk5Mi01Ni41MTItNTUuNDg4LTI3LjAwOC0yNi40OTZxLTI2LjAxNi0yNi4wMTYtMjYuNDk2LTUxLjQ4OHQxNy41MDQtNTEuNDg4cTgtMTAuMDE2IDIzLjAwOC0yMy40ODhUMTQyLjAxNiAxMjBxMzAuMDE2LTIwIDU0LjAxNi0xNy41MDR0NDggMjcuNDg4bDMxLjAwOCAzMS4wMDhxMjMuMDA4IDIzLjAwOCA1Ni45OTIgNTZ0NzYuNTEyIDc0LjQ5NiA4OC41MTIgODYuNDk2cTM4LjAxNi0zOC4wMTYgNzQuNDk2LTc0LjAxNnQ2OC02Ny40ODggNTYuOTkyLTU2LjUxMiA0Mi40OTYtNDIuMDE2cTI0LTIzLjAwOCA1Mi0zMC40OTZ0NTQuMDE2IDEyLjUxMnEuOTkyLjk5MiA2LjQ5NiA0Ljk5MnQxMS4wMDggOC45OTIgMTAuNDk2IDkuNTA0IDcuMDA4IDUuNTA0cTI3LjAwOCAyNi4wMTYgMjYuNDk2IDU2LjUxMnQtMjYuNDk2IDU2LjUxMlE4NjIuMDQ4IDI4MCA4MzUuNTUyIDMwNi45NzZ0LTU5LjAwOCA1OS4wMDgtNjguNTEyIDY4bC03NiA3NnEzNi45OTIgMzYgNzIuNTEyIDcwLjQ5NnQ2Ni4wMTYgNjQuNTEyVDgyNS41NjggNzAwdDQwLjUxMiA0MC45OTJ6IiBmaWxsPSIjZmZmIi8+PC9zdmc+);
}

.toast_wp .toast__img_loading {
  background-image: url(data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iaWNvbiIgdmlld0JveD0iMCAwIDEwMjQgMTAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB3aWR0aD0iMzIiIGhlaWdodD0iMzIiPjxwYXRoIGQ9Ik0yNzAuNCAyMTQuNEMzMzYgMTYwIDQyMCAxMjggNTEyIDEyOGMyMTIgMCAzODQgMTcyIDM4NCAzODRoNjRjMC0yNDcuMi0yMDAuOC00NDgtNDQ4LTQ0OC0xMDcuMiAwLTIwNS42IDM3LjYtMjgyLjQgMTAwbDQwLjggNTAuNHoiIGZpbGw9IiNmZmYiLz48L3N2Zz4=);
  -webkit-animation: rotation 1s linear infinite;
  -moz-animation: rotation 1s linear infinite;
  animation: rotation 1s linear infinite;
}

.toast_wp .toast__content {
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  border-radius: 4px;
  font-family: PingFangSC-Regular, sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
  color: #fff;
}

.toast-pos_center {
  top: 50%;
}

.toast-pos_top {
  top: 10% !important;
}

.toast-pos_bottom {
  bottom: 0 !important;
}

@-webkit-keyframes rotation {
  0% {
    -webkit-transform: rotate(0deg);
    transform: rotate(0deg);
  }

  to {
    -webkit-transform: rotate(1turn);
    transform: rotate(1turn);
  }
}

@-moz-keyframes rotation {
  0% {
    -moz-transform: rotate(0deg);
    transform: rotate(0deg);
  }

  to {
    -moz-transform: rotate(1turn);
    transform: rotate(1turn);
  }
}

@keyframes rotation {
  0% {
    -webkit-transform: rotate(0deg);
    -moz-transform: rotate(0deg);
    transform: rotate(0deg);
  }

  to {
    -webkit-transform: rotate(1turn);
    -moz-transform: rotate(1turn);
    transform: rotate(1turn);
  }
}
</style>
