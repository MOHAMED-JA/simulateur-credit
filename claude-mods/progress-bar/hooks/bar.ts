import type { Step } from '../types'

export const bar = (done: number, total: number, width = 20): string => {
  const full = total === 0 ? 0 : Math.round((done / total) * width)
  return '█'.repeat(full) + '░'.repeat(width - full)
}

export const elapsed = (ms: number): string => {
  const s = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(s / 60)
  return m > 0 ? `${m} min ${String(s % 60).padStart(2, '0')} s` : `${s} s`
}

export const summary = (steps: Step[]) => {
  const live = steps
  const done = live.filter(s => s.status === 'completed').length
  const current = live.find(s => s.status === 'in_progress')
  return { done, total: live.length, current }
}
