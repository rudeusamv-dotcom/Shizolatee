export type Tip = { suggested: string; current: string; reason: string }

declare module 'claude-code' {
  interface PluginState {
    'model-saver': { tip: Tip | null; isOff: boolean }
  }
}
