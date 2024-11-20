<!--
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-05-29 23:52:55
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-10-29 00:38:46
 * @FilePath: \Vue3FrontEndDemoExercise\src\components\opus-detail\RightPannel\PannelItems\SettingComponent\ClickBar.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->


<script setup lang="ts">
import type { AccountSettingConfigItemModel } from '@/models/account/account_setting/account_setting_type_model';
import { BaseSettingType } from '@/models/base/base_setting_model';
import { computed, onMounted, ref, toRef, watch } from 'vue';
import LoadingCard from '@/components/CommonCompo/LoadingCard.vue';
import ConfigItem from '@/components/opus-detail/RightPannel/PannelItems/SettingComponent/ConfigItem.vue';
import BlueBtn from '@/components/CommonCompo/Bili-Interact-Compo/Blue-Btn.vue';
import accountApi from '@/api/account/account_api';
import emitter from '@/utils/mitt'

const is_loading_setting = ref<boolean>()

const props = defineProps<{
  account_name: string,
}>()
const emit = defineEmits(['close_setting_modal'])


//#region 设置映射表 （不是特别想写完，反正也能凑活用）
const setting_map: { [key: string]: AccountSettingConfigItemModel } = {
  COOKIENAME: {
    name: '',
    title: '账号Cookie名称',
    tips: '（账号浏览器数据的存放文件夹，只能查看）',
    setting_content: {
      value: '',
      type: BaseSettingType.Text,
      text_props: [
        {
          readonly: true,
          label: 'Cookie名称',
          placeholder: ''
        }
      ]
    }
  },
  AUTO_DailyReward: {
    name: '',
    title: '每日奖励', tips: '（每天自动投币，领取b币，兑换电池）',
    setting_content: {
      type: BaseSettingType.Radio,
      value: '',
      radio_props: [{
        value: true,
        content: '开启',
      }, {
        value: false,
        content: '关闭',
      },
      ]
    }
  },
  lottery_sep_time_type: {
    name: '',
    title: '抽奖间隔模式', tips: '（决定抽奖等待的间隔时间）',
    setting_content: {
      type: BaseSettingType.Radio,
      value: '',
      radio_props: [{
        value: 1,
        content: '总运行时间',
      }, {
        value: 2,
        content: '等间隔',
      },
      ]
    }
  },
  CommonLottery_switch: {
    name: '',
    title: '普通抽奖', tips: '（执行所有的抽奖数据）',
    setting_content: {
      value: '',
      type: BaseSettingType.Radio,
      radio_props: [{
        value: true,
        content: '开启',
      }, {
        value: false,
        content: '关闭',
      },
      ]
    }
  },
  Only_Comment_Lottery_Switch: {
    title: '只参加评论抽奖', tips: '（跳过所有需要转发的抽奖）', name: '',
    setting_content: {
      type: BaseSettingType.Radio,
      value: '',
      radio_props: [{
        value: true,
        content: '开启',
      }, {
        value: false,
        content: '关闭',
      },
      ]
    }
  },
  PersistStore: {
    title: '持久化存储', tips: '（在浏览器中保存数据，可以免登录）', name: '',
    setting_content: {
      type: BaseSettingType.Radio, value: '',
      radio_props: [{
        value: true,
        content: '开启',
      }, {
        value: false,
        content: '关闭',
      },
      ]
    }
  },
  ProfileDir: {
    title: '浏览器使用用户',
    tips: '（更改后需要重新登录，尽量都用Default）',
    name: '',
    setting_content: {
      type: BaseSettingType.Text, value: '',
      text_props: [
        {
          readonly: false,
          label: '浏览器profile名称',
          placeholder: ''
        }
      ]
    }
  },
  proxy: {
    title: '账号代理服务器',
    tips: '（该账号浏览器使用的代理地址，地址格式：http://127.0.0.1:123）', name: '',
    setting_content: {
      type: BaseSettingType.Text,
      value: '',
      text_props: [
        {
          readonly: false,
          label: 'ip',
          placeholder: ''
        }
      ]
    }
  },
  LIVE_SEND_DM: {
    title: '监听直播统一发送弹幕',
    tips: '（监听统一发送弹幕接口）',
    name: '',
    setting_content: {
      type: BaseSettingType.Radio, value: '',
      radio_props: [{
        value: true,
        content: '开启',
      }, {
        value: false,
        content: '关闭',
      },
      ]
    }

  },
}
//#endregion
// const props = defineModel<AccountSettingModel>()
const fomat_setting = (obj: any): collapse_item[] => {
  let ret_obj_list: { [key: string]: any }[] = []
  for (let key in obj) {
    let val = obj[key]
    if (typeof val === 'object' && val.length === undefined) {//如果是可以继续分解的json对象
      ret_obj_list.push({
        key: key,
        title: key,
        content: fomat_setting(val)
      })
    }
    else {
      if (Object.keys(setting_map).includes(key)) { // 如果是属性
        let content: AccountSettingConfigItemModel = setting_map[key]
        content.setting_content.value = toRef(val)
        content.name = key
        ret_obj_list.push({
          key: key,
          title: content.title,
          content: content
        })
      }
      else {
        switch (typeof val) {
          case "boolean": {
            let content: AccountSettingConfigItemModel = {
              name: key,
              title: key,
              tips: key,
              setting_content: {
                type: BaseSettingType.Radio,
                value: toRef(val),
                radio_props: [{
                  value: true,
                  content: '开启',
                }, {
                  value: false,
                  content: '关闭',
                },
                ]
              }
            }
            ret_obj_list.push({
              key: key,
              title: key,
              content: content
            })
            break
          }
          default: {
            let content: AccountSettingConfigItemModel = {
              name: key,
              title: key,
              tips: key,
              setting_content: {
                type: BaseSettingType.Text,
                value: toRef(val),
                text_props: [
                  {
                    readonly: false,
                    label: key,
                    placeholder: ''
                  }
                ]
              }
            }
            ret_obj_list.push({
              key: key,
              title: key,
              content: content
            })
            break
          }
        }
      }
    }
  }
  return ret_obj_list as collapse_item[]
}
const resolve_stting = (obj: collapse_item[] | undefined) => {
  if (obj === undefined) return {}
  let ret_obj = {}
  for (let i of obj) {
    if (Array.isArray(i.content)) {
      Object.assign(ret_obj, Object.fromEntries([
        [i.key, resolve_stting(i.content)]
      ]))
    }
    else {
      let content: AccountSettingConfigItemModel = i.content
      Object.assign(ret_obj, Object.fromEntries([
        [i.key, content.setting_content.value]
      ])
      )
    }
  }
  return ret_obj
}
const formattedprops = ref<collapse_item[]>()

const saved_props = computed(() => {
  return resolve_stting(formattedprops.value)
})


watch(saved_props, (newVal, oldVal) => { // 需要保存的属性变化时弹出保存按钮
  if (Object.keys(oldVal).length !== 0) {
    console.log(`formattedprops:`, formattedprops.value)
    console.log(`saved_props:`, saved_props.value)
    save_btn_model.value.is_show = true
    cancel_btn_model.value.is_show = true
  }
})
interface collapse_item {
  key: string,
  /**
   * 收起时显示的内容
   */
  title: string
  /**
   * 设置的格式，或者嵌套的json
   */
  content: AccountSettingConfigItemModel | collapse_item[]
}
const activeNames = ref('1')//最多三层！！！
const activeNames1 = ref('')
const activeNames2 = ref([])
const save_btn_model = ref({
  btn_text: '保存',
  is_active: true,
  is_show: false,
})
const cancel_btn_model = ref({
  btn_text: '取消',
  is_active: true,
  is_show: false,
})

const save_lottery_setting = () => {
  let post_data = {
    account_name: props.account_name,
    settings: saved_props.value
  }
  accountApi.save_account_setting(post_data.account_name, post_data.settings).then((res) => {
    if (res.code !== 0) {
      emitter.emit('toast', { t: `保存失败！${res.msg}`, e: 'error' })
      return
    }
    emitter.emit('toast', { t: '保存成功' })
    emit('close_setting_modal')
  }).catch(e => {
    emitter.emit('toast', { t: `保存失败！${e}`, e: 'error' })
  })


}


onMounted(
  async () => {
    is_loading_setting.value = true;
    return await accountApi.GetAccountLotterySettingByAccountName(props.account_name).then(resp => {
      if (resp.code) {
        return emitter.emit('toast', { t: resp.msg, e: 'error' })
      }
      return resp.data.info.settings ? (formattedprops.value = fomat_setting(resp.data.info.settings)) && (is_loading_setting.value = false) : emitter.emit('toast', { t: `账号设置加载失败！`, e: 'error' })
    }).catch(e => {
      emitter.emit('toast', { t: `获取账号设置失败！${e}`, e: 'error' })
    })



  }
)
</script>
<style scoped>

.el-collapse-item button {
  background-color: #fb7299;
  opacity: 0.7;
  border-radius: 0.75rem;
  height: 2rem;
  padding: 1rem;
  margin-top: 0.2rem;
}

.el-collapse-item .is-active {
  opacity: 1;
}
</style>


<template>
  <div style="display: flex; align-items: center; justify-content: center;">
    <BlueBtn v-model="save_btn_model" style="display: inline-flex;margin: 10px;" @click="save_lottery_setting">
    </BlueBtn>
    <BlueBtn v-model="cancel_btn_model" style="background-color: crimson;display:inline-flex;margin: 10px;"
      @click="emit('close_setting_modal')"></BlueBtn>
  </div>
  <LoadingCard v-if="is_loading_setting || formattedprops === undefined" />
  <el-collapse v-else v-model="activeNames" accordion>
    <el-collapse-item v-for="(value, idx) in formattedprops" :key="idx" :title="value.title" :name="idx">
      <ConfigItem v-if="!Array.isArray(value.content)"
        v-model="formattedprops[idx].content as AccountSettingConfigItemModel" />
      <el-collapse v-else v-model="activeNames1" style="padding-left: 20px; padding-top:3px" accordion>
        <el-collapse-item v-for="(v1, idx1) in value.content" :key="idx1" :title="v1.title" :name="`${idx}.${idx1}`">
          <ConfigItem v-if="!Array.isArray(v1.content)"
            v-model="value.content[idx1].content as AccountSettingConfigItemModel" />
          <el-collapse v-else v-model="activeNames2" style="padding-left: 20px; padding-top:3px">
            <el-collapse-item v-for="(v2, idx2) in v1.content" :key="idx2" :title="v2.title"
              :name="`${idx}.${idx1}.${idx2}`">
              <ConfigItem v-model="v1.content[idx2].content as AccountSettingConfigItemModel" />
            </el-collapse-item>
          </el-collapse>
        </el-collapse-item>
      </el-collapse>
    </el-collapse-item>
  </el-collapse>
</template>