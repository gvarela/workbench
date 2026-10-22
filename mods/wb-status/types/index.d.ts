/**
 * The plan a session pinned: the plan directory a /wb:* command named (as
 * given, relative or absolute), what pinned it (`/wb:implement`,
 * `/wb-status`), and when, in `$.clock.now()` milliseconds.
 */
export type WbStatusPin = { path: string; by: string; at: number }

declare module 'claude-code' {
  interface PluginState {
    'wb-status': { pin: WbStatusPin | null }
  }
}
