import { ref, onMounted, onUnmounted } from 'vue'
import { getElapsedText } from '@/utils/time'

export function useTimeElapsed(getIsoString: () => string) {
  const text = ref(getElapsedText(getIsoString()))
  let timer: ReturnType<typeof setInterval>

  onMounted(() => {
    timer = setInterval(() => {
      text.value = getElapsedText(getIsoString())
    }, 60000)
  })

  onUnmounted(() => {
    clearInterval(timer)
  })

  return text
}
