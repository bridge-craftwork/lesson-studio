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

const STRAIN_GLYPH: Record<string, string> = { C: '♣', D: '♦', H: '♥', S: '♠' }

/**
 * Human display for a call: strains become suit glyphs, calls become words.
 * `"1C"` -> `"1♣"`, `"3NT"` -> `"3NT"`, `"P"` -> `"Pass"`, `"X"` -> `"Dbl"`,
 * `"XX"` -> `"Rdbl"`. Input may carry an annotation marker, which is dropped.
 */
export function formatCall(call: string): string {
  const c = stripAnnotationMarker(call)
  if (c === 'P') return 'Pass'
  if (c === 'X') return 'Dbl'
  if (c === 'XX') return 'Rdbl'
  const m = c.match(/^([1-7])(C|D|H|S|NT)$/)
  if (!m) return c
  return m[2] === 'NT' ? `${m[1]}NT` : `${m[1]}${STRAIN_GLYPH[m[2]]}`
}

/** Whether a strain in a call renders in the red suits (for coloring). */
export function isRedCall(call: string): boolean {
  const c = stripAnnotationMarker(call)
  return /[1-7](D|H)$/.test(c)
}

/** One display segment of a call; `red` is true only for a red suit glyph. */
export interface CallSegment {
  text: string
  red?: boolean
}

/**
 * Split a call into display segments so only the suit glyph is colored: the
 * level digit, `NT`, and non-bid calls stay black. `"2D"` ->
 * `[{text:"2"},{text:"♦",red:true}]`; `"3NT"` -> `[{text:"3NT"}]`;
 * `"P"` -> `[{text:"Pass"}]`. Any annotation marker is dropped.
 */
export function callSegments(call: string): CallSegment[] {
  const c = stripAnnotationMarker(call)
  if (c === 'P') return [{ text: 'Pass' }]
  if (c === 'X') return [{ text: 'Dbl' }]
  if (c === 'XX') return [{ text: 'Rdbl' }]
  const m = c.match(/^([1-7])(C|D|H|S|NT)$/)
  if (!m) return [{ text: c }]
  if (m[2] === 'NT') return [{ text: `${m[1]}NT` }]
  return [{ text: m[1] }, { text: STRAIN_GLYPH[m[2]], red: m[2] === 'D' || m[2] === 'H' }]
}
