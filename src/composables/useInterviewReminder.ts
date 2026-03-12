import { onMounted, onUnmounted } from 'vue'
import { useInterviewStore } from '@/stores/interview'
import { useCompanyStore } from '@/stores/company'

export function useInterviewReminder() {
  const interviewStore = useInterviewStore()
  const companyStore = useCompanyStore()
  let timer: ReturnType<typeof setInterval>
  const notified = new Set<string>()

  function check() {
    const now = Date.now()
    const fifteenMin = 15 * 60 * 1000

    for (const interview of interviewStore.interviews) {
      if (!interview.reminder) continue
      if (notified.has(interview.id)) continue

      const start = new Date(interview.scheduledAt).getTime()
      const diff = start - now

      if (diff > 0 && diff <= fifteenMin) {
        const company = companyStore.getCompanyById(interview.companyId)
        const name = company?.name ?? '未知公司'
        window.electronAPI.notification.show(
          '面试提醒',
          `${name} - ${interview.stage} 将在 ${Math.ceil(diff / 60000)} 分钟后开始`
        )
        notified.add(interview.id)
      }
    }
  }

  onMounted(() => {
    check()
    timer = setInterval(check, 60000)
  })

  onUnmounted(() => {
    clearInterval(timer)
  })
}
