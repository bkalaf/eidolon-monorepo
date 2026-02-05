Below is a **complete, consolidated Codex prompt** that includes everything we discussed: server-authoritative Playwright screenshots, night blocking + ack, storyteller-driven misinfo decisions, artifact retention + `phaseId → artifactId` mapping, dev pop-out viewer, replay plumbing, and the wiki parsing script stubs.

---

## Codex Prompt: Grimoire Screenshot System (Authoritative) + Artifact Retention + Dev Pop-out + Replay + Wiki Parser Stubs

You are implementing features in my existing Node/React/Socket.IO/XState repo for an online BOTC-style game. The server is authoritative. Do **not** implement any client-side screenshot capture. All secret rendering must happen server-side.

### High-level Goals

1. Generate **server-side PNG screenshots** of the storyteller grimoire (and future misinfo variants), send to specific clients as **binary buffers** over Socket.IO.
2. Implement **night-order blocking**: certain roles (Spy/Widow/etc.) must view the screenshot in a modal and **ACK close** before night proceeds (with a timeout fallback).
3. Implement **artifact retention**: nightly storyteller screenshots are saved as artifacts and indexed by **`phaseId → artifactId`** for deterministic replay and dev tooling.
4. Implement **developer-only storyteller pop-out window** that can show the latest retained storyteller screenshot **during day** (for playtesting).
5. Implement **replay plumbing**: after game ends, allow browsing retained nightly storyteller screenshots by phase.
6. Add wiki parsing script improvements + scaffolding for first/other night reminders and future night-logic tokenization.

---

# Part 1 — Screenshot Rendering Pipeline (Server-side, Playwright)

## 1.1 Screenshot Job Model

Create a server-side `ScreenshotJob` store (in-memory or existing server persistence, whichever the repo uses). A job represents an in-flight render request for a specific recipient (e.g., Spy view). Fields:

* `id`
* `gameId`
* `phaseId` (string; stable semantic phase key like `night-2-final` / `night-3-spy-info` etc.)
* `recipientPlayerId`
* `policy` enum:

  * `STORYTELLER_TRUE`
  * `MISINFO_DRUNK_POISON`
  * `MISINFO_VORTOX`
* `seed` (deterministic; stored)
* `revisionHash` (hash of truth slice + policy + seed + recipient)
* `status`: `queued | awaiting_storyteller | rendering | done | failed`
* `expiresAt` (short-lived)
* `pngBuffer` (optional cache; do not persist forever unless needed)

**Note:** Jobs used for “must view now” flows can be ephemeral; artifacts are separate (Part 3).

## 1.2 Render Token Security

Implement a signed, short-lived **render token** for Playwright route access.

* Route `/render/grimoire?token=...` must accept ONLY the token.
* Token resolves to a specific `ScreenshotJob` id.
* Route rejects if token invalid/expired/job not found.
* Route must never accept arbitrary `gameId` params to fetch truth.

## 1.3 View-model Derivation

Implement a pure function boundary:

* `deriveGrimoireView(truthState, { policy, seed, recipientPlayerId, phaseId, misinfoPlan? }) -> viewModelJSON`

**Separation of concerns:** The authoritative game machine must NOT decide what misinformation to show. It may request it from storyteller authority (Part 2).

## 1.4 Storyteller Misinfo Decision Plumbing

When a screenshot requires misinformation (`MISINFO_*`), the server must request a decision from storyteller authority and block until provided (or timeout fallback). Support two modes:

1. **Server/AI storyteller (default for now):** generate a deterministic misinfo plan using `seed`.
2. **Human storyteller (future but scaffold now):**

   * server emits `storyteller:misinfo_request` with `{ jobId, gameId, phaseId, recipientPlayerId, policy, context }`
   * server awaits `storyteller:misinfo_response` with `{ jobId, misinfoPlan }`
   * job transitions to `rendering`

Define `MisinfoPlan` schema (JSON) as explicit edits to apply:

* token swaps, role replacements, alignment flips, etc.
  Implement:
* `applyMisinfoPlan(baseViewModel, misinfoPlan) -> finalViewModel`

No RNG inside renderer; RNG occurs only when generating the misinfo plan (server-side), so renders are repeatable.

## 1.5 Playwright Render Worker

Implement a render service that:

* Reuses a browser instance across renders if possible.
* Loads `/render/grimoire?token=...`
* Ensures deterministic rendering:

  * fixed viewport size
  * wait for fonts/assets to load
  * screenshot a specific container element
* Produces PNG buffer
* Updates job status and returns buffer

---

# Part 2 — Night Blocking “Must View Screenshot” Flow

## 2.1 Socket Events

Define socket event contract (binary buffers):

Server → Client:

* `screenshot:show` `{ jobId, phaseId, pngBytes }` (pngBytes as Buffer/Uint8Array)

Client → Server:

* `screenshot:ack` `{ jobId }` (sent when modal closed)

Optional:

* `screenshot:error` `{ jobId, message }` to client if needed.

## 2.2 Client UI: Screenshot Modal

Implement `GrimoireScreenshotModal`:

* Receives PNG bytes from socket
* Creates an `ObjectURL` (`URL.createObjectURL(new Blob([...], {type:'image/png'}))`)
* Displays image in modal (image-only, no interactivity)
* Blocks other interactions while open (client UX), but server remains authoritative
* On close:

  * revoke ObjectURL
  * emit `screenshot:ack`
* The screenshot must NOT overwrite or reuse player grimoire component/state; keep separate.

## 2.3 XState Integration

Extend night order with a blocking state `generateAndShowScreenshots`:

Sequence:

1. Night actions resolve to truth state.
2. Enter `generateAndShowScreenshots`:

   * Determine recipients who must see a screenshot this phase (Spy nightly, Widow once, etc.).
   * Create `ScreenshotJob`s for those recipients.
   * If policy requires misinfo: request storyteller decision and await.
   * Render screenshots.
   * Emit `screenshot:show` to each recipient with PNG bytes.
   * Block until each recipient ACKs OR timeout triggers fallback.
3. Proceed to day.

Timeout fallback:

* If a client never ACKs, log, mark as skipped, optionally notify storyteller, and continue.

**Important:** This blocking is only for the “must view now” job screenshots (Spy/Widow), not for dev/replay viewing.

---

# Part 3 — Artifact Retention + `phaseId → artifactId` Mapping

## 3.1 Artifact Model

Create `GrimoireScreenshotArtifact` for retained storyteller screenshots:

* `artifactId`
* `gameId`
* `phaseId`
* `createdAt`
* `policy` (usually `STORYTELLER_TRUE`)
* `seed`
* `revisionHash`
* `mimeType: image/png`
* `pngBuffer` OR `storageKey` (use storage if repo has it)
* `width`, `height` (optional)

## 3.2 Always Generate & Retain Storyteller Nightly Artifact

During each night, after truth is finalized (same place you generate jobs), always generate ONE retained storyteller artifact:

* policy: `STORYTELLER_TRUE`
* phaseId should represent the canonical night snapshot (e.g. `night-2-final`)

This retained artifact is separate from ephemeral per-recipient jobs.

## 3.3 Bake `phaseId → artifactId` Into Game State

Add mapping to the authoritative game record/state:

* `phaseArtifacts: Record<phaseId, artifactId>`
  or equivalent schema.

When the nightly storyteller artifact is created:

* persist it
* update `game.phaseArtifacts[phaseId] = artifactId`

Rationale: deterministic replay/dev navigation; no reliance on timestamps or “latest artifact”.

---

# Part 4 — Developer-only Storyteller Pop-out (Live, Day Allowed)

## 4.1 Server Permissioning

Add server-side auth checks:

* only users flagged as developer (`isDeveloper` / `ROLE_DEV`) can access dev artifact APIs.

## 4.2 Dev Socket Events

Client → Server:

* `dev:grimoire_artifacts:list` `{ gameId }`
* `dev:grimoire_artifact:get` `{ artifactId }`
* `dev:grimoire_artifact:getLatest` `{ gameId }` (optional convenience; must be dev-gated)

Server → Client:

* `dev:grimoire_artifacts:list:result` `{ artifacts: [{artifactId, phaseId, createdAt}] }`
* `dev:grimoire_artifact:data` `{ artifactId, phaseId, pngBytes }`

Also implement server push:

* `grimoire_artifact:created` `{ gameId, artifactId, phaseId, createdAt }` emitted to dev subscribers when new nightly artifact is saved.

## 4.3 Client Dev Pop-out Window

Implement a dev tool:

* Button “Storyteller View (Dev)” opens `window.open("/dev/grimoire?gameId=...")`
* Route `/dev/grimoire` renders a viewer that:

  * lists phases (from `phaseArtifacts` mapping or artifact list)
  * loads and displays selected artifact image
  * auto-refreshes to latest on `grimoire_artifact:created` unless user is scrubbing
* This viewer is allowed during day because it is dev-only and reads retained artifacts.

---

# Part 5 — Replay Plumbing (Post-game)

When game ends (`status=finished`):

* Enable replay route (e.g. `/replay/:gameId`) to show retained storyteller artifacts.
* Replay viewer should use `phaseArtifacts` mapping to populate a timeline scrubber.
* Implement storyteller perspective only for now (player perspective toggle can be stubbed).

Server permissioning:

* For now, keep replay artifact access restricted (dev-only or authenticated) unless repo already supports public replays.

Socket events (or REST equivalent) mirror dev, but gated by `game.status=finished` and replay permissions:

* `replay:grimoire_artifacts:list`
* `replay:grimoire_artifact:get`

---

# Part 6 — Wiki Parsing Script Improvements + Stubs

There are scripts that parse BOTC wiki data to generate role JSON. Implement:

## 6.1 Summary → Ability Text

When parsing role pages:

* take the first line of summary/intro
* merge/prepend into `abilityText`
* normalize whitespace and punctuation
* avoid duplicating content

## 6.2 First/Other Night Reminder Stubs

In `src/assets/data/roles.json` baseline (TPI generated), roles include:

* `firstNightReminder`
* `otherNightReminder`
* `firstNightOrderIndex`
* `otherNightOrderIndex`

Update generation scripts to:

* load baseline roles.json
* pass through and include these fields in generated output schema
* add extraction scaffolding from wiki HTML/wikitext (even if incomplete):

  * attempt to locate reminder sections
  * log what was found per role
  * add TODO markers and keep pipeline stable

## 6.3 Night Logic Tokenization Scaffolding

Add schema fields (stubs) for future NLP/tokenization:

* `nightLogicSourceFirst` (raw extracted text blob)
* `nightLogicSourceOther` (raw extracted text blob)
* `nightLogicTokensFirst` (empty array)
* `nightLogicTokensOther` (empty array)

Ensure scripts populate raw sources if found; otherwise leave empty but keep keys present.

---

# Deliverables / Notes

* Use Playwright; add install notes if required.
* Ensure binary buffers work through Socket.IO (no base64 unless necessary).
* Implement timeouts so the game never deadlocks on rendering or ACK.
* Keep dev/replay viewing separate from “must view now” blocking logic.
* Update minimal docs describing socket contracts and how to run renderer locally.

---

# Acceptance Criteria

1. Nightly storyteller artifact generated and saved each night; `phaseArtifacts[phaseId]=artifactId` updated.
2. Spy/Widow/etc. can receive PNG buffer via socket, view modal, and must ACK to proceed; timeout fallback works.
3. `/render/grimoire` only works via signed token; cannot be abused to fetch truth.
4. Dev pop-out window works during day and updates when new nightly artifact created.
5. Replay viewer can scrub phases using `phaseArtifacts` mapping after game ends.
6. Wiki parsing updates: summary first line merged into ability; reminder fields stubbed + schema updated for future logic extraction.

---
