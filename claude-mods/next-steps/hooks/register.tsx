import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

const suggestions = atom({ plugin: 'next-steps', key: 'suggestions' } as const, [])
const isOff = atom({ plugin: 'next-steps', key: 'isOff' } as const, false)

const ASK = `Voici la dernière réponse d'un assistant de code à son utilisateur.
Propose exactement 3 prochaines étapes que l'utilisateur pourrait demander ensuite,
formulées comme des messages qu'il taperait lui-même (impératif, en français, 70 caractères max).
Réponds uniquement par 3 lignes, sans numéro ni puce.

Réponse :
`

export const parseSuggestions = (text: string): string[] =>
  text
    .split('\n')
    .map(line => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim())
    .filter(line => line.length > 0)
    .slice(0, 3)

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'suggestions',
      description: 'Boutons de prochaine étape : /suggestions on | off',
    })
    return next(e)
  })

  on('command.run', { command: 'suggestions' }, async ($, e) => {
    const off = e.args.trim() === 'off'
    await update($, isOff, () => off)
    if (off) await update($, suggestions, () => [])
    return { text: off ? 'Suggestions désactivées.' : 'Suggestions activées.' }
  })

  on('prompt.submit', async ($, e, next) => {
    await update($, suggestions, () => [])
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const done = await next(e)
    if (e.agentId || e.reason !== 'answer' || (await read($, isOff))) return done

    const reply = await $.model.complete({
      model: 'haiku',
      prompt: ASK + e.answer.slice(-6000),
      effort: 'low',
      timeoutMs: 20000,
    })
    if (reply.isAnswered) {
      await update($, suggestions, () => parseSuggestions(reply.text))
    }
    return done
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const list = await read($, suggestions)
    if (e.props.hasSurvey || e.props.isWorking || list.length === 0 || (await read($, isOff))) {
      return next(e)
    }

    const { Box, Button, Text } = $.ui.resolve(e)
    const send = async (text: string) => {
      await update($, suggestions, () => [])
      await $.prompt.submit({ text, asUser: true })
    }

    return (
      <Box flexDirection="column">
        <Text dimColor>Prochaines étapes :</Text>
        {list.map((text, i) => (
          <Button key={`s${i}`} hotkey={String(i + 1)} label={text} onPress={() => send(text)} />
        ))}
        <Box>
          <Button key="dismiss" role="dismiss" dimColor label="Ignorer" onPress={() => update($, suggestions, () => [])} />
          <Text dimColor>  (/suggestions off pour les couper)</Text>
        </Box>
      </Box>
    )
  })
}
