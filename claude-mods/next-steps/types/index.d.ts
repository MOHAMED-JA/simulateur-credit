export type NextStepsSuggestions = string[]

declare module 'claude-code' {
  interface PluginState {
    'next-steps': { suggestions: NextStepsSuggestions; isOff: boolean }
  }
}
