<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  NCalendar, NSpace, NButton, NIcon, NText, NTag, NModal, NBadge, NEmpty
} from 'naive-ui'
import { AddOutline } from '@vicons/ionicons5'
import { useInterviewStore } from '@/stores/interview'
import { useCompanyStore } from '@/stores/company'
import { usePipelineStore } from '@/stores/pipeline'
import { formatTime, toDateString } from '@/utils/time'
import InterviewForm from '@/components/interview/InterviewForm.vue'
import InterviewDetail from '@/components/interview/InterviewDetail.vue'

const interviewStore = useInterviewStore()
const companyStore = useCompanyStore()
const pipelineStore = usePipelineStore()

const selectedDate = ref<string>(toDateString(new Date()))
const showAddModal = ref(false)
const showDetailModal = ref(false)
const selectedInterviewId = ref<string>('')
const editingInterview = ref<string | null>(null)

const todayInterviews = computed(() => {
  return interviewStore.interviews
    .filter(i => i.scheduledAt.startsWith(selectedDate.value))
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
})

function getInterviewStageColor(companyId: string, stageName: string) {
  const templateId = companyStore.getCompanyById(companyId)?.templateId
  return pipelineStore.getStageColor(stageName, templateId)
}

function getCompanyName(companyId: string) {
  return companyStore.getCompanyById(companyId)?.name ?? '未知公司'
}

function handleDateSelect(timestamp: number) {
  selectedDate.value = toDateString(new Date(timestamp))
}

function handleAddInterview() {
  editingInterview.value = null
  showAddModal.value = true
}

function handleEditInterview(id: string) {
  editingInterview.value = id
  showAddModal.value = true
}

function handleViewDetail(id: string) {
  selectedInterviewId.value = id
  showDetailModal.value = true
}

function getDateInterviewCount(timestamp: number): number {
  const dateStr = toDateString(new Date(timestamp))
  return interviewStore.interviews.filter(i => i.scheduledAt.startsWith(dateStr)).length
}
</script>

<template>
  <div style="display: flex; gap: 20px; height: 100%">
    <div style="flex: 1; min-width: 0; background: #fff; border-radius: 12px; padding: 16px; box-sizing: border-box; box-shadow: 0 1px 3px rgba(0,0,0,0.06); overflow: hidden">
      <NCalendar
        :value="new Date(selectedDate).getTime()"
        @update:value="handleDateSelect"
        #="{ year, month, date }"
      >
        <div v-if="getDateInterviewCount(new Date(year, month - 1, date).getTime()) > 0" style="display: flex; justify-content: flex-end; margin-top: 2px">
          <NBadge
            :value="getDateInterviewCount(new Date(year, month - 1, date).getTime())"
            type="info"
            :max="9"
          />
        </div>
      </NCalendar>
    </div>

    <div style="width: 360px; flex-shrink: 0; background: #fff; border-radius: 12px; padding: 20px; box-sizing: border-box; box-shadow: 0 1px 3px rgba(0,0,0,0.06); display: flex; flex-direction: column; overflow: hidden">
      <NSpace justify="space-between" align="center" style="margin-bottom: 16px; flex-shrink: 0">
        <NText strong style="font-size: 16px">{{ selectedDate }} 面试</NText>
        <NButton type="primary" size="small" @click="handleAddInterview">
          <template #icon><NIcon><AddOutline /></NIcon></template>
          新增
        </NButton>
      </NSpace>

      <div v-if="todayInterviews.length === 0" style="flex: 1; display: flex; align-items: center; justify-content: center">
        <NEmpty description="当天没有面试安排" />
      </div>

      <div v-else style="flex: 1; overflow-y: auto">
        <div
          v-for="interview in todayInterviews"
          :key="interview.id"
          class="interview-item"
          @click="handleViewDetail(interview.id)"
        >
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px">
            <NText strong>{{ getCompanyName(interview.companyId) }}</NText>
            <NTag
              size="small"
              round
              :bordered="false"
              :color="{
                color: getInterviewStageColor(interview.companyId, interview.stage) + '18',
                textColor: getInterviewStageColor(interview.companyId, interview.stage)
              }"
            >
              {{ interview.stage }}
            </NTag>
          </div>
          <NSpace :size="12">
            <NText depth="3" style="font-size: 12px">
              {{ formatTime(interview.scheduledAt) }} - {{ formatTime(interview.endAt) }}
            </NText>
            <NTag size="tiny" :bordered="false" :type="interview.method === 'online' ? 'info' : 'warning'">
              {{ interview.method === 'online' ? '线上' : '线下' }}
            </NTag>
          </NSpace>
          <NText v-if="interview.method === 'online' && interview.platform" depth="3" style="font-size: 12px; display: block; margin-top: 2px">
            {{ interview.platform }}{{ interview.meetingId ? ` | ${interview.meetingId}` : '' }}
          </NText>
          <NText v-if="interview.method === 'offline' && interview.location" depth="3" style="font-size: 12px; display: block; margin-top: 2px">
            📍 {{ interview.location }}
          </NText>
          <NSpace style="margin-top: 6px" :size="4">
            <NButton text size="tiny" type="primary" @click.stop="handleEditInterview(interview.id)">编辑</NButton>
            <NButton text size="tiny" type="error" @click.stop="interviewStore.removeInterview(interview.id)">删除</NButton>
          </NSpace>
        </div>
      </div>

      <div v-if="interviewStore.suggestTimeSlots(selectedDate).length > 0" style="margin-top: 12px; flex-shrink: 0; border-top: 1px solid #eee; padding-top: 12px">
        <NText depth="3" style="font-size: 12px; margin-bottom: 6px; display: block">推荐空闲时段</NText>
        <NSpace :size="6">
          <NTag
            v-for="(slot, idx) in interviewStore.suggestTimeSlots(selectedDate).slice(0, 3)"
            :key="idx"
            size="small"
            round
            :bordered="false"
            type="success"
          >
            {{ formatTime(slot.start) }} - {{ formatTime(slot.end) }}
          </NTag>
        </NSpace>
      </div>
    </div>

    <NModal
      v-model:show="showAddModal"
      preset="card"
      :title="editingInterview ? '编辑面试' : '新增面试'"
      style="width: 520px"
      :bordered="false"
    >
      <InterviewForm
        :date="selectedDate"
        :interview-id="editingInterview"
        @saved="showAddModal = false"
        @cancel="showAddModal = false"
      />
    </NModal>

    <NModal
      v-model:show="showDetailModal"
      preset="card"
      title="面试详情"
      style="width: 640px"
      :bordered="false"
    >
      <InterviewDetail
        v-if="selectedInterviewId"
        :interview-id="selectedInterviewId"
      />
    </NModal>
  </div>
</template>

<style scoped>
.interview-item {
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 8px;
  background: #fafafa;
  cursor: pointer;
  transition: background 0.2s;
}
.interview-item:hover {
  background: #f0f0f0;
}
</style>
