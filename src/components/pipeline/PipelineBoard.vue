<script setup lang="ts">
import { h, ref, reactive, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import {
  NButton, NIcon, NInput, NDatePicker, NTag,
  NPopconfirm, NText, NSelect, useMessage
} from 'naive-ui'
import {
  AddOutline, ChevronForwardOutline, EyeOutline, TrashOutline,
  CheckmarkOutline, CloseOutline
} from '@vicons/ionicons5'
import { usePipelineStore } from '@/stores/pipeline'
import { useCompanyStore } from '@/stores/company'
import { formatDate, getElapsedText } from '@/utils/time'
import type { Company, StageConfig } from '@/types'
import type { SelectOption } from 'naive-ui'
import { useRouter } from 'vue-router'

const pipelineStore = usePipelineStore()
const companyStore = useCompanyStore()
const message = useMessage()
const router = useRouter()

const expandedId = ref<string | null>(null)

// ---- 填满一页 ----
const ROW_HEIGHT = 52
const HEADER_HEIGHT = 44
const tableRef = ref<HTMLElement>()
const visibleRowCount = ref(15)

const emptyRowCount = computed(() =>
  Math.max(1, visibleRowCount.value - companyStore.companies.length)
)

function updateVisibleRows() {
  if (tableRef.value) {
    const h = tableRef.value.clientHeight
    visibleRowCount.value = Math.max(5, Math.floor((h - HEADER_HEIGHT) / ROW_HEIGHT))
  }
}

// ---- 行内编辑 ----
const editingRowIdx = ref<number | null>(null)
const editForm = reactive({
  name: '',
  position: '',
  salary: '',
  appliedAt: Date.now(),
  templateId: pipelineStore.defaultTemplateId,
  status: pipelineStore.getInitialStageName(pipelineStore.defaultTemplateId)
})

const templateOptions = computed<SelectOption[]>(() =>
  pipelineStore.templates.map(t => ({ label: t.name, value: t.id }))
)

const statusOptions = computed<SelectOption[]>(() =>
  pipelineStore.getStagesByTemplateId(editForm.templateId).map(s => ({
    label: s.name,
    value: s.name,
    color: s.color
  }))
)

function renderStatusTag(option: SelectOption) {
  const color = String(option.color ?? '#999')
  return h(
    NTag,
    {
      bordered: false,
      size: 'small',
      round: true,
      style: {
        maxWidth: '100%',
        padding: '0 8px'
      },
      color: {
        color: `${color}18`,
        textColor: color,
        borderColor: 'transparent'
      }
    },
    { default: () => String(option.label ?? '') }
  )
}

watch(() => editForm.templateId, (newId) => {
  editForm.status = pipelineStore.getInitialStageName(newId)
})

function activateNewRow(idx: number) {
  if (editingRowIdx.value !== null && editingRowIdx.value !== idx) {
    autoSaveIfValid()
  }
  editingRowIdx.value = idx
  Object.assign(editForm, {
    name: '', position: '', salary: '', appliedAt: Date.now(),
    templateId: pipelineStore.defaultTemplateId,
    status: pipelineStore.getInitialStageName(pipelineStore.defaultTemplateId)
  })
  nextTick(() => {
    const input = tableRef.value?.querySelector('.editing-row .cell-input input') as HTMLInputElement
    input?.focus()
  })
}

function autoSaveIfValid() {
  if (editForm.name.trim() && editForm.position.trim()) {
    doCommit()
  } else {
    editingRowIdx.value = null
  }
}

function doCommit() {
  if (!editForm.name.trim() || !editForm.position.trim()) {
    message.warning('请填写公司名称和岗位')
    return
  }
  companyStore.addCompany({
    name: editForm.name.trim(),
    position: editForm.position.trim(),
    salary: editForm.salary.trim() || undefined,
    templateId: editForm.templateId,
    status: editForm.status,
    appliedAt: new Date(editForm.appliedAt).toISOString()
  })
  message.success('添加成功')
  editingRowIdx.value = null
}

function cancelEdit() {
  editingRowIdx.value = null
}

function onEditKeydown(e: KeyboardEvent, field: 'name' | 'position' | 'salary') {
  if (e.isComposing) return
  if (e.key === 'Enter') {
    e.preventDefault()
    if (field === 'salary') {
      doCommit()
    } else {
      const inputs = tableRef.value?.querySelectorAll('.editing-row .cell-input input')
      if (inputs) {
        const nextIdx = field === 'name' ? 1 : 2
        ;(inputs[nextIdx] as HTMLInputElement)?.focus()
      }
    }
  } else if (e.key === 'Escape') {
    e.preventDefault()
    cancelEdit()
  }
}

// ---- 列宽可拖拽 ----
interface ColDef {
  key: string
  title: string
  minWidth: number
  fixedWidth: number | null
  flex: number
}

const COL_MIN = 80
const COLUMN_WIDTHS_STORAGE_KEY = 'od-pipeline-column-widths'

const columns = reactive<ColDef[]>([
  { key: 'name',    title: '公司名称', minWidth: 130, fixedWidth: null, flex: 1.6 },
  { key: 'position', title: '投递岗位', minWidth: COL_MIN, fixedWidth: null, flex: 1 },
  { key: 'date',    title: '投递时间', minWidth: COL_MIN, fixedWidth: null, flex: 1 },
  { key: 'salary',  title: '薪资待遇', minWidth: 100, fixedWidth: null, flex: 0.95 },
  { key: 'status',  title: '当前状态', minWidth: 84, fixedWidth: null, flex: 0.8 },
  { key: 'elapsed', title: '距上次变更', minWidth: COL_MIN, fixedWidth: null, flex: 1 },
  { key: 'actions', title: '操作',    minWidth: COL_MIN, fixedWidth: null, flex: 1 },
])

function colStyle(col: ColDef) {
  if (col.fixedWidth !== null) {
    return { width: col.fixedWidth + 'px', minWidth: col.minWidth + 'px', flex: 'none' }
  }
  return { flex: String(col.flex), minWidth: col.minWidth + 'px' }
}

function loadSavedColumnWidths() {
  try {
    const raw = localStorage.getItem(COLUMN_WIDTHS_STORAGE_KEY)
    if (!raw) return

    const saved = JSON.parse(raw) as Record<string, number>
    for (const col of columns) {
      const width = saved[col.key]
      if (typeof width === 'number' && Number.isFinite(width)) {
        col.fixedWidth = Math.max(col.minWidth, width)
      }
    }
  } catch {
    localStorage.removeItem(COLUMN_WIDTHS_STORAGE_KEY)
  }
}

function persistColumnWidths() {
  const payload: Record<string, number> = {}
  for (const col of columns) {
    if (col.fixedWidth !== null) {
      payload[col.key] = col.fixedWidth
    }
  }
  localStorage.setItem(COLUMN_WIDTHS_STORAGE_KEY, JSON.stringify(payload))
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
  if (resizingIdx >= 0) {
    persistColumnWidths()
  }
  resizingIdx = -1
  document.removeEventListener('mousemove', onResizeMove)
  document.removeEventListener('mouseup', onResizeEnd)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

// ---- 数据行逻辑 ----
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

function handleDelete(id: string, e: Event) {
  e.stopPropagation()
  companyStore.removeCompany(id)
}

function goDetail(id: string) {
  router.push(`/company/${id}`)
}

// ---- 生命周期 ----
let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  loadSavedColumnWidths()
  updateVisibleRows()
  if (tableRef.value) {
    resizeObserver = new ResizeObserver(updateVisibleRows)
    resizeObserver.observe(tableRef.value)
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  document.removeEventListener('mousemove', onResizeMove)
  document.removeEventListener('mouseup', onResizeEnd)
})
</script>

<template>
  <div class="pipeline-root">
    <div style="margin-bottom: 16px; flex-shrink: 0">
      <h2 style="margin: 0; font-size: 20px; font-weight: 700">投递管理</h2>
    </div>

    <div class="table-container" ref="tableRef">
      <!-- 表头 -->
      <div class="table-header">
        <div
          v-for="(col, idx) in columns"
          :key="col.key"
          class="col"
          :style="colStyle(col)"
        >
          {{ col.key === 'elapsed' && editingRowIdx !== null ? '流程模板' : col.title }}
          <span
            v-if="idx < columns.length - 1"
            class="resize-handle"
            @mousedown="onResizeStart(idx, $event)"
          />
        </div>
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
            <NText strong class="company-name-text">{{ company.name }}</NText>
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

              <!-- 终态：未选终态 → 曲线分叉 -->
              <template v-else>
                <div class="timeline-fork-area">
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

      <!-- 空行 / 行内编辑行 -->
      <template v-for="i in emptyRowCount" :key="'empty-' + i">
        <!-- 正在编辑的行 -->
        <div
          v-if="editingRowIdx === i - 1"
          class="table-row editing-row"
          @click.stop
        >
          <div class="col" :style="colStyle(columns[0])">
            <NInput
              v-model:value="editForm.name"
              size="small"
              placeholder="公司名称"
              class="cell-input"
              @keydown="(e: KeyboardEvent) => onEditKeydown(e, 'name')"
            />
          </div>
          <div class="col" :style="colStyle(columns[1])">
            <NInput
              v-model:value="editForm.position"
              size="small"
              placeholder="投递岗位"
              class="cell-input"
              @keydown="(e: KeyboardEvent) => onEditKeydown(e, 'position')"
            />
          </div>
          <div class="col" :style="colStyle(columns[2])">
            <NDatePicker
              v-model:value="editForm.appliedAt"
              size="small"
              type="date"
              style="width: 100%"
            />
          </div>
          <div class="col" :style="colStyle(columns[3])">
            <NInput
              v-model:value="editForm.salary"
              size="small"
              placeholder="25k*16"
              class="cell-input"
              @keydown="(e: KeyboardEvent) => onEditKeydown(e, 'salary')"
            />
          </div>
          <div class="col" :style="colStyle(columns[4])">
            <NSelect
              v-model:value="editForm.status"
              size="small"
              :options="statusOptions"
              :render-label="(option: SelectOption) => renderStatusTag(option)"
              :render-tag="({ option }) => renderStatusTag(option)"
              style="width: 100%"
            />
          </div>
          <div class="col" :style="colStyle(columns[5])">
            <NSelect
              v-model:value="editForm.templateId"
              size="small"
              :options="templateOptions"
              style="width: 100%"
            />
          </div>
          <div class="col col-actions" :style="colStyle(columns[6])">
            <NButton size="tiny" type="primary" secondary style="padding: 10px 8px" @click="doCommit">
              <template #icon><NIcon :size="14"><CheckmarkOutline /></NIcon></template>
              确定
            </NButton>
            <NButton size="tiny" quaternary @click="cancelEdit">
              <template #icon><NIcon :size="14"><CloseOutline /></NIcon></template>
            </NButton>
          </div>
        </div>

        <!-- 空占位行 -->
        <div
          v-else
          class="table-row empty-row"
          :class="{ 'empty-row-active': i === 1 }"
          @click="i === 1 && activateNewRow(0)"
        >
          <div class="col" :style="colStyle(columns[0])">
            <span v-if="i === 1" class="placeholder-hint">
              <NIcon :size="12" style="margin-right: 4px"><AddOutline /></NIcon>
              点击添加投递…
            </span>
          </div>
          <div v-for="col in columns.slice(1)" :key="col.key" class="col" :style="colStyle(col)" />
        </div>
      </template>
    </div>
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
  width: 4px;
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
  width: 1px;
  border-radius: 1px;
  background: #d6d9de;
  transition: background 0.15s;
}

.resize-handle:hover::after {
  background: #8f96a3;
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

.company-name-text {
  display: block;
  width: 100%;
  padding: 0 24px;
  box-sizing: border-box;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
}

/* 空行 */
.empty-row {
  cursor: default;
  border-bottom: 1px solid #f8f8f8;
}

.empty-row-active {
  cursor: pointer;
}

.empty-row-active:hover {
  background: #fafbfc;
}

.empty-row-active:hover .placeholder-hint {
  opacity: 1;
}

.placeholder-hint {
  display: flex;
  align-items: center;
  font-size: 13px;
  color: #bbb;
  opacity: 0.7;
  transition: opacity 0.15s;
  white-space: nowrap;
  padding-left: 28px;
}

/* 编辑行 */
.editing-row {
  background: #f0f7ff;
  border-bottom: 1px solid #d6e4f0;
  cursor: default;
}

.editing-row:hover {
  background: #f0f7ff;
}

.cell-input {
  width: 100%;
}

.editing-row :deep(.n-input .n-input__input) {
  text-align: center;
}

.editing-row :deep(.n-input) {
  --n-border-radius: 6px !important;
}

.editing-row :deep(.n-base-selection) {
  --n-border-radius: 6px !important;
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
