export interface Company {
  id: string
  name: string
  position: string
  templateId: string
  department?: string
  salary?: string
  status: string
  appliedAt: string
  statusHistory: StatusChange[]
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface StatusChange {
  from: string
  to: string
  changedAt: string
}

export interface Interview {
  id: string
  companyId: string
  stage: string
  scheduledAt: string
  endAt: string
  method: 'online' | 'offline'
  platform?: string
  meetingId?: string
  meetingLink?: string
  location?: string
  content?: string
  result?: 'pass' | 'fail' | 'pending'
  reminder: boolean
  createdAt: string
  updatedAt: string
}

export interface StageConfig {
  name: string
  color: string
  terminal?: boolean
}

export interface PipelineTemplate {
  id: string
  name: string
  stages: StageConfig[]
}

export interface PipelineConfig {
  templates: PipelineTemplate[]
  defaultTemplateId: string
}

export const DEFAULT_STAGES: StageConfig[] = [
  { name: '已投递', color: '#2080f0' },
  { name: '笔试', color: '#0fb9b1' },
  { name: '一面', color: '#3867d6' },
  { name: '二面', color: '#7c3aed' },
  { name: 'HR面', color: '#f0a020' },
  { name: 'Offer', color: '#18a058', terminal: true },
  { name: '拒绝', color: '#d03050', terminal: true },
  { name: '流程终止', color: '#909399', terminal: true }
]

export const DEFAULT_TEMPLATE_ID = 'default-template'

export const DEFAULT_PIPELINE_TEMPLATE: PipelineTemplate = {
  id: DEFAULT_TEMPLATE_ID,
  name: '默认模板',
  stages: DEFAULT_STAGES.map(stage => ({ ...stage }))
}
