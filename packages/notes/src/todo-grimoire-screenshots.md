Below is a consolidated **Codex prompt** you can paste straight into your implementation agent. It’s written as an “implement this in my repo” task spec with clear constraints, deliverables, and acceptance criteria.

---

## Codex Prompt: Server-Authoritative Grimoire Screenshot + Blocking Night Flow + Wiki Parsing Stubs

You are implementing features in an existing Node/React + Socket.IO + XState codebase for an online Blood on the Clocktower-style game. The server is authoritative. Do **not** implement any client-side screenshot capture. All secret rendering must be server-side.

### Part 1 — Server-side “Storyteller Grimoire Screenshot” Rendering Pipeline (PNG Buffer)

**Goal:** The server can generate a PNG screenshot of a “storyteller perspective” grimoire view (or misinformation variants) and send it to a specific client as a binary buffer over Socket.IO. The client displays it temporarily in a modal, then acknowledges it has been viewed/closed; the night order blocks until the ack is received (or a timeout fallback triggers).

#### Requirements

1. **Screenshot generation must be server-side** using Playwright (preferred) or Puppeteer.
2. The screenshot must be produced from a dedicated render route/page:

   * `/render/grimoire` (or equivalent)
   * The route MUST NOT accept arbitrary `gameId` and role and then fetch truth. It must accept only a **signed short-lived render token** referencing a server-created `ScreenshotJob`.
3. Output format: **PNG buffer**.
4. Delivery: send the PNG buffer via Socket.IO to the intended recipient only.
5. The recipient client:

   * creates an object URL from the received buffer,
   * shows it in a **modal** (image-only; no interactive grimoire),
   * disallows leaving the modal open during day,
   * when user closes modal, emits `screenshot:ack` back to server.
6. **Block night order** while screenshot modal is open:

   * Night flow waits until ack received.
   * Must include a timeout fallback so the game cannot deadlock.
7. The screenshot is temporary:

   * It should not overwrite the player’s own grimoire component/state.
   * Use a separate modal/component for the screenshot overlay.

#### Data Model

Create a `ScreenshotJob` entity persisted in server memory (or existing server store):

* `id`
* `gameId`
* `phaseId` (night number / step id)
* `recipientPlayerId`
* `policy` enum:

  * `STORYTELLER_TRUE`
  * `MISINFO_DRUNK_POISON`
  * `MISINFO_VORTOX`
* `seed` (deterministic RNG seed for repeatable renders)
* `revisionHash` (hash of relevant truth state + policy inputs + seed)
* `status`: `queued|rendering|done|failed`
* `createdAt`, `expiresAt`
* `pngBuffer` (optional in-memory cache) OR storage reference if the repo already uses object storage.

#### View-Model Derivation Separation

Implement a pure function boundary:

* `deriveGrimoireView(truthState, { policy, seed, recipientPlayerId, phaseId }) -> viewModelJSON`
  This returns **the exact data** used by the React `GrimoireView` renderer page.

Important: **The XState game machine must not decide misinformation details.**
Instead, implement a `StorytellerDecision` plumbing step:

* When a screenshot job requires misinformation, server must request a decision from “storyteller authority”.
* For now, support two modes:

  1. AI/storyteller = server (auto decision): provide a default deterministic lie generator using `seed`.
  2. Human storyteller: server emits a `storyteller:misinfo_request` event containing the job id + context; night blocks until storyteller replies with `storyteller:misinfo_response` describing the misinfo edits to apply.

Design this so later the “storyteller authority” can be a user client.

Define a `MisinfoPlan` schema that storyteller returns, e.g.:

* list of token swaps, alignment flips, or “replace player role with X”
* explicit and deterministic (no RNG inside renderer; RNG happens only when generating the plan)
  Then:
* `applyMisinfoPlan(baseViewModel, misinfoPlan) -> finalViewModel`

For Vortox: misinfo plan should support “force globally false learn” constraints.

#### Render Service

Implement a render worker/service that:

* Reuses a single browser instance if possible.
* Loads `/render/grimoire?token=...`
* Waits for fonts/assets to load deterministically.
* Uses fixed viewport and stable CSS (no responsive surprises).
* Captures screenshot of the grimoire container element.
* Returns PNG buffer.
* Updates `ScreenshotJob` status.

#### Security Constraints

* Render token must be short-lived and signed.
* `/render/grimoire` must validate token, load job by id, and refuse if expired.
* Route must never expose truth state to anyone without valid token.
* Socket events must be emitted only to the intended player’s socket(s).
* Avoid broadcast rooms for this.

#### XState Integration (Blocking Pattern)

Add/extend night flow:

* After resolving night actions into truth state, enter a `generateAndShowScreenshots` step/state:

  * Determine recipients who must see grimoire screenshot this phase (Spy nightly, Widow once, Alchemist-spy, etc.).
  * For each recipient, create a ScreenshotJob with correct policy.
  * If misinformation needed, request storyteller decision and await response.
  * Render screenshots.
  * Emit `screenshot:show` to each recipient with PNG buffer.
  * Block until each recipient sends `screenshot:ack` OR timeout triggers fallback.
* On timeout, log and continue night with a fallback server event so storyteller can handle manually.

### Part 2 — Client UI: Grimoire Screenshot Modal

Implement a new client component:

* `GrimoireScreenshotModal`
* Accepts a PNG buffer (ArrayBuffer/Uint8Array).
* Creates object URL, displays in modal.
* On close: revoke object URL, emit ack.
* Must be used ONLY for server-provided screenshot, not for local player grimoire.
* Must block night progression client-side too (disable other inputs while modal open), but server is authoritative.

Socket events:

* server -> client: `screenshot:show` payload: `{ jobId, pngBytes, phaseId }`
* client -> server: `screenshot:ack` payload: `{ jobId }`

### Part 3 — Wiki Parsing Script Improvements + Stubs for Night Reminders

There are existing scripts that parse BOTC wiki data and generate role JSON data used by the app. Implement the following:

#### 3A — Move First Summary Line into Ability Text

* When parsing role pages, take the **first line of the summary** and prepend/merge it into the `abilityText` field.
* Ensure formatting is clean (no duplicate punctuation, no weird whitespace).
* Add tests or fixtures if the repo has them.

#### 3B — Stubs for “First Night Reminder” and “Other Night Reminder”

In `src/assets/data/roles.json` (TPI-generated baseline), each character includes:

* `firstNightReminder`
* `otherNightReminder`
  and night order indices.

Implement a stub pipeline that:

1. Loads existing roles.json baseline.
2. For each role, store in generated output fields:

   * `firstNightReminder` (string or array)
   * `otherNightReminder` (string or array)
   * `firstNightOrderIndex`
   * `otherNightOrderIndex`
3. Add placeholder extraction hooks in the wiki parser:

   * Locate likely sections in raw wiki HTML / wikitext for reminder blocks.
   * Even if extraction is incomplete, create the code structure + TODO markers + logging that prints what was found per role.
4. Ensure the generated schema supports future “tokenized night logic” extraction.

#### 3C — Prepare for Future “Night Logic Tokenization”

Do not fully implement NLP parsing now. Add scaffolding:

* Add fields to role schema output like:

  * `nightLogicSource` (raw extracted text blob for first/other night steps)
  * `nightLogicTokens` (empty array for now)
* Add a script step that saves these raw text blobs for later reverse-engineering.

### Deliverables / Files

* Server: screenshot job store, token signer/verifier, render route, Playwright worker, socket events, XState blocking integration, storyteller misinfo request/response plumbing.
* Client: modal + socket handlers for show/ack + object URL cleanup.
* Scripts: summary-line-to-ability merge, reminder fields passthrough from baseline roles.json, extraction stubs, schema extensions.
* Minimal docs: README section describing how to run screenshot rendering locally (Playwright install notes) and the socket event contract.

### Acceptance Criteria

1. In a local game, triggering spy/widow screenshot produces a PNG buffer server-side and shows modal client-side.
2. Night order does not proceed until modal closed and ack received (or timeout fallback).
3. No client-side rendering of secrets; no html2canvas or DOM capture on client.
4. `/render/grimoire` refuses requests without valid signed token.
5. Role parsing output includes updated ability text and stub reminder fields + raw night logic blobs.

---

If you want this even tighter for “first PR” scope: implement only `STORYTELLER_TRUE` end-to-end, but include the storyteller misinfo request/response plumbing and schema so misinfo can be plugged in next without refactors.
