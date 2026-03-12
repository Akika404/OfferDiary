import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import type { PipelineConfig, PipelineTemplate, StageConfig } from '@/types'
import { DEFAULT_PIPELINE_TEMPLATE, DEFAULT_TEMPLATE_ID } from '@/types'

export const usePipelineStore = defineStore('pipeline', () => {
  const templates = ref<PipelineTemplate[]>([cloneTemplate(DEFAULT_PIPELINE_TEMPLATE)])
  const defaultTemplateId = ref(DEFAULT_TEMPLATE_ID)

  const defaultTemplate = computed(() => getTemplateById(defaultTemplateId.value) ?? templates.value[0])
  const stages = computed(() => defaultTemplate.value?.stages ?? [])
  const flowStages = computed(() => stages.value.filter(s => !s.terminal))
  const terminalStages = computed(() => stages.value.filter(s => s.terminal))

  function cloneStages(source: StageConfig[]) {
    return source.map(stage => ({ ...stage }))
  }

  function cloneTemplate(template: PipelineTemplate): PipelineTemplate {
    return {
      ...template,
      stages: cloneStages(template.stages)
    }
  }

  async function load() {
    const config = await window.electronAPI.store.get('pipelineConfig') as PipelineConfig | null

    if (config?.templates?.length) {
      templates.value = config.templates.map(cloneTemplate)
      defaultTemplateId.value = getTemplateById(config.defaultTemplateId)?.id ?? config.templates[0].id
      return
    }

    const legacyStages = (config as { stages?: StageConfig[] } | null)?.stages
    if (legacyStages?.length) {
      templates.value = [{
        id: DEFAULT_TEMPLATE_ID,
        name: '默认模板',
        stages: cloneStages(legacyStages)
      }]
      defaultTemplateId.value = DEFAULT_TEMPLATE_ID
      await save()
    }
  }

  async function save() {
    await window.electronAPI.store.set('pipelineConfig', {
      templates: templates.value,
      defaultTemplateId: defaultTemplateId.value
    })
  }

  function getTemplateById(templateId?: string) {
    return templates.value.find(template => template.id === templateId)
      ?? templates.value.find(template => template.id === defaultTemplateId.value)
      ?? templates.value[0]
  }

  function getTemplateName(templateId?: string) {
    return getTemplateById(templateId)?.name ?? '未命名模板'
  }

  function getStagesByTemplateId(templateId?: string): StageConfig[] {
    return getTemplateById(templateId)?.stages ?? []
  }

  function getFlowStagesByTemplateId(templateId?: string): StageConfig[] {
    return getStagesByTemplateId(templateId).filter(stage => !stage.terminal)
  }

  function getTerminalStagesByTemplateId(templateId?: string): StageConfig[] {
    return getStagesByTemplateId(templateId).filter(stage => stage.terminal)
  }

  function getInitialStageName(templateId?: string): string {
    const flowStage = getFlowStagesByTemplateId(templateId)[0]
    if (flowStage) return flowStage.name
    return getStagesByTemplateId(templateId)[0]?.name ?? ''
  }

  function getStageColor(stageName: string, templateId?: string): string {
    return getStagesByTemplateId(templateId).find(stage => stage.name === stageName)?.color ?? '#999'
  }

  function isTerminal(stageName: string, templateId?: string): boolean {
    return getStagesByTemplateId(templateId).find(stage => stage.name === stageName)?.terminal ?? false
  }

  function replaceConfig(newTemplates: PipelineTemplate[], nextDefaultTemplateId: string) {
    templates.value = newTemplates.map(cloneTemplate)
    defaultTemplateId.value = getTemplateById(nextDefaultTemplateId)?.id ?? newTemplates[0]?.id ?? DEFAULT_TEMPLATE_ID
    save()
  }

  function createTemplate(name: string, sourceTemplateId?: string) {
    const sourceStages = getStagesByTemplateId(sourceTemplateId)
    const newTemplate: PipelineTemplate = {
      id: uuidv4(),
      name,
      stages: cloneStages(sourceStages.length ? sourceStages : DEFAULT_PIPELINE_TEMPLATE.stages)
    }
    templates.value.push(newTemplate)
    save()
    return newTemplate
  }

  return {
    templates,
    defaultTemplateId,
    defaultTemplate,
    stages,
    flowStages,
    terminalStages,
    load,
    save,
    getTemplateById,
    getTemplateName,
    getStagesByTemplateId,
    getFlowStagesByTemplateId,
    getTerminalStagesByTemplateId,
    getInitialStageName,
    getStageColor,
    isTerminal,
    replaceConfig,
    createTemplate
  }
})
