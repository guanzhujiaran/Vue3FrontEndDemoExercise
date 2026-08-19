<template>
  <div class="user-center-records flex flex-col gap-4">
    <el-tabs v-model="activeTab" class="user-center-records__tabs" @tab-change="handleTabChange">
      <!-- 登录记录 -->
      <el-tab-pane label="登录记录" name="login">
        <div class="user-center-records__login-panel flex flex-col gap-4">
          <div class="user-center-records__login-header flex flex-col gap-2">
            <h3 class="user-center-records__login-title text-xl font-bold text-text-primary">
              登录记录 您最近一周的登录情况
            </h3>
            <el-alert
              class="user-center-records__login-alert"
              type="warning"
              :closable="false"
              show-icon
              title="若根据登录时间、IP、地理位置判断为异常情况，请在核实后及时修改密码"
            />
            <div class="user-center-records__login-notes flex flex-col gap-1">
              <el-text class="user-center-records__login-note text-sm text-text-secondary" tag="p">
                说明
              </el-text>
              <el-text class="user-center-records__login-note text-sm text-text-secondary" tag="p">
                1. 移动端登录，由于运营商是随机分配 IP，往往存在与实际登录地不符的情况
              </el-text>
              <el-text class="user-center-records__login-note text-sm text-text-secondary" tag="p">
                2. 若使用 VPN 或代理联网，登录地无法准确记录
              </el-text>
              <el-text class="user-center-records__login-note text-sm text-text-secondary" tag="p">
                3. 部分网络代理商的服务，存在 IP 地址不稳定的问题
              </el-text>
              <el-text class="user-center-records__login-note text-sm text-text-secondary" tag="p">
                4. 使用哔哩哔哩账号登录的游戏，也存在一定程度的误报情况
              </el-text>
            </div>
          </div>

          <el-table
            v-loading="loginLoading"
            :data="loginItems"
            class="user-center-records__table"
            empty-text="暂无登录记录"
          >
            <el-table-column label="时间" prop="time" min-width="180">
              <template #default="{ row }">
                <span class="user-center-records__time">{{ formatTime(row.time) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="类型" prop="act_info" min-width="110">
              <template #default="{ row }">
                <el-tag
                  size="large"
                  effect="light"
                  :type="actInfoType(row.act_info)"
                  class="user-center-records__act-tag"
                >
                  {{ actInfoText(row.act_info) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="IP" prop="ip" min-width="140">
              <template #default="{ row }">
                <span class="user-center-records__ip">{{ row.ip || '—' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="地理位置" prop="location" min-width="180">
              <template #default="{ row }">
                <span class="user-center-records__location">{{ row.location || '未知' }}</span>
              </template>
            </el-table-column>
          </el-table>
          <div class="user-center-records__more flex justify-center">
            <el-button
              v-if="loginHasMore"
              class="user-center-records__more-btn"
              size="large"
              :loading="loginLoadingMore"
              @click="loadLoginMore"
            >
              加载更多
            </el-button>
            <el-text v-else-if="!loginLoading && loginItems.length" class="user-center-records__no-more text-sm text-text-secondary" tag="span">
              已加载全部记录
            </el-text>
          </div>
        </div>
      </el-tab-pane>

      <!-- 经验记录 -->
      <el-tab-pane label="经验记录" name="exp">
        <div class="user-center-records__exp-panel flex flex-col gap-4">
          <div class="user-center-records__exp-header flex flex-col gap-2">
            <h3 class="user-center-records__exp-title text-xl font-bold text-text-primary">
              经验记录 您最近一周的变化情况
            </h3>
            <el-alert
              class="user-center-records__exp-alert"
              type="info"
              :closable="false"
              show-icon
              title="经验记录展示您近期的经验变动情况，如每日登录获得的经验奖励"
            />
            <div class="user-center-records__exp-notes flex flex-col gap-1">
              <el-text class="user-center-records__exp-note text-sm text-text-secondary" tag="p">
                说明
              </el-text>
              <el-text class="user-center-records__exp-note text-sm text-text-secondary" tag="p">
                1. 每日首次登录可获得经验奖励
              </el-text>
              <el-text class="user-center-records__exp-note text-sm text-text-secondary" tag="p">
                2. 更多获取经验的行为后续逐步开放，敬请期待
              </el-text>
            </div>
          </div>

          <el-table
            v-loading="expLoading"
            :data="expItems"
            class="user-center-records__table"
            empty-text="暂无经验记录"
          >
            <el-table-column label="时间" prop="time" min-width="180">
              <template #default="{ row }">
                <span class="user-center-records__time">{{ formatTime(row.time) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="行为" prop="action_name" min-width="140">
              <template #default="{ row }">
                {{ actionNameText(row) }}
              </template>
            </el-table-column>
            <el-table-column label="经验变动" prop="exp" min-width="100">
              <template #default="{ row }">
                <el-tag size="large" type="primary" effect="light">+{{ row.exp }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="引用日期" prop="ref_date" min-width="120" />
          </el-table>
          <div class="user-center-records__more flex justify-center">
            <el-button
              v-if="expHasMore"
              class="user-center-records__more-btn"
              size="large"
              :loading="expLoadingMore"
              @click="loadExpMore"
            >
              加载更多
            </el-button>
            <el-text v-else-if="!expLoading && expItems.length" class="user-center-records__no-more text-sm text-text-secondary" tag="span">
              已加载全部记录
            </el-text>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import userApi from '@/api/user/user_api.ts'
import type { UserActLogItem, UserExpRecordItem } from '@/api/user/user_api.ts'

// 当前激活的 tab：login（登录记录）/ exp（经验记录）
const activeTab = ref('login')

// ==================== 登录记录 ====================
const loginItems = ref<UserActLogItem[]>([])
const loginLoading = ref(false)
const loginLoadingMore = ref(false)
const loginHasMore = ref(false)
const loginOffset = ref(0)
const LOGIN_PAGE_SIZE = 10

const loadLogin = async (append: boolean) => {
  if (append) {
    loginLoadingMore.value = true
  } else {
    loginLoading.value = true
    loginOffset.value = 0
  }
  try {
    const res = await userApi.ActLog(loginOffset.value, LOGIN_PAGE_SIZE, 7)
    const data = res?.data
    const items = data?.items ?? []
    if (append) {
      loginItems.value = [...loginItems.value, ...items]
    } else {
      loginItems.value = items
    }
    loginHasMore.value = !!data?.has_more
    loginOffset.value += items.length
  } finally {
    loginLoading.value = false
    loginLoadingMore.value = false
  }
}

const loadLoginMore = () => {
  if (loginHasMore.value && !loginLoadingMore.value) {
    loadLogin(true)
  }
}

// ==================== 经验记录 ====================
const expItems = ref<UserExpRecordItem[]>([])
const expLoading = ref(false)
const expLoadingMore = ref(false)
const expHasMore = ref(false)
const expOffset = ref(0)
const expLoaded = ref(false)
const EXP_PAGE_SIZE = 10

const loadExp = async (append: boolean) => {
  if (append) {
    expLoadingMore.value = true
  } else {
    expLoading.value = true
    expOffset.value = 0
  }
  try {
    const res = await userApi.ExpRecord(expOffset.value, EXP_PAGE_SIZE, 7)
    const data = res?.data
    const items = data?.items ?? []
    if (append) {
      expItems.value = [...expItems.value, ...items]
    } else {
      expItems.value = items
    }
    expHasMore.value = !!data?.has_more
    expOffset.value += items.length
  } finally {
    expLoading.value = false
    expLoadingMore.value = false
  }
}

const loadExpMore = () => {
  if (expHasMore.value && !expLoadingMore.value) {
    loadExp(true)
  }
}

// tab 切换：首次切到「经验记录」时加载一次（之后复用，不重复请求）
const handleTabChange = (name: string | number) => {
  if (name === 'exp' && !expLoaded.value) {
    expLoaded.value = true
    loadExp(false)
  }
}

// ==================== 展示辅助 ====================
const formatTime = (time?: string) => {
  if (!time) return '—'
  const d = new Date(time)
  if (isNaN(d.getTime())) return time
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

// 登录记录 act_info → 中文文案
const ACT_INFO_TEXT: Record<string, string> = {
  login_succ: '登录',
  daily_login: '每日登录',
  reg: '注册',
}

// 登录记录 act_info → el-tag 类型（daily_login 单独用 info 蓝色，避免与手动登录混淆）
const actInfoText = (actInfo?: string) => ACT_INFO_TEXT[actInfo || ''] || actInfo || '—'
const actInfoType = (actInfo?: string): 'success' | 'info' | 'warning' | 'primary' => {
  if (actInfo === 'daily_login') return 'info'
  if (actInfo === 'reg') return 'warning'
  return 'success'
}

// action_name（枚举名）→ 中文展示文案
const EXP_ACTION_TEXT: Record<string, string> = {
  daily_login: '每日登录',
}

const actionNameText = (row: UserExpRecordItem) => {
  if (row.action_name && EXP_ACTION_TEXT[row.action_name]) {
    return EXP_ACTION_TEXT[row.action_name]
  }
  if (row.action_type === 1) return '每日登录'
  return row.action_name || '未知行为'
}

onMounted(() => {
  loadLogin(false)
})
</script>
