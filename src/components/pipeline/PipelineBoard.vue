<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import {
  NButton, NIcon, NSpace, NModal, NForm, NFormItem, NInput,
  NDatePicker, NTag, NPopconfirm, NText, NSelect, useMessage
} from 'naive-ui'
import { AddOutline, ChevronForwardOutline, EyeOutline, TrashOutline } from '@vicons/ionicons5'
import { usePipelineStore } from '@/stores/pipeline'
import { useCompanyStore } from '@/stores/company'
import { useInterviewStore } from '@/stores/interview'
import { formatDate, getElapsedText } from '@/utils/time'
import type { Company, StageConfig } from '@/types'
import type { SelectOption } from 'naive-ui'
import { useRouter } from 'vue-router'

const pipelineStore = usePipelineStore()
const companyStore = useCompanyStore()
const interviewStore = useInterviewStore()
const message = useMessage()
const router = useRouter()

const showAddModal = ref(false)
const expandedId = ref<string | null>(null)
const addForm = ref({
  name: '',
  position: '',
  department: '',
  salary: '',
  appliedAt: Date.now(),
  templateId: pipelineStore.defaultTemplateId
})

const templateOptions = computed<SelectOption[]>(() =>
  pipelineStore.templates.map(template => ({
    label: template.name,
    value: template.id
  }))
)

// ---- 列宽可拖拽 ----
interface ColDef {
  key: string
  title: string
  minWidth: number
  fixedWidth: number | null
}

const COL_MIN = 80

const columns = reactive<ColDef[]>([
  { key: 'name',    title: '公司名称', minWidth: COL_MIN, fixedWidth: null },
  { key: 'position', title: '投递岗位', minWidth: COL_MIN, fixedWidth: null },
  { key: 'date',    title: '投递时间', minWidth: COL_MIN, fixedWidth: null },
  { key: 'salary',  title: '薪资待遇', minWidth: COL_MIN, fixedWidth: null },
  { key: 'status',  title: '当前状态', minWidth: COL_MIN, fixedWidth: null },
  { key: 'elapsed', title: '距上次变更', minWidth: COL_MIN, fixedWidth: null },
  { key: 'actions', title: '操作',    minWidth: COL_MIN, fixedWidth: null },
])

function colStyle(col: ColDef) {
  if (col.fixedWidth !== null) {
    return { width: col.fixedWidth + 'px', minWidth: col.minWidth + 'px', flex: 'none' }
  }
  return { flex: '1', minWidth: col.minWidth + 'px' }
}

let resizingIdx = -1
let startX = 0
let startWidth = 0

function onResizeStart(idx: number, e: MouseEvent) {
  e.preventDefault()
  e.stopPropagation()
  resizingIdx = idx
  startX = e.clientX
  const el = (e.target as HTMLElement).parentElement
  startWidth = el ? el.getBoundingClientRect().width : 150
  document.addEventListener('mousemove', onResizeMove)
  document.addEventListener('mouseup', onResizeEnd)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

function onResizeMove(e: MouseEvent) {
  if (resizingIdx < 0) return
  const delta = e.clientX - startX
  columns[resizingIdx].fixedWidth = Math.max(columns[resizingIdx].minWidth, startWidth + delta)
}

function onResizeEnd() {
  resizingIdx = -1
  document.removeEventListener('mousemove', onResizeMove)
  document.removeEventListener('mouseup', onResizeEnd)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

onBeforeUnmount(() => {
  document.removeEventListener('mousemove', onResizeMove)
  document.removeEventListener('mouseup', onResizeEnd)
})

function toggleExpand(id: string) {
  expandedId.value = expandedId.value === id ? null : id
}

function getLastChangeTime(company: Company): string {
  const history = company.statusHistory
  if (history.length > 0) return history[history.length - 1].changedAt
  return company.appliedAt
}

function getTemplateId(company: Company): string {
  return pipelineStore.getTemplateById(company.templateId)?.id ?? pipelineStore.defaultTemplateId
}

function getFlowStages(company: Company) {
  return pipelineStore.getFlowStagesByTemplateId(getTemplateId(company))
}

function getFlowStageIndex(company: Company, stageName: string): number {
  return getFlowStages(company).findIndex(stage => stage.name === stageName)
}

function isNodeActive(company: Company, stageName: string): boolean {
  if (pipelineStore.isTerminal(stageName, company.templateId)) {
    return company.status === stageName
  }
  const currentFlowIdx = getFlowStageIndex(company, company.status)
  const nodeFlowIdx = getFlowStageIndex(company, stageName)
  if (currentFlowIdx >= 0) return nodeFlowIdx <= currentFlowIdx
  if (pipelineStore.isTerminal(company.status, company.templateId)) return true
  return getStageChangeTime(company, stageName) !== null
}

function isNodeCompleted(company: Company, stageName: string): boolean {
  if (pipelineStore.isTerminal(stageName, company.templateId)) return false
  const currentFlowIdx = getFlowStageIndex(company, company.status)
  const nodeFlowIdx = getFlowStageIndex(company, stageName)
  if (currentFlowIdx >= 0) return nodeFlowIdx < currentFlowIdx
  if (pipelineStore.isTerminal(company.status, company.templateId)) return true
  return getStageChangeTime(company, stageName) !== null && company.status !== stageName
}

function getTerminalLayout(company: Company) {
  const terminals = pipelineStore.getTerminalStagesByTemplateId(company.templateId)
  const isInTerminal = pipelineStore.isTerminal(company.status, company.templateId)

  if (isInTerminal) {
    const active = terminals.find(t => t.name === company.status)!
    return { mode: 'linear' as const, linearStage: active, forkStages: [] as StageConfig[], abortStage: null as StageConfig | null }
  }

  const abortStage = terminals.find(t => t.name === '流程终止') ?? null
  const forkStages = terminals.filter(t => t.name !== '流程终止')
  return { mode: 'fork' as const, linearStage: null as StageConfig | null, forkStages, abortStage }
}

function getStageChangeTime(company: Company, stageName: string): string | null {
  if (stageName === pipelineStore.getInitialStageName(company.templateId)) return company.appliedAt
  for (const change of company.statusHistory) {
    if (change.to === stageName) return change.changedAt
  }
  return null
}

function forkCurvePath(count: number, index: number): string {
  const totalH = count * 44
  const midY = totalH / 2
  const nodeY = index * 44 + 22
  return `M 0,${midY} C 28,${midY} 28,${nodeY} 56,${nodeY}`
}

function handleAdd() {
  if (!addForm.value.name || !addForm.value.position) {
    message.warning('请填写公司名称和岗位')
    return
  }
  companyStore.addCompany({
    name: addForm.value.name,
    position: addForm.value.position,
    templateId: addForm.value.templateId,
    department: addForm.value.department || undefined,
    salary: addForm.value.salary || undefined,
    appliedAt: new Date(addForm.value.appliedAt).toISOString()
  })
  showAddModal.value = false
  addForm.value = {
    name: '',
    position: '',
    department: '',
    salary: '',
    appliedAt: Date.now(),
    templateId: pipelineStore.defaultTemplateId
  }
  message.success('添加成功')
}

onMounted(() => {
  addForm.value.templateId = pipelineStore.defaultTemplateId
})

function handleDelete(id: string, e: Event) {
  e.stopPropagation()
  companyStore.removeCompany(id)
}

function goDetail(id: string) {
  router.push(`/company/${id}`)
}
</script>

<template>
  <div class="pipeline-root">
    <NSpace justify="space-between" align="center" style="margin-bottom: 16px; flex-shrink: 0">
      <h2 style="margin: 0; font-size: 20px; font-weight: 700">投递管理</h2>
      <NSpace>
        <NButton type="primary" @click="showAddModal = true">
          <template #icon><NIcon><AddOutline /></NIcon></template>
          添加投递
        </NButton>
      </NSpace>
    </NSpace>

    <div class="table-container">
      <!-- 表头 -->
      <div class="table-header">
        <div
          v-for="(col, idx) in columns"
          :key="col.key"
          class="col"
          :style="colStyle(col)"
        >
          {{ col.title }}
          <span
            class="resize-handle"
            @mousedown="onResizeStart(idx, $event)"
          />
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="companyStore.companies.length === 0" class="empty-state">
        <NText depth="3">暂无投递记录，点击「添加投递」开始</NText>
      </div>

      <!-- 数据行 -->
      <div v-for="company in companyStore.companies" :key="company.id">
        <div
          class="table-row"
          :class="{ expanded: expandedId === company.id }"
          @click="toggleExpand(company.id)"
        >
          <div class="col" :style="colStyle(columns[0])">
            <NIcon
              :size="12"
              class="expand-icon"
              :class="{ rotated: expandedId === company.id }"
            >
              <ChevronForwardOutline />
            </NIcon>
            <NText strong style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap">{{ company.name }}</NText>
          </div>
          <div class="col" :style="colStyle(columns[1])">
            <NText style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap">{{ company.position }}</NText>
          </div>
          <div class="col" :style="colStyle(columns[2])">
            <NText>{{ formatDate(company.appliedAt) }}</NText>
          </div>
          <div class="col" :style="colStyle(columns[3])">
            <NText>{{ company.salary || '-' }}</NText>
          </div>
          <div class="col" :style="colStyle(columns[4])">
            <NTag
              :bordered="false"
              size="small"
              round
              :color="{
                color: pipelineStore.getStageColor(company.status, company.templateId) + '18',
                textColor: pipelineStore.getStageColor(company.status, company.templateId),
                borderColor: 'transparent'
              }"
              style="padding: 10px 10px"
            >
              {{ company.status }}
            </NTag>
          </div>
          <div class="col" :style="colStyle(columns[5])">
            <NText depth="3" style="font-size: 12px">{{ getElapsedText(getLastChangeTime(company)) }}</NText>
          </div>
          <div class="col col-actions" :style="colStyle(columns[6])" @click.stop>
            <NButton size="tiny" secondary type="primary" style="padding: 10px 8px" @click="goDetail(company.id)">
              <template #icon><NIcon :size="14"><EyeOutline /></NIcon></template>
              详情
            </NButton>
            <NPopconfirm @positive-click="(e: MouseEvent) => handleDelete(company.id, e)">
              <template #trigger>
                <NButton size="tiny" quaternary type="error">
                  <template #icon><NIcon :size="14"><TrashOutline /></NIcon></template>
                </NButton>
              </template>
              确定删除「{{ company.name }}」？
            </NPopconfirm>
          </div>
        </div>

        <!-- 展开的时间线 -->
        <Transition name="expand">
          <div v-if="expandedId === company.id" class="timeline-panel">
            <div class="pipeline-timeline">
              <!-- 流程阶段（线性） -->
              <div
                v-for="(stage, idx) in getFlowStages(company)"
                :key="stage.name"
                class="timeline-stage"
              >
                <div
                  v-if="idx > 0"
                  class="timeline-connector"
                  :class="{ active: isNodeActive(company, stage.name) }"
                />
                <div
                  class="timeline-node-group"
                  :class="{ clickable: company.status !== stage.name }"
                  @click.stop="company.status !== stage.name && companyStore.changeStatus(company.id, stage.name)"
                >
                  <div
                    class="timeline-node"
                    :class="{
                      completed: isNodeCompleted(company, stage.name),
                      current: company.status === stage.name
                    }"
                    :style="{
                      background: isNodeActive(company, stage.name) ? stage.color : '#e0e0e0',
                      borderColor: company.status === stage.name ? stage.color : 'transparent',
                      boxShadow: company.status === stage.name ? `0 0 0 4px ${stage.color}30` : 'none'
                    }"
                  >
                    <svg v-if="isNodeCompleted(company, stage.name)" width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5L4.5 7.5L8 3" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </div>
                  <div class="timeline-label" :class="{ active: isNodeActive(company, stage.name) }">
                    {{ stage.name }}
                  </div>
                  <div v-if="getStageChangeTime(company, stage.name)" class="timeline-time">
                    {{ formatDate(getStageChangeTime(company, stage.name)!) }}
                  </div>
                </div>
              </div>

              <!-- 终态：已选终态 → 线性延续 -->
              <template v-if="getTerminalLayout(company).mode === 'linear'">
                <div class="timeline-stage">
                  <div class="timeline-connector active" />
                  <div class="timeline-node-group">
                    <div
                      class="timeline-node current"
                      :style="{
                        background: getTerminalLayout(company).linearStage!.color,
                        borderColor: getTerminalLayout(company).linearStage!.color,
                        boxShadow: `0 0 0 4px ${getTerminalLayout(company).linearStage!.color}30`
                      }"
                    />
                    <div class="timeline-label active">
                      {{ getTerminalLayout(company).linearStage!.name }}
                    </div>
                    <div v-if="getStageChangeTime(company, getTerminalLayout(company).linearStage!.name)" class="timeline-time">
                      {{ formatDate(getStageChangeTime(company, getTerminalLayout(company).linearStage!.name)!) }}
                    </div>
                  </div>
                </div>
              </template>

              <!-- 终态：未选终态 → 曲线分叉 Offer/拒绝 + 间隔 + 流程终止 -->
              <template v-else>
                <div class="timeline-fork-area">
                  <!-- SVG 曲线 -->
                  <svg
                    class="fork-curves"
                    :width="56"
                    :height="getTerminalLayout(company).forkStages.length * 44"
                    :viewBox="`0 0 56 ${getTerminalLayout(company).forkStages.length * 44}`"
                  >
                    <path
                      v-for="(term, tIdx) in getTerminalLayout(company).forkStages"
                      :key="term.name"
                      :d="forkCurvePath(getTerminalLayout(company).forkStages.length, tIdx)"
                      fill="none"
                      stroke="#e0e0e0"
                      stroke-width="2"
                      stroke-linecap="round"
                    />
                  </svg>
                  <!-- 节点列 -->
                  <div class="fork-nodes">
                    <div
                      v-for="term in getTerminalLayout(company).forkStages"
                      :key="term.name"
                      class="timeline-node-group clickable"
                      @click.stop="companyStore.changeStatus(company.id, term.name)"
                    >
                      <div class="timeline-node" :style="{ background: '#e0e0e0' }" />
                      <div class="timeline-label">{{ term.name }}</div>
                    </div>
                  </div>
                </div>

                <template v-if="getTerminalLayout(company).abortStage">
                  <div class="timeline-abort-gap" />
                  <div
                    class="timeline-node-group clickable"
                    style="align-self: center"
                    @click.stop="companyStore.changeStatus(company.id, getTerminalLayout(company).abortStage!.name)"
                  >
                    <div class="timeline-node" :style="{ background: '#e0e0e0' }" />
                    <div class="timeline-label">{{ getTerminalLayout(company).abortStage!.name }}</div>
                  </div>
                </template>
              </template>
            </div>
          </div>
        </Transition>
      </div>
    </div>

    <!-- 添加投递弹窗 -->
    <NModal
      v-model:show="showAddModal"
      preset="card"
      title="添加投递"
      style="width: 460px"
      :bordered="false"
      :mask-closable="true"
    >
      <NForm label-placement="left" label-width="80">
        <NFormItem label="公司名称" required>
          <NInput v-model:value="addForm.name" placeholder="如: 腾讯" />
        </NFormItem>
        <NFormItem label="投递岗位" required>
          <NInput v-model:value="addForm.position" placeholder="如: 前端开发" />
        </NFormItem>
        <NFormItem label="部门">
          <NInput v-model:value="addForm.department" placeholder="如: 微信事业群" />
        </NFormItem>
        <NFormItem label="薪资待遇">
          <NInput v-model:value="addForm.salary" placeholder="如: 20k-30k" />
        </NFormItem>
        <NFormItem label="投递时间">
          <NDatePicker v-model:value="addForm.appliedAt" type="date" style="width: 100%" />
        </NFormItem>
        <NFormItem label="流程模板">
          <NSelect
            v-model:value="addForm.templateId"
            :options="templateOptions"
            placeholder="选择流程模板"
          />
        </NFormItem>
      </NForm>
      <template #footer>
        <NSpace justify="end">
          <NButton @click="showAddModal = false">取消</NButton>
          <NButton type="primary" @click="handleAdd">确定</NButton>
        </NSpace>
      </template>
    </NModal>
  </div>
</template>

<style scoped>
.pipeline-root {
  height: 100%;
  display: flex;
  flex-direction: column;
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
}

.table-container {
  flex: 1;
  min-height: 0;
  background: #fff;
  border-radius: 12px;
  overflow: auto;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
}

.table-header {
  display: flex;
  align-items: center;
  padding: 0 16px 0 4px;
  height: 44px;
  background: #fafafa;
  border-bottom: 1px solid #eee;
  font-size: 13px;
  font-weight: 600;
  color: #666;
  flex-shrink: 0;
}

.table-row {
  display: flex;
  align-items: center;
  padding: 0 16px 0 4px;
  height: 52px;
  border-bottom: 1px solid #f3f3f3;
  cursor: pointer;
  transition: background 0.15s;
  font-size: 14px;
}

.table-row:hover {
  background: #fafbfc;
}

.table-row.expanded {
  background: #f6f8fa;
  border-bottom-color: transparent;
}

.col {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 8px;
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
}

.table-header .col {
  user-select: none;
}

.resize-handle {
  position: absolute;
  right: 0;
  top: 0;
  width: 6px;
  height: 100%;
  cursor: col-resize;
  z-index: 1;
}

.resize-handle::after {
  content: '';
  position: absolute;
  right: 0;
  top: 25%;
  height: 50%;
  width: 2px;
  border-radius: 1px;
  background: transparent;
  transition: background 0.15s;
}

.resize-handle:hover::after {
  background: #c0c4cc;
}

.col-actions {
  gap: 8px;
  overflow: visible;
}

.expand-icon {
  position: absolute;
  left: 16px;
  transition: transform 0.2s;
  color: #999;
  flex-shrink: 0;
}

.expand-icon.rotated {
  transform: rotate(90deg);
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px;
}

/* 时间线面板 */
.timeline-panel {
  padding: 20px 28px 20px 40px;
  background: #f6f8fa;
  border-bottom: 1px solid #eee;
  overflow: hidden;
}

.pipeline-timeline {
  display: flex;
  align-items: center;
  position: relative;
}

.timeline-stage {
  display: flex;
  align-items: center;
}

.timeline-connector {
  width: 60px;
  height: 2px;
  background: #e0e0e0;
  flex-shrink: 0;
  transition: background 0.3s;
}

.timeline-connector.active {
  background: #b0b0b0;
}

.timeline-node-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 56px;
  padding: 4px 6px;
  border-radius: 8px;
  transition: background 0.15s;
}

.timeline-node-group.clickable {
  cursor: pointer;
}

.timeline-node-group.clickable:hover {
  background: rgba(0, 0, 0, 0.04);
}

.timeline-node-group.clickable:hover .timeline-node {
  transform: scale(1.15);
}

.timeline-node {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  flex-shrink: 0;
  border: 2px solid transparent;
}

.timeline-node.current {
  width: 26px;
  height: 26px;
  transform: scale(1.1);
}

.timeline-label {
  margin-top: 8px;
  font-size: 12px;
  color: #bbb;
  white-space: nowrap;
  font-weight: 500;
  transition: color 0.3s;
}

.timeline-label.active {
  color: #333;
}

.timeline-time {
  margin-top: 3px;
  font-size: 11px;
  color: #aaa;
  white-space: nowrap;
}

/* 分叉区域 */
.timeline-fork-area {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.fork-curves {
  flex-shrink: 0;
  display: block;
}

.fork-nodes {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.timeline-abort-gap {
  width: 50px;
  flex-shrink: 0;
}

/* 展开动画 */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.25s ease;
  max-height: 300px;
}

.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
  opacity: 0;
}
</style>
