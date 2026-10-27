# Contract 5: PDF Lesson Attachments — moved

**This contract now lives in lesson-stage**, at
[`docs/contracts/pdf-attachments.md`](https://github.com/bridge-craftwork/lesson-stage/blob/main/docs/contracts/pdf-attachments.md)
(locally `../lesson-stage/docs/contracts/pdf-attachments.md`). That copy is
normative.

It moved on 2026-10-27, as its *Ownership handover* section provided, and
became shared. pbn-to-pdf is a second producer, using a `pbn` profile at
payload version 2.

**What it means for lesson-studio: nothing changes.** This repo produces the
`lesson-dsl` profile and may keep emitting payload version `1` exactly as
before: the four attachments, the `lesson-block:` links and the attach-last
pipeline. The only addition that touches this profile is optional: provenance
may carry `sourceFormat: "lesson-dsl"`, and absent means the same thing.

Propose changes to the contract in lesson-stage.
