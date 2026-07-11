/**
 * The template-starter content (Contract 1 / architecture doc: the "template
 * starter" plugin pre-loads the one-page topic-intro skeleton). This is a
 * minimal, valid Phase-1 lesson exercising the active v1 vocabulary:
 * front matter + hand + auction + response-box. Blocks render as plain fenced
 * code until the node-view plugins in src/blocks/ are wired.
 */
export const STARTER_LESSON = `---
title: New Minor Forcing
skill_paths:
  - bidding_conventions/new_minor_forcing
primary: bidding_conventions/new_minor_forcing
level: intermediate
author: Your Name
status: draft
reviewed-by: self
---

# New Minor Forcing

After a 1m–1M–1NT sequence, responder bids the **unbid minor** as an
artificial game force, asking opener to further describe major-suit support
and hand shape.

## When it applies

Opener rebids 1NT over a one-level major response, and responder has enough
for game but needs more information about the majors.

\`\`\`hand
seat: S
S: A Q 5 4
H: K J 3
D: A 7 2
C: Q 8 5
\`\`\`

\`\`\`auction
dealer: N
1C   P    1S   P
1NT  P    2D^1 P
---
1. New Minor Forcing — artificial, game-forcing
\`\`\`

\`\`\`response-box
title: Opener's rebids after New Minor Forcing
2H | Three-card heart support
2S | Three-card spade support
2NT | No major fit, minimum
3NT | No major fit, maximum
\`\`\`
`
