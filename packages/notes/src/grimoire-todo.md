## Codex Prompt: Implement Grimoire UI as In-Room Landing Page (TanStack Start + TanStack Router)

You are working in my local repo. This app uses **TanStack Start** (server backend) and **TanStack Router** (routing). Use TanStack Router throughout, follow the repo’s existing **route file conventions**, loaders, server functions, and layout composition patterns. Do **not** introduce React Router, Next routing, or any alternate routing framework.

### High-level goals

1. **Default room landing page**: entering `/rooms/:roomId` shows the **Grimoire** view (not the existing splash/landing).
2. The Grimoire has two layouts: **circle** and **square** (toggleable via local UI settings).
3. Layout math is deterministic and computed in React. **No state machine controls layout.**
4. Each seat renders:

   * an **avatar tile** (square with rounded corners),
   * a **big role token** (circular) positioned around the avatar according to seat angle,
   * **three reminder tokens** (smaller circles) along the axis from the avatar toward the table center (stored as an array so removing index 0 shifts others down visually).
5. Add a **right-hand Notes drawer** for markdown-ish notes (replacing the need for custom-text reminder tokens).
6. Add a **settings menu** (visible only when in a room) with:

   * token size slider (min ~75px, max ~200px; clamp),
   * layout toggle (circle/square).
7. Layout default rule:

   * If player count **<= 15**, default layout is **circle**
   * If player count **> 15**, default layout is **square**
8. Grimoire background for the room is a **flat slate-blue** (no splash/hero background).

---

# Part A — TanStack Router: Make Grimoire the main in-room route

### Requirements

* Use TanStack Router route definitions / file routes already present in the repo.
* Ensure `/rooms/$roomId` renders the new `GrimoireRoute` / `GrimoirePage` as the default content.
* If the repo currently routes `/rooms/$roomId` to a “lobby/overview” page, replace it so Grimoire is the landing page **or** redirect to the Grimoire route using TanStack Router patterns.
* All routes under `/rooms/$roomId/*` should share room context and room-scoped UI (top bar controls, notes drawer).

### Deliverables

* A new/updated route file for `/rooms/$roomId` that renders Grimoire.
* Any necessary route-level loader to fetch room context (follow existing Start/Router patterns).
* Ensure top bar controls (settings, notes) appear only within `/rooms/$roomId/*`.

---

# Part B — Grimoire component architecture

### Components to create

1. `GrimoirePage` (route component)

   * Full-viewport container with slate-blue background.
   * Contains `Grimoire` + right drawer host + top bar controls integration.
   * Obtains `roomId` from TanStack Router params.
   * Obtains seat/player data using existing app state sources (do not wire game engine yet beyond what’s needed for UI).

2. `Grimoire`

   * Props: `seats`, `layout`, `tokenSize`, `viewport` (width/height), `tableCenter` (computed).
   * Computes positions for each seat and its tokens using pure functions.
   * Layout controlled by local state/hooks (NOT XState).

3. `Seat`

   * Props include:

     * `seatId`, `player` (name, avatar), `angleRad` (circle layout), `positions`
     * `roleToken` data (image ref / id)
     * `reminderTokens: ReminderToken[]` (length 0..3 typical)
   * Renders:

     * Avatar tile (rounded square)
     * Role token as circle (positioned relative to avatar)
     * Reminder tokens as a line toward center

4. `RoomSettingsMenu` (settings wheel UI)

   * Two controls:

     * token size slider (75..200 default)
     * layout toggle (circle/square)
   * Use existing UI patterns in the repo (components, styling system, icon usage).

5. `NotesDrawer`

   * Right-hand drawer overlay, inset below top bar and above bottom bar (if a bottom bar exists).
   * Contains a simple Markdown editor/viewer or “rich text lite”.

---

# Part C — Layout math (circle and square) + token positioning

## Shared inputs

* `viewportWidth`, `viewportHeight` from a `ResizeObserver` hook or existing layout measurement utility.
* `playerCount = seats.length`
* `tokenSize` controls big token diameter `D` directly (clamp 75..200).
* Small reminder token diameter `d = D / 2`.
* Avatar tile size `S` derived from token size (pick a stable ratio, e.g. `S = round(D / 0.8)` so `D ≈ 0.8S`).
* Overhang rule: big token sits so only **40% overlaps** the avatar on the radial line, **60% overhangs** past the avatar edge.

  * Implement this as: token center sits **0.1D** outside the avatar edge along the chosen direction.

## Seat angle definition (circle layout)

* Seats evenly spaced: `angle = (2π * index) / N`
* Define 0 rad at **12:00** position.

  * World position:

    * `x = cx + R * sin(angle)`
    * `y = cy - R * cos(angle)`

## Circle layout: compute seat center positions

* Choose ring radius `R` that fits in viewport:

  * `R = min(viewW, viewH) * 0.5 - margin - seatOuterExtent`
  * Use a conservative `margin` (24..40).
  * `seatOuterExtent` includes half avatar size; include outward protrusion only if you ever place the big token outward.
* Place each seat center at `(cx + R*sin(a), cy - R*cos(a))`.

## Square layout: compute seat positions around perimeter

* Determine available rectangle bounds within viewport margins.
* Distribute seats around perimeter in order:

  * top row left->right, right column top->bottom, bottom row right->left, left column bottom->top
* Compute seat centers based on evenly spaced slots along each edge.
* Keep corners from double counting.

## Token positioning relative to avatar

Each seat has:

* Avatar tile centered at the seat center.
* Big role token:

  * Determine seat “radial direction” vector: `v = normalize(seatCenter - tableCenter)`
  * Default place token **inward toward center** (so it “hangs out” toward the grimoire center):

    * `dir = -v`
  * Place token center at:

    * `avatarCenter + dir * (S/2 + 0.1D)`
* Reminder tokens:

  * Direction `toCenter = normalize(tableCenter - avatarCenter)`
  * Place reminder token centers at:

    * `base = avatarCenter + toCenter * (S/2 + d/2 + gap)`
    * Token i center: `base + toCenter * i * (d + gap)`
  * Reminder tokens driven by an array. Removing index 0 causes remaining tokens to reflow to positions 0..n-1 automatically.

## Deliverables

* A `computeLayout()` module with pure functions:

  * `computeCircleSeatCenters(...)`
  * `computeSquareSeatCenters(...)`
  * `computeSeatTokenPositions(...)`
* Keep geometry in one place and easy to unit-test (add minimal tests only if the repo already has a test setup).

---

# Part D — Notes Drawer (Markdown-friendly)

### Requirements

* Implement a right-hand drawer that can be opened from UI.
* Content is per-room (and optionally per-user).
* Provide a “good enough” Markdown experience:

  * Preferred: `react-markdown` for rendering + a textarea editor + Edit/Preview toggle
  * Optional: a lightweight markdown editor component only if it matches repo conventions
* Top of drawer has formatting controls **if** using a richer editor library. Otherwise provide:

  * Edit/Preview toggle
  * Placeholder/help text for markdown basics

### State/storage

* For now: store notes in local state keyed by `roomId` and persist to `localStorage` (keyed by roomId).
* Add stubs for future server persistence via TanStack Start server functions (don’t fully implement server storage yet).

---

# Part E — Settings state (layout + tokenSize) without involving state machines

### Requirements

* Layout and token size are controlled by local UI settings (React state).
* Settings should be available to Grimoire and to the top bar settings menu.
* Use existing state patterns in the repo (Context, Zustand, etc.). Do not add Redux unless the repo already uses it and it’s clearly the standard.
* Defaults:

  * tokenSize default: choose a sane value (e.g. 120) clamped to 75..200
  * layout default based on player count: `<=15 => circle`, `>15 => square`
* Apply default only if user hasn’t manually overridden layout (track `layoutWasManuallySet`).

---

# Part F — Styling requirements

* Room Grimoire background: flat **slate-blue** (e.g. `#3A4A6B` or similar).
* No splash/hero background on Grimoire page.
* Seat components and tokens should be crisp and readable.
* Reminder tokens are circles and sized exactly half the role token size.

---

# Part G — Integration with future screenshot rendering

The `Grimoire` component must be reusable for server-side rendering later.

* Keep rendering deterministic based on props and computed layout.
* Avoid reading from global browser-only APIs inside core render logic; measure viewport in the route/page and pass width/height down.
* Ensure a future “render mode” prop can force a fixed viewport.

---

# Acceptance checklist

* Visiting `/rooms/$roomId` loads Grimoire immediately via TanStack Router route.
* Settings wheel appears only inside room routes.
* Toggle layout circle/square updates seat arrangement live.
* Token size slider updates avatar size + role token + reminders live (clamped 75..200).
* Each seat shows avatar + role token positioned inward toward center + reminder tokens in a line toward center.
* Notes drawer opens on the right, supports editing + preview, and does not rely on reminder tokens for notes.
* Background is slate-blue and clean.
