<script setup lang="ts">
import emitter from '@/utils/mitt'
import { computed, onBeforeUnmount, onMounted, onUnmounted, ref } from 'vue'
const id = ref<string>('')
const show = ref<boolean>(!1)
const type = ref<string>('loading')
const position = ref<string>('')
const showTime = ref<number>(0)
const text = ref<string>('')
const timmer = ref<number | ReturnType<typeof setTimeout>>(0)
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
    if (timmer.value) {
      clearTimeout(timmer.value as ReturnType<typeof setTimeout>)
      timmer.value = 0
    }
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
@import '@/assets/components/feedback/global-toast-tailwind.css';
</style>