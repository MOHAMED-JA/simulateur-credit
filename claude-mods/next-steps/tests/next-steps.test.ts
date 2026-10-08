import { expect, test } from 'claude-code/testing'

import { parseSuggestions } from '../hooks/register'

const BAND = { component: 'AbovePrompt', props: { hasSurvey: false, isWorking: false, maxRows: 10 } as never } as const

test('nettoie les puces et garde 3 lignes', async () => {
  expect(parseSuggestions('1. Ajoute des tests\n- Lance le linter\n• Commit\nEn trop')).toEqual([
    'Ajoute des tests', 'Lance le linter', 'Commit',
  ])
})

test('réponse simple → 3 boutons ; un clic envoie la suggestion comme un message', async ($, on) => {
  const sent: string[] = []
  on('turn.complete', () => ({ text: 'Paris est la capitale de la France.' }))
  on('model.complete', () => ({ value: {
    isAnswered: true, text: 'Donne-moi sa population\nCite 3 monuments\nCompare avec Lyon',
    usage: { input_tokens: 1, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
  } }) as never)
  on('prompt.submit', ($, e) => (sent.push(e.text), { text: e.text }))
  on('ui.render', ($, e) => h($.ui.resolve(e).Box, {}))

  await $.turn.complete({ turnId: 't1', reason: 'answer', answer: 'Paris est la capitale de la France.', durationMs: 900, isAborted: false })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'next-steps', surface, ...BAND })
    expect(await ui.find({ key: 's0' })).toBeDefined()
    expect(await ui.find({ key: 's2' })).toBeDefined()
    await ui.unmount()
  }

  const ui = await $.ui.mount({ plugin: 'next-steps', surface: 'terminal', ...BAND })
  await ui.press({ key: 's1' })
  expect(sent).toEqual(['Cite 3 monuments'])
  expect(await ui.find({ key: 's0' })).toBeUndefined()
  await ui.unmount()
})

test('« Ignorer » efface les boutons', async ($, on) => {
  on('turn.complete', () => ({ text: 'ok' }))
  on('model.complete', () => ({ value: { isAnswered: true, text: 'a\nb\nc', usage: { input_tokens: 1, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 } } }) as never)
  on('ui.render', ($, e) => h($.ui.resolve(e).Box, {}))
  await $.turn.complete({ turnId: 't1', reason: 'answer', answer: 'Paris est la capitale de la France.', durationMs: 900, isAborted: false })
  const ui = await $.ui.mount({ plugin: 'next-steps', surface: 'terminal', ...BAND })
  await ui.press({ key: 'dismiss' })
  expect(await ui.find({ key: 's0' })).toBeUndefined()
  await ui.unmount()
})
