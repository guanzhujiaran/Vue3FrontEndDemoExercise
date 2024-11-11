<!--
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-10-15 19:07:56
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-11-11 18:41:04
 * @FilePath: \Vue3FrontEndDemoExercise\src\views\lottery_data_statistic\LotteryDataStat.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<template>
    <div class="container">
        <div class="el-tabs-wrapper" style="overflow: hidden;">
            <el-tabs v-model="active_site_name" type="border-card">
                <el-tab-pane label="数据页" name="no-data">
                    <Placeholder v-model="placeholder_props" />
                </el-tab-pane>
                <el-tab-pane label="B站" name="bili" lazy>
                    <bili_lot_inner v-model:active_lot_data_name=active_lot_data_name />
                </el-tab-pane>
            </el-tabs>
        </div>
        <el-affix target=".container" position="bottom" :offset="20">
            <div class="drag-upload-btn" style="float: right;padding-right: 1rem;">
                <el-button type="primary" round size="large" @click="open_submit_lot_data_pannel">提交数据</el-button>
            </div>
        </el-affix>
    </div>
    <div v-if="is_upload_popover_open" class="lot-upload__wrap" style="z-index: 2006;">
        <div class="bili-overlay" style="background-color: rgba(0, 0, 0, 0.5);" @click="close_submit_lot_data_pannel">
        </div>
        <div class="lot-upload-popover">
            <div class="lot-upload__pub" :v-loading="lot_upload_submit_props.loading">
                <div class="lot-upload-publishing">
                    <div class="lot-upload-publishing__closing" @click="close_submit_lot_data_pannel">
                        <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
                            viewBox="0 0 16 16" width="16" height="16" style="width: 16px; height: 16px;">
                            <path
                                d="M3.1082399999999994 3.110086666666666C3.4011333333333327 2.81719 3.876006666666667 2.81719 4.168896666666666 3.110086666666666L7.9989333333333335 6.94015L11.830066666666667 3.108993333333333C12.12295 2.8160966666666667 12.597849999999998 2.8160966666666667 12.890716666666664 3.108993333333333C13.183683333333335 3.401883333333334 13.183683333333335 3.8767599999999995 12.890716666666664 4.169649999999999L9.059583333333332 8.0008L12.88985 11.831083333333334C13.182816666666668 12.12395 13.182816666666668 12.598849999999999 12.88985 12.891716666666664C12.59698333333333 13.1846 12.12208333333333 13.1846 11.8292 12.891716666666664L7.9989333333333335 9.06145L4.169766666666666 12.890666666666664C3.876866666666667 13.183533333333333 3.4019999999999997 13.183533333333333 3.1091 12.890666666666664C2.816209999999999 12.597699999999998 2.816209999999999 12.122883333333334 3.1091 11.830016666666667L6.938283333333333 8.0008L3.1082399999999994 4.170743333333332C2.8153433333333333 3.877853333333333 2.8153433333333333 3.4029766666666674 3.1082399999999994 3.110086666666666z"
                                fill="currentColor"></path>
                        </svg>
                    </div>
                    <div class="lot-upload-publishing__title">
                        <span>提交抽奖数据</span>
                    </div>
                    <el-dropdown class="lot-upload-publishing__selector" @command="handle_command"
                        popper-class="lot-upload-publishing__selector-popper" :teleported=false>
                        <el-button type="primary" style="width:100%">
                            {{ lot_upload_selected_drop_down_props.title }}<el-icon
                                class="el-icon--right"><arrow-down /></el-icon>
                        </el-button>
                        <template #dropdown>
                            <el-dropdown-menu >
                                <el-dropdown-item :command="lot_upload_drop_down_props.upload_dynamic_lottery">{{
                                    lot_upload_drop_down_props.upload_dynamic_lottery.title }}</el-dropdown-item>
                                <el-dropdown-item disabled
                                    :command="lot_upload_drop_down_props.upload_space_reserve_lottery">{{
                                        lot_upload_drop_down_props.upload_space_reserve_lottery.title }}</el-dropdown-item>
                            </el-dropdown-menu>
                        </template>
                    </el-dropdown>
                    <el-input class="lot-upload-publishing__textarea" v-model="lot_upload_submit_props.textarea"
                        :autosize="{ minRows: 6, maxRows: 12 }" type="textarea"
                        :placeholder="lot_upload_selected_drop_down_props.placeholder"
                        :disabled="!lot_upload_selected_drop_down_props.is_textarea_able" resize="none" />
                    <el-button type="primary" class="lot-upload-publishing__submit"
                        :disabled="!(lot_upload_selected_drop_down_props.is_textarea_able && lot_upload_submit_props.textarea.length > 0)"
                        @click="handle_lot_upload_submit">提交</el-button>
                    <div style="clear:both;"></div>
                </div>

            </div>
            <div class="lot-upload__done">
                <div class="lot-upload-succ-tip" v-show="is_upload_succ">
                    <div class="lot-upload-succ-tip__img">
                    </div>
                    <div class="lot-upload-succ-tip__tips" style="width: 100%;">反馈信息：<br><br>
                        <el-card body-style="
                        overflow-y:scroll;
                        display: flex;
                        flex-wrap: nowrap;
                        flex-direction: column;
                        align-items: stretch;
                        row-gap:0.2rem;
                        max-height: 50vh;
                        "
                        >
                            <el-tooltip v-for="(el, idx) in lot_upload_submit_props.submit.result_data" :key="idx"
                                :content="el.msg" placement="top" >
                                <el-tag :type="el.code === 0 ? `success` : `danger`" hit style="min-height: 2rem">
                                    {{
                                        lot_upload_submit_props.submit.req_data[idx] }}
                                </el-tag>
                            </el-tooltip>
                        </el-card>
                    </div>
                    <button class="lot-upload-succ-tip__btn bili-button bili-button--medium"
                        @click="() => { is_upload_succ = false }">关闭</button>
                </div>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
import { ArrowDown } from '@element-plus/icons-vue';
import { ref, computed } from 'vue';
import bili_lot_inner from '@/views/lottery_data_statistic/bili_data/bili_data_wrapper.vue';
import Placeholder from '@/components/opus-detail/RightPannel/PannelItems/Placeholder.vue';
import { type LotDataView, type LotDataWrapperProps, type LotUploadAreaProps } from '@/models/lottery/lotdata';
import lotteryDataBaseApi from '@/api/lottery_data/bili/lottery_database_bili_api';
import type { RootObject } from '@/models/base_model';

const placeholder_props = ref({
    inner_text: `选一个平台看看数据吧！`,
    is_show: true
})
const active_site_name = ref('no-data');
const active_lot_data_name = ref<LotDataWrapperProps['lot_name']>('')
const lot_upload_drop_down_props = ref<{
    upload_dynamic_lottery: LotUploadAreaProps,
    upload_space_reserve_lottery: LotUploadAreaProps,
    choose_one: LotUploadAreaProps
}>({
    upload_dynamic_lottery: {
        title: '动态id或链接（官抽/预约/充电）',
        placeholder: '输入动态链接或者动态id，多条内容可换行输入，例如：\n`https://www.bilibili.com/opus/1145141919810`\n`https://t.bilibili.com/1145141919810`\n`1145141919810`',
        is_textarea_able: true
    },
    upload_space_reserve_lottery: {
        title: '空间链接（预约）【暂未完成】',
        placeholder: '正在施工中，前方的区域以后再来探索吧~',
        is_textarea_able: false
    },
    choose_one: {
        title: '选择提交内容',
        placeholder: '先选择一个数据内容！',
        is_textarea_able: false
    }
})
const lot_upload_command = ref<LotUploadAreaProps>()
const lot_upload_submit_props = ref<
    {
        textarea: string,
        loading: boolean,
        submit: {
            req_data: string[],
            result_data: RootObject<string | undefined>[],
        }
    }>({
        textarea: '',
        loading: false,
        submit: {
            req_data: [],
            result_data: [],
        }
    })

const handle_command = (command: LotUploadAreaProps) => {
    lot_upload_command.value = command;
}
const lot_upload_selected_drop_down_props = computed<LotUploadAreaProps>(
    () => {
        if (active_lot_data_name.value && (!lot_upload_command.value || lot_upload_command.value?.title !== lot_upload_drop_down_props.value.choose_one.title)) {
            switch (active_lot_data_name.value) {
                case "GetOfficialLottery":
                case "GetReserveLottery":
                case "GetChargeLottery": return lot_upload_drop_down_props.value.upload_dynamic_lottery;
            }
        }
        return lot_upload_command.value ? lot_upload_command.value : lot_upload_drop_down_props.value.choose_one
    }
)
const handle_lot_upload_submit = async () => {
    lot_upload_submit_props.value.loading = true;
    lot_upload_submit_props.value.submit.req_data = []
    for (let da of lot_upload_submit_props.value.textarea.split('\n')) {
        if (da && da.trim() && !lot_upload_submit_props.value.submit.req_data.includes(da.trim())) {
            lot_upload_submit_props.value.submit.req_data.push(da.trim())
        }
    }

    lot_upload_submit_props.value.submit.result_data = Array.from(lot_upload_submit_props.value.submit.req_data.map(() => {
        return {
            code: -1,
            data: '无数据',
            msg: '无数据',
        }
    }));
    await Promise.all(
        lot_upload_submit_props.value.submit.req_data.map(async da => {
            return lotteryDataBaseApi.handle_add_dynamic_lottery_data(
                { dynamic_id_or_url: da }
            ).then(result => {
                lot_upload_submit_props.value.submit.result_data[lot_upload_submit_props.value.submit.req_data.indexOf(da)] = result;
            });
        })
    );
    lot_upload_submit_props.value.loading = false;
    is_upload_succ.value = true;

}

const is_upload_popover_open = ref(false);
const is_upload_succ = ref(false);
const open_submit_lot_data_pannel = () => {
    is_upload_popover_open.value = true;
}
const close_submit_lot_data_pannel = () => {
    is_upload_popover_open.value = false;
}
</script>
<style>
::-webkit-scrollbar {
    width: 0;
    height: 0;
    background-color: transparent;
}

.lot-upload-publishing__submit {
    margin-top: 1rem;
    display: block;
    float: right;
}

.lot-upload-publishing__textarea {
    margin-top: 1rem;
    display: block;
    width: 100%
}

.lot-upload-publishing__selector {
    margin-top: 1rem;
    display: block;
    width: 100%
}

.lot-upload-publishing__title {
    color: #18191C;
    font-size: 20px
}

.lot-upload-popover {
    z-index: 1
}

.lot-upload-publishing__closing:hover {
    background-color: #f1f2f3
}

.lot-upload-publishing__closing {
    align-items: center;
    border-radius: 4px;
    color: #9499A0;
    cursor: pointer;
    display: flex;
    height: 20px;
    justify-content: center;
    position: absolute;
    right: 24px;
    top: 18px;
    transition: background-color .2s;
    width: 20px
}

.lot-upload-publishing {
    background-color: #FFFFFF;
    border: 1px solid #E3E5E7;
    border-radius: 8px;
    box-shadow: 0 13px 20px 0 rgba(106, 115, 133, .22);
    box-sizing: border-box;
    padding: 16px 24px;
    position: relative;
    width: 50vw
}

@media screen and (max-width:620px) {
    .lot-upload-publishing {
        width: 90vw
    }
}

.bili-button {
    background-color: #18191C;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    box-sizing: border-box;
    color: #61666D;
    cursor: pointer;
    display: inline-block;
    line-height: 1;
    margin: 0;
    outline: none;
    padding: 12px 20px;
    text-align: center;
    /* transition: .1s;
    transition: all .2s; */
    white-space: nowrap
}

.bili-button--medium {
    font-size: 14px;
    height: 32px;
    padding: 0 12px
}


.lot-upload-succ-tip__btn {
    width: 150px
}

.lot-upload-succ-tip__tips {
    color: #18191C;
    font-size: 20px;
    margin-top: 20px;
    line-height: normal;
}

.lot-upload-succ-tip__img {
    background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJUAAACdCAYAAAC98ToiAAAAAXNSR0IArs4c6QAAQABJREFUeAHsfQd8m9XV/tFenpItee+9E2fvBJIwMkigUGaAsttSWjpov7aMtnRAB7RAC5QV9gojAUISQiYZduJ4771lW7ZkS7Lm/zmvrcQ7YX2/3wf/C46kd9733nPPeM54ib7FzXvffeJv8eP//0f/KkfA0fP8PJf5tTcdXc/f8Xmv621/X+3ofinP6/3/BDnd2H2rVupw74sZ7t6XnxOLZfslCtmlROLrvN7XJdMNzlTbXdL+fKlMdMzVl7zf1ffyNe3t/1FPddy3edu3gqjM7f8Jcfa8+EcJiT4TK6RbvG6Pwm22kkgsyqWe4aTPRQAimiuSy2RSqWSxRCrealD4H3YZX7r69dc/H3F+rnv+Hzv4G09Uru4Xr1Ap/A5LlfJ7yEsBTusweb1e8uBPqpQpnV7vks8zZzhvHnk85Bx2ktPuJLFElCuRS17cfJ7rQ0f3K7M+z7W+qcd+Y4nKa9waDu70hlgmflUqFiczMXlADBOb1ytaMXHbdL/Lyu6Ti0TiLHK5Tx/idLgEApPIJKslEu9+h/Gl/NM7v6VfvrFEZbN7xF6PN18kEZPT6Zpyer1MHCLvHG/No4opD5iwMSEiORwsLtbtnkycYH/kdrsrLGJvzYTTvnU/v7FEpY7e0uZ0ei71uDw9UtnUujj2kZhEcRQUHHcuMy91e5PAkfw8Hu+4w8ViEbldbpvL4/2hTneNedzOb+GPbyxR8VxqIrechHi60UuiYTE41sQm6FUKmdLtFedM3DfVb3C+dLFcOmmXRCFnLvUHddh1Ryft/BZumDzS37BBUIZd977T6fgpE5VIJJr8dNju9rrnTN4x5Zb0iVtlKjk5bfa98lDlQxP3fVt/f+OJiidWqd/yL+hVD0tBAJMa9COxSJw7aftUG7yUTGP0KYlUQm6Hq8cjEt0uEl3umOqUb+O2bwVR8cTKQ6J+CQvwdZl6vE4OzIo85E3xdr6gmYkABGVeLIpmOIEbMz3gXAS97G5l6LVVM537bdv3rSEqkWilSyYR3eyyOQ6wyPI1D4gK9BE+LPFG+rZN9WkNCtbCwjO43SNKulSlIJfD+YzccO0LUx3/bd72jSAqr/c/MmBSD9q7t86IjotgmUnFdJVr2FUpU8iEeReUdZlEKfGKE2YiBJlXbAB3CvB6PcTnuuyOEplc8tOZzhnufuF3wx3PXT7TMd/Efd8IonJ2qa6T+qt+KZOKP3QYX5hR6QZhtXrcrisAAXT5oAaRTAqwnVJnmmCxlCKkMqlELBYTuJvF6XTfJAq62jTdOY7u52+UKxW/lshlj3r7X5qRYKe7xv/V7f+bRCVauPaaGTnJFxlE6EJ6kUR0n2domMRiSZJEKvsAHOuCma6lMGwp9rpc1wCvHJIw1ACKgno0I1GBkKIJirmIlXOn+2fq8C3HpruH3bj1YolU/i8o8SSRSw0uh/uRz+u4nu7a/xe2/28Rleb6v297JWzWwke/6kFxSEQ/hX4TBc5DTocT+pE3FAzlzWHj1itnupfMsGU3iOMOUBM0by/UJVHiTMfDXxhNUPKhR/0HetR/pjvW0fniAqlE8gL6oWK3kNPmIKlCvs7R7ZixP9Nd7//i9v8NopJdcf8z/01bsu4Kh22w/KscJHvL1iSJSHyLG45dX3M52S/n1SCK4HlH19bbfdun+mQlG1zkPuZAcDHHgJuc0eAnnCAiUbLLNHhc5vbePWHX6Z/QnzIlcvHrErFI6xrjHwRoCkvRe6+37/XA0wd/PV/YdTC1++Drud+UV50MD0952BffuPrWe3+dseKSK2yWfuprqan44leafKZYQT+SKGWB7Cwe29zsfkHQFETPY8PdLwYq9Nf8aez+sd/l+mt+7zS+CLEsupy6XcHY1zV2P38HlxI7jVsHPcOO60QRNwxN3M+/bR3PxknlsjcBskZzBMPY5oLvEVBGEizPm7D9r2P3fdnv8xcvXrlx/fpL4xISc4K02kBgbt5Bi3nQZDI1Nrc0F322f//B3bt3F+I+4zv1ZW88w/lfK1ElL1qzLGvVpntkChWZOpuoq7Fy0oTN0LcZd0GXineJ6GY4eAWknMNZxjYWPWLyiuQK6R+Hu7f6K/TX/s/Y/b7vQNm93u7Xv++k4VgXuVkETtHHJyUyqep+kf6GZt95Yz8Hu58Nk4rlb4pl0jSnfTIGKiD5zA293s1e795HGN4Ye/4X/C667Y4f3H/HD77/P5npaTAfJrXFNg9d3Xptk7e+rq7o0OFDTz752GNbu7q6plwUk87+Ehum6MuXuNr4UxX5F179kD4+Xe52OaDcOmjIbApTBAbyxMXgT4e/L3x/q0Q2LBZJHnENO7EKvXbGnmRKOSTZmUuy49cFZVmulP/K0f3itMqySH/5oMcrvlEqlvWMf4SRXyLRrU6R9rrmqfZ5Tc8GKcXyV6UKaf5EgmJHM4OtIKph95D9WShvW74igiKtVptxxVVX/TIbBGWHxLdO8SfDUCTHxYri4+NztcHazSqVKnqqZ/iqt03hDPtqbpG9avP163/6t2eV/sHk9bixSj000Nlicw7bsWA9LqfNau1urG0/tu25H7VXHz04elfWaTg8lymDoWtm2fw3efljIzfBquq1p3jEkqUgotXYtACTGSWWA4eCXgNlnI07DshDUJ3jaVmI9Q4mEj73yzZG4V0S0eswFC7yiWBG2gE94B9YiXbnAH5vc3vEj8lDryz4svcbe35WVtbFb2//cHtsbNTY8C7hEGZbSvSjvLrW+enePS8999//PnL8+PGised/nd+/LvGnjJ+99Mf+oRECh/LiAUFXpItOUrF/g8UBTP8Ac1t9m8vlMMzZeMvvwxNT8wNCw2NUAdogpSZA4rAPeRx2qx3H2oatg31Dfd31va31p5pOHTzeUn6iGIMywAMDnxuuTKyr8d+TwISCXS7K99gd5+H3SpBdNqI+hThymZ/qJmePSO1t+dtNouif2LD/CzdW6p09w0/LQFDQlQgBxkQIsXHbHZC8niJyeN9wuZ1vKA3X181wEyX2hS9cujQmNiYmUhusC1WqlUFyKGd8EZvNPmS2mHs6OtraC48da+zt7WVuKYiv1tbW9u6uTk9CbJR4rCzlKJ/hYQe9seODo0/8+/Ff7N21a98M9x+7S4UfTA+WsRu/yHdM91ffFAHatTf9c8dHoTHJ1N1YafHT6mV+WoOSORYTlAhLqXjnWzTY2W1ShqYEJsyeJQ6JjQBHY9MeDAqfPuJjHwrOYH2EQGQ00NVCva11Te0VJz6p2Lfjrbaaor14AutUT4FzRMM9LyRDrC3GRVeD9y2SaJSxLuvwTptj8JqAiFunFHdTXWvsNo5Hv2TF8H9kwX7fIyjlICqe11J08yM83HtSraVgOm4YExOTsXHz5uXp6ZnLo2Kic/WGsKjgYK1fUHAwQTwRrFYYGSN3c7m8IJBhspjNZOrtHi6sbW/ZWVh5rKu86L39bz/76T+f+M/uH9x2S5Z9dMiUIKjahkba+sILf/39fffei6tMqz8FhMZeqNFHIs5ekQZMLUosken6u1sU1n7jx8P97Xfg3Gmlw0jvpv/3ayGqsNjEB5Zc+aPzu1rqHj/w0iOF63/88LMLv/uD+S4HmAPYVu2xw2Tps1JQeDIG0EsRKRGC64MJZ8YGggTAyVwOfl039TTXUNPJQ2Wle995vubY7q04t3Om8729Lwa4PJ5ZJJNfBEuuV64PgdJ8kWA6csqVCBjqTOfzPm/Z63KXfvgPQMq/53G6C9Hj3VgIuyBWS6YjJJymvfOuuzcvXrzompSM9HkJCYkqf+h/PPhMjXxTXke+x/d94nGFxkTGTiUzjnmv1kk9RiO1lZ+obDy6K2DLnb+ImJ0YRuFqMZ0sOjX057/8+a43X3nl6ZEzp/7XTxuWGZ657KRaGz7iqxKJ4XYaorb6KvRDRI6e2mvsptaXpj777Fu/FqLCbbX468Pf4pRF33kwPm/e4kVX3Cixmu3UWlZOPa31FJ6EUG6Rl/RxYeSn9RO41Nm7O/4IsUQK/UVO5t5Oqjywo63ow1eeaCg6+MTovccfPOHXCMJd7j0XQhp7Kuf9CWlaakWNyO/yGYkY52nv/90fbl6xcuWtOXl58UEalUBETlCRj3DGXvts3+G3pMpeBx1otZNCpaa2mjJqqS6jJRuvpJ7CXe7n7//xT0rLy88KMBuS8+/Upy58BL0QbinCQu3vaCRTXz88AEpy9Le9be0ou3Rsf/yCg7MCIzK/a+qq22bt6WCIYtr2dRFVcPzstb9Lnr/htqjMJZKBrlpSBwSSWBZEnTUF0K3SyS84iEJiQknpp/pCBDX2iXhQZHIF9Xe10okdL1YffuuJ+4d6ul4ee8z/8nf5T352zzUbNqy/Z+78+ckqKDrDmL8p8i4+d7dgUFJBh51OdNlJLpdT4UdvCgvLDgMoOjmjrbGkcG/hjteeKj+278B0F4/MWvaYLiHvDlZHuLFKAriHbMNuZAfBoLF0Fgy1Fs/1nR8Sn31LcGzmX9RBYYGD3c2tLSX7VjssvZW+/RM/IYW/2hYcEbN43sYfvZW16oZ12shkMew8IYulq76MAkKiyT8knHRRBgqJ1bOp/6UJSug9lr0b91Fo/ChhznJddMacS+0Dpmxjc/VR7BcU+pmeMjt7bsKGSy+9PTk5Nb+stJgHyz7meIY+/PA3pd425jjh68qVq5c/+Jc/v3j9jTd8Pz05SeeCaPminGnitfk385ZIfykpJCAE4AhSTSB11JbRvAsuE2nDowNis2bnJuTNvy4qNSfP2NJQbekzTuKmAWHx12qCw7IE/VW4qBfqSDfiDxEdC1nrtpsbnZbuZ3iXPjHvpyGJ+Y8q/XVKOOJJ4acNgPoxx9xR9yp2T2lFf6VElbn8kltmXfyDreBSUQEhgWQftCJ220VSsFQpYrt1UREQd+Hkp/MXlO9R7st9P+cmlkzfZdbJPDD9tJEJlLJwdYZEIt3cWHSoFhevnuEGkoce/sv7191w2/WpGXkXxMYnnl9yquADm83muPtnv/jtAw/c/+SatRfcUFlRc7Cnp6tjhuvI/+fee3/7s1/8/N/nLV8WJwbndEyjobGu9GVEBBNWuJ+UIv3AoVX+pEudRQ54EZxOJxaXizRBOnFs1pz0+Jy5V0tVGmnjqaO8uEbYEr4EGOIuU48lKkyExWTEASAq/Oca6j3gGup7Ozg86ZqQ5DmPydWBIh9XgymFxRsY5XHZ+6393YenGo+vClKQLNh8x4Pxcy75eUhMIgUZ/AUu5KfVkB3RA8jkJZV/EkkYjcOIsJX3eRvy7YhdPab2RhBnAin9gwBTsJo7ubkcEA1KDZ1/270x2sj4tz9+6ne/tHS3TececQcGBbmUSgUsLylt2PSdOWVlp56flZtpu+vOO9epsJ1n49jxgmUVFcUnJt9N2GJ44qlnnr7qqu+u06hVAhA5zXGCZWcHBMFRo3JgaV9Et+Jrg4ZIp5LQimgJDQx7qHNITD02N1lAyXZYjU7PMGXl5fulpaY8sHRW+uIHfnz7LTitmc/1Op2DvAC9kMfMmUYsbd6B/70uKO2WQwqFIik4PvufKn+dmMHrsU0KD4kqOOKH1FDK3Kx37D7+/lUQlWL5ll8/kTx/4w3aiHDSaNUCtQNmIYVaCapWCvfkwfsixOTrMLNqpV8AuFA8YIoqUgdqoZMlgbBOL0DfocInW4ce6AhzNlwvC9BHPLzjHz8P726o/Dl2TuIfJlNfjxx6D/eZ/XSrVp5/3uWXrQdhjnAb4EVkt1snDd7oDfVPP7d1x/VbrsnHXBJuOW0DWkDd3T1UV1tHebPypj3uXHf41maAQkxBUCW48TYOTh2xJr0kkehImX3b2oxow8c/vevOy4FvFXvc9vaB3m5EdTgoJCwCZ7FVDeJCczuGnE5z5+GwtPn/8AuNCRocMMEoUAn7mQBdw1bqa2sAtNPJJ4bjb9K4jFyJr/bFmvz8W3//35w1194QnhIPsYYwbyae0eU3shp4RQgbv9gdJpyl9Auk6Ky5gg7VVnlSUDJ5pU3XGNtKXrCGNv3ysbsNiRmweCa7hsxms0UO8cwDOzQ0SHGxkaQNChSQar60A1iR2QTTdXLze+rZ51++AQTFetOYnIhJRzJBdXR0UVVlFc2anUdyheILc6mJF+fhZc7Ff/ydR0OKf2TghjCwBTF8xaWbUv/6z3+9HxoamjxoMpYMDfSR1WLBIkK4EAwd/MOrHvqU5TOJQhEdEJZ4scXUS10tjWRsb+VpJYg76miooYG+XoT0DPwCm8om9oV/fxmiEp9/ywP/zL94y9Wh0QZYX3CY8hN9zY05FrNtQ2ImLEottZQdZyoWWPh0t3aCsGJzF9PGnz3yA11U0oMTjxu0DA7KZPDTARUfGhwkfQgjIiONicoFPQXcanwoBMbuwYcefvyaa64+z4Hbz/TorAYyh6qurqH5C+ZB7H11BOXr58RPngnfbPDwwLlMl1+yMeYPf3n4jUFjc7+/v8bmF6Slgf5+slqHCF4zsg10ka2z4lNSGS53iRQ0aB6gQF0oaQ1hNNjTBuJqR4q/td9lar5puK+J1QnfLcbd/guLv+VbfvbrORu23KLBip5Otxl3p6/4B1uVwZFxJMKMNZceo9js+XhCXqNTPif8flaKm7WULrzzwV+8/cfbm62m3sd9XWpra3PLcaoa+pDNNkQhOubsoBq+HJoLutvQ0ACm5Uy7ZMutv9hy4/euFYMFjQmdOnPA6DeWKgP9ZiorLaOFixZAbwNwO6aLzCRGLftJ536VG5iwGHm/9pqrc4sLj9/1+scFbSFxGUkpYRpaPC+HYiM2kJKtcbfrrqraBvWRE2VU6gCjUMPgGjCSsa2J3MPWj+ym+ntgEZyaqW9fiKjSFl14M3SV+/y0OsG3N9MNvs59bOkFh8Wwo5gaTn4GOGGJYP1Nd08mrMwVG+HYbn3o/b/9hP2HR358993fT05OWdvQ1ERKhUZ4Hj8/RhBGyBNzTmYo1q3GvtNcPT530Zqll998n04bNCNBCVwO4uVEYSHNmTtXEHlgsqcb++mKT5UK7pnElERYyqd3fS1fmJiVWARXbbnhYqvN4d5y4420cN4cQqTs2PsF8A/Wy0pLSujvj/+XXn5pWwl013vdtv53sWvME4w97cz30wN1ZtPM37RhMRmLr/rhQ7DARBzO8nU1VgoZlDtbY3wqNDYRbFlEzcWFsDBHPA/TnceENf/Sm9XzNt38HxwTd8FF6/9n8dLlqf3mIaqrKafmpnrSAO/ixncfhIH5SYOZukxm31hFrrrujv/EZs6ST1P3QziX/2Fj98NPP6OAqGQKCvAbB37yPLa3d1Lpjg/BIUaMmdMnfk1fmGv2DlgEEf+3f/xNsmwRuDtYJRsXE/9YP8vJyaZnHv8b/e439yhAUByTf1aC4q6PI9FzeBbxRT/607OZKzdlO4fhx/uaGiuOprZGiDYpfIIY8FHFf9rbQRtVBeio4cQJWIVqQdc6DexNcRLDE5FpeaFNxUeH5a6hrfqwiE1iqYrmQIEeNPdRf7+JIiMjBaI+3u2ikoZ2Ktz+0ms2i7lyzQ13PbPyqtsXIVqdUrXw301D91Axqbisko53Oej8eZkElU0QzHw4c6iOzm5q+uBj0vv7U8S8udj2hYTGFE83/Sa2lE8UFNLsWbPIz9+PhMjr0cOZyAVdfYxoFlIcoQMsmD9f19PbF15w/Nhb01/9zB7f6juzZYZvsy/47sbkBasvYu7w9TYUJIN11Lj/XUFJZiKYqbGBoNQogNJnUs3RY0I0w0xcjnXAQEM0Lb36rjv/8Y9/VNXXVr/f19NNRaV1tGr1BRQRHY2V6yUbMIIms5MS/ESksZuHYrLzv7N48/WXCagz5NiY8R/XPdbF+gfMtL2wjuLTcwgYpdDYd+fB9+qmdqp5/wOapw0lD/Q4BQp8nG3djLvBF/jBxkITRHxkRAQFgmuOFbUc11jf0EKdHd3Ei2FsY3HNcMsNN960Dhw1duy+6b7PPFvjz1Kkr9j46wB91CTF/GyTPv4yZ//F1p0/Jj0iNIzcB9/CBLtGQLoZThVjxjRBASRXGai+4DMSA8icqTntNspYvl6RddG1PzcZO+sXLsin6spSKq9qoiCtQQhB8ZnpUq/L29Y3ELv8Ozf9MSI5E3oXXE+gKE5EnYpRMfHs+PQIiaMyKFTNLhUQGQDKY0YPPb27lMre3k5LDRGCKe+GuJbC5TK2MffzGQkssvjvq2imvj4KDw8X3Ea+6/G9GDK55w+P0rV33kcnT5UI/fXt50/2DGRmZfr/9Bf3vHDzbd+/EZvOmMdjDxz9PoEupzhidNPsi665dM76LXcKkzVhWdkHB8BZJusFAmI7nXyY/lYjewAdEKyw5I4SKAJt1K+NwYoBwDfh3r7LMGdi4NLlFAN1byZ/bQDA0kAcPh0/geyH8xQuhyRxT23iJevX+XV2dUIs9VBIqJ4C/BHbhGu2w+P3WXGlp72mNHXTj3+Xwkg494FXd6oOKLxv9kc7wqKtsrqO9jYMkCEhHSEpIuoYctOBDhcd/+wI5dSfoI0pSYIuw26VTrCGyNTk04/FBDSM8KxBJHMogLh39ZjJgu8qRK4y8U31OMyFptruGxv+5Oye1uYWik+IH5HDozuZ4HftO0wvvH+Ihtwy2rl7H2UlR1F8dKSgrPuuIYOCqNH4x2669LKNK1asuMxutw9WVlSc9O0f+3mua0ACX9oP/XVhAkY09gIetxNYURk58OCnRQ4mo7e1h7oboBd90WWGUVKo/ag2PIs2aFwUVvQhDQCwE8Mk58b3Eq6N40aIV0xKjgeHUPIPiaNGKO2nl/vYDo/5zu4HAKJyjT4mjDfHxcVRXk4qRYTBBQSaZnpZHCGjdIO/ZOXVt6UxrsP3YvY0wsVAsPjua3y8xe6iV/cWkj45h+BNp+p+Nx1uQ6zS/g9po6mW1qWlCucK4cZYOJyc6psE1mtM/UPU2GLExCO9HjsCINb5npV1HdRjGhSI2Xc//mQMrRy620zDjKECVGLDIhJPOt8Nlrvto33oh4LkYLFDpKG7fvtXqq1v4C6ebr4+8v3WXXhB4sN/+/t/v3/XT57FAZMKm/iOPX3yVF8S85bNj0ibtdA1wdrjiWUL0GFzQY+BnjU6wDwINouNBnpMMPG/hIUIseeKSqPjNhF9P9lA6aUfkbGpikQyBQ0DrDN1dpKpq4sGELTWXlsDy48D+CTMfchmdiBGqBmDPWZkJjwcczFEPVJ0QoqwxwldUYXCG5ywwI1FXCBo+OrlOZSTlQUOMvIsvNeNcx3Qu0YfeeQTo/nGgRKyKrVQhGGZYwG0t6IPn7xBt6idND8+njwwKqRRepJlJQpybcRPJ9yOGnustKfSSJ0IETplltBBxE11AscPMwRRNgIZO41mMvYNniYgVjUtQMVLS4oFBH3kKlP/y8TACbe+/vJRTDR1jU10pKgKUkCGhSoGd5RSr1NFf3joUWBWIwvId0UJxnJw0EKMAsfERNPvHnjg+jvuvJOD+TgU+XQ7J6JKXXbh1bqoRMlkkJNFjkOIifILOhNoxxwkLDECkQlyhFT0zjixp3sy1RdMnAbcqkgTSUZEPHwPXOSizgKq/vg1PNwQBekNpIXiyTACRy8gtBsZNXDSghj9IC5by0/Bgpz+EbmfjqF+SooMEe7Og+ZAfPfYxuOqUaspFusR1t9pbsycihV53yQxHR5tG6ZjxWWUkDWLzHD3tB3aSXnFn9CtCVFkCg6nYomK6nUhZInUk8hfDQVdRiWdQ7St1k4fNljpjZOdyA9TU22/k8o6BumTU030bnE3vVzQRW1mF2UlhVFLpwncCTdHY1Wsp6OdJMjMPltjLtVnGhhnXPBy+2TfIaquqhfcMX3dnTQEIpXDYbzzcAkdPXZc4JZ8bX5O5naYEqE5AEP4+WvoN7+9d+PGSzY/PLJ15N/pR/zMUQFhSdkXT6mM404MQAaEBkEsjeEIuDMSAigiIoiG64rIy0L/CzbEXJAoJoM+7R4QVvbarAxaJx+mnoPbqKmsgIwdnbiyiPQxsYK8kquUeHBYg8jiMffABQGReVosT+yDCJxtsJtSYlAfFvvYHzcIYpg4KIxJZiJkx9bbLijXfBm+hxWTy6KFFfOKPhcdKGsAgSuoD2G5qt2v0k3KYdowL58USTHkig4j3cJZFJSZSm1DXipo7KNB3FQG7tiHHKsOAGKsEypBaKynDZn6KTDIn7ShWupF9MHrBbDO7CIK9FNSL0SkT9z11NZTKPTZETLjnk1uTAhqLIzeXhOZBmynz0WNUnrrnQ/IAR2O3TWdbS3UhHzfgdYqykoIBxdH4ZJRIuKr9oFB+AEC8W1jSMKg09KPf/7z22Exb/DdeWYTCUelL1g7TxeTHDsd0Mn3ZJEzsTFOpFJrKNrWSU2mHtIEBI3oIxMPnOE3T5ylp48UgcFUojRQj2WAdPNn0RWhwbSqtpH2nTpGe5tLyD37PESVGnAlhHzYLXhonmyElqh01F1fCffM4imRf4djmJQ2IxkMS0ZXsIRaWtooLztzXK+YMcQAt1IX1sBpfMYZNAiLjh239QNQwo0uai0toASxmdaFh1HWvHWYSUgFiBNO2UpHgkRlUyuC6vwoNCSIzIGB9EptP7X2NyMJkjOqcSE8L1c+FkuBu2nUUB/w7FgkjiHkL2CMD7XZKRmlH2Qy1G/H4SYAttLOLrIAozM7oUuCdQnY0rjej/xQoR9K5EaWldfQ7Lx0AK4c50905Xc2UmxcMTlgNBhAwDkZKTQvP4cSEhKEPvlcUJzb0T+A8dcGjwNxQe+0bOF80fVbbrz/wd/f/zHuZp9MDRM6NOviq29JXXTBksmiD/wBE8cINZyMMOdDhcn0nc77rDYrrXQD5OvpIU9ECjzmM60n35lnPlmk9bTAS94AvcmtIP/eOkqbl43QxxDShOspIz2NclxWqtz7HhWePAJR0IWEVReI101yTRAUUzn0qmqKSM2aRNB87f72RvLCotRFRJMBiXJ9fRaqra1l83m8mMAEKqCvlZVXIvAesUQgDE5UDYTpFIC/XY1DZOFCHI0F9JubrgDXjIY/BBX7eLExKwOxoGgHhQXBonQ7kLhgIjP8gayztDc2kl9iurCfQ1HsVhv5BfjDQS9DDJoGYzsSexWkCyY7KKa9pZMWpOhJCSI5dfQ4JcFAOoUAiir/BArXSMkfYTCsC05szE37LEOIkqgBt9FChxohsjm5mbThwlW06eLVtGblEsrNSqdgrRbXQJVATBd6L0AMRYAaONUuHZbrRMJlrhmk04XteO/dY9Dxqidy+ol9EcGrv8hncY3dyag3Jx1w8gFXoxMGb+wB+O5Gr5hbrZWYqa+uFCtwJOZnwmHT/mROFZaYhCxjxP5AO9wLbuBo7yBvF8pCBWiosKOV/vrpAWowmUnd3UDukx/QcOl71HjoFeooPwAnsJn6QSg2s0lYAONvBAu1qYJCEVT4Gcz91yrM9PZJuGhg4bHVxSAgTwQPaqfVQztbYOVKwwSkHxGl4BQiMmKZ7m2Gd98tIrOxnXKi9USsoI+dVSaqUcJiStUGqCktVkdzkkJpc14YLQuWoZ/MXWEUgHCG4EbpN/YKC6S30yj0OwhREywNjC3tZEKuf51NSt14DYq1rIIioqIoKNSfesG1djZaqc2CSNsJs8pcDZupoJeoqK4JBN0PBb2D2jv6yIaYHTC5cX/cfV+3XZjb5vYeOnDwMBziC6eMZuWwn5zsLDp/7YWX8xifjVPpFl1xx71AnzW+nD0+iQmK8+8qD3xAhuRcaq+rgV4VJnjghdHhY9CrYdsgpZhbaX5yPNUUHaGuYFTj0bBMPneOxUQbZNBTX3MldUIJSbF0UJRKAwW3nf72z2fIAgXePziQDBhcRCuiuLWV1F4rGQYb6bwwRBAg/9IeEkv+oeGTuJVCHSAE/LEe1g7CeefQCegWvaQM1FEHrMdOh5wKupxU0O0AAUFhDwqhysO7KDIpQxANrKgPYUZkMBSMNSW0KlFLHe1diL3qF+6lgKEiBsd67rlXqaKylrJngcsylM0UxLOGfRYg2RUuOWLRQJCgOg3QbjMUan+IR36uLohjGa7TXt8sELg+NppagJ0V7/mYloD6g+bnUr97mOptcpKo/KgZHgADAFfmWHwbbnyrw+0OqmjqIIUunNrLCykZi7XfPAiYZgi5hXhrBfQ5Oz7tENNWcL9+6G3dRuhZ3Sb6aOdHtGz5YoqJjpo2ZkwF0dvS3qH6aMf2J2fUqSKScmLVgSEhTFA2AJwKdFqGCQV7osNv/5e6KguAegdT6EAdDeyvIEnqStLFpJxB3PFUYvyJoKjeEqSk+998k4ZWXUcapBdxZOa5NIYnZAgNTl20hEoO7KXtpSdp1nkL6YV/PydYQUsvWkPz580jFZRVK65ZfuIkHdqzlyxwk+hgdT1wxYX0qw+rMbK5427HhM2ovcfURSlH36USt5xUiGg8KlJSueMYJUZFICRkLqYZEaGYlf7OFmo5cVC4BnNQzNPIH77w3Dn7uyjQP4ceevRZ6uruo6BAKNnaQAo3hAKlriDEL9G6i84DcYeQF5PrghEhCdNRTFwkeUpaiFIgcmG1ohIIhSFIUIhNw7VZt2pvaKaQCAMxx+K79rQ1QvczUt7qFWQd8tAQgqUclj6SGGBMgDg+Afe8KEED0SwWdC9O66o1OWAteskQn0LdeJ7Dx4/Rwvx86FIu6ujqE56Lic/X2DJmw6EWKWALF8ymXOiZbPFN13hX3qxZ0TAIMmfkVAmzVyzMXLnhuwpwl6IPX6adT/5eMDedTSdpQYw//fCm68CFwmguFL/NF6yigs8Okls3ouCxtTgM8ZPv6CI3TP/DDg3JsRIaTu4nCbAnBYhgIsfigWQON6lhEhn9Dgee1AY9rfj4PqquqKYla86nlTB/nY8+QcPv7SBJWwfFLV9KiXNnU31VDRUWlVIu+lbV0UvSsNRJOp0bffRrKaObEg20DBO8PEgOWKCTLDIV6pvJKEQtAycpJ9eJvZTVVkrxXhtpVl9OCiUUcPTJ15CgSjaknm0+bxHl5mYhIM9Ira1dWO0WAaHn2Hc7YvyOHDsJTM9K0clxpLQC36tsIL8IPZXW1JIzMgWTjmfH3+lgR9xCA/1KF6YXQnp5gTHS1H90F6XPnkdLFqRTpB6pbwo1FVbUkX94rPCMePWEYFEmBstpED6WT0FknNQw2GtEiLQKySfJ1E9yaqwsJiX2qMGpGadijsvj74Bux75QUx/0NxBUenrqOOez77mF7o7+YH0rMDBIWl9Xc2JGokqZf975KQvXXMgyVgz9SdlbTVctTadLVswlPVacCbKZh7a7p5fa2tqJlb6Chh5SQXwInes3Ul1dKx2VxVE9BZMaAX3Xz9PT3o93kAs4kgYx574sDe4bD+YQ2DEXapWwSwYDKPw3Smd8TW1iFhVUdiDgTEybhgdIBIJyd0DPgqXkLjpFw/sOUVD+bIpaOJdOHjkuKLSsjFuDEqAMj1c2hoGxxZtqaBZcOvAuUggKEK+JMZDOWEdLlC7KHuqmJSIrrYkIpZy4OAqB8lxosZPSEAW9aVSEo092EIq0vZyWzpsFlcqPFi+cQ/HxUfCxuWDCW8iKFS+BCLPbhqm4uIIKTpbgOaIoJiOZROGhZOvuoMohEVxLoULcuC9enMeEiZc5I3+ybttdfYquytbTonSIwWa4lXosgkiqrW8iuT5aEMus73EyBM8bO8Q7AVdwzJSpu12wwqUgHo7x9waFUwMA6uYuGFOtLUDmixEW008aGC1RiOadN38OaaHn+SxAoT/4h3U0btZRnI4hEL6XH6zLppbW8hmJKnXJ2rWRGfNXOmDVrE9R0/VXXgZ9SoqBMlNUVDRl5+RSUnwspSQlgsUXU0ZqMpVUNxBCMhFA76DGkgrqEgeTNikZpruJNsaLKRmicA6yXT7b/gZ1SjQUHB6D7o0OGibdC9OiF4qhq6ceYtSJzBAo58ByhuEAZsxpoKWWmk7so6WxBsr64APy2AE5Y5AE/wN/ou6A81gB6S++EKvRQ3WwdgJ1gWQJjBO4ozAa+IfZuxW5bssTZBSVkkAeJDcgFZ4CsZIlXjdlwfGaFBpK/sB3cLBg6vtBpFUBq3Ho405jWcyRhxB2q+mrowVzZ0EOMnkiIyAhjuaGQWS9/i7JKuAFQP+HIHKd0PsGoFR/dvQEiYA5pWakkj44gA4XnCJNQiZV7XqbAsKihORYX1/5k/s70NtDma5WWroQ2Be0cbYmtRBxavw5IcabnXJSI8tIIEAQVjfyAk0I92QOyP00QYT76wxQ+jmLB2oFCD0AC0RliCFZWDy19Q+SIS2H1i/NA7wAMQ0cb6L6y+vSiOsebLNRIeD+egC1QSjiEIg+MLxSUlbRPCNRZSzfdKFK7Fxyx8oU0iA8o7auAVp+NqUlJ1JAYAAZ4R657777IN9bKRPbe4zdeEA5tQyrEF1pRHp7D5IP1ZQeKqHvpsopKTpYsIxQjYLWZKfSQH0hHYeLQeSvJw2wKJ4Mzg8ELyZN1VG6RtJNkaZmiupronhLC2VQDy2KUVJnYxnlYJJCisvJw/YsGqq8CJ8iPr9/gFxQlhOuvxoi+ShpMWlMVEqIcR5wbrw4nJ01tD7LQGroPRLohmIQH5Yp9XYZyQPw1l+PgUUGtUQP6ys2jCQpsWQDDlY7JBFgBb4WO5gtpj7SDrZS/mzobbysAR+4jH1UcTMqYoMzxeN+aeBYqbDqgo1wWM/LJQWiRosgnhNiIikahGXtgOEzKKK47lrBwpJHxOKhRpQY5tDDIFZly0m6clW+oAoID4H7c0EPFTiETiWjQ6UwmKLhrPadx88pHMj/eKkP99CCYAWn+Oh2Fqn8HIKIhpUMxynWqJwikFfI3GdsY4JiItrTZBUAWebVQzD9ODUsCaJWCWX9VGlZC2Zg+gb/llgDCyUYgNeuXXvo8ss20bHCkzCBgT8tW0yh8OZ/7+ZbwTItlBCfQO+99w7lz51PR+FukPsFk5/cSTfl+9GyuSEkQfyzCYTWBX3DZIYrAISzGnrYQhgA7x/4hErLgcvE5WLlwEKECLHmrQTyXEznzc8RiIyQ7gVZBtAE6e3gJAMvvgs0H+4JcCdexfrLV9JQWSMNVTSSGCtQBWspAkqvAd52FQYeuARG+MwQO8EBdR4o81oAnZgw3icORMQnFGoVIjFtESCkPOg5TCR8GhMjjkkHMv5pQSuJ9CPWJIvnEaNjzAzgfq2PwTI9VUYSAKCCEwXncjxpHrhUDLig/q6byQIiY4sVlEqrFufTsbc+pbCAANJgIRX1JlEQ4A2+tpc5ZVsVXTUnkeTdZnL3t6GfauimsBh5UWH2Q3DNSCqEm8UshCf7Fo9vdp0AegXiAcFMZSTx0LCYBcpFZT1QC+D0DFaewbyYoNqBS+yDfsZgsC86gz8HwA0Z9Q/AeIOiRTMSFSxWq8XtT8Z+KxBYuB+w2t5843W69rrrqaq2nvbs2Q3FNI8WI0OEGyvfbkSEBnotADuzyK+nlFbOiSUr4nXeevVt2n/gOHx26BQmlAcDdc8pFiv1iksvpqugWxw7VU5NbSAMOFQlai0dtjhoHh7MH8qqoMPw5ONv5fIlVF9SS10f7BYSH6TAfuJ/s4WsNa1U/4N/kSEzF76/EHJDFIcgF9HfgzQkYfWOEBWvfJu5n7IDQBIgIJhAo2MPwkD/1PgwmrBqmZp8upNwhJt0EAt6T6XwTHIeaXAAhlh8/jgGPO3V9dT95nYsJBAMH4FJ53uyMuvEOb0FRaTHc/iD2wuTj3so/fzpO/lJVINxXRmZSiVHd5P9vEtJgUmzY/zilA4KhcJuKiiHDtlLGqDyqrgIvjj1o69BISG0LDOeXqoqppjZS8Z5EHjR2eCNkEG0C1yKWcwUjUUij5AdVHOq204rYyD60ZjgrIBODrbahFgs9jmObexcZ2iFm8k8ODQjUdktfUOkDIBi3EnZcbFQuuvp7rt/QqjNRaWlpXThRRdTNDgB97FXUNbbaAEC6RN0Q7S3ooRcCHr799M1VNfQSc0A7rQ6Hc1amE0hITpSQBeywTXQ2NtHf3rkabr52ktp/caL8ESs29hhgTihrKPEECvsY8MUueeYBF1mCnVhgrzY5zRZyPxZOQWdP5uSN28iERRTLybC0dWD0Nkc6m+qIweIRZhYnM4ZOHbEaKWlwURnDuRrGD0PUGcVdI4hIN48YZMa9mUiA/sTYweFRsQIq1sGbmMBtxGuhWtbjxdTAAL9TG1NJAKnk8LZ7oGSzgg66zYuWIXIEhb6cfr+ILJMWFmsWkjQpcugPD++8w2KvfhKEAgCUsRueuKJ5+jYiVLYbfAAQSwnFBUAyBygNvg/H/vbg5SBSIqgI6+gnlW24AQXFHwcy5EaA8YuFEUJwdBN8UyjDykk5mI8UF2ZGiDm0nUIOQJKz0RVahwWLErOJZzYeAtHyh7sdNLB6o6OmYnKNmjUgAt8VlZFK2fNo0MHD9Fc6A1MlLNzsoTP2po6QrAWoCsxxONm0ISdCksqyaWMp2oo745GxHFjpaRkpNG6yy+jQAz+8COPk6e6RuASczPTqWPtWqoFSr4MEymDTsTIuxKOWaGNnXTf02ACNCCqkPnzSAYrR41VKjsKBboPUQlgZjgZ4g7FyDBxC/Lz6JTDQs5yHzdiaQGlcqCd4iPzR3Qg33XxXB4LuDIIeZitKhgbKKnt2zvyCSLOhGW3a181eaPiBGxJCeyuZwhEBQ4smP2IaY9duoKUpafI4uynlH//mFoefpWM7xwUOIUYeiePyaSGCccrJQTWEL92OV3p3kXPbHuO9IvWkgbqwgYsuk5gYDWNbQj9cdGxo6XCJaTg+Nve+5A2bF5Hm5bl02OH9lEasobc7IZAYxcbJ49GJKUJ/RM2TvGPAPHgeZlInOCuTEhcs8GMMa7ugxuKqWuKxkRYgmMHAJp2tTU1zEhUQ8buDtgV1OdSUm1zNxyvwJuOFVJSIiwFQAidnR0UDOR3HnChVkRMPvnKB1Tc4iBt6jzSx4Zi4qMBCiILFpN14aYNwDECafBPfyX3nk+B6o1iPfUQUYePUsy9vySXXEEy6EtCm4qYfA+EwZfC1DVcvoGkxxFHhWsJ+lU/Uu3npoFYZeQGGizhrBjvSOiv4Gria2JgbPBXhqAYjB98XOMcWeAknkEb3E+wjkD8yDFFFgyU97F9wb2DYBVGiE6QBRENKnApJe6DhY2CJNAVoZV4AYuIwOHDMnIpfGm0EKUgZSsSjaM6lKjTybohoGzfE43/HO3n7EsuJMmho/SPd5+mvGVzaOnS+fSb+35K7z25lXZ/CIAX/UfxNZKA+bz17m7opdV0++1baCHq1JQiUiIyIRkE5Ua0Rpdg6bH441DoqRrf0gOuysSOr4LO1AIdqg/AaucQiBIKuU+Pmup8m0dEg7CmO6pKK6dYLmdOaa+taHFYBxzBWJFvfYzctTmzR24Ga0+H+lK54FYm3PDPz+6mP7xSTiXmSJJp4wHAwe1RXk6rFuQKIicUbpYgxBE5auvIXYh6pjzAvCLBlqGskRveb/Pv/0K95bVQvGek8zOdwwCoz1tANg2UWBgO0qhQks9OFMx0Vt7dSjhM48NBNC5YToD+fJwP4qsFCRUpgbi3bxtfFcTmhcj1AqRkZ7MD1+xExgtbcpMa+j0rVk/9QOA5vJpBQ7dGR61YaCigLYhrERsVgAzEiGBwH68HxhVBKesQEbBkBWmXL8QleepmaHwd9Cd3yUJ64JYrKYUJEefYDhdQ2uvb6UqAv6uKiikCY+pFejr3uQLx9b/69Z8pAuJWUXeYeruZmBSoPVWDoiZxAoFNf0dUcgZuJ2BkfG80DkKsBhLfDnWCDZKZGifJ9rY1DzaVn6yYkag6ak6024csxhAo0fVmFT3+9MsUYYCZLZbT63tO0W+e3EdP7+unXmU6RWXOotS5Obi1WRA7g821pAOcMIjJkYPdizHwHkASMB2FCRRWPzovvBwbhORFCEfvP5/Eg08v88c9FHMrxPb4bdlIVsSBe4F+C9fE+U6Asg6sYFUMFFmw8SGEbUiVcA3Bj2gpgQg3VSBsOEsQV6evyUTFehFEK4+fB58NjY1TExW4TVZKIol7GgWzm/W64PgMqoI7RQRjRRwdQoolWaRclk0SAMGuj+vBTSTkpw8jVXw0+QEkFe5z+uYzfAE3i46Pp7S8XLLCmqy+67dkbmwhJQg7z2qnzS0ddDVgizVVVULMFyu4f/n7UxTqGQLyvp048A5ziIBGdv1MP7asf40Q1ZlFxGKN3TvMqaaS1mN7zRzO2ILwW6LWs7EFs3Wgt0npp4hMyJ1N+4uLaP/DOxATBFzHz4AKL5EUGaQBtOEPEaAUgrrCAIS2VrdRgAs4UcxigfJ9hOLFZPMsMCGpU6Ip/nffo9Z/vEGm/UXAbbQU2G8DN2skZUrC+Akf2/ux3zG5ikgEk/3oWrKdLKVhYEDMcaRY1RoUVhMBqcZIIcSlmyQR2dR1dCddL+mjpnADGWCCjzMAQEheiD6hf7iHAgTYVI9FgOtNapgAFQq/pvqLqKm3G5BLKHxqqVRX2gixjnru0Lm8EOMihN6IUXpSPjuJho9WkhPotXhBKsmwMM9YnJOuPnkDiJZxiZZHniIHnpHFPfMSJ/cNf3hfHAUDuLzs0vXkSIT3AoAvp31tDAmmW373IOVddisOw6KZfOXTWwRdEGPFHM/X+MnZac5tilEQtvv+cYH426vLDuG362xE5bX291ahz4uCI1A9N2ARIg8gImCeS4E3qICVcPgu93aE0pEtjPI+tadOUI7CTpExMRTMwCNQbq6yy2JPwF3ADNz47ZeXSDE/+g4pQGshaZlCKI0DIlCZlujr69k/QVhScET/FQuhPjGXAaMewAUb60eJxgsLE2Bdw3a6LUxMqSD60jIzwFvoSjj3dMMzeGAh8uixhWa2WbuONzTLbnO7oXhN0bDqF2UlUeFnp8h/wWrB/dEJgLW5EfgY0r1sR06QKiiIROCYIoTpMHExcKpduwz3HdUbp7jslJsgYoex2CQd/fDzQRfDhAgcnp8VEAY7vF0ci4UiIFrcezaiG5i1dNWDQ8I3GhY/xsk/5Q3w7CBcJiy2jPn6vnY2YuLjOJKkt62Rak8c/lj47Tt5us/Bvq4yjvrkIvdiABTa8CDEhWsR6hI4UlGYOc+YTnDNyIikVMoAhiLGas5MTyYjHtYN14wWlqN+Vj5FL1xMhohUGv6oAqaxlqIvvhDKK/Lg8EDuzj484fRsesp+8hiAoHgARLyq21pAUCMEZkf/3AiXuef8VEpZvYRW/+GvIEIo8BN1Nx5UtuAwQfzXZTa3Nds8FrzkZUT/m3hjEEZsQgJFmmtJWrmPTFikVjjM3/rkMxLpgki+KJ8G4RO0AmqxtrbTkAoc5aZLweER5fF5nw9iyHaynCIy8ygMEoNFs+GKVRR3z9W4Fq9odBljJ2U8jwkWuhi3Qljt6WuvEGK/JnZ//G9EjIJLMVGN8zuOP0j4NRWRsWGDoradzZXFzKnOXvSso6a4bKgf7hZU/xhEwBuLubFENPG+3Lmo9NlUVTMILMhI569aQnv2Hkbscw3lboA/btkS8h90AAhE90oxYQodyWZB3KF5uvrJ1sQEMQ1R8TlYtQwwIgBoZECF7yMEJKwwFv4oHII0E8EIUISE0s9nzxG45IfbP6ZCuDJy4RYZxy1wXS/8fl529fB3cOI2Y3eDKio9uLG1jbKy2b00uU+clr8STldObUpMTUEGcCswI4Og5KvghfA/f6lgRPC1VfAbirjvY7njxMGb5jcbD17AFMxBwzJyAHyGUPBPLkFkRCs4DMMYSGfT60iVEDuymDAGZmQZ7W8xU/TKtQLBTHNpYTMPK88bEybfA79mOnzSPpY+zWUndmMHOALW4KQjJmw48cErJRZjWz8DfMMA8DjG5myN43bM+iysWsRsg1Otu3Al7dj2PvVBaZdcvAowPUJpsaKkSeEkCuSVy0sNk+kHfSQtbjJn4KcGOu3BCjQfP0ntjz1L1Xf8iup/9ScaLCqjytvvob6P94FAGRZE4+pwSSlE0QgFQeyWcH0QRSVEiEckR+IACI6Jz9f43lB6ecLZw8+ZMKdqKkt10Yneyqb28cf6zuFPHM9FLPajTzU4LjUlmVadvwrRrrgnc0zck900UsRVsU4zTocbe52ZvoNLsXUrhm4jQ4aSLCsO1uMCEpVgQe5todhFyyk8O4/0F64mGUKshQWJhfbGzk9JnbYQONtMFz+zj4mKI1qFfp7ZfNZvLPqMzfVUenjPK76Dx4ysb9Okz66hAVMzp0HxDYegEE4J3I05jdloQLCOjg/r6Ti88dde/11aOj+P3n3ldVIjvsm1fiXZMHECZwE98acDDlgLsj3UiN8ZxxVAKB7oC90vvU3N9z1MA2/sICXETNTyRRQ2OxsvYKkBnG+i7rd2jAwo98Mnjn2f6LsdnOt4UTm4nIpe2f4JH8RHjjQMvE9Jl2C1NnV1eT6rKCsI0hk8dX1IS5qqGAlzSCDuR+HU7o6YSy/VIFa8vHKkD7778tX5Oy+aL9NwviwliqQ58XBs60mSEAbi15ASBoIuOZV0QNL112wauRcWf8GRo1QGVdAQFXsWGGG0U5hXxq84euFsbeKTcBpeY2lhRVNJwV7fuWdT1Pk4l7mrtQL3zeGa52aAilx5+GyNoxiD4zIQ+32IQoLqaMst19EAEhOkcCAHrZpPNgSXWeDrEzO2w/oN/GD+S+cCsAQo6hN/IChLQTG1Pfo0BSfGQ/daDZ2EAU2eqFFxBI6T/P0bqHbrm+ThFc3+Nt+kYt8gAMwiZPB2w3+JnFchO+WTU810+OARWrR0keAW4uMZSWelTMB7WhrNluHhCkg1h0URTN1wgxgio0buCaIDGEWNDY30cSnSppBwEIoMlPbGWjIPduAC58gazjaAvv0gKAmc3Iy7EYtnHis8uwhRCbKMWBpsOUK0MBMAaxzOEFFncyO9cqyW4lezewfHn0PjHrMI4wC+iUQz0+nMZOyDZqo5vv85HAfTeaSdC6dC4dD6k1w7UwWXjdPuRE4ac6uzDx47cdXJC+ipQ03UWltLgQglEWN1S/HKCv+0eAq64mLyv2gV+Z0PPQsYl/A+Yx9BYQX07dhN5df+gEKy0siwfg0sGRAMuJagT7F44T+sMH5jlhKsX7BcfMOCB7ah7OB7ew7hDT4BFJuaBzG8GvkSiHIMDKVfP/YqtcI6YvCVwxq9QxgTnMMEtrukHJ5einHaBvvVkclUWtcMqADHwRXV2tJCL35wgJ4rHyJzwhIKiU6kAYS+QOmkGhMsXIiRr7rxolMgbcqCUCNHn0mwcln/G4ZV7V2STf4XLsMtES2AeKvHtn1CYYvWz4h+T+4f65EgVEElmIasMDYTRSOXMq8/dcx4fPsrW8de85yIqr2qsGQQeIwCMUYK1CvoQxaGh+MfztKY8DhMVZK2kh472EpVCFbjWCn0foQbAQgVoUipqKYa2ZgQTdUVRFyqfFTf6XrtPVIhKiBkyQKsUkyYjwONvS+OdSGcRJUKNJ0n3jcmuG89QEKNNhwO7BBAGnZKSU6h3PQE4ey2QTHd9Jt/UGlxsUBMMhAz9xVViKmg1YjgbtVc64CpQ4u4ppLOASoFev30u5/Qkyd6qC1iAenT5wjBb8YeI26J9+vAhdWM6NaaKjwLP+O5NCZi1gNHn3faU7hviFBQQ/F3hYXSEAjXyjOXmUz+a5cCtlAgqbad/v7ah6Seuw5RHShM4uPk0170zA7uP4s+Ka5zevzO7BaIyYXQGQfUgNOEhb5zafGKw7uftlqtmLQzDbz87M1ibJemLVt/M6rnSXpbaxCBOYwOIGYJnGvKTgDtdYLoAEfQcFcduSfHp4EAAEAASURBVDorye5FMmRdD0mtJoqP0I1YCHXQh+AvO00szHnAggEiCVaeA5ENEqzI4EVzBaV4Uk95MkBo5oYm8l+9DAg7lH4mPFhZnL79MUKLw5GIwavYHy6TJMAcekRLfogyP2pUhOlFBs37ew5Se1UFqWCh2cEFH9+1l3ZUNJNjoP3t1PxFstjM3AUf7fuMDnZ5KDhnBYXGpUJWuIXESq4tGwBxrAEYyQNhx2uJjpVUkV6BQrdIVBCIBYqsYLFyv8YuCiw4VsAtOxGzD5xNwnDA2P0THxb72Cshw3XlAFflMdCxdOy7RCGzk0X03P4y8p9zAQVCl50qR3Pi5cb+9ok/djoHo8TRRIJkZbyroRo4Iop4wDPBz8p+xJqCg11v/flnN6J6DRTkMw1PfPaGQHgLmB/LB7kGYGZfeyPeA+MP8FMl1FEYBzEgBNXcBQDQ3UVz4rQUH5UkhGG4ERp8rLyRXttXRCfaB2ltrB+luNghq0SsE6wk1lUQI05h4SODiwkOu+5yMkKncCH+XAqTfBwB4xwHFHQbUHrlkrmkiMJ5bK5j4KvBLfYeKaIuQCApUKg5+zchBtGl4LQbLjqfPvrkIO062YKkygAYzzr69yel9IhpD6ITkOjgRj/slk7E37yC4qnXmTpRlXcICZ0yvGTgyAFKTEbSBmLr1dDdOJhPmBBM+ABEEZdTUqUtoI/2vQNJiUjLPjMNQKyyGF4yK5PCUffhtAWI57Vs20Xe/cVkY2JBXJkg2meaDiY6fkY0F4iprrmVDmABNIuhlC/ZKIi8cyUohg5YkgigJ67L+hQ7xKcKjeFrsvqj5ixzqC98Lh9b/Mn2hyZyKe7bOXEq6B0h8zfc8AN/rUEmA6W2V5YhpTwICZ5cCAP4C7NxbgjRtTSX0fo4MV123jyKi0aqOILPuMQipxqlxkZQsBR5dLZQqiY97Qdx7Tt2DNZ/LAVDNKEw1DhfGyvd6uw0GgLHYsJixJxjyVmXsCJc2INANfViEBRcNcJkQfwVnSiiwipgS7MXCiuWFe8wuEUi9MCa0HhA8rIz6NCBfdTVz2+G4MBCxHZBV3SLIarhPBvubfizx2HdhVdyaOZcsHmLGmkRVSeOIJ4I6L3anzJTU4TwW76eDaE+A5ZBkiNp1o2kgfjaw9TS1kYPFfbQrvp+JJsiybPaSOlBYkpLiRsR+3wiDxnEpEuE0J257CM8C6fic7iBO/ejeNk/X3yHjrpCSJo8j0IiY1G2CFyeie4cGo+BFaHDFqg0/lrEWIFAmQt1ghsFIIadpdDphrkdBojLQX7BBvgPQVQ8Zid2bSt78+Ff3objJimR50RUEUlZ6blrrrgVr+5AaLcURdrNsAI7wQLhhgD74DqbzEU4hyzG3UqXrV6EWCtED4xyfKY5s3mQzBBJSmA4n0EMymCZxJia6Ko1ID5OsmQxMbFhkAQlFaCeGP46QsEKCkW4B5yyqpx0UiTECaHDLF44OnLbW9uooqWP8uYshBUHpbq5CZVKrAIRaeCT48bD7u/vhySNNGpETlsLkj+NCHF2QU/hUjuOgbYa10ArD5ZtwNgxmLlkzQ05S8/XtAAElerjaAhcRw+xwyt6AGHR3G9+cZMDOZDz207RpgvgLYCY3VHaBn8m15dH7BQmLBVdn5OVzCyGuyEQgBTErpqTBdEHi/ZcdSCMiQJjmIAYd6qvQw5gE/XDwrXhfA475vT604t85E6T/pVDXNcUHqw+vO3556NScudpgoIBzyHWvg/jgAUWGGo4LQJZeR8a6AUxeYUgP14MQ6iJuue5R+5GFEvhpItjwzkRVfK88y/CW9vXjzgbESQv96cOVAdhlulyiICyQ9aCSzD1z9K5KTl2JBrUd0MmKieIqA7WFt7fSuqCg7QZY7JmBaqg8OqdCVBlKsADcWAbr2YJoAeJRgNBzETipZ7eXjq8/xAVfLCLiivradEFGwQAkwepGzUcyuG9X792paDeMFzE/lH+1ALxTgPGE2cIpiCVlLT+SlQ6CSNDkGxbQ13Na6N9t4YnpC/OXHx+WjvCdNtqK4XMEdY7NP6BQi6era2W9MWf0ndULpq9bD6JUCYoFCrCseOF1OH1E8BHCAxSDnYirSoWYwW9j2cGzyR0hK1d/s6NB+ocGh/lj8WVlhRNs7zDFNXeQJqmSmo8socG/HSISJhcnM53WdaPmHgOvP70T/e99vRDgaFhN+H1LIGchcNvIWupKqGIxDSBe/E5vqhR5k4qiH0Opak9caj+7b//5i7shik+uU3BHiYfpI9PXcGlDlnbZzMSaCPZO0qMneaO0Oi8C1CIzEiR6QjwHwKGZZDC58VFJfCGJxS14MZjFgDuEIHIgNeee46uys2hyGWw6DjzZSqC8g0uK+L8nf9Y5wKLH0YBC64+0gp3jhGhJjLUFIjDgMQizUidkS/oOfwmKcF1ATS9qgOZMa5hhL0oxtW6lMMhHo1IBo83H3Fic3BpiCFM+FtvvLJoz84PwDpIUD5LPv3g1cWbrt3Ioj0IlqAuKV3gdAPVRaRFMsLGADnlJEYjCSGMiBMRIErEEIXZIQo6Ut1Kiog4MDO8jAgJCzU79pAb3CkqNYnCkL7FuYCnMTnkCNrAcVRQF86JazHHY/UAae9pcMCHAfMrRmi2X1QcujDKDYXRP/OPoEdhLD9776XXPn31qRewRx2XM9etQORq2aFdcIoHk6W1FtZ9K7jVCGHy0PO8q7GI2Epk5L2h+PhbvvE5c/Uz386FqHT6+PQVzKXkmKTWihPOgnef+ZOlsnBf/Jof7uppLBaFIgumq75DqFN1EHHTcrkfMCMp0sCRDYvUJ65OxwsyErrPDbffRnt376K02mrKzssZGUDuOS9WFgEYEC+4GhfYGkS1vD6IzUEQUiU4jgZxUQnBoSTFpw4GQUoAlO8wiF6c90ZVJYXlzBbcSMyq1QAHI5F1rEOth7Lq2knlgfhWQRDbTmcwEiC7hRFhUak1RGckzLvkp/XH3rmPN9YVH91eeuCjmojE7OSa3TtJ2tdA4U2BtAi4WEo6CAYOdDcAW1EiFG1fgyiuQSjoMKxfAiEy13SIENsebECauouaPjlKFQjXVBp0FAfRPgic7MV9xVQD3+ej37sYYTkg0LGEwePDf1CshU8eK4YV4O5qRoZSSYcJob94KVNqPiUgDY0nfmLjPrCr7eDbzxe+9dAv78B+jACEscNh04VjQYJoLH09pMb4DqGeBHNjLrDCjRepUFgOjAIuGU/RXqRNzdDOSlTpy9ZfgtdvhPFr0aoPfVh4+NXHftFcfnxPTNZ5qwMNcSKruYeMjadgaucKaLQ7KI227jpI3TItRUAMXJgaTgtyEjDJckGdCILYuXjDRvr344/R1nf3YWK5vqZLCN2Vu4eE5NEqREsOq7Q0jGSfAUQOXJoZQZEI4W1HZZcgN8KAMR6hSL6QQZdir/oREKgmI5O0EI087sGIfAyFAVFageRIQAAHUco6LysDw4CdYxqPWYgukIy9ZsQO2tAPL/oTSMlzVv/MZR840Fy8dw8OHzy07cVf3fCn/74+JynaeWeAV5yZliXlgWY/qBfApAzEJRRHZ7mKPjUC6D1lgu6DReiEB0HCBdigYA6C2ILxvLmwOjlot6i2in7y8nZq0cN1FYjCaxID/e2dfXTvNWuhlyA9CoTFqWRcFtIKA8XMXBoxXxwPb0SYr8kL7ovYNr+wWfBWHKXo1EycM2IdjnlMgajZWDry3ss1rz7wsyuwT3D84tMxjJfxWEBEnF3EdRY4LoxLavLz+ZrgbMY4M2F1NlTVN5UWnfTtm+rzbETlF5Gc9cOO6lPlJXve+veRN//zDC6C0E2ugKJLkciUFByB0JbGEnCqQlTjzcdDAXOJmE0dhcjla0KuH+Kv0uP0SFPTCu8P5gXIFetu+N5NdOsDW7HKEdHYVUXZoXIUgV8h1CnQIdZ6Z2UzWQMhVtQQuQopEjXnki0rD6LPhBXdSSdg6g+VlVAQqKgeBC+DQ3gYcdJxEEFiLxzTYuBkMAyYu7abAxC/XUlZSLKYWGSCyYxrNQ2CHpjDscQOMsSoc8+/Yau5p+Xi/vbak7UnD7955P2X/jHsFcUdajd7QFSXcpoZx8JLMxNIxK6l0VXNLPfZnYfJ5gewUsIFy1DmKDAEtaU8ZAWAyDYoR1QeQdTGgxVd1JWyEpwdVY4h2lll2N2CArwPP0sJaVlYhIiZ5yxhKcQkxlqMQiUyTRgpUNpbEYHgSIhPGUDL5oqTUDVkxIVuJ8ags07EVQ4PvP7fmlf/8PNLHI7BOp6/0eYFNtXNocD8sk8m4qmIUoAZeHzwjJ0NlYdwLuCl6dvZiMpTf+SDW/b894+luAScY2eaRmuYLYNrgiv8hsZm4c3rZaixeQAFxhZC4VNT/vx1VFW4kxQAPkWieWdOxDdBYUZ4bVqEHxXUHqXLFsdTHvQsHkSe2DWL5tEs1Bp4dtdhqvAGUwfAVkZ0OTA/AMpkICIQ5JnZZOxqo4Ool9AkT4O4CaHX36ihC5MraSmSLkubeoCltVHg/I0IHJxP75YeoQAkanJKGaSN0FiiMEhrRfQFf2esjAeQBzc8bV74urv+/M4nT96/qb22+MT7//r9PThJ78jNj1uZP/+SBEO4xIvISnEwdCCfRQdj4sD+w7Sz3Q3LD7oniMfV0wb+iAp/mBTmOlyXdG9pKf26EjFmkZkkhx8RNwRBMWfCSwPw5qXYZZsoFFyDw5SZubLoGlHm+ViOXxsZJ66oY+5BPYXaCpq9+pJJBMUI+bAVtUOfefz4O4/cexX6Xzvy5Gf+Nfd1N/ue+czW8d+E++MZrOBmbdUlB8fvnfyLwf6ZmrWhDDUQJxAUfisC9dELWfHjxoMREpMFnSqaGos+FgqADSDLNSw4mjYvRrIEDxwahkYQT3yWEY7pVACSF80Kpdmz8bpWiBJ+OCYqZvdaKIq3rVtFMagaU2m0CI5hvgLXxAyFyEqGt3777oP0cW8idQUuxMu+UxFAGEvfWbuANq5eRdGL1pF2xdUUGGIQRI0meS69vL8EiZfIskEHuC88Vx1dSO1CSI0SBNHe2oTirajhFBAOsYo8vOUXx1z04z/viJ+zfDUOZ0un9dNThYc+PH70IyZATpQ4zaHAKRoAun7YPExrNnyHgmGYjEAqeHaBbhD6jHMKqqvpNzXA3KLSgb9D/uJ5Wf90gNt2cXWZ9FTUdkBZIaRXeQEYe6EfeaBjcrYQZ+IIkbN8DjrP3KV0/05KmbcMqscZ/sAEysp3K6q6vPrHu7eCoC5A3ycRFLZxskI1x7CP+P14y/jG3JPT5Tmy1NTZ6qk5fgh+rZnbOUEKEy+hDgzMW3n93b+Q+2nFw3A18APy6uH3w6gDQuD2OIIyQv1YOXYSw1TvlgRSs0NFZSi2Wou64q0oXtaPl+TJWSdyWlEwFdnEWJUYq9E/rn3pFqrwJer8aM/RAlqUl0b52clIE9OioIWGGhrq6NOiFrJDp/NAJEiVCNcF+JgZbKaM5ARqtnjI4kHVYqYeNCYCp1pH5ccO0LxMlBgEWbV3orAqnONWiKiDRwppZ3EvuYPTQHRiiHVU1FNIQKxJfuGJmZchcG+wvaqIF5i31djTuCgj87oIvV4iQhFdBjH5XXhP7Sun4PzVFITozphIRL7iOoMwKoC9kMzUSbkyB90PgrKFpyI6ckQJ5r4NdTSQCVX9DEjkWCuzUR8j21CY+W3uvMi4jXAL4avwnYngxMfbQIBZQjVAXthsTLH7hPWjw++80Lzt77+9q/zQ7ntx1rTiClBBYFxW/jUMF2i4EgzmcWxjn+Dx7a82hyem+g0YOwc+efmJP2K/YBmPPW7s9y9EVCmLLrht3iU3rtSA9TsgOjh4z0dYUjkqkUDPGjJ1oEQNspMVBvKDuY+KNmREPpxx0E4dqBrSJ1IjvQoFUFsqadGsDCFQn99woEbNBH/4wrioRoguAIVNE2GN9GGgrbQckQy4kVDu+qNjZXTPLZtp85IUai4/igTWKrKbgLxjutbOTUC1uZGqJz6iYmrlUpGdiDptLzkOP65aeAffwaPHaefxBmr2RJE6FBkyGB2FWk4hSPnixtwhUB8li8rMvyDQEJXTfHJ/UUevsUjr75+2IjsvWxwZSr2oBPPER8dJPWutwPGY4zIRR0fhmtDtSvZsJ2dHPR0D0Nofh7eSYjGN0rqgpzA3UEan0Qqlk34Bzp5k66faspPUz9YtXCPsZuJaCMyNeJz5+KI976OPsYQ3uwti0gNi6EepoKJd73Z98NSfH9v9/D9vBh51VlFlNfV4otLzbopMzUKla81pIuZn5+rE4GSe7U88+MuUuctWDJl6ugp3vv137BpVIPioye0Mz5y8b7otiujM+ZcqGLeC19qQGE5SVHUz43UXjA3BX4AHR9lAlKbpghqm62ukxHKY6hCBXJiZzVQLdJB2KBkVAWEUDGwoCNxMrx95y4Iw2L4RRw+4PM3qJfPp7y+9Ry14IU80TPkPDxyDyEsF4QBWgJth1dxU2t3cBt0GRWVdSbTveBnJEvJw9njTmq2YyBREar5fTO98/CS5NBGIZk7ES4ccKBSL0o58X3AAf4hXCTA0TlNnTiHgNFC2F11+x6bIlLxlpfve/eej257auiI7d/0cvZ//40fKSZ67BhYuklqhH3HjMBz2Gx589Tlygxu6sYhaBqEXHnifYlZdQh4ZnD/oD19frMLihG8tMwB6GAoucJ2sG6GXPn/0Q+qas5pqP9u7H+/eUSy+9Ib5XMu9YPtzMP318L0GUvmhPYAWBlCOu4OOvvPCvytOFf4Ot28XOnEO/yCjvA1BdvULN16dPZ5L8XuVJXRqz7vvtNWUPgNd6scKpdqMSyJcZOb2uTmVIjBw1YrrfvaTgJBwhEuxgok3TMGEVyIKwAVW72Q9gzk2ZqgHbP27QQ66JS+D0uCFT4bVkoJMj5wQlFbGm8qPcbSnAs5ZWy8loZYlTyrTJXN83x8zYz/gXCeaehEvhDATAJkHusWkjU6AVeek6AC8X8broL2NKEIBUSiWaUB8Pah7pUMKE6JVJzw/F9JISkmBbmWHmZcCXcYIth8icNbBXuF1ruC+AG+h8SgR9cCmuKCv4EIc9OYXrFf/v/KuA7Ct6lz/tmRZsmXJe++V4cTZm5AAgUAg7PkopbSlpZSWvg7avr62UKCvAwql5fVBC7TMkgIN0IQRUrK3cWwnjveWty1LtrU89L7vyjKyIztOSAJNT3It6d5zz733nP/+5z//+P7I5MzV4ZExq4sO7Qw9OhQWZFx+NYzmoR8TFF4qhpxvfuZ3MAGZlSmJASHMLoEcxnL1bV+UFBiXExBkGwe3nFhsFLivTtBJOgBFBuEDrEZ702Ij5aknf/XhX5/61TpdWLht2pJV11BNQa12ED67TEjOFJsIWTIZCsmCv+x865W78Lgc+JMpQ7NXrb1m1sq1Wb5qBK6aCz94s/WvD9130+CgswsEPB2mr5SKQ7uePlHjJ82ppi+99M6kafOQQHKEC5AA8C8EvuYM2aIDX097D1YdKngozJL8BRgN2LzcEPTcdIaDKwussErswjAMv+6UGHmnBUrGv2+VFXnpEh8bC+8BKrQ95EDiYpLFdLh6HINWuqqgQRIWXEiNHEDERN6ucUga/M41Q33wDl0ifaajUg2kmjCka81bvBS6JM99oiq4pBsQOSpZk2YUbaVe3jyGQFedAbDY1RKbOQ/TbCsWGQ1iba/v/+jtp34fkzktNCoxTjs85Bpy9PX023rNMCI0N1jNzc2BTldoxIqrN0xbdiWIHlwH9+MtxO3cs/Elaa43wdCMZ8FDcNqiGStnFrC+MKUFA7ifUd58SppxaksLJW7+dIHVWTSYclkMeO5vD9sy39v6N8PeN198O2V6fkFS7iwdBOYD7Q1VOxy91tRLv3Lf/Xs3vvj835+4/6s4ZdJpSWn0+D/habMWTPeV2Wh+qyzYPbT5fx++x+Gw1PKU8v07nu83VXEZT5r5+GF5cFw5WaKaBUz1K7hUHZ9EUpn60Lg+KkxCI4Av1euUjlJgcM7IgIYRuJSYSkboROlkNTrasW2X1COolTqZg11BsunJV+WimXHypds/p7yNJCgWRV6D6iIJybUVR/6RKYbyEjEtC+2A8gFCbyCCN41pc5UFWVU1wGBnEj4HWORYhgXjxMUJGlkYD90SzsuDzXFz4QE4v+Vj9TqgqEQM0SmwzYVD8J2tq/3ovT07nn/gLc8dHP933RVX3+8w6MPI6inPeAsFW666CnZshzJTB+dATK2QFfkofZANU/GsnCIpd7Hw2RxUomJRY4AsObLT84kXcdnKFWn3fPWbP/rlb5745oZf3rcKBzigyhSUPnvB9Jfu/6a6aNs/foZ9Y+d6Twsn/JucM+vCxKyZKd6Xj2OLcCt584n7H6gvK6Y5RinWrtaDpV2tm/GDqrYOz17/fymXTrmkz135bWCA6qgzmqh4iYtCfFJcMAy1MKBSj8NOJGFx4xyHlc3cGL1kl26Vzb/5kWx7+RmpKDkqGRlZALMbmw2ddjl2PKdHCG5jLk0dEIHDglQYKBxjeBXEIvgoJUpVMVBgMO2kG1RydZYWcIkfT4dZ8HTIjoTrFFZ+YSAmyhM2SzsIDDomvTEwY/5aDhS0mseXyMjI5Otv/Nw9X0C0cT9Q/YYx3XnfdBLo7rdek6z0DLnn1ivkqjXLlOW6DSs6pjdLBBiu7zTD1pk2LQAvjRbEp8z73kvirQpENM7N1177pRS9ZhZ2U/E82vl1JQVlIKgfY98pERQvM2P5hV+IBZY8V48kqI7GGnnjV/d9WL5/+8M87lP4XvwaG1wzJi8nQ1Rz56+75eYQYAOMFej8X4C57AwBSNMBN40xHeWtjlvMzc6UB667Sn4JdxEEV0gn8qY89vQrSEFmVQiDxEGdUh/cjl3qUGWp7z3d95MyD23TJCgWfmrDk6SmqllWRjvlikwsBELgdkyaZteghCGIY8FMJPW2AoQWgxeRAF/z9gaFa9FMkTRj2ZwZ59/4HU/tsX+vvvamr82YNSdq3uxZctOcOOko3gVc0iFFdqotKYDStU0e/tHXZdmVV8qP7/088rcYpRv7EoHxFQbzkq9nJV8UKkWZDUPx0fdeClMon6OiqESqWjpDpq+75ZUlV33uDu/h0/Q5d/rSCy+heoKyo6niCKa57ZKWt6AI7Y99ez0XJFFDGJ28TJWoAnKXXvzw7DXX6+hvM5VCbhatRY9BKei3YCANMVHSBsv8VStWyJcAAdQDp7FCgE1s3bYf/uUwYbRbFMWkCeAdNnWYMo0RN4mJekgg3o0UGIQ5TdFAj1yMA9SrQjozyCpgEKPExCl1hK5k1vRsiQjoASMFQcA6wAwWAHrDcRpfQyVn6VU/jEjNPW/c/cctWHLel1jXiHD2xfAFu315ljhLt4NwmuXo3p0KgAnByKKG7fI2rAImYDkQ/jsL8XmcHscWqAtAVENOKDfhKOjVzBYWHZHH3twpf4bcdyxyoVx7/zOzzr/xK38CrP38seef+q9F667/zvRlFwTzpTyy493h7a8+3bH8mtsIZnLKnI93MyWZShtquG3FLd9cp9HpleX1iR6DU4ELETPRyDwAQQfV/RA9BjIqNkY6jtVhxIfk8yuXyTN7AbkMhye65loQMtXZZQFhaaSurlZW5y2B+zq02HD+o2xGAC4SiwayErMb9Mdr5R0TPRg9j+SGkTo4OlM2bP+nXLByKQaLU4vnzklY5BDxAJDNhQ3tAELT1VDAxmTMUcxO1GQzlW1M2uyQuRd9+c8fPnffGpyJGxW59vpbb5+dPy8uECqSKEBlAw8MU3a6fD06Cv7uO5FB6wigDEPlez//P4nCqtiE1V8/YhxVULWkTp8NTkiVCy6OTXFFwQvRD+9RpvYQ1oV+7m/bCqU2KEkiZq8VXEjBVG0Bp7MHaAIDNWFJSMj2Ee/lkxStPvz8VTd/9Wbey/vPPd7+7p9+fW/mnAVdPe0t7zsc9hPH4E1y8akQVS70M7/OWXIRhPOpcSkIETKINzMyIXh0II+7BwyaDvKCBW2Sw6TAlTgNK8gKiwNKT8A3gsNR9mhoxGoPK8LlmdBc+xTvNMZdFN5jQ2G3U1Zg0IahbeyCrKWVY70R4H5HZOGCeaM2P55LIZ8pZGdPS5e9NccgfsKNFmAW5Fje6X0QaoH0+RdnLbV8d8O+Nx65HE1aFi9bcSf9rqKwGKGMRFGRtkRidt569TpZBPfnB//vb1JQXIFUaMCNghqhF46JtPnpYXpiHOIQuPgAXrphG9IEOyySjJXrmgyDmIA5tb3RIn1pSyQaNs5uuA0PYQoMwSowEioZQ+g0mb32hjU7nvvV23zuUy2hoaHxq6+55Y+IFhp4+tufe+nw1rceQltVh7dulpy5K/7stlmo5DvlciKiCp994bXPr7zt27HELppKIeVTaeZ2gVOBSPzKUyMNUevsNUVQy8wVWiz0Tha4q767dTuMrVBWJgEWCOYfuqV4M4Z674PTHwuawQoLfyCXDIKgwgE+6wTHc4LjqGKmyZsfHkC6sXmeyviLKkohw8gCDrwxYL8Ciq/kKPayM9ZARQbFTj//5kUA8v+bo2rr5vy5QHvFdcilvO0oVXEv7KGUzEy59MvfksyaOgkz1wB3tB6gu7Xw0giSWSro2WxIXgBiDEf+5ZisKLxAmILhslNQkCV/eH6DxF13qURAR9WOGD8DzD1MYElbaBeAQgbA5VZc98V7IsP0gxuf+Ml9uJxHiOQNnERxDw4uaDpy4IVNL/zh7zjtqO+p2x790TdCUlIewD5wRDH5Hpvq98mIKjRz0eoXLrv3F0uC8Ab7dfyiJI3iFTxJTPZeM0ZZLfa2OjGGguB9e973rnCu1WJVIKUZetQJRagTgQdxiP9/6wg0z0Aozjd2ymrgE9CLoB+uLRSuvYXciTMhF5MsTJ1G2eSCrFC5e1WENJoH5eeb2zHNRMj+KqRAg20uJiFR4SykKS5Aya3oVpwZr5dCa4cYI+HtCILxLRTiqeDNXXbdKn1mxKoocFED9HHBcMcZ0QqMVmd31FuGAF4PVBbgONy4ZppE+4hQI7SscFF+J0WwDWZTDwb3a4R7UO1HhZIIX7D8fMhfoPouBI8yMwX9zrTQ2GOlGNiamn03Tn0cWyO2ky5Ai95UVFiwyd+JHVgXARifCxSfO/dXc+J9ExFVRM7Si/9y5Xcfu8IYkwQF4ugqVmmJsgAdtpiOjJ2uj4xV9tNqfnjzq5I6Z4l01iOthXbZxEQFQboBb3AWQPlrm03y+9Iuybz8W4p2m8t6rh6dQxCi8UkuxdXV+KIQFgiDhT5RNAGdlx0qsWFqJAlQSRg4VhfsjJagdPlw70dy63WJo+txL1GFYAqclpkqB7bVSUA0okW8VOppduQvOB9WiZcC4YUvzngu5a3KW2Fmdy4kEjVI6ggicx5/297qo5/KVAyCidW4B7ft36ruRqqUCHhXMJ6Q6hIjzDY9LfXS31ohmdClJnYfbcXJeHvPaDllYd3DasbeW86i9XdsuvZHf1gfkZg+SlCc1rhyYTCh02aFkXSjFPxjo5gRGUuXWpbCd16HziZcUf4NalOk5miNYksb2/zIL7QXB+FmT02j/ORIv7TELoR/tlExb1DIpnykh0swxFl0bBAw8z1x/t63HbimyuqPhMXCqSsIwvOGAguSW0MFgekvzqCWy/JC5K71c6SmoUXJmuCp7eFU/K4Bh0tLSxXtoBnrBTTqp5Codc5WyYApiRwqFEZvfwyY92Tq81BRMlB94Zo+tYJnoBY7U6860vjey7c4LV32wn07AM4PjbsbloOirXJ+UJN855LZctuVF8p/3vmFpKsuv3zF1Bo/+7V8HxvZPBKvvvSen++96ge/WxaRkIaFG1wpMPUx+RCFdLh+yIGNzxQf/NP9xc5eZOWMzQCWAJBFIEwWvP0KCCEUHgq58AStl5D4XNm+A759NU2epRafjfMDFXwItKwoLZfnD5nkeSeybiXDco9D3mmUKyMGK4SHAvEFRBVu1GNVB0EcFMWB8xZlChmhMoXo0W41cvP9/sMuRf3ws6vi5b610fLVVTEyG4bvWgRLUO/F4j2XqgcuDOKhILX3Wz6+V081ZaVm6+2SrNhgJUFTBCJ6Rmb9kRqeD3IbJhliLhhijSfq4TA8cm9jKk7wQ4WXIi4+Icllbn6zveCfLwfChailukwyTPvlmyCm1SsWw3yFRRmioqNSUoJuvv6aH6OpU56iJriN07J7zPSHiLFae0/H93a8+OgMBEdCzSwRAw7HoM3a1d7dVFPeULRnT6+5o/qSr/72LWNCjrhs9UoM2r7XnoHcwSX5TGVlk7lgHVyGtXLIBoVaZZUkTU+Hitum5LIpgULyw8P1UmVFmJVxrpJ6gpzJt3B6paAfgxUWiSUK2nmu2Kic4ECRsEhgLN5x88Ixa4MC5O7VURKJ1SCP0X2YqD+5iPOrqqoEPGPGqHRLxkQhPxRcMD0xWuoaAWAPu5xnFak0j+cCNGJ3veSdl4bvgYDtpnuI55jvXxJVC3LvMSWtEW+IbwoO33oTfeciJArpJBbPW5xXN+jcbCre9/nbHXFBN61b7YEBoKHeW+DrvubCC1bcdP01N7762t9f8u7+rHz6EpW7p91UtP3Fx6hNnbAsXP+N55NnrVpgbi6HEXlY9mz4M2x9ORKekKF4J7LjibrnRuoOd8JMeQCoK3mI9miDW1dTn0bsqggJCkEgaDQuDQ7n1YL7XpBjphnulWgIzjoEatLHigItuQxobJSgxp4DJSJ81G9aFC4XzwgdI8uQeBhyXlFRPkZjxutw02FKS4PBeoggIQEzFEKmrMhCX/QwtxlZw5YqwRvBdInxHFKOe/9wH6c+EnskZLkQKGO9hO+tM9kn08ZFx8QGpM+cserAS395dKDwg4uyfvXkG9Jji3YDgETxg/deGDJndFKS3HrD9feDqDaj3TMtX01268cdG5kMjtvvd0f24ivuz4HKFa4QCCY9gKTZnYiiWQ7fqXSFoLwnKSsodIAWxlxbxkWyy5wm9YEzAKaaK3q4mWho0QVBTVQ4kFHBLsTXhSmRMd7phoGgo6zpuJMDkPJiWK6ebxgzRbIaz++BmiIzK+u4s6iWIKHEx4OA3f2Kx6nLTqgk8G2c2A93miysDrVQ/FKDTqIeX7iLHIopy/idJiFyrqkW0gpjJPUA+0hNyVBkJSxedz679d2fdiIg1o1UdcddGCFsl1xySfZX77j9v6Z6nbNVb8pElTR96bdnr/nCT3UAfuWrmrP0OknMXaGAUvhOF743TuLitERdC/oM54EzjVuy+9bnd053LiwEUmOQVR0uJZSnvC8oP0lX4wuX5EvmTpObZtjFDFOJV24arYeTGrAaTUtNG1VBeI+Rm9DDMQJCcZQeagmsNvtby4Y7K3Z2q9SIhkHGqlygrBBENwyqBO+9eM/nJwnI7HAjZYgnr0sMNf++FU7wnW0y3Izp0eLjExaiuoGn/HHT20+/tmvb1kAAjbgtYPXet4sHcRLVEJ+7+aZvxEZEfKaE9ikRVdK0pT9aeOW9jzAci9EzlHnodMZ4Pb+9zIc+1cKQpP425I2BXxX0UhooNf0NpG/zPK5F2P01a1cgzWwTIK2RzxlETK7Cz8ZGk5KujHouv22BKpD7VxKiYXbp6xZjymx32e63nigD2ICqr34wBcRIbjbR1MfrtCM1Ge2S0GRAnqLPvu8dnvg7Fwx8GRKSUpITEhK8Gu3BRza89K2dhQXWABO41XjFGGSr8y5eE3zXl26nzmoOtogTX+nM1zgRURmyFl3+9NIbvv9QVOpMOOb56qtOstem+Cx0pAtzd8Muh6ye4FIcMG4nKkp/Q6hegiRIlIf27Nmn+HVzcEtLjyIPMAI2wdEmKhqoLZIQkj7QbxbgJalyV3/uC7tf+vEv040DtWEIB9dDmJ/oPtgTHcC64rXCoC3X03xzkt1DJhQEXVtScmrAzFnz13jvs7qt7cjv3nr9oZaqGpHWbo9gyYPgavRE3bNrr7iTZi288/ENB1fd9NXPec/7ND85KfkvavXyeZfe9fK8dXetD42IVziU/4qnb28giKKt/qjk6HtBHItg8zNixVaFzkZSIQjsHDSu5CYbL9ZJANocp5Ji2PwKDh2SjMxMSUHI/QRqKIVYGHPY3d0jh5GtItiYCFzTpHAQ56UXL5+XlJySFhSLqBkmvvRXSNAftQ8gfN0tKXDby42AMO+v4iT7SLAD8BlzoY262kptwcF9z6G60kxpQ/0hoLmctzpzekYgkW/gun0MqIQv7kI+IDeQApFwMzVvjgo45raKff/cMMllzsohf0QVmzl/7U8w3T05bfk1aXSLmEhm8neHHiUpImpZOMJTLejVQRhZG1pKpAE4UEHWJtj+kMzw8GElAXhqcpKiN6uoqMJUBd/xEW8Ef82TSxgAzxMbBxRfzCkzZsyclHNQJuKtWuEZUVJeCo83rkqhShgaiMyfnROUBl/xOOBbcdofX0gMTKB4uMOlLBBmRiI5AWSzk+VUSrtoy2K1w3xljn7/3X+8hn2Y85QytPtoyf5EY/hN8xJSQjcfq5T3OoBkOG05skpEIQraItGBdkRp98Ts2PQ6VQwndKQbafeMfPgSVeT05dd+efbFdzyTt/rWKyKTcoMoP02FMBSzDbTt1LjT+t5ctheuza1DYTGp8BqeZM7xfSRwqeGeWrnlonyxQvK+FY57CwDgkZichltwS1Vlpbz80otSWFgoSxYD3QUeDpPRLI8xvzDdWyYbYBIUZivFdmgGvno1kIijZyIfdEMtXG7KJDknVxZmxMNGqMjOvnesfKdG34IYxpJOuAQjEiYZnOpUiYrYUr0AJOl0uNXbd+2sc/b27PG5YGdhWWljUe/wNVXxCwKz5iyG/GeRVMQJXpYdhlhII5JqRoV2lh0qMTXWT6oW8mnzjHylnmpe1vy112ctu/JLiTlL4jRAihtw2qAioM0dPTaOkZMTYa2NhYhnyU0tuANySFdjOTTpJdVttYUbTaV7Xln7td++AC43YzIuxzYU/25QgAsa+xS9S/JSkQDbiiSMcCvugQhHg290VISiX5ozd55UQte0ceNbsv7ydQgsjVXujmRLnuiPyEhQitA+8jR8Im48xwX/cQu8Sjsw7TV2mKWovluCU2fKshnp0ncEiHzglA29A7AqwFyEk8a3z31UxBZi6qNLMU3E1QiWzYcVmcTGe5pqIXFzhXmoxSovV1olODHrammupQA+qhl2z1wxuzRtiSoE0UK5rbVyzex4yYqBhh/n7kNW0KzUBFm1bPFVB3bv+MtUr3sm6pGoml0Ox7s9TRVWZ7/l/BBDzDyoDRK0cDehiYarPE+PopOw2qNxGfUA7Wdi1InZDFtCV2Pprvba4i1oax82sl4QZ2TSqNkFO8YXFeQkc3OlhITH4joITug1IX9gPLwkm6GojJctLQGShODKJQhWoIBNeSgMWAhLFy+SaCTvfvalDTIPnCwcbiNhdBGB8ZUgFV4kOUb4MLiA9jwX1AR2EFA/vB2s8HboQQbNHoCqW/De2AMQ74fo5vCIRMkHHvmc+GDBfymC7BISFglvB0QwgzI5cCREb8FPhQNua3IJaECsVcXIgdMtgfMukFqg1kyLVE+6MPC2w08SoA1KuF0mpxy1Af8AxvOQyNh8HIrDZmIdFrejDyi+vUP52amqi+Bvn4nsZSRq3ss0yHHbWoYl7YIb1n5PpfrJr3/5y79gdz3PO9uFRNXWWLqd2058/yW2qMik7BwEA8yEZjxbrQlJCFAF6ulX5LT19jn7zG29Xc11lva6ctStwDb60PiulMTcRbN1hkiDN7DSu5+fylQJW2Jr5aGmonef/tPSG374Y43OqLL3IIdd5HKYdUpk5SVrpRyRxEuABMMO6wJszvYmYBSkaZHnDgI1PEL7IjJl9yAyn9abgfnajsABRNNg2BUNEVgIoQoVBSZkQiaQpLOcgganiwHOJSKgsZrLRdqSGHinRmmxFgchwcKjpCKrRIbTTiewCsztIMR0aXOpZIbPQ/CeeGO7TS4ppZZy8+sS39ugEPRAVKoc0eciFMxDLCfiVjQ6c+W4pQ6ervCB1CIqaLCtRiJyF+rtLXUL20r2jPZv6+Gdfwa2p2H+kh8+rgpQB9RDzZCSzLzIkN1x82sSAc+YvjhE1sx/YP2VV927Z9fubQcP7HsXPmsdCHMztrS02959d9MbuPuJNc8+z3mqX0lU40tXt6mKG7nOKZXwhNxFOhhEx3MqBlMOIhSp7sCWXQWbfvfl3s7m2u6W6i+Hx2cltyC75v9sOSyrQ7rlTkyBUVAmRsPcwUE53OFZWdGu190Fdx9kiZiBSJzFSzPwpmYo3gCc5vphHiNX47TEweJGQzU3IDB6QtohRcKBQJnKXDiJaVy7MajlXQgbh0GYU1w2hO0wuBW5EbOndlilbQgogT5sivqk/ZhuSrqGZNcHm6W6vkFa4SLkctglBj7qscnpQKEJkLyoybkV76+hdwgEZUeiS0BN1pfD66NB8fK06mID9Cm514Go3vQdhObiPU8888QvnM47vvb4shWrtCFQjEbB/4qERddqB/CrQqGPW7l8WSS2a7ssfdeSY4dDcbv5vS0DIKpUtNfq2+bp/u6PqD7xNYxxaSuIqcBwcRYPdwqWrqaywZqD7zxW/MGzD2A3IzOk/vAHL8flLLovH7hSnW3FknfhUmjf4QGqA6fAAJNYEpDSNidcjeyew3DR7ZV24FMthcohB7Izj0+lMBniTnAWjKOi+aZZhQNBAuFbHheCFLaxGomHiQX0jCAEQB3GAkIRHLCtlylfNZIMzwMS7DEAjRR2DsshEFAlMNiZlZRcWQ/XnXbgb5YXF0A7v1zSDHCZYUCGn3skQZWjne0m+I1Bamo4ghhEuBXlrbxMoprqZPPmt0UbnXgBbhc8Tyy+z7h37+6nqqsr627/4t1PX3/zbakEAolAMk/cmhQhLG369OkSGxmunBIJXZ8DkeO1dfXDR4qLnsLOLt+2zsT3M0FUkYbo5AVegyxlJ6TjkOpDm0rLdm34Tkfd0Xd9H6T60OZfa4MCr73v3ruyszMvAGHVKQknCSXIQSfR5EUBvQWD0NZhBepdN/LquSQR4eHewkHjuCljp/wZ+T5SgfIQtBRQEQDUDD/S4OYSDyIKAxZUCAiKpkg605mdUA10I0+eySoFpeVd6uS5EZDFAhsqS+VozGJJg4rIBE+EfQDqLy09IocP7JLwTKALo83MlFSpbWwCyEeiFBfskwwEOXwEe+H5SYC1Hrkn7/2SoEo6B2RXC2XUAan5aLeSjjYG8XcE4ohNTJXEpBSAdHQmGzNmLbHUHnnfe673s729/b1f/+L+CwEp/vyVV1+/nJlI9XBZnjFtmjz91FP2uJiYrbhsd1VVRWdjQ0NbdXX1zgMHDuz1nn8mP31VCqflOkm585ZnL732bkb6UvBoKd9nL/7guScOv/PUF209HSXjL6LT6SK/e+83v56QkBimRpwgwUw/QngSI1DCgb0QgpUXX0EK6q1tZvnoyFHpiMyWgchkaYcB1wpCsINYOD2RAJXxAzshR8F/ZeM++r9HIuomWhcoSbTxoT6W7nDBcUtRl1sOtLpkb51ZCg4Xy66Xnzz8wesvPhiRf/6Vmqj4wN7GConJBigbLnCkG1NlY6t88OZfAdqaA7lNLfnAlJo/O0864frbSzB+mE9UdqtoYdaKhAdoFK7Je+P9UCgvxHS+BwQ1AE5edXCHJGTNgB8a7JIA7GBhejg1CLKqFMD9nc1me0fTmBdRqeT5Y97+z/ffDAnRZxsjYmYkJcUjOALOftnZ8vwLL2x68IGf3r179+73jxw5sttkMjX5nHdGv552TpUy55J1xthUaa0qdDeUfPh28bYXH4Kq+OBETwGOpi5paA1de9llkgg5qbSsXAGc7Qes46Z3tipuKRkZqdiXoihBd+78UKKXXwnNdy0MqmGK3xZzygRBJxWEuYyciHonGrLxXyEuDhJD37mqcoE6mUGUwQQO+Hi5APhFUH2VE6lo1cOyEhDYCfPzBjc917Nj2lBbX6st2MgVYN2xYiSBXIjcNXbZ/o8NEgQrQwAgEzOglJ2RnaVMcXm5OdKKgIWQqAQpPVosubPnyZ7AGIWQOcWyHATxHuyAy7FCUNuhCV8AYLb4MZFKdKdmwIdmyGXpqj36t4n6bmR/1+OPPHRj8eGCb6y/6tof3HLLDXHJCfFBjz/+2HeBX5rx2G8euQ31JsSnOkHbp3T4tHIqhIMbwmOSHmgsP7Tv4BuPfMNUtu/nmMOaJ7uz1LW3PWpNnre06GiJTI83ytJFi5SB6wVwFwyryBRhkLKyanl/yxbYubbLRatXSU6kTvqbqsXSUAGwsHLpqkM4VEMloLerpL2hRklP1qx81gMko0YKi4oEQPLiam9CRopKGW6tkaBuCMT2DklWObD818nslHhgkyZBPWEgMrKuqqqs44ff/u76efHGAJXdgsybByU5f5nsfP9tqYXRWp+IlGzwGD0Psh0xMzkFU7XB7PbdCCQdAq5Df/0xwDzOF6sDqXGhFN3X4pQCLAgGQJhFH2wE+mAOQuwNIG6Ea7EBrFipQGYGU4BviL6z0m0YsD9d11DXMlkf4pi7tqZq33vvvL2hrq7BajAYE+GHFhaoDpr1zuZNG+B5gQiQs1c8r8/pux5isiQeW/VUmkxYtObOtIv/4+kgfbiiS0LcuVyaZZAvIclkckqKVFRVi6nJBHxzPXIgRQIRJloiEaDJAqYDKGyk8AAYGpGFHXCzRQ4dmJSGFJ8oCs5qqBOOVVTIHwqaJEs3LD+46VKE4YcqYWHMxOBxN0HuYXI5+ObQXlhd20JPh6FXXni29Wvf/G5SONyHGRxRXFwiL2wrEB1y+8QnpUqTGU6ECUlijIqVYTVUFkDLIxZBLxBttgGHlHJUb32pXHT+KplzwRUSMoyAUch1A7hx0/a/STR8t+KQ1o2LGBrRHdhP1xm7GojG4KZhDjNwt+bKpo0b/vrQgz++ZSr96VMnNC8vLw3rwaCjRwvLsN/pc+yMfz3d0x9XdFMiqJDEtPnxiy75tQYKRno/BGNgg5Oz5KUD+2VLSZ1ci/C6my9bJReuPl9akOajprpamsCJDAiqTILXYywCTAmWxg3jpyheaBHidxa++HRD2VpcKrMWnSeafqQuQSLGGbmpyoD7ylx8s3ge5R4nrAkNDXWqpJTUJK6qorFcDw8PgZ/TKmDCG5GTKRZEiewW4Ei9CAzlRjhqO4JC7dCmElIoMScUAvigaHIXQplbIY1lRZI8fQ6IHpjwR7fL92+7Em1FK6pyvAOKgpb1nZDFehC2ZgO0tToIXhU4FhCbuR63lo6tDttUS//Ro0fhxvrplNNNVGOeAiAZnw/Uhi1y9bRsBC75Vp+D0akrr3kuLHWacRgExdCqfLimUBEZE+iU3iCjvFBRLW8UPCMX5sTI9WvOkxXLlioa7UZkTq+Dw10RPBAYjwdWjzzcURKBzPJhiBIOBmIM1QSc13sQGbyvtl3m43yXTS87CkokJz1F7JDSiWLnBHdjEgA7ph9+DoDT9VgdkpmZA7hsK0RBJ4zXnsQCpLqFCwBThHaV1aab+Wn4neRI2c3D9LlK5fX5Cx8K93wMyRXKMJ3rAO5258Xz4TaM/IMgGBaepsZyUA0dng6wkBEgYuVcNPvc1iIpsAWHXnnj539bV7b/vuLi8nLPWcf/RUKEWeqIxFtc/d1bBvs6tx1f4+zt8fTEmbieTpcaFjurSBUaFT5kMw/bOyp+ONhv/hUuFZR83voNmZd/8WraBQkYGxMZKauXLpLGI0jkPXeZIl+0Q3VQa2oBh6oUe3O1zDC6Ze2CGbJ6+RJJT09X7rgfoBZtwBjoaG8Xi6VHseVxcInTHgEvhYKyWnm5yiVXr18PDbsKq7on5I5Vs2F+MShTIGPq6JwXht8MhzJCadgCPIPnX90ooVh1rlmzRjLTGWA6cQcpHTiuF33rk8iILrhj126ZlpMD79OPIbf9tUqC5Eq3uGtQ3imul1ka5HB22eU3b23rLn3npTU9VUWF484zhsRkf1+lj7lHpTWEDfa3t/U1FC5AnVFN/Lj6Z/znGeNUIfqEuwJ1xnCCXai0xkBtbO5Drq5ak8va/tKg0/m+raNpXUhsioYrtIVz5yDPTBngfFIVrMwAEFoiwDu4zQWyXCsIjMmS/uet9+TJLYWIjwOAGSJ0FuXnybRpMIksnK+83ewtjr8dyj4nVnWPvv4hMEmB6w75iSYbXTz8qtLSZW7+rDEdyymnAtPr/tJq2V7eKuWA2P7K4mxkkNArK0gsHCcsyqFJjpObqbE6vfSi1cp0R9yF8YU0SWLi9FtvHVLUG7QM3LMySwyqQfnt9hqg3oTA7DU4ZrzU+vALgsPTH1eHRuVTyKdtVhUSFaeLSv+evavuW+Ovc7Z+j7nJ03hRY4A2/FYs6jHI9EsfQv5jQ1BwdNazuEZA68H3/zDs7GuPW3r50xesvzEyeNgl3dBLJc2YB+8Ij1HemxdFh+ksJz1VIgBqNj3xP0QVkQD34AbZXFspf31xm2icGyUGeqAUTBup8dHA0kyQZKRxM8OnuxoQkauSEpXHouCePnOuPPC7/wMach5iGYOxKnOJCYAgjVaXNMD0o02bDbdkwHYD1Laovlm+CBmMRI/xUrjHJLQzadeRc3mnO+qp2A4JiVMfix0CegPC5Y9AIdoDvdsMGKMXxmlwbbdsb0N0dJBeuna92WytgZ+0p6g0EUnf14Sn/EStNQQrEUkjLkYU/ANDIj6PJfGjqNo4Uv+sfpwRotKERV2gCtanjvGlwkMHavQaTWTmH4cGhmztxXted3Waasypcc/0643zZp13iYL+Mv7pKbNwijQjewOFXQKpJiPTwhC4GwH9rUiKZEFWrbrSw1LaDJSVToTK7wOYPDo3HKlu6WfkhUJk0KgjKV82NMEhEDZIFQTuYCTDNKYYwf2Q5gT4n30gNOY0LO92yf5GpOZNioNBe0iyjWqPyWX8DZ7EbxITPUTNsDFmw+zkAguk7Y+hXaQv7luTGoQQL4Dwwoi+oxVBt6YOef3R+6WrzZKChOKXuSwd7wdHpj0THJV+XQDUFuND3GhvxQscERQSceWAzfzkSdzeaat6RogqMNhwWSAiUcihxhQQllpn0Opi0p9ztDu7eprrt88o/efu1AWr5pUDzic8ZzZWgQioGNEs81zKSExfwdc6GOoAX2hDDQTcGCz5E4B2HIbUuWFRK4DrEKMI/lQv0ASiQ0CEIkzjfBJX/nSAZmTlIbbVptwaXYSJLGxurJayBuixSFQ4YgvUynuHyiTLDQyrMHp2DsiKRM0oeJpy8kn8IYeqBTei3XAZ3HnerQPGJyzdDOc6LzEYWv5ACYWClFPtUchTh7pVUl1RJq8//jASKAGXIjQcKUIj/ytQHfp14G6tUtjnCHcaextw06FXRnDYOqRvPWeICsMXuGgYLhxkxcrD+zw13yzIAAZNZMZLg80ll3UMqJb9MH+mFNeUy3vvF0sz8M+jsmYC/xIh7yAuujN3NzcoWmfvSsvbHH9zI2amHTJUeHyKsqrDTsQWAqYI2+g52Od1jQ4FoYXAVsbC4yRcQkhjFoVDnwcWMQBca6itSlYlrpbi9kHF79x73VP5JJcKBwdC3KocbHMpjnxL4pEYk1000mA7vCUKYO6lo1/hljfkvRefRYIjvDBItm2HMyEWPXMDh+AEhkUHWJSf24DxGnIVYcEVL0rPAtRfRT/nnr5dXHmf7hLgHnI2AkvzAxBVkjokAlAq7FKfgt8qLZZcSE5a1NKduiQjNXjprDxZDPjr0OoSqSk5JK3QAwUgpZmCRVk9jbsQAAAPbElEQVReJEnTZvs0MPYrp1nmT4lMQmj62ENjfpGAmAQpPD4ZnU83l4/vi98tyJjQM4ipEcTMPMJtAB+5ZXEmEoxHSBwojrVBf6dUeC49FnLCg6BdVytESu5F4Zxy1GHYH/cCx6eo5Ii89fv/kW1vbsTCJUMMyIzFe7P1AQcVDpND0O4HBjGyx8+NYN9AT+NLzs7K7wz0OsClXB52fEp3fOonnYnpDzRl28xbGrJ3m4ZDo98LUBP88+MB9NwuPAb0MVku+HX/+I13ZEFerhhXLpTl2amyuKwGaWorZd/WYjkyCOxOJKWELCs6aKwD0MFURfj6anlxSBkUSo36RIWc0yPUjr0XDhoTUzMxE1UM1Ghz1cpcg28c7ZalukQJwTHQAsLZ4UgHaqCnAYnC39iOvz6aV4iHuA704aIxu8oC/60BZCwFU2npBWJgTZUc2PyaHPrnB8DgGJYkpJyl9p/wTEx/QoxRTv0kKCxyRKWDRwwbHilc3Q5Y2w7b2yvvxi74on565UwQ1ejTOC3tW9X62G1BhsQLxguUSiVMhVq48h5s6pYH3/1AHrlgCVwwDaJekCf5CKnKN7VJJ0Bkj3V0ykf/+KNUqPUSnD5TYpG2LARmGxIR31g73mIN8qrQbqZwH3S20t0+nc5JhhpyxRMA5/C7MjXjO6GCeAJhE4etFnfnsZJj/c01f9P0mEr/EeT+yeGy6rykrFwJR8LqMEQF03OCaHha8HksEBUnQH5XHAI5M6EtRk1zxccNcj7chfHJDW+HDUrXXuQt7GwxSTPcamqKC6X6CPBO4WAXBJ+q+LRkhaC8Lw6fSwdTVS8cGaGLQvto3PfZ8LIMOax9LnPdnejXT5WgOK5nlKjQ/rCzp/kX0FOtCgji/KEMNa+rdIrSOegQcofXCupk2l82yJ1fuMnTYSkIagCofyTCo1Z29MgKmC46MRClLYflv59++FVVYoYmJiUzBz5IRqe9P0wbGhaGTAjQFGgVrsZ0Z4RCUqYJ0gwGgm96W3OjRLW1gIAcSGUDd3pHnwQPIdDD2uHe+fKLj3S2Nb7RVlfFaBTFsl91uCQ+JHn6b3XIrGpAhgYjsEmNgK1GhnRkDEPmBnARJbUHrsvBZzAHrkYFLsqwE4Q6gKDP/gGHzeq09XcAt73R1tNV0Vp9tLa22vTwsEqfSOImJyJBGSOjlKTfXoJiV7G9EOBK9OH5WRRZVfmm/FK4qsts+umAzXJodPen+OVMExUAZbs/GOzv2qKJSF3ruxr0TEOYZsBBqNkOAzrwoxu2K/avu++4CeoHTHXoGOYmdifGwPnJLLF9sVLR0d58bMd7X4EvHd9IOFtJCDZ9TFJ6THhccjJAV5fcfv6qH4UZwgOYDdQjpeIqmBapab0o2C2x1iLkdwYYbAo2BF5EIhq6uKCg62f7P3wYbY3xssS7sAPy1YDLHRzUAaVoW5sFU2i5ZxpV7p5PgMKpUPn0oA4PAZPJ3la2DrsgKSlerv34dLCKtwRHpkRqo6Me5RxKDhuM4A0SrPKyeSvhUzkGoiXhKYkRUH+04PugteV9Z0/jE6P7PuUvZ5yo8HzDLovpQVVIxIXQU2F+4jCjEyGzsDMxLorMQHymIKy4frtxv3wE88qdN1wq82Z55IoAcAkXFJLVfXXy6uEDj40QFLuOXm0kAkuHqc6E7bAOPnCXfeG2b0/PyAxxQ6WgGOhQIYCRvfB9h02IXnDKdTFanuNA/61tNNWiGljX2IIM9sfiDKHVQfrY6VRtMJSMerOPi8ch0PPbM9iUb4YHmYRH6CFAYvJbnN2NT6l14berwxLyAxAOFonpldMyiWh8oe6MiQ56cX2vkM7rwM5ntplr70V9j9Z4/Imfwu+zQVQyaO/dPWBt/Ss06rcpzwhiQqcrbJxGYQqkHGCQGmSHMNldZZE9P3tWUuHnFI9cN9QvtSB5dknhoTrEFv5psn7CnBVoJ6Is5CTihAbABqhOjQOeJzxRFUOcx7tyTBsgktKKSk55HsY25iCg0h39e42pUdP1CBHjFErC4kYDNBM/UVtPQvDkdyFBQF4bHiKFkZNOVvoHzU0/DNCEvh0RlxbIqXTstOdzKtpX5CpAIimFfQgFrrO74UFYrUm8n5lyVoiKT+vorH0AstXlQWGxkey4QPggUd9CHyYagEffTnQeEwRJcIQ0QatcX29T5BQbvAdgOP45moImdNISsKesNGAWbIbBcPMFHJ+HI2IVRcJVuKP3dFyb4AxV8BLZvnP3hNFDvd1NO8IdM+6gaYcAuiHcqBFBe7xv773b4NnQ3d46sg8P6Z9IvVdXPp028+Yge88GQ+S8m73tjKkw8oPHGGL28QoXkEs9TbsH+juhOvhsFUqVZ6uYETs4CL3VWiZYDAC8NQVUcik94Jz9FcVXG9pBBoki1+z+3ubS/0Q937nH32nRxQPGr+9p7QoyIbjTAX+nYazqgB3ukYMw1uQs1LgfAy7DH195S376+DMDB3ZvvR+Ntflr0NVncxniU7+sCYGtRpm+UYsEOlI4HXGjwE65h4pK6JPMmJr+F1U4DU5aAgf7PtIZYm/VIiBxvDzleyIXHg5bv+KrNdjf6bS3Vv0H6Lbet85n4ftZ41R8WHTEky5z43ptTPZqrI+UgQkGKq/CPXwGybdjKDfYetoGu03HfoD90OqcoAQFGTShRm0ZEoMXbzwoKvde6LewwgTOlQ6qAEJjM+iUUI4t3UAxRoRyX6+jBq1WTNyyq8rZ212tj0qZSQP5RIUcOBT+XZzIW8wNU+JUbAvZQWs760seCDZG/47R2hMRlpdwKds5uhv/CJFyQu460T2ejf2Y/M9qcTq6au9yWVo6sN4Ho4LvE1i671s/9m5odoAxuf7os46ezm1jj/n/pVYFh0HYDWTsYAjMMcHAhhhCBi7rUDC09IFSDxNIbY9bTFaMuSZUyR4/YO3i4Dj8t6jsdSESaJ8C8jZJJR4iYelBWEhITFb2MTs7wXnW1tqnuutKto6ZnsefgxePnH3AamoZsnVRFPhMlrNNVOyEcgiXdww7e100OwRhupio52mrMzceq+isK/nvqfaeWx0czZD3j4tnAcAFH+1sjLLhxlg9zFgKSo3N3Lb14/r+v9nMLR8O2Htxjm/b/utyYQHiOimiQksDbRUH7+kxlXexX/wV6t6AtyQuS+vjOH6iYAh/TZyVfSfuoTNwG0NO6yZgaX4/EMtoYrT741TsWGtbTW9rxcEv4hao65lSCQzQRHvFnhOdQAIBNoStv6dlz4nqOqxde+2WThvBZScv5K6K/m2id2Wy08tayw9+HcAnw+wXxhTyxVKIDG9AX0ejtFccfHPY1U9Z7TNbzqpM5dsL4FaPAwhV7+qLe5AIMxCsRg57xgIE1d9Wtu/zVEf4nnei7whvivE6+J2wLogKoLVUJdSeqC6O1zksnSWSmA1b0sSF3I96LPBHPpD3oSY+YdwRV1/3q+3H9urcw6671EEh6cPDAyoXIJL7zS2HzKaK19H4JpziRy8yrqFP8eenRlR8ZmvjsYeGHZbKEDjsqzWhSRhjFfQ+ViDqNSJZ9nODjr5/nmzfwHHNqGT8mgKfoGF60NazBdegUH2iMmQ3t25B5M8SZRqaYGHBRhSDN9kMZtwTNervOBKE/7l//6a/4Bg0tUobtB5MJvP5a+ZT2/epEhWfuq+j+VVu+Mq3mnPLxMsrHDxRwfRkdCHUiWoDr+bZ3zmc+lz23iEM4Lv+jvvbZzObNls7TP8VkZgZyAXERHolekqgfZqPsLQFfMypFb4W8K761ysnEhDO5hOxEz8RQfFmIc+kMoZOcYFRZiD/j0DZyNHb1diLLBf+axy/F0kDPmqvL0PS8xZo1OmE6NFPjamJfdS6Q06HmUCxS445/O/w47NEVKejv6NUmtB5THlLReGYBYCXALyfuBpWfTv5cRIXhsnG8pq1ux2h9bXS1tSg4DGM4YiYFqn1hvY9RK2LTDqJts+ZqucUUQXpdDmBGl0sNdsKUY0OEyz50KB3weWlrbEen61Idtk97Oo1T2pHHD3d54vLankFyZj6qaigWYZAZ77yOKdEHXyutHpgMGhD831O/bf5ek4Rlaj1eQi4CNCCqHy5FJWs/b0WsXZ3KWaOPqtFLK31B3taKk+oSjieEpwV8LzcxPbpqsKsW+M14Jxa9XADDlAHLzr+/HN/zzlFVIFq3TSGXXkM1GMHT0FTxtTHogceg9thfR5fYWU++TLU1/EH96BjOBzZQ8dyRE9bHm4VBqc7fR72nFN9PJXeOrceWK3JYJ5ByjRgVR8//whXIQGEgrNog1XmvtaKjR9XOLlvjr7OvXq9tkyx86Ht4wr2MSpZG2ZMxzG4Sfx7lXOLqNzueKaNHa/1VtxGQGzxqcikCvgfpJPdarPZmj/BUDsDh+ybxk97vu2RKer0ilY30Xf/v8P3c4mo1JjijB4Dtf+hIxejY5u1s/51/zWmvtfSXLkRePLDE9kC3TD9aUMNsG8bkqfe6rlR81wiqiCEL2kJZjZm6vMdJyg8YcPrsjZXb/PdfSrfe7vbC11whxnPFb1tMZ5HDfjG4FB9gnffv8vnuURUgHjSakbDtPyMIKckKDwP4FCrn8Mnu8tus3Tsn0irzsZozlGpNDEn2/C/ev1zjKg0QUo83wSjQsQ+m7l12wSHT3q3vafzgCcHomdVOaYByO+cGgPVgf7dWsdUPrd+nEtEBRgEddAY7bbPWHGagkeCu7fTtN9n9yf6arO0HRkAtDX1YMcX+inAjMP8Jf9m5VwiKoY3+Vnfe0ZUMSDbrBZ4PlSdrjFGW/VI4m2bSFgHVZFdnZKnwum6x0+jnXOJqAbBGQbGcyoPt2Dyo0AZdNro7Nd9Gju6C7gR3Wxb2UhE4wsD+v7Nyqfu+nIa+9sBF4X+8e1ZgT8whPg/hsPbe5ElciScfXy9U/zda7Oa29WdnclDgPjRIUES9WTe1SeFeHhN/Mv4QZ1iHxx32rnEqQaGXDaXIhzDFdnrhktXXDvCmhxAHw6Ly5hmiEqe1HPzuB6afIfa6RzQmDvbxNwBMNvuTmXG4x9GAY1wr7bJmzj3jp5LnArIRQ1fa6tUXwqvk3zIx6kY1AgQmSEsVK1VqdyMXh12qwJXYRhPi7CuVusWxKXnztKGxyv+Wx7zEKOvXVwUiL2nrXlgoP+kvVf/1cnMjxDwr/5Io/dPAZmOckwRASAF5ZMylQnbJ3YGRBtoUR8TG599g0ZnmIkpLxJgaQGDDluv02apQ0jXEchbRGH5JOYg5TL/an/+Hxe5hZ7JFMylAAAAAElFTkSuQmCC);
    background-position: 50%;
    background-repeat: no-repeat;
    background-size: contain;
    height: 157px;
    margin-top: -60px;
    width: 149px
}

.lot-upload-succ-tip {
    align-items: center;
    background-color: #FFFFFF;
    border-radius: 8px;
    box-shadow: 0 13px 20px 0 rgba(106, 115, 133, .22);
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    padding: 10px 12px;
    width: 344px
}

.lot-upload-popover>div {
    left: 50%;
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%)
}

.el-tabs-wrapper {
    width: 100%;
    height: 100%;
}

.el-tabs__content {
    height: 80vh;
}

.el-tabs__content::-webkit-scrollbar {
    display: none !important
}

.lot-upload__wrap {
    bottom: 0;
    left: 0;
    position: fixed;
    right: 0;
    top: 0
}

.bili-overlay {
    bottom: 0;
    left: 0;
    position: absolute;
    right: 0;
    top: 0
}
</style>
