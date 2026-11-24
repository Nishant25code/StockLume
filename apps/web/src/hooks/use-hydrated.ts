import { useSyncExternalStore } from "react"

const subscribe = () => () => {}

/**
 * false while React is hydrating server HTML, true afterwards.
 * Use it to render browser-only state (session, role, localStorage) without
 * a hydration mismatch: the first client render then matches the server.
 */
export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )
}
