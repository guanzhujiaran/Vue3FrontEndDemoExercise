<!--
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-06-12 19:34:19
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-07-02 15:03:24
 * @FilePath: \Vue3FrontEndDemoExercise\src\components\opus-detail\RightPannel\PannelItems\SettingComponent\AccountStatusBoard.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<template>

    <el-descriptions class="margin-top" :column="2" :size="size" direction="vertical" :border="true" >
        <el-descriptions-item>
            <template #label>
                <div class="cell-item">
                    <el-icon>
                        <user />
                    </el-icon>
                    运行状态
                </div>
            </template>
            <el-tag type="warning" :hit="true" v-if="!account_running_status">无数据</el-tag>
            <el-tag type="success" :hit="true" v-else>{{ account_running_status.running_msg
                }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item>
            <template #label>
                <div class="cell-item">
                    <el-icon>
                        <iphone />
                    </el-icon>
                    任务启动时间点
                </div>
            </template>
            <el-tag type="warning" :hit="true" v-if="!account_running_status">无数据</el-tag>
            <el-tag type="success" :hit="true" v-else-if="account_running_status.last_start_ts !== undefined">{{ (new
        Date(account_running_status.last_start_ts)).toLocaleString() }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item>
            <template #label>
                <div class="cell-item">
                    <el-icon>
                        <Location />
                    </el-icon>
                    当前任务消息
                </div>
            </template>
            <el-tag type="warning" :hit="true" v-if="!account_running_status">无数据</el-tag>
            <el-tag type="success" :hit="true" v-else-if="account_running_status.running_msg !== undefined">{{
        account_running_status.running_msg }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item>
            <template #label>
                <div class="cell-item">
                    <el-icon>
                        <img src="https://ys.mihoyo.com/main/favicon.ico" style="width:100%;height:100%;">
                    </el-icon>
                    {{ account_running_status?.is_running ? `原神，退出！` : `原神，启动！` }}
                </div>
            </template>
            <el-button v-if="account_running_status" style="width:80%;margin:10%;height:100%;"
                @click="handle_account_task_btn"
                :style="account_running_status.is_running ? `background-color: #00aeec;` : `background-color: #fb7299;`">
                <el-icon v-if="account_running_status.is_running">
                    <SwitchButton />
                </el-icon>
                <el-icon v-else>
                    <CaretRight />
                </el-icon>
            </el-button>
        </el-descriptions-item>
    </el-descriptions>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Iphone, Location, OfficeBuilding, Tickets, User, SwitchButton, CaretRight } from '@element-plus/icons-vue'
import type { ComponentSize } from 'element-plus'
import type { PageShowModel } from '@/models/account/page/model';
import type { AccountRunningStatus } from '@/models/account/account_model';
import accountApi from '@/api/account/account_api';
import { ElMessage, ElMessageBox } from 'element-plus'
import emitter from '@/utils/mitt'
import doLotteryApi from "@/api/do_lottery/bili_do_lottery_api";
const props = defineModel<PageShowModel>()
const get_status_error_msg = '获取状态失败'
const account_running_status = ref<AccountRunningStatus>()
const size = ref<ComponentSize>('small')
let fresh_ts = Date.now();
const get_account_running_status = () => {
    fresh_ts = Date.now();
    account_running_status.value = {
        is_running: false,
        last_start_ts: 0,
        running_msg: get_status_error_msg,
    }
    props.value?.info.account_name ? accountApi.GetAccountRunningStatus(props.value?.info.account_name).then(resp => {
        let da = resp.data
        if (resp.code === 0) {
            account_running_status.value = {
                is_running: da.is_running,
                last_start_ts: da.last_start_ts,
                running_msg: da.running_msg,
            }
        } else {
            account_running_status.value = {
                is_running: false,
                last_start_ts: 0,
                running_msg: resp.msg,
            }
        }
    }) : {}
}
const handle_account_task_btn = () => {
    let account_name = props.value?.info.account_name;
    if (account_name === undefined) {
        return emitter.emit('toast', { t: `账号名称获取失败！无法执行任务！`, e: 'error' })
    }
    let is_running: boolean = account_running_status.value?.is_running!;

    let action_name: `停止` | `启动` = is_running ? `停止` : `启动`;
    ElMessageBox.confirm(is_running ? `是否停止账号任务？` : `是否启动账号任务？`, "提示",
        {
            confirmButtonText: 'OK',
            cancelButtonText: 'Cancel',
            type: 'warning',
        }
    ).then(() => {
        emitter.emit('toast', { t: `账号【${props.value?.info.account_name}】${action_name}任务！`, e: 'info' })
        if (action_name === "启动") {
            doLotteryApi.run_account_lottery_task(props.value?.info.account_name!).then(resp => {
                resp.code ?
                    emitter.emit('toast', { t: `账号【${props.value?.info.account_name}】${action_name}任务执行出错\n${resp.msg}`, e: 'error' }) :
                    emitter.emit('toast', { t: `账号【${props.value?.info.account_name}】${action_name}任务执行成功！`, e: 'info' });
                account_running_status.value && (account_running_status.value.is_running = resp.code ? false : true)
            })
        }
        else if (action_name === "停止") {
            //TODO 添加停止api
            account_running_status.value && (account_running_status.value.is_running = false)

        }
        else {
            emitter.emit('toast', { t: `未知任务命令！`, e: 'error' })
        }

    }).catch(() => {
        emitter.emit('toast', { t: `账号【${props.value?.info.account_name}】取消修改任务状态！`, e: 'info' })
    })
}
watch(() => props.value?.is_show, (newValue, OldValue) => {
    if (OldValue === false && newValue === true && Date.now() - fresh_ts > 10e3) {
        get_account_running_status()
    }
}, { deep: true })
onMounted(() => {
    get_account_running_status()
})


</script>
<style>
button:hover {
    opacity: 1;
}

button {
    opacity: 0.7;
}
</style>