import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import type { Interview } from '@/types'

export const useInterviewStore = defineStore('interview', () => {
  const interviews = ref<Interview[]>([])

  async function load() {
    const data = await window.electronAPI.store.get('interviews') as Interview[] | null
    if (data) interviews.value = data
  }

  async function save() {
    await window.electronAPI.store.set('interviews', interviews.value)
  }

  function addInterview(partial: Omit<Interview, 'id' | 'createdAt' | 'updatedAt'>) {
    const now = new Date().toISOString()
    const interview: Interview = {
      ...partial,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now
    }
    interviews.value.push(interview)
    save()
    return interview
  }

  function updateInterview(id: string, updates: Partial<Interview>) {
    const idx = interviews.value.findIndex(i => i.id === id)
    if (idx === -1) return
    Object.assign(interviews.value[idx], updates, { updatedAt: new Date().toISOString() })
    save()
  }

  function removeInterview(id: string) {
    interviews.value = interviews.value.filter(i => i.id !== id)
    save()
  }

  function getInterviewById(id: string) {
    return interviews.value.find(i => i.id === id)
  }

  function getInterviewsByCompany(companyId: string) {
    return interviews.value.filter(i => i.companyId === companyId)
  }

  function getInterviewsByDate(dateStr: string) {
    return interviews.value.filter(i => i.scheduledAt.startsWith(dateStr))
  }

  function checkConflict(scheduledAt: string, endAt: string, excludeId?: string): Interview[] {
    const start = new Date(scheduledAt).getTime()
    const end = new Date(endAt).getTime()
    return interviews.value.filter(i => {
      if (i.id === excludeId) return false
      const iStart = new Date(i.scheduledAt).getTime()
      const iEnd = new Date(i.endAt).getTime()
      return start < iEnd && end > iStart
    })
  }

  function suggestTimeSlots(dateStr: string, durationMinutes: number = 60): { start: string; end: string }[] {
    const dayInterviews = interviews.value
      .filter(i => i.scheduledAt.startsWith(dateStr))
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())

    const slots: { start: string; end: string }[] = []
    const dayStart = new Date(`${dateStr}T09:00:00`)
    const dayEnd = new Date(`${dateStr}T21:00:00`)
    const durationMs = durationMinutes * 60 * 1000

    let cursor = dayStart.getTime()

    for (const interview of dayInterviews) {
      const iStart = new Date(interview.scheduledAt).getTime()
      const iEnd = new Date(interview.endAt).getTime()

      if (iStart - cursor >= durationMs) {
        slots.push({
          start: new Date(cursor).toISOString(),
          end: new Date(cursor + durationMs).toISOString()
        })
      }
      cursor = Math.max(cursor, iEnd)
    }

    if (dayEnd.getTime() - cursor >= durationMs) {
      slots.push({
        start: new Date(cursor).toISOString(),
        end: new Date(cursor + durationMs).toISOString()
      })
    }

    return slots
  }

  const interviewsByDate = computed(() => {
    const map: Record<string, Interview[]> = {}
    for (const i of interviews.value) {
      const date = i.scheduledAt.substring(0, 10)
      if (!map[date]) map[date] = []
      map[date].push(i)
    }
    return map
  })

  return {
    interviews,
    interviewsByDate,
    load, save,
    addInterview, updateInterview, removeInterview,
    getInterviewById, getInterviewsByCompany, getInterviewsByDate,
    checkConflict, suggestTimeSlots
  }
})
