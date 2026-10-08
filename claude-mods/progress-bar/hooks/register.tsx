import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Progress, Step } from '../types'
import { bar, elapsed, summary } from './bar'

const EMPTY: Progress = { steps: [], startedAt: null, now: 0 }
const progress = atom({ plugin: 'progress-bar', key: 'progress' } as const, EMPTY)

async function setSteps($: EngineInterface, fn: (steps: Step[]) => Step[]) {
  const now = await $.clock.now()
  await update($, progress, p => {
    const steps = fn(p.steps)
    return { steps, startedAt: steps.length === 0 ? null : (p.startedAt ?? now), now }
  })
}

async function tick($: EngineInterface) {
  const now = await $.clock.now()
  await update($, progress, p => (p.steps.length === 0 ? p : { ...p, now }))
}

export const register: Register = on => {
  let ticker: { cancel: () => void } | undefined

  // TodoWrite : la liste entière à chaque appel
  on('tool.call', { tool: 'TodoWrite' }, async ($, e, next) => {
    const ran = await next(e)
    if (!e.agentId && ran.deny === undefined && !ran.isError) {
      await setSteps($, () =>
        e.todos.map((t, i) => ({
          id: String(i),
          title: t.status === 'in_progress' ? t.activeForm : t.content,
          status: t.status,
        })),
      )
    }
    return ran
  })

  // TaskCreate / TaskUpdate : une tâche à la fois
  on('tool.call', { tool: 'TaskCreate' }, async ($, e, next) => {
    const ran = await next(e)
    if (!e.agentId && ran.deny === undefined && !ran.isError && ran.result) {
      const id = ran.result.task.id
      await setSteps($, steps => [...steps, { id, title: e.subject, status: 'pending' }])
    }
    return ran
  })

  on('tool.call', { tool: 'TaskUpdate' }, async ($, e, next) => {
    const ran = await next(e)
    if (!e.agentId && ran.deny === undefined && !ran.isError) {
      await setSteps($, steps =>
        e.status === 'deleted'
          ? steps.filter(s => s.id !== e.taskId)
          : steps.map(s =>
              s.id !== e.taskId
                ? s
                : {
                    ...s,
                    title: e.status === 'in_progress' && e.activeForm ? e.activeForm : (e.subject ?? s.title),
                    status: e.status === undefined || e.status === 'deleted' ? s.status : e.status,
                  },
            ),
      )
    }
    return ran
  })

  on('turn.start', async ($, e, next) => {
    ticker?.cancel()
    ticker = $.clock.every(1000, () => void tick($))
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (!e.agentId) {
      ticker?.cancel()
      ticker = undefined
      const p = await read($, progress)
      const { done, total } = summary(p.steps)
      if (total > 0 && done === total) {
        $.ui.toast(`✔ ${total}/${total} étapes terminées en ${elapsed(p.now - (p.startedAt ?? p.now))}`)
        await update($, progress, () => EMPTY)
      }
    }
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const p = await read($, progress)
    const { done, total, current } = summary(p.steps)
    if (e.props.hasSurvey || total < 2) return next(e)

    const { Box, Text } = $.ui.resolve(e)
    const below = await next(e)
    const pct = Math.round((done / total) * 100)
    return (
      <Box flexDirection="column">
        <Text>
          <Text color="green">{bar(done, total)}</Text> {done}/{total} étapes ({pct} %) · ⏱{' '}
          {elapsed(p.now - (p.startedAt ?? p.now))}
        </Text>
        <Text dimColor>{current ? `▶ ${current.title}` : done === total ? '✔ Terminé' : '… en attente'}</Text>
        {below}
      </Box>
    )
  })
}
