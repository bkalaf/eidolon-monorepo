Alright, here’s the “full shape” of it: **one Game Machine**, **one Player Actor per seat** (AI or Human, same interface), and **one Role Plugin per seat** (plus optional global/setup plugins). The game machine emits *moments*; plugins react and emit follow-up events; the game machine stays the only authority that mutates state.

This is long, but it’s the kind of long that saves you from later-longer.

---

## 1) Core split: 3 layers that don’t step on each other

### A) Game machine (authoritative rules + phase orchestration)

Owns:

* phase/timing (setup → night → day → nominations → vote → execution → end)
* the canonical game state
* the event queue (process moment → let plugins react → process emitted events)

Does **not**:

* contain per-character logic beyond “run plugin pipeline”
* talk to websockets directly

### B) Player actor (one per seat: Human or AI)

Owns:

* communication loop (send/receive messages over websocket)
* decision loop (requests from game → produce choices)
* “who says what” + chat routing (human types; AI generates)

Both Human and AI implement the same interface:

* receive: `REQUEST_CHOICE`, `REQUEST_CHAT`, `PRIVATE_INFO`, `PUBLIC_ANNOUNCEMENT`
* respond: `CHOICE_MADE`, `CHAT_SENT`

Game doesn’t care if it’s AI or human. It just sees “seatId responds”.

### C) Role plugin (one per seat; may be disabled by drunk/poison)

Owns:

* character-specific mechanics (Virgin, Poisoner, Imp…)
* local ability memory (“spent”, “usedTonight”, “registeredAs”, etc.)
* emits game events (never mutates state directly)

---

## 2) “Moments”: the event taxonomy that scales past 180

Think “moments” as **domain checkpoints**. Here’s a solid minimal set that will cover TB + travelers without turning into 400 bespoke events.

### Setup moments

* `SETUP_STARTED`
* `SETUP_ASSIGN_ROLES` (roles chosen/assigned)
* `SETUP_APPLY_MODIFIERS` (Baron, Drunk, etc.)
* `SETUP_DEAL_INFO` (info roles get their starting info)
* `SETUP_FINISHED`

### Phase moments

* `PHASE_NIGHT_STARTED { night: number }`
* `PHASE_NIGHT_ROLE_TURN { roleId }` (optional, if you do a strict night order)
* `PHASE_NIGHT_ENDED`
* `PHASE_DAY_STARTED { day: number }`
* `PHASE_DAY_ENDED`

### Choice + messaging moments (player actors)

* `REQUEST_CHOICE { requestId, seatId, prompt, options, visibility }`
* `CHOICE_MADE { requestId, seatId, choice }`
* `REQUEST_CHAT { requestId, seatId, channelId, prompt }`
* `CHAT_SENT { seatId, channelId, text, visibility }`

### Nomination / vote / execution moments

* `NOMINATION_STARTED { nominatorId, nomineeId }`
* `NOMINATION_CANCELLED { reason }`
* `VOTE_STARTED { nomineeId }`
* `VOTE_CAST { seatId, vote: boolean }`
* `VOTE_RESOLVED { executed: boolean }`
* `EXECUTION_STARTED { targetId }`
* `EXECUTION_RESOLVED { targetId, died: boolean }`

### Death / state-change moments

* `PLAYER_DIED { playerId, reason }`
* `PLAYER_STATUS_CHANGED { playerId, statusPatch }` (poisoned/drunk/protected/etc.)
* `PUBLIC_INFO_REVEALED { ... }` (Undertaker, Ravenkeeper info, etc.)

### Travelers / Storyteller arbitration moments

* `STORYTELLER_DECISION_REQUESTED { requestId, kind, payload }`
* `STORYTELLER_DECISION_MADE { requestId, decision }`

That’s the backbone. Everything else is “effects emitted from plugins” using those events.

---

## 3) The pipeline that makes this work

When the game machine receives an event, it does:

1. **Reduce base rules** (phase transitions, apply obvious effects).
2. **Run plugin reactions** for that event (filtered by `triggers`).
3. **Enqueue emitted events** (with loop guard, max depth).
4. Continue until queue empty.

Key: you **centralize drunk/poison** here, not inside every role.

### Drunk/poison gating rule (centralized)

Before calling a role plugin’s `react`:

* if role is informational or active ability and seat is `drunk || poisoned`, either:

  * suppress plugin, OR
  * let it run but pass a `ctx.isReliable=false` so it emits “info” via storyteller arbitration

My preference: **let plugins run**, but for anything that returns information, they emit an `STORYTELLER_DECISION_REQUESTED` or “INFO_PROPOSED” and the ST chooses what to deliver. That matches BOTC reality and avoids hardcoding “wrong info generation” logic into every role.

---

## 4) Player actors: Human and AI are the same machine with different “decision services”

Every player needs an actor. Yup. That’s good architecture, not overhead.

### PlayerActor machine (same for AI and Human)

States:

* `idle`
* `awaitingChoice(requestId)`
* `awaitingChat(requestId)`

Transitions:

* on `REQUEST_CHOICE` → `awaitingChoice` → (Human: wait websocket input) (AI: call model) → send `CHOICE_MADE`
* on `REQUEST_CHAT` → `awaitingChat` → (Human: wait text) (AI: call model) → send `CHAT_SENT`

The only difference is the invoked service:

* `decideChoiceHuman()` waits for client message
* `decideChoiceAI()` calls ServerFn → OpenAI → returns choice

So yes: **AI actor and Human actor are the same actor** with different implementations of 2 services. Clean.

---

## 5) Changes you make to your current game machine

You said your setup is currently “switch statement by role”. You’ll change it to:

### New setup flow

1. Assign roles.
2. Build plugin list from role factories.
3. Run `SETUP_APPLY_MODIFIERS` pipeline (Baron, Drunk, etc.).
4. Run `SETUP_DEAL_INFO` pipeline (Washerwoman, etc.), which issues `REQUEST_CHOICE` and `PRIVATE_INFO` events.

That’s it. Your “setup function” becomes “emit setup moments, let plugins do their thing.”

---

## 6) Trouble Brewing: role plugin specs (22 base + 5 travelers)

Below is a **workable plugin blueprint** per character: triggers + what they emit. I’m intentionally using the same moment types so you don’t proliferate event names.

### Townsfolk (13)

#### Washerwoman

* Triggers: `SETUP_DEAL_INFO`
* Emits: `STORYTELLER_DECISION_REQUESTED(kind="INFO", payload={type:"WASHERWOMAN", candidateA, candidateB, claimedRole:"Townsfolk"})`
* Then ST sends `PRIVATE_INFO_REVEALED` → PlayerActor via `PRIVATE_INFO` (or direct `REQUEST_CHAT` for narration)

#### Librarian

* Triggers: `SETUP_DEAL_INFO`
* Emits: storyteller info request `{type:"LIBRARIAN", outsiderRole, candidateA, candidateB}`

#### Investigator

* Triggers: `SETUP_DEAL_INFO`
* Emits: storyteller info request `{type:"INVESTIGATOR", minionRole, candidateA, candidateB}`

#### Chef

* Triggers: `SETUP_DEAL_INFO`
* Emits: storyteller info request `{type:"CHEF", value:number}`

#### Empath

* Triggers: `PHASE_NIGHT_STARTED` (or `PHASE_NIGHT_ENDED`, whichever you standardize)
* Emits: storyteller info request `{type:"EMPATH", value:0|1|2}` based on alive neighbors *and* possible misregistration (Spy/Recluse) and poison/drunk.

#### Fortuneteller

* Triggers: `PHASE_NIGHT_STARTED`
* Needs: a choice (pick 2 players)
* Emits: `REQUEST_CHOICE` to the FT seat (two targets)
* On `CHOICE_MADE`: emits storyteller info request `{type:"FORTUNETELLER", yesNo, redHerringId}`

#### Undertaker

* Triggers: `EXECUTION_RESOLVED` (when someone dies by execution)
* Emits: storyteller info request `{type:"UNDERTAKER", executedPlayerId, shownRole}`

#### Monk

* Triggers: `PHASE_NIGHT_STARTED`
* Emits: `REQUEST_CHOICE` (choose a player)
* On choice: emits `PLAYER_STATUS_CHANGED { target, statusPatch:{ protectedTonightBy:"Monk" } }`

#### Ravenkeeper

* Triggers: `PLAYER_DIED` (if this player died at night)
* Emits: `REQUEST_CHOICE` (choose a player)
* On choice: emits storyteller info request `{type:"RAVENKEEPER", targetId, shownRole}`

#### Virgin

* Triggers: `NOMINATION_STARTED`
* Local state: `spent=false`
* React:

  * if nomineeId === virgin && !spent:

    * if nominator is Townsfolk (account for Spy/Recluse weirdness via storyteller if you want strictness)

      * spent=true
      * emit `NOMINATION_CANCELLED { reason:"VIRGIN" }`
      * emit `EXECUTION_STARTED { targetId:nominatorId }` (or directly `PLAYER_DIED` if you skip execution ceremony)
* Also: if drunk/poisoned, ST can decide it “doesn’t work” → easiest is gating at pipeline.

#### Slayer

* Triggers: `PHASE_DAY_STARTED` (or “anytime during day”, but you can model it as an available action)
* Local: `spent=false`
* This one is best as an **action offer**:

  * Game offers “use slayer shot” as a day action → triggers plugin via `REQUEST_CHOICE`
* Emits:

  * `REQUEST_CHOICE { options: players }`
  * On choice: `STORYTELLER_DECISION_REQUESTED { type:"SLAYER", targetId, hit:boolean }`
  * If hit: `PLAYER_DIED { targetId, reason:"Slayer" }`
* (Storyteller decision handles drunk/poison / misregistration / rules nuance.)

#### Soldier

* Triggers: `PLAYER_DIED`? Not enough. Better:

  * Triggers: `DEATH_PROPOSED { targetId, cause }` (you don’t have this yet but you should)
* If you don’t want a new event type, do:

  * Demon attempts kill → emit `PLAYER_DIED` only after a “death resolution” moment.
    So add one moment:
* `DEATH_ATTEMPTED { targetId, cause }`
  Then Soldier:
* Triggers: `DEATH_ATTEMPTED`
* If targetId === soldier && cause is demon kill:

  * emit `STORYTELLER_DECISION_REQUESTED { type:"PREVENT_DEATH", reason:"SOLDIER" }`
  * Or directly emit `PLAYER_STATUS_CHANGED` that cancels the pending death (see below).
    Practical: keep a pending-death resolution step in the game machine.

#### Mayor

* Triggers:

  * `DEATH_ATTEMPTED` (demon kill) for bounce
  * `VOTE_RESOLVED` for win-check style effects (mostly base rules)
* Mayor bounce (to random neighbor) is storyteller-y; emit:

  * `STORYTELLER_DECISION_REQUESTED { type:"MAYOR_BOUNCE", originalTarget, candidateTargets }`
  * Then apply resulting `DEATH_ATTEMPTED` to new target

---

### Outsiders (4)

#### Butler

* Triggers: `VOTE_STARTED`, `VOTE_CAST`
* Needs: a “master” assignment (Butler chooses who they must follow) — typically during day as an action
* Emits:

  * Day action `REQUEST_CHOICE` to choose master (once, or whenever allowed)
  * On `VOTE_CAST` by butler: if vote doesn’t match master’s vote:

    * emit `STORYTELLER_DECISION_REQUESTED { type:"BUTLER_ENFORCEMENT" }` (or auto-correct vote)
      Practical simplification: when `VOTE_STARTED`, block butler’s vote until master votes, then enforce matching.

#### Drunk

* Triggers: `SETUP_APPLY_MODIFIERS`
* Effect: mark this seat `isDrunk=true`, and assign them a “believedRole” (a Townsfolk role token)
* Emits: `PLAYER_STATUS_CHANGED { playerId, statusPatch:{ drunk:true, believedRole:"Chef" } }`
* Important: their role plugin should be the believed role plugin, but piped through “unreliable info”. So they *think* they’re that role; the ST lies via arbitration.

#### Recluse

* Triggers: none active. It’s a **registration modifier**.
* Implement as a **global registration rule** used by info roles / demon targeting:

  * `ctx.registerAsEvil(playerId)` may return true sometimes for Recluse.
* If you want it purely event-driven:

  * Provide a `registrationService` in context that consults active modifiers (Spy/Recluse/poison etc.)

#### Saint

* Triggers: `EXECUTION_RESOLVED`
* If executed target is Saint and died:

  * emit `GAME_ENDED { result:"EVIL_WINS", reason:"SAINT_EXECUTED" }`
    (Your game machine should own `GAME_ENDED`.)

---

### Minions (4)

#### Poisoner

* Triggers: `PHASE_NIGHT_STARTED`
* Emits: `REQUEST_CHOICE` (choose target)
* On choice: `PLAYER_STATUS_CHANGED { target, statusPatch:{ poisonedUntil:"nextDusk", poisonedBy:"Poisoner" } }`

#### Spy

* Triggers: `SETUP_DEAL_INFO` (to show Grimoire)
* Emits: `STORYTELLER_DECISION_REQUESTED { type:"SPY_GRIMOIRE_VIEW" }`
* Also provides **evil registration modifier**:

  * Spy may register as good/townsfolk to info roles. Implement via shared `registrationService`.

#### Scarlet Woman

* Triggers: `PLAYER_DIED`
* Local: `active=true`
* If demon dies and alive players >= 5 and scarlet alive:

  * emit `STORYTELLER_DECISION_REQUESTED { type:"SCARLET_TAKEOVER" }` (often automatic)
  * emit `PLAYER_STATUS_CHANGED { scarletId, statusPatch:{ role:"Imp" } }`
  * also update demon seatId in game state (important)

#### Baron

* Triggers: `SETUP_APPLY_MODIFIERS`
* Emits: `SETUP_MODIFY { outsidersDelta:+2 }`
  (You can represent this as `PLAYER_STATUS_CHANGED` for global state, but cleaner to have a setup patch event.)

---

### Demon (1)

#### Imp

* Triggers: `PHASE_NIGHT_STARTED`
* Emits:

  * `REQUEST_CHOICE` choose kill target
  * On choice: `DEATH_ATTEMPTED { targetId, cause:"DEMON_KILL" }`
* Also: Imp star-pass

  * If Imp chooses self (or separate “star pass” choice):

    * emit `PLAYER_DIED { impId, reason:"IMP_STAR_PASS" }`
    * emit `STORYTELLER_DECISION_REQUESTED { type:"IMP_STAR_PASS", minionCandidates }`
    * then `PLAYER_STATUS_CHANGED { chosenMinionId, statusPatch:{ role:"Imp" } }`

---

## 7) Travelers (TB 5): plugin sketches

TB Travelers: **Bureaucrat, Thief, Gunslinger, Scapegoat, Beggar**.

Travelers are weird because the ST has more latitude. That’s fine: model that explicitly with `STORYTELLER_DECISION_REQUESTED`.

#### Bureaucrat

* Triggers: `PHASE_DAY_STARTED` (or as a day action)
* Emits: `REQUEST_CHOICE` pick a player
* On choice: `STORYTELLER_DECISION_REQUESTED { type:"BUREAUCRAT", targetId, extraVotes:+2? }`
* Apply as vote weight modifier during next vote(s)

#### Thief

* Triggers: day action
* Emits: `REQUEST_CHOICE` pick player, pick what to steal (vote token / ability use / etc.)
* On choice: `STORYTELLER_DECISION_REQUESTED { type:"THIEF", fromId, effect }`
* Apply as status patches (e.g., “cannot vote this day”)

#### Gunslinger

* Triggers: day action
* Local: “can shoot each day” (or per rules)
* Emits: `REQUEST_CHOICE` pick target
* Then `STORYTELLER_DECISION_REQUESTED { type:"GUNSLINGER", targetId, die:boolean }`
* If die: `PLAYER_DIED { targetId, reason:"Gunslinger" }`

#### Scapegoat

* Triggers: `VOTE_RESOLVED` (when tied or when ST chooses scapegoat)
* Emits: `STORYTELLER_DECISION_REQUESTED { type:"SCAPEGOAT", eligibleVoters }`
* Apply: `PLAYER_STATUS_CHANGED { chosenVoter, statusPatch:{ voteLockedOut:true, duration:"today" } }`

#### Beggar

* Triggers: day chat action (“ask for alms”)
* Emits: `REQUEST_CHOICE` to other players (or ST-mediated): give vote token?
* This is messy in UI; simplest:

  * Beggar requests via game → ST decides who gives votes
  * Emit `STORYTELLER_DECISION_REQUESTED { type:"BEGGAR", donors, votesGranted }`
  * Apply vote weight or vote tokens as status patches

Travelers are basically “ST arbitration + status patches” and that’s not a cop-out — it’s accurate to the game.

---

## 8) The missing piece you *should* add: DEATH_ATTEMPTED

You can hack around it, but you’ll regret it.

Add:

* `DEATH_ATTEMPTED { targetId, cause }`
  Game machine then resolves:

1. run plugins (Monk protection, Soldier immunity, Mayor bounce, etc.)
2. either emits `PLAYER_DIED` or emits `DEATH_PREVENTED`

This makes protection/immune/redirection clean and avoids “oops we already killed them then un-kill them”.

---

## 9) How drunk/poison + storyteller fit without infecting everything

Rule of thumb:

* **Anything that produces info** (Washerwoman, Chef, Empath, Undertaker, FT, Ravenkeeper, etc.)

  * plugin emits `STORYTELLER_DECISION_REQUESTED`
  * storyteller service returns what to show (could be “true”, “false”, “plausible lie”, etc.)
* **Anything that changes mechanics** (Monk protection, Poisoner poisoning, Virgin execution)

  * can be auto, but is suppressed/altered if drunk/poisoned by the pipeline gate

So you don’t code “if poisoned then lie” in 40 places. You centralize it.

---

## 10) What you’ll actually build next (the minimal path)

1. Implement `GameEvent` union + event queue processing.
2. Implement plugin registry + `runPlugins(event)` with drunk/poison gating.
3. Implement player actor template + Human/AI decision services.
4. Convert **one flow** end-to-end:

   * nominations → Virgin → execution resolution
5. Add `DEATH_ATTEMPTED` and convert Monk/Soldier/Imp kill to use it.
6. Convert setup to `SETUP_*` moments and implement 3 info roles (Chef/Investigator/Washerwoman) with storyteller arbitration.

After that, adding the other 160 characters becomes boring work (the good kind).

---

If you want to sanity-check this against your current code shape: the biggest refactor is **setup** and **kill resolution** (because of `DEATH_ATTEMPTED`). Everything else can migrate gradually: you can keep old logic while routing new events through the pipeline, role by role. The universe does not require a big-bang rewrite, thankfully.
