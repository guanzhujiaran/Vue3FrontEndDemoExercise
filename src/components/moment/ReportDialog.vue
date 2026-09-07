<template>
  <el-dialog
    v-model="visible"
    class="report-dialog max-w-130"
    :title="'请选择举报的原因'"
    width="90%"
    top="12vh"
    append-to-body
    :close-on-click-modal="false"
    :close-on-press-escape="false"
  >
    <div class="report-dialog__body flex flex-col gap-4">
      <!-- 预设原因 -->
      <el-radio-group v-model="reasonValue" class="report-dialog__reasons flex flex-col gap-2">
        <el-radio v-for="r in REPORT_REASONS" :key="r.value" :value="r.value" class="report-dialog__reason">
          {{ r.label }}
        </el-radio>
      </el-radio-group>

      <!-- 其他原因：补充描述（字数 0/60） -->
      <div v-if="reasonValue === OTHER_REASON" class="report-dialog__desc">
        <el-input
          v-model="reasonDesc"
          class="report-dialog__desc-input"
          type="textarea"
          :rows="3"
          :maxlength="60"
          placeholder="请补充举报原因（最多 60 字）"
          show-word-limit
        />
      </div>

      <!-- 图片附件（最多 3 张，http(s) URL） -->
      <div class="report-dialog__pics">
        <div class="report-dialog__pics-label flex items-center justify-between">
          <el-text size="default" type="info">图片证据（最多 3 张）</el-text>
          <el-button
            v-if="pics.length < MAX_PICS"
            class="report-dialog__pics-add"
            size="default"
            text
            @click="addPic"
          >
            添加图片
          </el-button>
        </div>
        <div v-if="pics.length" class="report-dialog__pics-list flex flex-col gap-2">
          <div v-for="(p, i) in pics" :key="i" class="report-dialog__pic flex items-center gap-2">
            <el-input v-model="pics[i]" class="report-dialog__pic-input" placeholder="粘贴图片 http(s) 链接" />
            <el-button class="report-dialog__pic-remove" size="default" text type="danger" @click="removePic(i)">
              删除
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <el-button size="default" @click="visible = false">取消</el-button>
      <el-button type="primary" size="default" :disabled="!canSubmit" :loading="submitting" @click="submit">
        确定
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { REPORT_REASONS, InteractionBizTypeEnum, reportByBiz } from '@/api/notify/moment-api'

const OTHER_REASON = 6 // ReportReasonEnum.OTHER

const MAX_PICS = 3

const props = defineProps<{
  modelValue: boolean
  bizType: InteractionBizTypeEnum // 举报来源类型（InteractionBizTypeEnum 值）
  bizId: string // 雪花 id 用 str 传递，避免 Number() 精度丢失
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'submitted', result: { created: boolean; triggered: boolean }): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
})

const reasonValue = ref<number>(REPORT_REASONS[0]?.value ?? OTHER_REASON)
const reasonDesc = ref<string>('')
const pics = ref<string[]>([])
const submitting = ref(false)

// 每次打开重置
watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      reasonValue.value = REPORT_REASONS[0]?.value ?? OTHER_REASON
      reasonDesc.value = ''
      pics.value = []
    }
  }
)

const canSubmit = computed(() => {
  if (reasonValue.value === OTHER_REASON && !reasonDesc.value.trim()) return false
  const validPics = pics.value.filter((p) => p && p.trim())
  return validPics.every((p) => /^https?:\/\//.test(p.trim()))
})

async function submit() {
  const desc = reasonValue.value === OTHER_REASON ? reasonDesc.value.trim() : reasonDesc.value.trim()
  const validPics = pics.value.filter((p) => p && p.trim()).map((p) => p.trim())
  submitting.value = true
  try {
    const res = await reportByBiz(
      props.bizType,
      props.bizId,
      reasonValue.value,
      desc,
      validPics,
      {
        showSuccessToast: true,
        successMessage: '举报已提交，感谢你的反馈',
      }
    )
    if (res) {
      emit('submitted', res)
      visible.value = false
    }
  } finally {
    submitting.value = false
  }
}

function addPic() {
  if (pics.value.length < MAX_PICS) pics.value.push('')
}

function removePic(i: number) {
  pics.value.splice(i, 1)
}
</script>
