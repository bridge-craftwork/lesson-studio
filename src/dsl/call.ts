import type { Call } from './types'

/** A legal call: pass/double/redouble, or level 1-7 + strain. */
export const CALL_RE = /^(P|X|XX|[1-7](C|D|H|S|NT))$/

export function isCall(token: string): token is Call {
  return CALL_RE.test(token)
}

/** Strip a trailing annotation marker: `"2C^1"` -> `"2C"`. */
export function stripAnnotationMarker(call: string): string {
  return call.replace(/\^\d+$/, '')
}

/** The annotation index on a call, or null: `"2C^1"` -> `1`. */
export function annotationIndex(call: string): number | null {
  const m = call.match(/\^(\d+)$/)
  return m ? Number(m[1]) : null
}
