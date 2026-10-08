import { expect, mock, test } from 'claude-code/testing'

import { bar, elapsed } from '../hooks/bar'

const BAND = { component: 'AbovePrompt', props: { hasSurvey: false, isWorking: true, maxRows: 10 } as never } as const
const STEPS = ['Lire le code', 'Écrire la fonction', 'Ajouter les tests', 'Lancer les tests']

test('dessine la barre et le temps', async () => {
  expect(bar(2, 4, 8)).toBe('████░░░░')
  expect(elapsed(75_000)).toBe('1 min 15 s')
})

test('tâche en 4 étapes : compte, étape en cours, temps écoulé', async ($, on) => {
  const clock = mock.clock(on)
  on('ui.render', ($, e) => h($.ui.resolve(e).Box, {}))
  on('ui.toast', () => ({ value: undefined }))
  on('turn.start', ($, e) => ({ turnId: e.turnId }))
  on('tool.call', () => ({ result: { oldTodos: [], newTodos: [] }, text: 'ok' }) as never)

  const write = (doneCount: number) =>
    $.tool.call({
      tool: 'TodoWrite',
      todos: STEPS.map((content, i) => ({
        content,
        activeForm: `${content}…`,
        status: i < doneCount ? 'completed' : i === doneCount ? 'in_progress' : 'pending',
      })),
    })

  const texts = async () => {
    const ui = await $.ui.mount({ plugin: 'progress-bar', surface: 'terminal', ...BAND })
    const all = JSON.stringify(await ui.find({ type: 'Box' }))
    await ui.unmount()
    return all
  }

  await $.turn.start({ turnId: 't1' } as never)
  await write(0)
  expect(await texts()).toContain('0/4')
  expect(await texts()).toContain('Lire le code…')

  for (let done = 1; done < 4; done++) {
    await clock.advance(20_000)
    await write(done)
  }
  const mid = await texts()
  expect(mid).toContain('3/4')
  expect(mid).toContain('Lancer les tests…')
  expect(mid).toContain('1 min')
})
