import { expect, test } from 'claude-code/testing'

import { mask } from '../hooks/mask'

test('masque une fausse adresse mail, un faux numéro et un montant', async () => {
  const text = 'Écris à jean.dupont@exemple.fr ou au 06 12 34 56 78 (+33 6 98 76 54 32) pour 1 250,50 € et 300 euros.'
  const out = mask(text)
  expect(out).toBe('Écris à [EMAIL] ou au [TÉLÉPHONE] ([TÉLÉPHONE]) pour [MONTANT €] et [MONTANT €].')
})

test('laisse les nombres ordinaires tranquilles', async () => {
  expect(mask('version 2.1.294, 42 fichiers, année 2026')).toBe('version 2.1.294, 42 fichiers, année 2026')
})

test('/record on masque l’affichage, /record off le rétablit', async ($, on) => {
  // the engine's own drawing, beneath the plugin: the text it was handed
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return h(Text, {}, String((e.props as { text?: string }).text ?? ''))
  })
  on('ui.status', () => ({ value: undefined }))
  for (const surface of ['terminal', 'desktop'] as const) {
    await $.command.run({ command: 'record', args: 'on' })
    const shown = await $.ui.render({
      plugin: 'record-mode', surface, component: 'AssistantMessage',
      props: { text: 'Contact : test@faux.com, 07 00 00 00 00', isFirstOfReply: true },
    })
    expect(JSON.stringify(shown)).toContain('[EMAIL]')
    expect(JSON.stringify(shown)).not.toContain('test@faux.com')
    expect(JSON.stringify(shown)).toContain('[TÉLÉPHONE]')

    const band = await $.ui.mount({ plugin: 'record-mode', surface, component: 'AbovePrompt', props: { hasSurvey: false, isWorking: false, maxRows: 10 } as never })
    expect(await band.find({ type: 'Text', text: /REC/ })).toBeDefined()
    await band.unmount()

    await $.command.run({ command: 'record', args: 'off' })
    const plain = await $.ui.render({
      plugin: 'record-mode', surface, component: 'AssistantMessage',
      props: { text: 'Contact : test@faux.com', isFirstOfReply: true },
    })
    expect(JSON.stringify(plain)).toContain('test@faux.com')
  }
})
