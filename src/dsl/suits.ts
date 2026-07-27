/** A run of text tagged as a red suit glyph (♥/♦) or plain. */
export interface SuitSegment {
  text: string
  red?: boolean
}

/** The red-suit glyphs. Spades/clubs render in the default color. */
export const RED_SUIT_GLYPHS = ['♥', '♦'] as const
const RED = new Set<string>(RED_SUIT_GLYPHS)

/** Regex matching a single red-suit glyph (for prose decorations). */
export const RED_SUIT_RE = /[♥♦]/g

/** BridgeComposer suit shorthand → glyph, for free-text display. */
const SUIT_ESCAPE: Record<string, string> = { c: '♣', d: '♦', h: '♥', s: '♠' }
const SUIT_ESCAPE_RE = /\\([cdhsCDHS])/g

/**
 * Split text so red-suit glyphs (♥/♦) can be colored wherever they appear —
 * response boxes, footnotes, quiz text, the lesson title. Consecutive plain
 * characters coalesce into one segment. BridgeComposer's `\C \D \H \S`
 * shorthand is expanded to the glyph first, so these free-text surfaces accept
 * the same suit shorthand as prose (where a Milkdown input rule handles it).
 */
export function splitRedSuits(text: string): SuitSegment[] {
  const expanded = text.replace(SUIT_ESCAPE_RE, (_, l: string) => SUIT_ESCAPE[l.toLowerCase()])
  const out: SuitSegment[] = []
  let buffer = ''
  for (const ch of expanded) {
    if (RED.has(ch)) {
      if (buffer) {
        out.push({ text: buffer })
        buffer = ''
      }
      out.push({ text: ch, red: true })
    } else {
      buffer += ch
    }
  }
  if (buffer) out.push({ text: buffer })
  return out
}
