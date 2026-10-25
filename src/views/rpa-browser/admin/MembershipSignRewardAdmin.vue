<template>
  <div class="membership-sign-reward-admin flex flex-col flex-1 min-h-0 p-4 gap-4 overflow-auto">
    <!-- ============ 基础配置 ============ -->
    <div class="membership-sign-reward-admin__basic flex flex-col gap-3 rounded-xl border border-border-light p-4">
      <span class="membership-sign-reward-admin__basic-title text-base font-semibold text-text-primary">
        基础奖励参数
      </span>

      <el-skeleton v-if="loading" class="membership-sign-reward-admin__basic-skeleton" :rows="3" animated />

      <div v-else class="membership-sign-reward-admin__basic-form flex flex-wrap items-center gap-3">
        <el-date-picker
          v-model="basic.launchDate"
          class="membership-sign-reward-admin__field-launch"
          type="date"
          placeholder="玩法上线日期"
          value-format="YYYY-MM-DD"
        />
        <el-select
          v-model="basic.timezone"
          class="membership-sign-reward-admin__field-timezone"
          placeholder="签到判定时区"
          filterable
          allow-create
        >
          <el-option label="Asia/Shanghai（默认）" value="Asia/Shanghai" />
          <el-option label="UTC" value="UTC" />
          <el-option label="Asia/Tokyo" value="Asia/Tokyo" />
          <el-option label="America/Los_Angeles" value="America/Los_Angeles" />
        </el-select>
        <el-input-number
          v-model="basic.dailyRewardMinutes"
          class="membership-sign-reward-admin__field-daily"
          :min="0"
          :max="1440"
          placeholder="每日签到奖励（分钟）"
        />
        <el-input-number
          v-model="basic.makeupCardMax"
          class="membership-sign-reward-admin__field-card-max"
          :min="0"
          :max="99"
          placeholder="补登卡持有上限"
        />
        <el-input-number
          v-model="basic.makeupWindowDays"
          class="membership-sign-reward-admin__field-window"
          :min="0"
          :max="365"
          placeholder="补签窗口天数（0=仅当月）"
        />
      </div>

      <span class="membership-sign-reward-admin__basic-hint text-xs text-text-secondary">
        修改后立即生效（热加载，无需重启服务）；保存动作会写入管理员操作审计日志。
      </span>
    </div>

    <!-- ============ 档位配置 ============ -->
    <div class="membership-sign-reward-admin__tiers flex flex-col gap-3 rounded-xl border border-border-light p-4">
      <div class="membership-sign-reward-admin__tiers-header flex items-center gap-2 flex-wrap">
        <span class="membership-sign-reward-admin__tiers-title text-base font-semibold text-text-primary">
          累计奖励档位
        </span>
        <el-button
          class="membership-sign-reward-admin__tiers-add"
          :disabled="loading"
          @click="handleAddTier"
        >
          新增档位
        </el-button>
      </div>

      <el-table :data="tierRows" class="membership-sign-reward-admin__tiers-table w-full" border>
        <el-table-column label="档位标识" width="180">
          <template #default="{ row }">
            <el-select v-model="row.tier" class="membership-sign-reward-admin__tier-type" placeholder="档位标识">
              <el-option
                v-for="option in TIER_OPTIONS"
                :key="option"
                :label="`${option} 档`"
                :value="option"
              />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="所需累计签到天数（升序）" min-width="200">
          <template #default="{ row }">
            <el-input-number
              v-model="row.days"
              class="membership-sign-reward-admin__tier-days"
              :min="1"
              :max="3650"
              placeholder="天数"
            />
          </template>
        </el-table-column>
        <el-table-column label="发放时长（分钟）" min-width="180">
          <template #default="{ row }">
            <el-input-number
              v-model="row.rewardMinutes"
              class="membership-sign-reward-admin__tier-reward"
              :min="0"
              :max="525600"
              placeholder="时长（分钟）"
            />
          </template>
        </el-table-column>
        <el-table-column label="发放补登卡" min-width="160">
          <template #default="{ row }">
            <el-input-number
              v-model="row.makeupCards"
              class="membership-sign-reward-admin__tier-cards"
              :min="0"
              :max="99"
              placeholder="补登卡数量"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100">
          <template #default="scope">
            <el-button
              class="membership-sign-reward-admin__tier-remove"
              type="danger"
              plain
              @click="handleRemoveTier(scope.$index)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无档位，请点击「新增档位」" />
        </template>
      </el-table>

      <span class="membership-sign-reward-admin__tiers-hint text-xs text-text-secondary">
        后端校验：档位不能为空、天数不能重复且必须按升序排列，档位标识仅支持 7d / 14d / 28d。
      </span>
    </div>

    <!-- ============ 操作区 ============ -->
    <div class="membership-sign-reward-admin__actions flex items-center gap-3">
      <el-button
        type="primary"
        class="membership-sign-reward-admin__save"
        size="large"
        :loading="saving"
        @click="handleSave"
      >
        保存配置
      </el-button>
      <el-button
        class="membership-sign-reward-admin__reload"
        size="large"
        :loading="loading"
        @click="loadConfig"
      >
        重新读取
      </el-button>
      <span class="membership-sign-reward-admin__changed text-xs text-text-secondary">
        {{ dirty ? '有未保存的修改' : '当前为服务端最新配置' }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import membershipApi from '@/api/browser/membership_api'
import type { SignRewardConfigPayload } from '@/api/browser/membership_api'
import biliMessage from '@/utils/message'

/** 后端支持的档位标识（SignRewardTierEnum） */
const TIER_OPTIONS = ['7d', '14d', '28d'] as const

/** 基础配置表单（数值按「分钟」录入，提交时转秒，便于运营填写） */
const basic = reactive({
  launchDate: '2026-06-17',
  timezone: 'Asia/Shanghai',
  dailyRewardMinutes: 60,
  makeupCardMax: 4,
  makeupWindowDays: 0
})

/** 档位表单行 */
interface TierRow {
  tier: string
  days: number
  rewardMinutes: number
  makeupCards: number
}
const tierRows = ref<TierRow[]>([])

const loading = ref(false)
const saving = ref(false)
/** 服务端快照签名，用于提示「未保存修改」 */
const serverSignature = ref('')

function buildSignature(): string {
  return JSON.stringify(toPayload())
}

const dirty = computed(() => serverSignature.value !== '' && buildSignature() !== serverSignature.value)

function toPayload(): SignRewardConfigPayload {
  return {
    launch_date: basic.launchDate,
    timezone: basic.timezone,
    daily_reward_seconds: String(Math.round(basic.dailyRewardMinutes * 60)),
    makeup_card_max: String(basic.makeupCardMax),
    makeup_window_days: String(basic.makeupWindowDays),
    tiers: tierRows.value.map((row) => ({
      tier: row.tier,
      days: String(row.days),
      reward_seconds: String(Math.round(row.rewardMinutes * 60)),
      makeup_cards: String(row.makeupCards)
    }))
  }
}

async function loadConfig() {
  loading.value = true
  try {
    const result = await membershipApi.GetSignRewardConfig()
    if (!result.success || !result.data) return
    const config = result.data
    basic.launchDate = config.launch_date
    basic.timezone = config.timezone
    basic.dailyRewardMinutes = Math.round(Number(config.daily_reward_seconds || 0) / 60)
    basic.makeupCardMax = Number(config.makeup_card_max || 0)
    basic.makeupWindowDays = Number(config.makeup_window_days || 0)
    tierRows.value = (config.tiers || []).map((item) => ({
      tier: item.tier,
      days: Number(item.days || 0),
      rewardMinutes: Math.round(Number(item.reward_seconds || 0) / 60),
      makeupCards: Number(item.makeup_cards || 0)
    }))
    serverSignature.value = buildSignature()
  } finally {
    loading.value = false
  }
}

function handleAddTier() {
  const used = new Set(tierRows.value.map((row) => row.tier))
  const nextTier = TIER_OPTIONS.find((option) => !used.has(option))
  const lastDays = tierRows.value.length ? Math.max(...tierRows.value.map((row) => row.days)) : 0
  tierRows.value.push({
    tier: nextTier || String(tierRows.value.length + 1),
    days: lastDays + 7,
    rewardMinutes: 60,
    makeupCards: 1
  })
}

function handleRemoveTier(index: number) {
  tierRows.value.splice(index, 1)
}

/** 前端预校验（后端同样校验，此处提前拦截避免无谓请求） */
function validate(): string | null {
  if (tierRows.value.length === 0) return '至少需要保留一个奖励档位'
  const daysList = tierRows.value.map((row) => row.days)
  if (new Set(daysList).size !== daysList.length) return '档位天数不能重复'
  for (let i = 1; i < daysList.length; i += 1) {
    if (daysList[i] <= daysList[i - 1]) return '档位必须按天数升序排列'
  }
  const unknownTier = tierRows.value.find((row) => !TIER_OPTIONS.includes(row.tier as (typeof TIER_OPTIONS)[number]))
  if (unknownTier) return `不支持的档位标识：${unknownTier.tier}`
  if (new Set(tierRows.value.map((row) => row.tier)).size !== tierRows.value.length) {
    return '档位标识不能重复'
  }
  if (!basic.launchDate) return '请填写玩法上线日期'
  if (!basic.timezone) return '请填写签到判定时区'
  return null
}

async function handleSave() {
  const invalid = validate()
  if (invalid) {
    biliMessage.warning(invalid)
    return
  }
  saving.value = true
  try {
    const result = await membershipApi.UpdateSignRewardConfig(toPayload())
    if (result.success && result.data) {
      // 以服务端返回的最新配置回写表单（后端可能做归一化）
      serverSignature.value = ''
      await loadConfig()
    }
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadConfig()
})
</script>
