<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  NCard, NSpace, NButton, NInput, NIcon, NText,
  NColorPicker, NPopconfirm, NTag, NModal, NEmpty, NPopover, useMessage
} from 'naive-ui'
import { AddOutline, TrashOutline, MenuOutline } from '@vicons/ionicons5'
import { VueDraggable } from 'vue-draggable-plus'
import { usePipelineStore } from '@/stores/pipeline'
import { useCompanyStore } from '@/stores/company'
import type { PipelineTemplate, StageConfig } from '@/types'
import { DEFAULT_STAGES } from '@/types'

type SettingsSection = 'appearance' | 'pipeline-templates'

const pipelineStore = usePipelineStore()
const companyStore = useCompanyStore()
const message = useMessage()

const activeSection = ref<SettingsSection>('pipeline-templates')
const localTemplates = ref<PipelineTemplate[]>([])
const localDefaultTemplateId = ref('')
const activeTemplateId = ref('')
const showCreateTemplateModal = ref(false)
const showEditTemplateModal = ref(false)
const newTemplateName = ref('')

const sectionItems: Array<{ key: SettingsSection; label: string }> = [
  { key: 'appearance', label: '外观' },
  { key: 'pipeline-templates', label: '流程模板管理' }
]

const currentTemplate = computed(() =>
  localTemplates.value.find(template => template.id === activeTemplateId.value) ?? null
)

const draggableFlowStages = computed({
  get(): StageConfig[] {
    return currentTemplate.value?.stages.filter(stage => !stage.terminal) ?? []
  },
  set(newOrder: StageConfig[]) {
    if (!currentTemplate.value) return
    const terminals = currentTemplate.value.stages.filter(s => s.terminal)
    currentTemplate.value.stages = [...newOrder, ...terminals]
  }
})

const flowStages = computed(() => draggableFlowStages.value)

const terminalStages = computed(() =>
  currentTemplate.value?.stages.filter(stage => stage.terminal) ?? []
)

function cloneStages(stages: StageConfig[]) {
  return stages.map(stage => ({ ...stage }))
}

function cloneTemplate(template: PipelineTemplate): PipelineTemplate {
  return {
    ...template,
    stages: cloneStages(template.stages)
  }
}

function syncLocalState() {
  localTemplates.value = pipelineStore.templates.map(cloneTemplate)
  localDefaultTemplateId.value = pipelineStore.defaultTemplateId
  activeTemplateId.value = localTemplates.value[0]?.id ?? ''
}

onMounted(() => {
  syncLocalState()
})

function addFlowStage() {
  if (!currentTemplate.value) return

  let lastFlowIdx = -1
  for (let i = currentTemplate.value.stages.length - 1; i >= 0; i--) {
    if (!currentTemplate.value.stages[i].terminal) {
      lastFlowIdx = i
      break
    }
  }
  currentTemplate.value.stages.splice(lastFlowIdx + 1, 0, { name: '', color: '#666666' })
}

function addTerminalStage() {
  if (!currentTemplate.value) return
  currentTemplate.value.stages.push({ name: '', color: '#666666', terminal: true })
}

function removeStage(index: number) {
  if (!currentTemplate.value) return
  currentTemplate.value.stages.splice(index, 1)
}

function getRealIndex(stage: StageConfig): number {
  return currentTemplate.value?.stages.indexOf(stage) ?? -1
}

function formatStageColor(color: string) {
  return color.toUpperCase()
}


function resetStages() {
  if (!currentTemplate.value) return
  currentTemplate.value.stages = cloneStages(DEFAULT_STAGES)
}

function setDefaultTemplate(templateId: string) {
  localDefaultTemplateId.value = templateId
}

function openCreateTemplateModal() {
  newTemplateName.value = ''
  showCreateTemplateModal.value = true
}

function openTemplateEditor(templateId: string) {
  activeTemplateId.value = templateId
  showEditTemplateModal.value = true
}

function createTemplate() {
  const name = newTemplateName.value.trim()
  if (!name) {
    message.warning('模板名称不能为空')
    return
  }

  const duplicated = localTemplates.value.some(template => template.name.trim() === name)
  if (duplicated) {
    message.warning('模板名称不能重复')
    return
  }

  const sourceStages = currentTemplate.value?.stages.length
    ? currentTemplate.value.stages
    : DEFAULT_STAGES

  const template: PipelineTemplate = {
    id: window.crypto.randomUUID(),
    name,
    stages: cloneStages(sourceStages)
  }

  localTemplates.value.push(template)
  activeTemplateId.value = template.id
  showCreateTemplateModal.value = false
  showEditTemplateModal.value = true
  message.success('已新增模板')
}

function deleteTemplate(templateId: string) {
  if (localTemplates.value.length <= 1) {
    message.warning('至少保留一个流程模板')
    return
  }

  const isInUse = companyStore.companies.some(company => company.templateId === templateId)
  if (isInUse) {
    message.warning('该模板已被现有投递使用，暂时不能删除')
    return
  }

  const wasEditingCurrentTemplate = showEditTemplateModal.value && activeTemplateId.value === templateId
  localTemplates.value = localTemplates.value.filter(template => template.id !== templateId)
  if (localDefaultTemplateId.value === templateId) {
    localDefaultTemplateId.value = localTemplates.value[0]?.id ?? ''
  }
  if (activeTemplateId.value === templateId) {
    activeTemplateId.value = localTemplates.value[0]?.id ?? ''
  }
  if (wasEditingCurrentTemplate) {
    showEditTemplateModal.value = false
  }
  message.success('模板已删除')
}

function saveTemplates() {
  const normalizedTemplates = localTemplates.value.map(template => ({
    ...template,
    name: template.name.trim(),
    stages: template.stages.map(stage => ({
      ...stage,
      name: stage.name.trim()
    }))
  }))

  if (normalizedTemplates.some(template => !template.name)) {
    message.warning('模板名称不能为空')
    return
  }

  const templateNames = normalizedTemplates.map(template => template.name)
  if (new Set(templateNames).size !== templateNames.length) {
    message.warning('模板名称不能重复')
    return
  }

  for (const template of normalizedTemplates) {
    if (template.stages.length === 0) {
      message.warning(`模板「${template.name}」至少需要一个阶段`)
      return
    }

    if (!template.stages.some(stage => !stage.terminal)) {
      message.warning(`模板「${template.name}」至少需要一个流程阶段`)
      return
    }

    if (template.stages.some(stage => !stage.name)) {
      message.warning(`模板「${template.name}」存在空的阶段名称`)
      return
    }

    const stageNames = template.stages.map(stage => stage.name)
    if (new Set(stageNames).size !== stageNames.length) {
      message.warning(`模板「${template.name}」的阶段名称不能重复`)
      return
    }
  }

  pipelineStore.replaceConfig(normalizedTemplates, localDefaultTemplateId.value)
  syncLocalState()
  showEditTemplateModal.value = false
  message.success('流程模板已保存')
}
</script>

<template>
  <div class="settings-page">
    <aside class="settings-sidebar">
      <h2 class="settings-title">设置</h2>
      <div class="settings-nav">
        <button
          v-for="item in sectionItems"
          :key="item.key"
          type="button"
          class="settings-nav-item"
          :class="{ 'settings-nav-item--active': activeSection === item.key }"
          @click="activeSection = item.key"
        >
          <span class="settings-nav-label">{{ item.label }}</span>
        </button>
      </div>
    </aside>

    <section class="settings-content">
      <template v-if="activeSection === 'appearance'">
        <NCard title="外观" :bordered="false" class="settings-card">
          <NSpace vertical :size="10">
            <NSpace align="center" :size="8">
              <NText strong>当前版本暂未开放更多外观选项</NText>
              <NTag size="small" :bordered="false" type="info">预留</NTag>
            </NSpace>
            <NText depth="3" style="font-size: 13px">
              后续可以在这里扩展主题、字号、紧凑模式等界面偏好设置。
            </NText>
          </NSpace>
        </NCard>

        <NCard title="关于" :bordered="false" class="settings-card">
          <NSpace vertical :size="8">
            <NText>校招日记 v0.0.1</NText>
            <NText depth="3" style="font-size: 13px">
              帮助你管理校招投递、面试安排和面试记录的桌面应用。
            </NText>
          </NSpace>
        </NCard>
      </template>

      <template v-else>
        <NCard title="流程模板" :bordered="false" class="template-list-card">
          <template #header-extra>
            <NButton size="small" type="primary" @click="openCreateTemplateModal">
              <template #icon><NIcon><AddOutline /></NIcon></template>
              新增模板
            </NButton>
          </template>

          <NText depth="3" style="display: block; margin-bottom: 14px; font-size: 13px">
            默认模板会在新建投递时自动选中。
          </NText>

          <div class="template-list">
            <button
              v-for="template in localTemplates"
              :key="template.id"
              type="button"
              class="template-list-item"
              :class="{ 'template-list-item--active': activeTemplateId === template.id }"
              @click="openTemplateEditor(template.id)"
            >
              <div>
                <div class="template-list-name">{{ template.name }}</div>
                <div class="template-list-meta">{{ template.stages.length }} 个阶段</div>
              </div>
              <NTag
                v-if="localDefaultTemplateId === template.id"
                size="small"
                :bordered="false"
                type="success"
              >
                默认
              </NTag>
            </button>
          </div>
        </NCard>
      </template>
    </section>

    <NModal
      v-model:show="showCreateTemplateModal"
      preset="card"
      title="新增流程模板"
      style="width: 420px"
      :bordered="false"
    >
      <NSpace vertical :size="12">
        <NText depth="3" style="font-size: 13px">
          新模板会复制当前选中模板的阶段配置，方便你快速调整。
        </NText>
        <NInput v-model:value="newTemplateName" placeholder="例如：大厂通用模板" />
      </NSpace>
      <template #footer>
        <NSpace justify="end">
          <NButton @click="showCreateTemplateModal = false">取消</NButton>
          <NButton type="primary" @click="createTemplate">创建</NButton>
        </NSpace>
      </template>
    </NModal>

    <NModal
      v-model:show="showEditTemplateModal"
      preset="card"
      title="编辑模板"
      style="width: min(560px, 92vw); align-self: flex-start; margin-top: 60px"
      :bordered="false"
    >
      <template #header-extra>
        <NSpace v-if="currentTemplate">
          <NButton size="small" secondary @click="resetStages">恢复默认阶段</NButton>
          <NButton size="small" type="primary" @click="saveTemplates">保存</NButton>
        </NSpace>
      </template>

      <template v-if="currentTemplate">
        <NSpace vertical :size="16">
          <div class="template-toolbar">
            <div style="flex: 1">
              <NText depth="3" style="display: block; margin-bottom: 8px; font-size: 13px">模板名称</NText>
              <NInput v-model:value="currentTemplate.name" placeholder="输入模板名称" />
            </div>
            <NSpace align="center">
              <NButton
                size="small"
                :type="localDefaultTemplateId === currentTemplate.id ? 'primary' : 'default'"
                secondary
                @click="setDefaultTemplate(currentTemplate.id)"
              >
                {{ localDefaultTemplateId === currentTemplate.id ? '默认模板' : '设为默认' }}
              </NButton>
              <NPopconfirm @positive-click="deleteTemplate(currentTemplate.id)">
                <template #trigger>
                  <NButton size="small" type="error" secondary :disabled="localTemplates.length <= 1">
                    删除模板
                  </NButton>
                </template>
                确定删除模板「{{ currentTemplate.name }}」？
              </NPopconfirm>
            </NSpace>
          </div>

          <div>
            <NText strong style="display: block; margin-bottom: 8px">流程阶段</NText>
            <NText depth="3" style="display: block; margin-bottom: 12px; font-size: 13px">
              按顺序经过的阶段，如投递、笔试、面试等。
            </NText>

            <VueDraggable v-model="draggableFlowStages" handle=".drag-handle" :animation="200" class="stage-list">
              <div v-for="stage in draggableFlowStages" :key="getRealIndex(stage)" class="stage-item">
                <span class="drag-handle">
                  <NIcon size="16" color="#c0c4cc"><MenuOutline /></NIcon>
                </span>
                <div class="stage-color">
                  <NPopover trigger="click" placement="bottom-start">
                    <template #trigger>
                      <button
                        type="button"
                        class="color-swatch-button"
                        :aria-label="`选择${stage.name || '阶段'}颜色`"
                      >
                        <span class="color-swatch" :style="{ background: stage.color }" />
                      </button>
                    </template>
                    <NColorPicker
                      v-model:value="stage.color"
                      :show-alpha="false"
                      :swatches="['#2080f0', '#0fb9b1', '#3867d6', '#7c3aed', '#f0a020', '#18a058', '#d03050', '#909399']"
                    />
                  </NPopover>
                  <span class="color-value">{{ formatStageColor(stage.color) }}</span>
                </div>
                <NInput v-model:value="stage.name" placeholder="阶段名称" size="small" />
                <NPopconfirm @positive-click="removeStage(getRealIndex(stage))">
                  <template #trigger>
                    <NButton quaternary circle size="small" type="error">
                      <template #icon><NIcon><TrashOutline /></NIcon></template>
                    </NButton>
                  </template>
                  确定删除阶段「{{ stage.name || '未命名阶段' }}」？
                </NPopconfirm>
              </div>
            </VueDraggable>

            <NButton dashed block @click="addFlowStage" style="margin-top: 8px" size="small">
              <template #icon><NIcon><AddOutline /></NIcon></template>
              添加流程阶段
            </NButton>
          </div>

          <div>
            <NText strong style="display: block; margin-bottom: 8px">终态阶段</NText>
            <NText depth="3" style="display: block; margin-bottom: 12px; font-size: 13px">
              互斥的结束状态，在时间线上并列显示。
            </NText>

            <div class="stage-list">
              <div v-for="stage in terminalStages" :key="getRealIndex(stage)" class="stage-item stage-item--terminal">
                <span class="drag-handle drag-handle--disabled">
                  <NIcon size="16" color="transparent"><MenuOutline /></NIcon>
                </span>
                <div class="stage-color">
                  <NPopover trigger="click" placement="bottom-start">
                    <template #trigger>
                      <button
                        type="button"
                        class="color-swatch-button"
                        :aria-label="`选择${stage.name || '终态阶段'}颜色`"
                      >
                        <span class="color-swatch" :style="{ background: stage.color }" />
                      </button>
                    </template>
                    <NColorPicker
                      v-model:value="stage.color"
                      :show-alpha="false"
                      :swatches="['#18a058', '#d03050', '#909399', '#f0a020', '#2080f0']"
                    />
                  </NPopover>
                  <span class="color-value">{{ formatStageColor(stage.color) }}</span>
                </div>
                <NInput v-model:value="stage.name" placeholder="阶段名称" size="small" />
                <NTag size="tiny" :bordered="false" type="default" style="flex-shrink: 0">终态</NTag>
                <NPopconfirm @positive-click="removeStage(getRealIndex(stage))">
                  <template #trigger>
                    <NButton quaternary circle size="small" type="error">
                      <template #icon><NIcon><TrashOutline /></NIcon></template>
                    </NButton>
                  </template>
                  确定删除阶段「{{ stage.name || '未命名阶段' }}」？
                </NPopconfirm>
              </div>
            </div>

            <NButton dashed block @click="addTerminalStage" style="margin-top: 8px" size="small">
              <template #icon><NIcon><AddOutline /></NIcon></template>
              添加终态阶段
            </NButton>
          </div>
        </NSpace>
      </template>
    </NModal>
  </div>
</template>

<style scoped>
.settings-page {
  display: flex;
  gap: 20px;
  height: 100%;
  padding: 0 24px 0 36px;
  box-sizing: border-box;
  overflow: hidden;
}

.settings-sidebar {
  width: 220px;
  flex-shrink: 0;
  align-self: flex-start;
  padding: 20px 16px;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.settings-title {
  margin: 0 0 16px;
  font-size: 20px;
  font-weight: 700;
}

.settings-nav {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.settings-nav-item {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid transparent;
  border-radius: 12px;
  background: #f8fafc;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
}

.settings-nav-item:hover {
  border-color: #dbe4f0;
  background: #f1f5f9;
}

.settings-nav-item--active {
  border-color: #14111d;
  background: #14111d;
}

.settings-nav-item--active:hover {
  border-color: #2a2538;
  background: #2a2538;
}

.settings-nav-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.settings-nav-item--active .settings-nav-label {
  color: #fff;
}

.settings-content {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
}

.settings-card {
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.template-list-card {
  height: fit-content;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.template-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.template-list-item {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid #eef2f7;
  border-radius: 12px;
  background: #fafafa;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
}

.template-list-item:hover {
  border-color: #dbe4f0;
  background: #f8fafc;
}

.template-list-item--active {
  border-color: #14111d;
  background: #f5f7fb;
}

.template-list-name {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.template-list-meta {
  margin-top: 4px;
  font-size: 12px;
  color: #6b7280;
}

.template-toolbar {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  justify-content: space-between;
}

.stage-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stage-item {
  display: grid;
  grid-template-columns: 22px auto 1fr auto;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  background: #fafafa;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
  transition: background 0.15s;
}

.stage-item--terminal {
  grid-template-columns: 22px auto 1fr auto auto;
}

.stage-item:has(.drag-handle:not(.drag-handle--disabled)):hover {
  background: #f3f4f6;
}

.drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  flex-shrink: 0;
  color: #c0c4cc;
  transition: color 0.15s;
}

.drag-handle:hover {
  color: #6b7280;
}

.drag-handle--disabled {
  cursor: default;
  pointer-events: none;
}

.stage-color {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 104px;
}

.color-swatch-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
}

.color-swatch {
  display: block;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.color-swatch-button:focus-visible {
  outline: 2px solid #2080f0;
  outline-offset: 2px;
}

.color-value {
  font-size: 12px;
  line-height: 1;
  color: #6b7280;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

@media (max-width: 1100px) {
  .settings-page {
    flex-direction: column;
  }

  .settings-sidebar {
    position: static;
    width: 100%;
  }
}
</style>
