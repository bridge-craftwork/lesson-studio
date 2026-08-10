/**
 * The template-starter content (Contract 1 / architecture doc: the "template
 * starter" plugin pre-loads the one-page topic-intro skeleton). This is the
 * real New Minor Forcing lesson from lesson-library (correct bridge content),
 * carried here as a template — front matter uses placeholder author/draft
 * status so a fresh lesson starts clean. Exercises the active v1 vocabulary:
 * hand + auction + response-box + columnbreak.
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

**New Minor Forcing (NMF)** solves a common problem: after opener rebids 1NT,
responder has 11+ points  and a five-card major but doesn't yet know
whether opener holds three-card support. Bidding the *other* minor — the "new
minor" — is an artificial force that asks opener to further describe shape and strength.

## The trigger

Opener rebids **1NT** over a one-level major response — showing a balanced hand with 12-14 HCP. Responder then bids the *unbid minor*:

\`\`\`auction
dealer: N
columns: 2
labels: Opener, Responder
grid: off
1C   P    1S   P
1NT  P    2D =1= P
---
1. New Minor Forcing — artificial and invitational. Says nothing about diamonds.
\`\`\`

With this hand, responder wants the best game: 4♠ if opener has three spades,
otherwise 3NT.

\`\`\`hand
seat: S
S: A Q 9 5 4
H: K 7 3
D: A 5
C: J 8 4
\`\`\`

\`\`\`columnbreak
\`\`\`

## Opener's rebids

Opener answers the question — cheaply with 12 or 13 HCP, or with a jump with 14 HCP:

\`\`\`response-box
title: Opener's rebids after 1♣–1♠–1NT–2♦!
2H/3H | Four hearts - top priority
2S/3S | Three-card spade support
2NT/3NT | Heart stopper
3D | 4 diamonds
3C | 5 clubs
Jump | With 14 HCP
\`\`\`

## Putting it together

Opposite three-card support, responder drives to the major-suit game:

\`\`\`auction
columns: 2
labels: Opener, Responder
grid: off
dealer: N
1C   P    1S   P
1NT  P    2D =1= P
2S =2= P    4S   P
---
1. New Minor Forcing
2. Three-card spade support, 12-13 HCP
\`\`\`

## Remember

* NMF is **only** on after a **1NT rebid** by opener — not after every 1NT.

* The new minor promises **nothing** in that minor; it is pure convention.

* Responder needs at least invitational values. Weaker hands pass 1NT or sign
  off in a suit instead.
`
