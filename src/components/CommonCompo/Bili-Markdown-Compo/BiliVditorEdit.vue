<template>
  <div ref="vditor"></div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue'
import Vditor from 'vditor'
import 'vditor/dist/index.css'
import { KeysEnum, useInject } from '@/models/base/provide_model'
import { useDark, useDebounceFn } from '@vueuse/core'
import { useDeviceSystemStore } from '@/stores/device_system'
import { Theme } from '@/models/store/device_system'
import emitter from '@/utils/mitt'
import { useClipboard } from '@vueuse/core'

const handle_image_render = (node: any, entering: boolean): [string, number] => {
  if (entering) {
    return [``, Lute.WalkContinue]
  }
  let link_str_char_codes = node.__internal_object__.ChildByType(41).Tokens as any
  let link_str = String.fromCharCode(
    ...Object.values(link_str_char_codes.$array as number[]).filter((value) => value !== 0)
  )
  if (link_str.startsWith('(')) link_str = link_str.slice(1, -1) //去掉链接的括号
  return [
    `<img src="${link_str}" size="64" referrerPolicy="no-referrer" alt="${node.Text()}" />`,
    Lute.WalkContinue
  ]
}
const is_dark = computed(() => {
  // return deviceSystemStore.systemTheme === Theme.dark
  return false
})
const clipBoard = useClipboard()
const globalVars = useInject(KeysEnum.globalVars)
const vditor = useTemplateRef('vditor')
const is_loading = defineModel('is_loading', {
  type: Boolean,
  default: true
})
const is_valid = defineModel('is_valid', { default: false })
const max_length = defineModel('max_length', { default: 4096 })
const placeholder = defineModel('placeholder', {
  type: String,
  default: '请输入内容'
})
const contentVal = defineModel({
  type: String,
  default: ''
})
const deviceSystemStore = useDeviceSystemStore()
const toolbars = defineModel('toolbars', {
  default: [
    'emoji',
    'headings',
    'bold',
    'italic',
    'strike',
    '|',
    'line',
    'quote',
    'list',
    'ordered-list',
    'check',
    'outdent',
    'indent',
    '|',
    'code',
    'inline-code',
    'insert-after',
    'insert-before',
    '|',
    'undo',
    'redo',
    'link',
    'table',
    '|',
    'edit-mode',
    'both',
    'preview',
    'fullscreen',
    '|',
    'outline',
    'code-theme',
    'content-theme',
    'export',
    'devtools',
    '|',
    'help',
    'br'
  ]
})
const props = defineProps({
  is_preview: { type: Boolean, default: false }
})
const handle_preview_theme = () => {
  if (vditor.value) {
    is_dark.value
      ? vditor.value.setAttribute('style', 'background-color: #24292e;')
      : vditor.value.setAttribute('style', 'background-color: #fff;')
  }
}
const viditor_factory = async () => {
  if (!vditor.value) return null
  if (props.is_preview) {
    return await Vditor.preview(vditor.value, contentVal.value, {
      mode: is_dark.value ? 'dark' : 'light',
      renderers: {
        renderImage: handle_image_render
      },
      after: () => {
        handle_preview_theme()
        is_loading.value = false
      }
    })
  }
  return new Vditor(vditor.value, {
    value: contentVal.value,
    height: 'auto',
    cache: {
      enable: false
    },
    input: (value) => {
      contentVal.value = value
    },
    blur: (value) => {
      contentVal.value = value
    },
    mode: 'ir',
    toolbar: toolbars.value,
    toolbarConfig: {
      hide: globalVars.value.screen_size !== 'large',
      pin: globalVars.value.screen_size === 'large'
    },
    after: () => {
      VditorInstance.vditor.lute.SetJSRenderers({
        renderers: {
          Md2VditorIRDOM: {
            // 请根据不同的模式选择不同的渲染对象
            renderImage: handle_image_render
          },
          Md2HTML: {
            renderImage: handle_image_render
          },
          Md2VditorDOM: {
            renderImage: handle_image_render
          },
          Md2VditorSVDOM: {
            renderImage: handle_image_render
          }
        }
      })
      window.addEventListener('resize', useDebounceFn(handle_resize, 2e3))
      is_loading.value = false
    },
    placeholder: placeholder.value,
    tab: '\t',
    theme: is_dark.value ? 'dark' : 'classic',
    counter: {
      max: max_length.value,
      type: 'text',
      enable: true,
      after(length, counter) {
        if (length > max_length.value || length === 0) {
          is_valid.value = false
          return
        }
        is_valid.value = true
      }
    },
    preview: {
      actions: ['desktop', 'tablet', 'mobile'],
      theme: {
        current: is_dark.value ? 'dark' : 'wechat'
      },
      transform(html) {
        console.log(html)
        return html
      },
      parse(element) {
        console.log(element)
      }
    },
    image: {
      isPreview: false,
      preview: (bom) => {
        console.log(1)
      }
    },
    link: {
      click: (bom: Element) => {
        clipBoard.copy(bom.textContent ?? '')
        emitter.emit('toast', {
          t: `已经复制链接地址 【${bom.textContent ?? ''}】 前往浏览器自行复制打开，注意安全喵！`,
          e: 'info'
        })
      }
    }
  })
}
let VditorInstance: any
onMounted(async () => {
  if (vditor.value) {
    VditorInstance = await viditor_factory()
    // watch(
    //   () => deviceSystemStore.systemTheme,
    //   (newVal) => {
    //     if (props.is_preview) handle_preview_theme()
    //     if (VditorInstance?.setTheme)
    //       VditorInstance?.setTheme(
    //         newVal === Theme.dark ? 'dark' : 'classic',
    //         is_dark.value ? 'dark' : 'wechat'
    //       )
    //   }
    // )
  }
})
const handle_resize = () => {
  if (VditorInstance?.updateToolbarConfig)
    globalVars.value.screen_size !== 'large'
      ? VditorInstance.updateToolbarConfig({
          hide: true,
          pin: false
        })
      : VditorInstance.updateToolbarConfig({
          hide: false,
          pin: false
        })
}
const setValue = (markdown: string, clearStack = false) => {
  VditorInstance?.setValue(markdown, clearStack)
}
onBeforeUnmount(() => {
  window.removeEventListener('resize', handle_resize)
  VditorInstance?.destroy()
})
defineExpose({ setValue })
</script>

<style scoped>
/* 根据需要添加样式 */
</style>
