<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import {
  NForm, NFormItem, NInput, NSelect, NDatePicker, NTimePicker,
  NRadioGroup, NRadio, NSwitch, NButton, NSpace, NAlert, useMessage
} from 'naive-ui'
import type { SelectOption } from 'naive-ui'
import { useInterviewStore } from '@/stores/interview'
import { useCompanyStore } from '@/stores/company'
import { usePipelineStore } from '@/stores/pipeline'
import { formatTime } from '@/utils/time'

const props = defineProps<{
  date: string
  interviewId?: string | null
  initialCompanyId?: string
}>()

const emit = defineEmits<{
  (e: 'saved'): void
  (e: 'cancel'): void
}>()

const message = useMessage()
const interviewStore = useInterviewStore()
const companyStore = useCompanyStore()
const pipelineStore = usePipelineStore()

const form = ref({
  companyId: props.initialCompanyId ?? '',
  stage: '',
  date: new Date(props.date).getTime(),
  startTime: new Date(`${props.date}T10:00:00`).getTime(),
  endTime: new Date(`${props.date}T11:00:00`).getTime(),
  method: 'online' as 'online' | 'offline',
  platform: '',
  meetingId: '',
  meetingLink: '',
  location: '',
  reminder: true
})

const conflicts = computed(() => {
  const dateStr = new Date(form.value.date).toISOString().substring(0, 10)
  const start = new Date(form.value.startTime)
  start.setFullYear(parseInt(dateStr.substring(0, 4)))
  start.setMonth(parseInt(dateStr.substring(5, 7)) - 1)
  start.setDate(parseInt(dateStr.substring(8, 10)))

  const end = new Date(form.value.endTime)
  end.setFullYear(parseInt(dateStr.substring(0, 4)))
  end.setMonth(parseInt(dateStr.substring(5, 7)) - 1)
  end.setDate(parseInt(dateStr.substring(8, 10)))

  return interviewStore.checkConflict(
    start.toISOString(),
    end.toISOString(),
    props.interviewId ?? undefined
  )
})

const companyOptions = computed<SelectOption[]>(() =>
  companyStore.companies.map(c => ({ label: `${c.name} - ${c.position}`, value: c.id }))
)

const selectedCompany = computed(() =>
  form.value.companyId ? companyStore.getCompanyById(form.value.companyId) : undefined
)

const stageOptions = computed<SelectOption[]>(() =>
  pipelineStore.getStagesByTemplateId(selectedCompany.value?.templateId).map(stage => ({
    label: stage.name,
    value: stage.name
  }))
)

onMounted(() => {
  if (props.interviewId) {
    const interview = interviewStore.getInterviewById(props.interviewId)
    if (interview) {
      form.value = {
        companyId: interview.companyId,
        stage: interview.stage,
        date: new Date(interview.scheduledAt).getTime(),
        startTime: new Date(interview.scheduledAt).getTime(),
        endTime: new Date(interview.endAt).getTime(),
        method: interview.method,
        platform: interview.platform || '',
        meetingId: interview.meetingId || '',
        meetingLink: interview.meetingLink || '',
        location: interview.location || '',
        reminder: interview.reminder
      }
    }
  } else if (props.initialCompanyId) {
    form.value.companyId = props.initialCompanyId
    form.value.stage = pipelineStore.getInitialStageName(selectedCompany.value?.templateId)
  }
})

watch(selectedCompany, (company) => {
  const stages = pipelineStore.getStagesByTemplateId(company?.templateId)
  const hasCurrentStage = stages.some(stage => stage.name === form.value.stage)
  if (!hasCurrentStage) {
    form.value.stage = stages[0]?.name ?? ''
  }
})

function buildDateTimeISO(dateTs: number, timeTs: number): string {
  const d = new Date(dateTs)
  const t = new Date(timeTs)
  d.setHours(t.getHours(), t.getMinutes(), 0, 0)
  return d.toISOString()
}

function handleSave() {
  if (!form.value.companyId || !form.value.stage) {
    message.warning('请选择公司和面试阶段')
    return
  }

  const scheduledAt = buildDateTimeISO(form.value.date, form.value.startTime)
  const endAt = buildDateTimeISO(form.value.date, form.value.endTime)

  const data = {
    companyId: form.value.companyId,
    stage: form.value.stage,
    scheduledAt,
    endAt,
    method: form.value.method,
    platform: form.value.method === 'online' ? form.value.platform : undefined,
    meetingId: form.value.method === 'online' ? form.value.meetingId : undefined,
    meetingLink: form.value.method === 'online' ? form.value.meetingLink : undefined,
    location: form.value.method === 'offline' ? form.value.location : undefined,
    reminder: form.value.reminder,
    content: '',
    result: 'pending' as const
  }

  if (props.interviewId) {
    interviewStore.updateInterview(props.interviewId, data)
    message.success('更新成功')
  } else {
    interviewStore.addInterview(data)
    message.success('添加成功')
  }
  emit('saved')
}
</script>

<template>
  <div>
    <NAlert v-if="conflicts.length > 0" type="error" title="时间冲突" style="margin-bottom: 16px">
      与以下面试时间重叠：
      <span v-for="c in conflicts" :key="c.id">
        {{ companyStore.getCompanyById(c.companyId)?.name }} ({{ formatTime(c.scheduledAt) }}-{{ formatTime(c.endAt) }})
      </span>
    </NAlert>

    <NForm label-placement="left" label-width="80">
      <NFormItem label="公司" required>
        <NSelect v-model:value="form.companyId" :options="companyOptions" placeholder="选择公司" filterable />
      </NFormItem>
      <NFormItem label="阶段" required>
        <NSelect v-model:value="form.stage" :options="stageOptions" placeholder="选择面试阶段" />
      </NFormItem>
      <NFormItem label="日期">
        <NDatePicker v-model:value="form.date" type="date" style="width: 100%" />
      </NFormItem>
      <NFormItem label="开始时间">
        <NTimePicker v-model:value="form.startTime" format="HH:mm" style="width: 100%" />
      </NFormItem>
      <NFormItem label="结束时间">
        <NTimePicker v-model:value="form.endTime" format="HH:mm" style="width: 100%" />
      </NFormItem>
      <NFormItem label="方式">
        <NRadioGroup v-model:value="form.method">
          <NRadio value="online">线上</NRadio>
          <NRadio value="offline">线下</NRadio>
        </NRadioGroup>
      </NFormItem>

      <template v-if="form.method === 'online'">
        <NFormItem label="平台">
          <NInput v-model:value="form.platform" placeholder="如: 腾讯会议" />
        </NFormItem>
        <NFormItem label="会议号">
          <NInput v-model:value="form.meetingId" placeholder="会议号" />
        </NFormItem>
        <NFormItem label="链接">
          <NInput v-model:value="form.meetingLink" placeholder="会议链接" />
        </NFormItem>
      </template>

      <template v-if="form.method === 'offline'">
        <NFormItem label="地点">
          <NInput v-model:value="form.location" placeholder="面试地点" />
        </NFormItem>
      </template>

      <NFormItem label="提醒">
        <NSwitch v-model:value="form.reminder" />
        <span style="margin-left: 8px; font-size: 12px; color: #999">面试前 15 分钟提醒</span>
      </NFormItem>
    </NForm>

    <NSpace justify="end">
      <NButton @click="emit('cancel')">取消</NButton>
      <NButton type="primary" @click="handleSave">
        {{ props.interviewId ? '更新' : '添加' }}
      </NButton>
    </NSpace>
  </div>
</template>
