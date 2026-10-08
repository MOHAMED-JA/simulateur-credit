import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import { mask, maskDeep } from './mask'

const isOn = atom({ plugin: 'record-mode', key: 'isOn' } as const, false)
const BADGE = '● REC — masquage actif'

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'record',
      description: 'Mode tournage : /record on | off (masque e-mails, téléphones, montants €)',
    })
    if (await read($, isOn)) $.ui.status(BADGE)
    return next(e)
  })

  on('command.run', { command: 'record' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    const on_ = arg === '' ? !(await read($, isOn)) : arg === 'on'
    await update($, isOn, () => on_)
    $.ui.status(on_ ? BADGE : undefined)
    await $.ui.invalidate('ui.render')
    return { text: on_ ? 'Mode tournage activé : données sensibles masquées.' : 'Mode tournage désactivé.' }
  })

  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) =>
    (await read($, isOn)) ? next({ ...e, props: { ...e.props, text: mask(e.props.text) } }) : next(e),
  )

  on('ui.render', { component: 'UserMessage' }, async ($, e, next) =>
    (await read($, isOn)) ? next({ ...e, props: { ...e.props, text: mask(e.props.text) } }) : next(e),
  )

  on('ui.render', { component: 'ToolUse' }, async ($, e, next) =>
    (await read($, isOn))
      ? next({ ...e, props: { ...e.props, input: maskDeep(e.props.input), output: maskDeep(e.props.output) } })
      : next(e),
  )

  on('ui.render', { component: 'ToolResult' }, async ($, e, next) =>
    (await read($, isOn)) ? next({ ...e, props: { ...e.props, output: maskDeep(e.props.output) } }) : next(e),
  )

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || !(await read($, isOn))) return next(e)
    const { Box, Text } = $.ui.resolve(e)
    const below = await next(e)
    return (
      <Box flexDirection="column">
        <Text color="red" bold>{BADGE}  (/record off pour arrêter)</Text>
        {below}
      </Box>
    )
  })
}
