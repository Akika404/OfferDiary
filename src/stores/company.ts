import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import type { Company } from '@/types'
import { usePipelineStore } from '@/stores/pipeline'

export const useCompanyStore = defineStore('company', () => {
  const companies = ref<Company[]>([])
  const pipelineStore = usePipelineStore()

  async function load() {
    const data = await window.electronAPI.store.get('companies') as Company[] | null
    if (!data) return

    const normalized = data.map((company) => {
      const templateId = company.templateId && pipelineStore.getTemplateById(company.templateId)
        ? company.templateId
        : pipelineStore.defaultTemplateId

      return {
        ...company,
        templateId
      }
    })

    companies.value = normalized

    if (normalized.some((company, index) => company.templateId !== data[index].templateId)) {
      save()
    }
  }

  async function save() {
    await window.electronAPI.store.set('companies', companies.value)
  }

  function addCompany(
    partial: Pick<Company, 'name' | 'position' | 'department' | 'salary' | 'templateId'>
    & { appliedAt?: string }
  ) {
    const now = new Date().toISOString()
    const templateId = partial.templateId || pipelineStore.defaultTemplateId
    const company: Company = {
      id: uuidv4(),
      name: partial.name,
      position: partial.position,
      templateId,
      department: partial.department,
      salary: partial.salary,
      status: pipelineStore.getInitialStageName(templateId),
      appliedAt: partial.appliedAt || now,
      statusHistory: [],
      notes: '',
      createdAt: now,
      updatedAt: now
    }
    companies.value.push(company)
    save()
    return company
  }

  function updateCompany(id: string, updates: Partial<Company>) {
    const idx = companies.value.findIndex(c => c.id === id)
    if (idx === -1) return
    const company = companies.value[idx]
    if (updates.status && updates.status !== company.status) {
      company.statusHistory.push({
        from: company.status,
        to: updates.status,
        changedAt: new Date().toISOString()
      })
    }
    Object.assign(company, updates, { updatedAt: new Date().toISOString() })
    save()
  }

  function changeStatus(id: string, newStatus: string) {
    updateCompany(id, { status: newStatus })
  }

  function removeCompany(id: string) {
    companies.value = companies.value.filter(c => c.id !== id)
    save()
  }

  function getCompanyById(id: string) {
    return companies.value.find(c => c.id === id)
  }

  const companiesByStatus = computed(() => {
    const map: Record<string, Company[]> = {}
    for (const c of companies.value) {
      if (!map[c.status]) map[c.status] = []
      map[c.status].push(c)
    }
    return map
  })

  return {
    companies,
    companiesByStatus,
    load, save,
    addCompany,
    updateCompany, changeStatus,
    removeCompany, getCompanyById
  }
})
