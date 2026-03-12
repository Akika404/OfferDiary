import { formatDistanceToNow, format, parseISO } from 'date-fns'
import { zhCN } from 'date-fns/locale'

export function timeAgo(isoString: string): string {
  return formatDistanceToNow(parseISO(isoString), { addSuffix: true, locale: zhCN })
}

export function formatDate(isoString: string, fmt: string = 'yyyy-MM-dd'): string {
  return format(parseISO(isoString), fmt, { locale: zhCN })
}

export function formatDateTime(isoString: string): string {
  return format(parseISO(isoString), 'yyyy-MM-dd HH:mm', { locale: zhCN })
}

export function formatTime(isoString: string): string {
  return format(parseISO(isoString), 'HH:mm', { locale: zhCN })
}

export function toDateString(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function getElapsedText(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days} 天前`
  if (hours > 0) return `${hours} 小时前`
  if (minutes > 0) return `${minutes} 分钟前`
  return '刚刚'
}
