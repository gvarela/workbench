/**
 * The plan a session pinned: the plan directory a /wb:* command named (as
 * given, relative or absolute), what pinned it (`/wb:implement`,
 * `/wb-status`), and when, in `$.clock.now()` milliseconds.
 */
export type WbStatusPin = { path: string; by: string; at: number }

/**
 * The session's latest wb command that names a workflow stage
 * (`/wb:create_design`), path or not, and when it ran.
 */
export type WbStatusStage = { by: string; at: number }

/**
 * A /wb:create_project waiting for the folder it creates: what ran, when, and
 * the plan folder names that existed when it ran.
 */
export type WbStatusPending = { by: string; at: number; known: string[] }

declare module 'claude-code' {
  interface PluginState {
    'wb-status': {
      pin: WbStatusPin | null
      stage: WbStatusStage | null
      pending: WbStatusPending | null
    }
  }
}
