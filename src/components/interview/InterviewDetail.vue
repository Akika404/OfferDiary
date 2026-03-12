<script setup lang="ts">
import { computed } from 'vue'
import { NDescriptions, NDescriptionsItem, NTag, NText, NButton, NDivider, NSpace } from 'naive-ui'
import { useInterviewStore } from '@/stores/interview'
import { useCompanyStore } from '@/stores/company'
import { usePipelineStore } from '@/stores/pipeline'
import { formatDateTime } from '@/utils/time'
import InterviewRecord from './InterviewRecord.vue'

const props = defineProps<{ interviewId: string }>()

const interviewStore = useInterviewStore()
const companyStore = useCompanyStore()
const pipelineStore = usePipelineStore()

const interview = computed(() => interviewStore.getInterviewById(props.interviewId))
const company = computed(() => interview.value ? companyStore.getCompanyById(interview.value.companyId) : null)

function getStageColor(stageName: string) {
  return pipelineStore.getStageColor(stageName, company.value?.templateId)
}

function openMeetingLink() {
  if (interview.value?.meetingLink) {
    window.open(interview.value.meetingLink, '_blank')
  }
}
</script>

<template>
  <div v-if="interview">
    <NDescriptions label-placement="left" :column="2" bordered>
      <NDescriptionsItem label="公司">
        {{ company?.name ?? '未知' }}
      </NDescriptionsItem>
      <NDescriptionsItem label="岗位">
        {{ company?.position ?? '-' }}
      </NDescriptionsItem>
      <NDescriptionsItem label="面试阶段">
        <NTag
          size="small"
          round
          :bordered="false"
          :color="{
            color: getStageColor(interview.stage) + '18',
            textColor: getStageColor(interview.stage)
          }"
        >
          {{ interview.stage }}
        </NTag>
      </NDescriptionsItem>
      <NDescriptionsItem label="面试方式">
        <NTag size="small" :type="interview.method === 'online' ? 'info' : 'warning'">
          {{ interview.method === 'online' ? '线上' : '线下' }}
        </NTag>
      </NDescriptionsItem>
      <NDescriptionsItem label="开始时间">
        {{ formatDateTime(interview.scheduledAt) }}
      </NDescriptionsItem>
      <NDescriptionsItem label="结束时间">
        {{ formatDateTime(interview.endAt) }}
      </NDescriptionsItem>
      <NDescriptionsItem v-if="interview.method === 'online' && interview.platform" label="会议平台">
        {{ interview.platform }}
      </NDescriptionsItem>
      <NDescriptionsItem v-if="interview.method === 'online' && interview.meetingId" label="会议号">
        {{ interview.meetingId }}
      </NDescriptionsItem>
      <NDescriptionsItem v-if="interview.method === 'online' && interview.meetingLink" label="会议链接" :span="2">
        <NSpace align="center">
          <NText>{{ interview.meetingLink }}</NText>
          <NButton text type="primary" size="small" @click="openMeetingLink">打开</NButton>
        </NSpace>
      </NDescriptionsItem>
      <NDescriptionsItem v-if="interview.method === 'offline' && interview.location" label="面试地点" :span="2">
        {{ interview.location }}
      </NDescriptionsItem>
    </NDescriptions>

    <NDivider>面试记录</NDivider>
    <InterviewRecord :interview-id="interview.id" />
  </div>
</template>
