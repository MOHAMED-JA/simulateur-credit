export type RecordModeOn = boolean

declare module 'claude-code' {
  interface PluginState {
    'record-mode': { isOn: RecordModeOn }
  }
}
