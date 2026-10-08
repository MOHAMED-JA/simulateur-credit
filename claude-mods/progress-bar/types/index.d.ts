export type Step = { id: string; title: string; status: 'pending' | 'in_progress' | 'completed' }
export type Progress = { steps: Step[]; startedAt: number | null; now: number }

declare module 'claude-code' {
  interface PluginState {
    'progress-bar': { progress: Progress }
  }
}
