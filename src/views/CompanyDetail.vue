<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NPageHeader, NSpace, NButton, NIcon, NTag, NCard, NText,
  NTimeline, NTimelineItem, NDescriptions, NDescriptionsItem,
  NInput, NSelect, NModal, NEmpty, NDivider, NPopconfirm, useMessage
} from 'naive-ui'
import type { SelectOption } from 'naive-ui'
import {
  ArrowBackOutline, CreateOutline, TrashOutline, AddOutline
} from '@vicons/ionicons5'
import { useCompanyStore } from '@/stores/company'
import { useInterviewStore } from '@/stores/interview'
import { usePipelineStore } from '@/stores/pipeline'
import { formatDateTime, formatDate, timeAgo } from '@/utils/time'
import StatusTag from '@/components/common/StatusTag.vue'
import TimeElapsed from '@/components/common/TimeElapsed.vue'
import InterviewForm from '@/components/interview/InterviewForm.vue'
import InterviewRecord from '@/components/interview/InterviewRecord.vue'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const companyStore = useCompanyStore()
const interviewStore = useInterviewStore()
const pipelineStore = usePipelineStore()

const companyId = computed(() => route.params.id as string)
const company = computed(() => companyStore.getCompanyById(companyId.value))
const companyInterviews = computed(() =>
  interviewStore.getInterviewsByCompany(companyId.value)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
)

const editing = ref(false)
const editForm = ref({ name: '', position: '', department: '', salary: '', notes: '' })
const showAddInterview = ref(false)
const showStatusChange = ref(false)
const newStatus = ref('')
const expandedInterview = ref<string | null>(null)

const stageOptions = computed<SelectOption[]>(() =>
  pipelineStore.getStagesByTemplateId(company.value?.templateId).map(stage => ({
    label: stage.name,
    value: stage.name
  }))
)

const templateName = computed(() =>
  company.value ? pipelineStore.getTemplateName(company.value.templateId) : ''
)

onMounted(() => {
  if (company.value) {
    editForm.value = {
      name: company.value.name,
      position: company.value.position,
      department: company.value.department || '',
      salary: company.value.salary || '',
      notes: company.value.notes || ''
    }
  }
})

function startEdit() {
  if (!company.value) return
  editForm.value = {
    name: company.value.name,
    position: company.value.position,
    department: company.value.department || '',
    salary: company.value.salary || '',
    notes: company.value.notes || ''
  }
  editing.value = true
}

function saveEdit() {
  companyStore.updateCompany(companyId.value, {
    name: editForm.value.name,
    position: editForm.value.position,
    department: editForm.value.department || undefined,
    salary: editForm.value.salary || undefined,
    notes: editForm.value.notes
  })
  editing.value = false
  message.success('已保存')
}

function handleStatusChange() {
  if (!newStatus.value) return
  companyStore.changeStatus(companyId.value, newStatus.value)
  showStatusChange.value = false
  message.success(`状态已更新为「${newStatus.value}」`)
}

function handleDelete() {
  companyStore.removeCompany(companyId.value)
  router.push('/')
}

function getResultLabel(result?: string) {
  switch (result) {
    case 'pass': return '通过'
    case 'fail': return '未通过'
    default: return '待定'
  }
}

function getResultType(result?: string) {
  switch (result) {
    case 'pass': return 'success' as const
    case 'fail': return 'error' as const
    default: return 'default' as const
  }
}

function getStageTagColor(stageName: string) {
  return pipelineStore.getStageColor(stageName, company.value?.templateId)
}

function getTimelineItemType(stageName: string) {
  if (!company.value) return 'info' as const
  if (!pipelineStore.isTerminal(stageName, company.value.templateId)) return 'info' as const
  if (stageName.includes('拒') || stageName.includes('终止') || stageName.includes('淘汰')) {
    return 'error' as const
  }
  return 'success' as const
}

function toggleResult(interviewId: string) {
  const interview = interviewStore.getInterviewById(interviewId)
  if (!interview) return
  const cycle: Record<string, string> = { pending: 'pass', pass: 'fail', fail: 'pending' }
  const next = cycle[interview.result || 'pending'] || 'pending'
  interviewStore.updateInterview(interviewId, { result: next as 'pass' | 'fail' | 'pending' })
}
</script>

<template>
  <div style="padding: 0 24px; max-width: 900px; margin: 0 auto; height: 100%; box-sizing: border-box; overflow-y: auto" v-if="company">
    <NPageHeader @back="router.push('/')">
      <template #title>
        <NSpace align="center" :size="12">
          <span>{{ company.name }}</span>
          <StatusTag :stage="company.status" :template-id="company.templateId" />
          <NTag size="small" :bordered="false" type="default">{{ templateName }}</NTag>
        </NSpace>
      </template>
      <template #extra>
        <NSpace>
          <NButton secondary size="small" @click="showStatusChange = true">切换状态</NButton>
          <NButton secondary size="small" @click="startEdit">
            <template #icon><NIcon><CreateOutline /></NIcon></template>
            编辑
          </NButton>
          <NPopconfirm @positive-click="handleDelete">
            <template #trigger>
              <NButton secondary size="small" type="error">
                <template #icon><NIcon><TrashOutline /></NIcon></template>
                删除
              </NButton>
            </template>
            确定删除「{{ company.name }}」？相关面试记录也将被删除。
          </NPopconfirm>
        </NSpace>
      </template>
    </NPageHeader>

    <!-- 基本信息 -->
    <NCard title="基本信息" size="small" style="margin-top: 20px" :bordered="false">
      <template v-if="!editing">
        <NDescriptions label-placement="left" :column="2" bordered>
          <NDescriptionsItem label="投递岗位">{{ company.position }}</NDescriptionsItem>
          <NDescriptionsItem label="部门">{{ company.department || '-' }}</NDescriptionsItem>
          <NDescriptionsItem label="流程模板">{{ templateName }}</NDescriptionsItem>
          <NDescriptionsItem label="薪资待遇">{{ company.salary || '-' }}</NDescriptionsItem>
          <NDescriptionsItem label="投递时间">{{ formatDate(company.appliedAt) }}</NDescriptionsItem>
          <NDescriptionsItem label="已过">
            <TimeElapsed :iso-string="company.appliedAt" />
          </NDescriptionsItem>
          <NDescriptionsItem label="备注" :span="2">{{ company.notes || '无' }}</NDescriptionsItem>
        </NDescriptions>
      </template>
      <template v-else>
        <NSpace vertical :size="12">
          <NInput v-model:value="editForm.name" placeholder="公司名称" />
          <NInput v-model:value="editForm.position" placeholder="投递岗位" />
          <NInput v-model:value="editForm.department" placeholder="部门" />
          <NInput v-model:value="editForm.salary" placeholder="薪资待遇，如 20k-30k" />
          <NInput v-model:value="editForm.notes" type="textarea" placeholder="备注" :rows="3" />
          <NSpace>
            <NButton type="primary" @click="saveEdit">保存</NButton>
            <NButton @click="editing = false">取消</NButton>
          </NSpace>
        </NSpace>
      </template>
    </NCard>

    <!-- 状态时间线 -->
    <NCard title="状态变更记录" size="small" style="margin-top: 16px" :bordered="false">
      <NTimeline>
        <NTimelineItem
          type="info"
          :title="'投递简历'"
          :time="formatDateTime(company.appliedAt)"
        />
        <NTimelineItem
          v-for="change in company.statusHistory"
          :key="change.changedAt"
          :type="getTimelineItemType(change.to)"
          :title="`${change.from} → ${change.to}`"
          :time="formatDateTime(change.changedAt)"
        />
      </NTimeline>
    </NCard>

    <!-- 面试列表 -->
    <NCard size="small" style="margin-top: 16px" :bordered="false">
      <template #header>
        <NSpace justify="space-between" align="center">
          <span>面试记录</span>
          <NButton type="primary" size="small" @click="showAddInterview = true">
            <template #icon><NIcon><AddOutline /></NIcon></template>
            添加面试
          </NButton>
        </NSpace>
      </template>

      <NEmpty v-if="companyInterviews.length === 0" description="暂无面试记录" />

      <div v-for="interview in companyInterviews" :key="interview.id" class="interview-card">
        <NSpace justify="space-between" align="center" @click="expandedInterview = expandedInterview === interview.id ? null : interview.id" style="cursor: pointer">
          <NSpace align="center" :size="8">
            <NTag
              size="small"
              round
              :bordered="false"
              :color="{
                color: getStageTagColor(interview.stage) + '18',
                textColor: getStageTagColor(interview.stage)
              }"
            >
              {{ interview.stage }}
            </NTag>
            <NText>{{ formatDateTime(interview.scheduledAt) }}</NText>
            <NTag size="tiny" :bordered="false" :type="interview.method === 'online' ? 'info' : 'warning'">
              {{ interview.method === 'online' ? '线上' : '线下' }}
            </NTag>
          </NSpace>
          <NSpace align="center" :size="8">
            <NTag
              size="small"
              :type="getResultType(interview.result)"
              style="cursor: pointer"
              @click.stop="toggleResult(interview.id)"
            >
              {{ getResultLabel(interview.result) }}
            </NTag>
            <NButton text size="tiny" type="error" @click.stop="interviewStore.removeInterview(interview.id)">删除</NButton>
          </NSpace>
        </NSpace>

        <div v-if="expandedInterview === interview.id" style="margin-top: 12px">
          <div v-if="interview.method === 'online'" style="margin-bottom: 8px">
            <NText depth="3" style="font-size: 12px">
              {{ interview.platform }}
              {{ interview.meetingId ? `| 会议号: ${interview.meetingId}` : '' }}
            </NText>
          </div>
          <div v-if="interview.method === 'offline' && interview.location" style="margin-bottom: 8px">
            <NText depth="3" style="font-size: 12px">📍 {{ interview.location }}</NText>
          </div>
          <NDivider style="margin: 8px 0">面试内容记录</NDivider>
          <InterviewRecord :interview-id="interview.id" />
        </div>
      </div>
    </NCard>

    <!-- 切换状态 Modal -->
    <NModal v-model:show="showStatusChange" preset="card" title="切换状态" style="width: 360px" :bordered="false">
      <NSelect v-model:value="newStatus" :options="stageOptions" placeholder="选择新状态" />
      <template #footer>
        <NSpace justify="end">
          <NButton @click="showStatusChange = false">取消</NButton>
          <NButton type="primary" @click="handleStatusChange">确定</NButton>
        </NSpace>
      </template>
    </NModal>

    <!-- 新增面试 Modal -->
    <NModal v-model:show="showAddInterview" preset="card" title="新增面试" style="width: 520px" :bordered="false">
      <InterviewForm
        :date="new Date().toISOString().substring(0, 10)"
        :initial-company-id="company.id"
        @saved="showAddInterview = false"
        @cancel="showAddInterview = false"
      />
    </NModal>
  </div>

  <div v-else style="padding: 60px; text-align: center">
    <NEmpty description="未找到该公司">
      <template #extra>
        <NButton @click="router.push('/')">返回看板</NButton>
      </template>
    </NEmpty>
  </div>
</template>

<style scoped>
.interview-card {
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 8px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
}
</style>
