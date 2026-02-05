```text
You are an expert TypeScript engineer building a Blood on the Clocktower (BOTC) app with TanStack React UI, Redux for client projections, XState for orchestration, shadcn/ui + Tailwind, and ServerFn to protect the OpenAI key. Implement the following architecture precisely. Do NOT invent new mechanics beyond what is specified. Prefer simple, explicit code with strong types.

GOAL
Decouple character logic from GameMachine by using:
1) A canonical game event stream (“moments”) with an event queue
2) A role plugin system (one plugin per seat/role)
3) A player actor per seat (Human or AI; same interface)
4) A storyteller arbitration interface for any resolution that could be distorted (drunk/poison, registration, etc.)
5) effectsService for reminder tokens/statuses, and registrationService for “registers as” queries
6) A deterministic history log of GAME EVENTS ONLY (plus IO + ST events for replay/reveal), with chainId/depth metadata to prevent infinite loops

IMPORTANT RULES
- Players must never be told they are drunk/poisoned. Player actors cannot receive hidden effect flags.
- Do NOT suppress role plugins for drunk/poison. Actions still execute; outcomes are arbitrated.
- Use Storyteller arbitration for outcomes of abilities that can be altered (Virgin trigger, Slayer hit, info roles, etc.).
- Support concurrency: info roles can run in parallel during night and not block the night order unless they affect the board.
- Determinism: every emitted event is appended to history in order; replay uses history order.
- Implement TB baseline: include a plugin framework supporting the TB roles and the 5 TB Travelers; implement Virgin and Slayer exactly as described; sketch the other roles’ mechanics as hooks, ST requests, and effects/events (do not fully hardcode all nuances).

TECH STACK/STRUCTURE
- TypeScript project
- XState (v5 preferred) for GameMachine + PlayerActor machines
- ServerFn for AI calls (decision + chat)
- WebSocket boundary is PlayerActors (Human waits on websocket; AI calls model; both emit IO_* events back to game)

FILE/FOLDER SUGGESTION
src/
  game/
    events.ts
    types.ts
    history.ts
    gameMachine.ts
    nightOrder.ts
    plugin/
      pluginTypes.ts
      pluginRunner.ts
      registry.ts
      roles/
        town/
        outsider/
        minion/
        demon/
        traveler/
    services/
      effectsService.ts
      registrationService.ts
      storytellerService.ts
  actors/
    playerActor.ts
    ai/
      aiDecisionService.ts
    human/
      humanGateway.ts
  shared/
    ids.ts

1) CANONICAL EVENTS (MOMENTS, CLAIMS, IO, ST, EFFECTS)
Create GameEvent union with these families. Every event MUST include:
- eventId: string (unique)
- index: number (assigned on append to history)
- meta: { chainId: string; depth: number; createdAt: number }

MOMENTS (minimum)
- MOMENT_NIGHT_STARTED { day:number }
- MOMENT_BEFORE_WAKE { day:number; roleKey: RoleKey }
- MOMENT_AFTER_WAKE  { day:number; roleKey: RoleKey }
- MOMENT_NIGHT_ENDED { day:number }
- MOMENT_DAY_STARTED { day:number }
- MOMENT_DAY_ENDED { day:number }

NOMINATION/VOTE/EXECUTION
- MOMENT_NOMINATION_STARTED { nominatorId: SeatId; nomineeId: SeatId }
- MOMENT_NOMINATION_CANCELLED { reason:string }
- MOMENT_VOTE_STARTED { nomineeId: SeatId }
- MOMENT_VOTE_CAST { seatId: SeatId; vote:boolean }
- MOMENT_VOTE_RESOLVED { executed:boolean; nomineeId: SeatId }
- MOMENT_DEATH_ATTEMPTED { targetId: SeatId; cause: DeathCause }
- MOMENT_DEATH_RESOLVED { targetId: SeatId; died:boolean; cause: DeathCause }

CLAIMS (generic action interface; used by Slayer and many Travelers)
- MOMENT_CLAIM { kind: ClaimKind; claimId: string; claimantId: SeatId }
- MOMENT_CLAIMED { kind: ClaimedKind; claimId: string; claimantId: SeatId; targetId?: SeatId; payload?: unknown }

IO (player actor boundary)
- IO_REQUEST_CHOICE { requestId:string; seatId:SeatId; prompt:string; options:Array<{id:string; label:string}>; visibility:'PRIVATE'|'PUBLIC'; meta?:{ claimId?:string } }
- IO_CHOICE_MADE { requestId:string; seatId:SeatId; choiceId:string; meta?:{ claimId?:string } }
- IO_REQUEST_CHAT { requestId:string; seatId:SeatId; channelId:string; prompt?:string; visibility:'PRIVATE'|'PUBLIC' }
- IO_CHAT_SENT { seatId:SeatId; channelId:string; text:string; visibility:'PRIVATE'|'PUBLIC' }

STORYTELLER ARBITRATION
- ST_REQUEST { requestId:string; kind: STKind; payload: unknown; await:boolean }
- ST_DECISION { requestId:string; kind: STKind; decision: unknown }

EFFECTS
- EFFECT_APPLY_REQUESTED { effect: EffectSpec }
- EFFECT_APPLIED { effect: EffectInstance }
- EFFECT_DENIED { effect: EffectSpec; reason:string }

GAME END
- GAME_ENDED { winner:'GOOD'|'EVIL'; reason:string }

2) IDENTIFIERS & KEYS
SeatId = string
RoleKey = union of TB+Travelers role keys, plus string extension.
Define Role categories for registration:
- RoleTeam: 'TOWNSFOLK'|'OUTSIDER'|'MINION'|'DEMON'|'TRAVELER'
ClaimKind (extensible) MUST include:
- 'CLAIM_SLAYER'
- 'CLAIM_BUREAUCRAT'
- 'CLAIM_THIEF'
- 'CLAIM_GUNSLINGER'
- 'CLAIM_SCAPEGOAT'
- 'CLAIM_BEGGAR'
ClaimedKind MUST include matching CLAIMED_* kinds.
DeathCause includes: 'DEMON_KILL'|'EXECUTION'|'VIRGIN'|'SLAYER'|'STAR_PASS'|'GUNSLINGER'|string

3) HISTORY LOG
Implement HistoryLog that appends ALL GameEvent (including IO and ST) in strict order.
- append(eventNoIndex): GameEvent with index assigned
- getAll(): readonly GameEvent[]
Replay uses event order.

4) EFFECTS SERVICE (REMINDER TOKENS / STATUSES)
Implement effectsService with duration and source.
Required effect types (minimum):
- POISONED { until:'nextDusk' }
- DRUNK { believedRoleKey: RoleKey }
- PROTECTED { until:'nightEnd' }
- NO_ABILITY { roleKey: RoleKey } (indefinite)
- VOTE_WEIGHT { delta:number; until:'voteEnd'|'dayEnd' }
- VOTE_LOCKED { until:'dayEnd' } (for scapegoat/butler-like constraints)
- GRIMOIRE_VIEW { until:'immediate' } (spy)
Implement query helpers:
- isPoisoned(seatId, momentMeta)
- isDrunk(seatId, momentMeta)
- hasNoAbility(seatId, roleKey)
- getVoteWeight(seatId, momentMeta)

5) REGISTRATION SERVICE
Implement registrationService for:
- registersAsTownsfolk(seatId, observerId, momentMeta)
- registersAsEvil(seatId, observerId, momentMeta)
- registersAsRole(seatId, roleKey, observerId, momentMeta)
- neighborsOf(seatId)
Make this extensible for Recluse/Spy and future scripts.

6) STORYTELLER SERVICE
Interface:
- request(kind, payload, opts:{await:boolean}): Promise<decision|void>
Implement AutoStoryteller for dev that consults effectsService + registrationService and returns plausible decisions.
STKinds MUST include all role-specific checks/info below.

7) PLAYER ACTORS
One PlayerActor XState machine per seat.
Inputs: IO_REQUEST_CHOICE, IO_REQUEST_CHAT
Outputs: IO_CHOICE_MADE, IO_CHAT_SENT
Human services wait for websocket; AI services call ServerFn/OpenAI.

8) PLUGIN SYSTEM
RolePlugin:
- roleKey, seatId
- firstNight?: { beforeWake?: Hook; afterWake?: Hook }
- otherNights?: { beforeWake?: Hook; afterWake?: Hook }
- onEvent?: (event, api) => void|Promise<void>
PluginAPI:
- ctx selectors (read-only): isAlive, getRoleKey, getTeam, getLastExecuted, getAliveSeats, etc.
- effectsService (read queries)
- registrationService
- io.requestChoice(req,{await}) -> emits IO_REQUEST_CHOICE; waits for IO_CHOICE_MADE if await:true
- io.requestST(req,{await}) -> emits ST_REQUEST; waits for ST_DECISION if await:true
- emit(event) -> enqueue in game queue

9) PLUGIN RUNNER + EVENT QUEUE + LOOP GUARDS
Event queue:
- enqueue(event)
- processing appends to history, reduces base state, runs plugin hooks, enqueues emitted events
Loop guards:
- meta.depth increments; maxDepth 25
- maxEventsPerTick 200

10) NIGHT ORDER + CONCURRENCY
Implement TB night order arrays:
- firstNightOrder: RoleKey[]
- otherNightOrder: RoleKey[]
Game emits:
- MOMENT_NIGHT_STARTED
- for roleKey in order:
  - MOMENT_BEFORE_WAKE { day, roleKey }
  - MOMENT_AFTER_WAKE { day, roleKey }
- MOMENT_NIGHT_ENDED
Concurrency:
- Info-only roles use requestST with await:false (do not block night).
- Board-changing roles use await:true for choices and critical resolutions.

11) REQUIRED: VIRGIN PLUGIN (FULL)
RoleKey: 'virgin'
Local: hasAbility=true
Listen: MOMENT_NOMINATION_STARTED
Check 3 things:
1) nomineeId === virginId
2) hasAbility === true (first time)
3) registrationService.registersAsTownsfolk(nominatorId, observerId=virginId, momentMeta) === true
If passes:
- decision = await io.requestST({
    kind:'VIRGIN_TRIGGER_CHECK',
    payload:{ virginId, nominatorId, nomineeId, isFirstTime:true, registersAsTownsfolk:true }
  }, { await:true })
Decision returns { trigger:boolean; spend:boolean }
- if spend: hasAbility=false
- if trigger:
    emit MOMENT_NOMINATION_CANCELLED { reason:'VIRGIN' }
    emit MOMENT_DEATH_ATTEMPTED { targetId:nominatorId, cause:'VIRGIN' }

12) REQUIRED: SLAYER CLAIM FLOW (FULL)
RoleKey: 'slayer'
Local: hasAbility=true
Claim initiation:
- Actor emits MOMENT_CLAIM { kind:'CLAIM_SLAYER', claimId, claimantId }
- Game system handler issues IO_REQUEST_CHOICE to claimantId (await:true), then emits:
  MOMENT_CLAIMED { kind:'CLAIMED_SLAYER', claimId, claimantId, targetId }
Plugin listens to MOMENT_CLAIMED kind='CLAIMED_SLAYER':
- if claimantId !== ownerId: io.requestST({kind:'CLAIMED_SLAYER', payload:{result:'FAIL', claimId, claimantId}}, {await:false}); return;
- if !hasAbility OR effectsService.hasNoAbility(ownerId,'slayer'):
    io.requestST({kind:'CLAIMED_SLAYER', payload:{result:'FAIL', claimId, claimantId}}, {await:false}); return;
- decision = await io.requestST({kind:'CLAIMED_SLAYER', payload:{result:'SUCCESS', claimId, claimantId, targetId}}, {await:true})
- hasAbility=false
- emit EFFECT_APPLY_REQUESTED { effect:{ type:'NO_ABILITY', roleKey:'slayer', targetId:ownerId, source:{roleKey:'slayer', seatId:ownerId}, until:{kind:'customEventIndex', value:Infinity} } }
- if decision.killTarget: emit MOMENT_DEATH_ATTEMPTED { targetId, cause:'SLAYER' }

13) BASE REDUCERS (MINIMUM)
Implement reducers to:
- Resolve EFFECT_APPLY_REQUESTED -> EFFECT_APPLIED/EFFECT_DENIED (ST may arbitrate for some)
- Resolve MOMENT_DEATH_ATTEMPTED -> MOMENT_DEATH_RESOLVED (consult protection effects; allow plugins to intercept later)
- Apply death to alive flags on MOMENT_DEATH_RESOLVED
- Handle GAME_ENDED

14) ROLE ABILITY SKETCHES (ALL TB 22 + 5 TRAVELERS)
Implement plugin factories for each role key below. You must include hooks/triggers and STKinds for each. Full correctness is NOT required now, but the scaffolding must reflect intended moment points and data flow. Prefer: compute “truth/proposal” in plugin -> requestST -> deliver result via chat/info events. Avoid leaking hidden info.

A) TOWNSFOLK (13)
1) washerwoman (first night info, non-blocking)
- firstNight.beforeWake:
  - io.requestST({ kind:'INFO_WASHERWOMAN', payload:{ seatId, day, truth:{ roleClaimed:'TOWNSFOLK', candidates:[a,b] } } }, { await:false })
- ST decision returns message/options; game/actor delivers PRIVATE info.

2) librarian (first night info, non-blocking)
- firstNight.beforeWake:
  - io.requestST({ kind:'INFO_LIBRARIAN', payload:{ truth:{ outsiderRoleKey, candidates:[a,b] } } }, { await:false })

3) investigator (first night info, non-blocking)
- firstNight.beforeWake:
  - io.requestST({ kind:'INFO_INVESTIGATOR', payload:{ truth:{ minionRoleKey, candidates:[a,b] } } }, { await:false })

4) chef (first night info, non-blocking)
- firstNight.beforeWake:
  - io.requestST({ kind:'INFO_CHEF', payload:{ truth:{ count:number } } }, { await:false })

5) empath (other nights info, non-blocking)
- otherNights.beforeWake:
  - compute neighbors = registrationService.neighborsOf(seatId)
  - truth count uses registrationService.registersAsEvil(neighbor)
  - io.requestST({ kind:'INFO_EMPATH', payload:{ truth:{ count:0|1|2 } } }, { await:false })

6) fortuneteller (all nights choice+info; choice blocking, info non-blocking)
- firstNight.beforeWake and otherNights.beforeWake:
  - targetA = await io.requestChoice({prompt:'Pick 1',...},{await:true})
  - targetB = await io.requestChoice({prompt:'Pick 2',...},{await:true})
  - io.requestST({ kind:'INFO_FORTUNETELLER', payload:{ truth:{ targets:[A,B], yesNo:boolean, redHerringId } } }, { await:false })

7) undertaker (other nights info, non-blocking)
- otherNights.beforeWake:
  - executed = ctx.getLastExecuted()
  - if none: noop
  - io.requestST({ kind:'INFO_UNDERTAKER', payload:{ truth:{ executedId, shownRoleKey } } }, { await:false })

8) monk (other nights: protect; blocking)
- otherNights.beforeWake:
  - target = await io.requestChoice({prompt:'Protect who?', options:alive},{await:true})
  - emit EFFECT_APPLY_REQUESTED { effect:{ type:'PROTECTED', targetId:target, source:{roleKey:'monk', seatId}, until:{kind:'nightEnd'} } }
  - OPTIONAL STKind 'MONK_PROTECTION_RESOLVE' if you want ST to deny silently when poisoned/drunk; otherwise resolve denial in AutoStoryteller via EFFECT_APPLY_REQUESTED arbitration.

9) ravenkeeper (reactive: if dies at night, then choose and learn role; blocking choice, non-blocking info)
- onEvent MOMENT_DEATH_RESOLVED:
  - if targetId===seatId AND died===true AND cause==='DEMON_KILL' (or night cause):
      target = await io.requestChoice({prompt:'Learn role of who?', options:alive},{await:true})
      io.requestST({ kind:'INFO_RAVENKEEPER', payload:{ truth:{ targetId:target, shownRoleKey } } }, { await:false })

10) virgin (implemented fully above)

11) slayer (implemented fully above via CLAIM flow)

12) soldier (passive immunity to demon kill; requires death resolution)
- onEvent MOMENT_DEATH_ATTEMPTED:
  - if targetId===seatId AND cause==='DEMON_KILL':
      io.requestST({ kind:'SOLDIER_IMMUNITY_CHECK', payload:{ seatId, day } }, { await:true })
      decision returns { prevent:boolean }
      if prevent: emit MOMENT_DEATH_RESOLVED { targetId:seatId, died:false, cause:'DEMON_KILL' } OR emit a DEATH_PREVENTED event if you add it.
(Keep it simple: handle in base death resolver by checking roleKey==='soldier' via ST arbitration.)

13) mayor (passive; may cause demon kill to bounce; plus endgame edge)
- onEvent MOMENT_DEATH_ATTEMPTED:
  - if targetId===seatId AND cause==='DEMON_KILL':
      decision = await io.requestST({ kind:'MAYOR_BOUNCE_CHECK', payload:{ mayorId:seatId, candidates:ctx.getAliveSeatsExcept(seatId) } }, { await:true })
      decision returns { bounceTo?:SeatId; prevent:boolean }
      if bounceTo: emit MOMENT_DEATH_ATTEMPTED { targetId:bounceTo, cause:'DEMON_KILL' }
      if prevent: resolve mayor death as died:false

B) OUTSIDERS (4)
14) butler (vote constraint; master selection via claim or ST; enforce during vote)
- Provide claim flow: ClaimKind 'CLAIM_BUTLER_MASTER' (optional) OR use ST to assign.
- onEvent MOMENT_VOTE_STARTED:
  - io.requestST({ kind:'BUTLER_MASTER_INFO', payload:{ butlerId:seatId } }, { await:false }) (ST decides/returns who master is for UI if needed; keep hidden if appropriate)
- onEvent MOMENT_VOTE_CAST for butler:
  - decision = await io.requestST({ kind:'BUTLER_VOTE_ENFORCE', payload:{ butlerId, butlerVote, masterVote? } }, { await:true })
  - decision returns { overrideVote?:boolean } -> emit corrected MOMENT_VOTE_CAST if overriding, OR apply VOTE_LOCKED earlier.
(Sketch only; TODO refine.)

15) drunk (setup modifier; believes they are a townsfolk)
- during setup: emit EFFECT_APPLY_REQUESTED { type:'DRUNK', targetId:drunkSeat, believedRoleKey:someTownsfolk, source:{roleKey:'drunk', seatId:drunkSeat}, until:{kind:'customEventIndex', value:Infinity} }
- registry should attach believed role plugin to this seat (roleKey=believedRoleKey) while true roleKey remains 'drunk' in state for ST only. Keep this as TODO: store trueRoleKey vs shownRoleKey.

16) recluse (registration modifier)
- no active hooks; registrationService should sometimes treat them as evil/minion/demon for observers. Implement as TODO in registrationService; plugin can be empty.

17) saint (if executed, good loses)
- onEvent MOMENT_DEATH_RESOLVED:
  - if targetId===seatId AND cause==='EXECUTION' AND died===true:
      emit GAME_ENDED { winner:'EVIL', reason:'SAINT_EXECUTED' }

C) MINIONS (4)
18) poisoner (other nights choose target; blocking; applies POISONED until nextDusk)
- otherNights.beforeWake:
  - target = await io.requestChoice({prompt:'Poison who?', options:aliveExceptSelf},{await:true})
  - emit EFFECT_APPLY_REQUESTED { effect:{ type:'POISONED', targetId:target, source:{roleKey:'poisoner', seatId}, until:{kind:'nextDusk'} } }

19) spy (first night: sees grimoire; non-blocking info)
- firstNight.beforeWake:
  - io.requestST({ kind:'SPY_GRIMOIRE_VIEW', payload:{ spyId:seatId, truth:{ fullGrimoire:ctx.getGrimoireSnapshotSTOnly() } } }, { await:false })
- registrationService TODO: spy may register as good/townsfolk.

20) scarletwoman (reactive: if demon dies while >=5 alive, becomes demon)
- onEvent MOMENT_DEATH_RESOLVED:
  - if ctx.roleOf(targetId) is demon AND died===true:
      decision = await io.requestST({ kind:'SCARLETWOMAN_TAKEOVER_CHECK', payload:{ scarletId:seatId, aliveCount:ctx.getAliveCount() } }, { await:true })
      decision returns { takeover:boolean }
      if takeover:
        emit ST_REQUEST/DECISION or direct ROLE_SWAP events (define ROLE_CHANGED event if needed) to set scarlet to imp and update demon seat tracking.
(Scaffold only; implement state event: ROLE_CHANGED { seatId, newRoleKey }.)

21) baron (setup modifier: +2 outsiders)
- during setup: emit SETUP_MODIFY { outsidersDelta:+2 } (if you have SETUP events) OR handle as state patch in GameMachine. If no setup events exist, add:
  - SETUP_MODIFY { outsidersDelta:number } as GameEvent
- Plugin can be onEvent MOMENT_NIGHT_STARTED day=1 and only once -> emit SETUP_MODIFY; TODO integrate cleanly.

D) DEMON (1)
22) imp (all nights: choose kill target; blocking; may star-pass)
- beforeWake (first + other nights):
  - target = await io.requestChoice({prompt:'Kill who?', options:aliveExceptSelfPlusSelfForStarPass},{await:true})
  - if target===seatId:
      decision = await io.requestST({ kind:'IMP_STAR_PASS', payload:{ impId:seatId, candidates:ctx.getAliveMinions() } }, { await:true })
      decision returns { newImpId:SeatId }
      emit MOMENT_DEATH_ATTEMPTED { targetId:seatId, cause:'STAR_PASS' } (then resolve to death)
      emit ROLE_CHANGED { seatId:decision.newImpId, newRoleKey:'imp' }
  - else:
      emit MOMENT_DEATH_ATTEMPTED { targetId:target, cause:'DEMON_KILL' }

E) TRAVELERS (5) — ALL VIA CLAIM FLOW + ST ARBITRATION + EFFECTS
Traveler abilities are ST-flexible; model as CLAIM -> CLAIMED -> ST_REQUEST -> effects/deaths.

23) bureaucrat
- Actor emits MOMENT_CLAIM { kind:'CLAIM_BUREAUCRAT', claimId, claimantId }
- Game requests choice target (await:true) then emits MOMENT_CLAIMED { kind:'CLAIMED_BUREAUCRAT', claimId, claimantId, targetId }
- Plugin listens:
  - if claimantId!==ownerId => ST_REQUEST result:'FAIL' (await:false)
  - else:
     decision = await io.requestST({ kind:'BUREAUCRAT_RESOLVE', payload:{ claimantId, targetId } }, { await:true })
     decision returns { voteWeightDelta:number; duration:'voteEnd'|'dayEnd' }
     emit EFFECT_APPLY_REQUESTED { effect:{ type:'VOTE_WEIGHT', targetId, delta:voteWeightDelta, until:{kind:duration} } }

24) thief
- CLAIM_THIEF -> choice target -> CLAIMED_THIEF
- ST_REQUEST 'THIEF_RESOLVE' returns a patch describing what is stolen (vote rights, ability lock, etc.)
- Apply effects accordingly, e.g. VOTE_LOCKED, NO_ABILITY (roleKey?), etc. Keep generic:
  - decision: { effectsToApply: EffectSpec[] }
  - emit EFFECT_APPLY_REQUESTED for each

25) gunslinger
- CLAIM_GUNSLINGER -> choice target -> CLAIMED_GUNSLINGER
- decision = await io.requestST({ kind:'GUNSLINGER_RESOLVE', payload:{ claimantId, targetId } }, { await:true })
- decision returns { killTarget:boolean }
- if killTarget: emit MOMENT_DEATH_ATTEMPTED { targetId, cause:'GUNSLINGER' }

26) scapegoat
- CLAIM_SCAPEGOAT -> (may not need target; can be ST-chosen). Implement as:
  - Actor emits claim; game emits MOMENT_CLAIMED with no targetId.
- Plugin listens on MOMENT_VOTE_RESOLVED or on CLAIMED:
  - decision = await io.requestST({ kind:'SCAPEGOAT_RESOLVE', payload:{ scapegoatId:ownerId, eligibleVoters:ctx.getAliveSeats() } }, { await:true })
  - decision returns { punishedVoterId:SeatId; duration:'dayEnd' }
  - emit EFFECT_APPLY_REQUESTED { effect:{ type:'VOTE_LOCKED', targetId:punishedVoterId, until:{kind:'dayEnd'} } }

27) beggar
- CLAIM_BEGGAR -> ST decides donors / vote tokens
- decision = await io.requestST({ kind:'BEGGAR_RESOLVE', payload:{ beggarId:ownerId, alive:ctx.getAliveSeats() } }, { await:true })
- decision returns { voteWeightDelta:number; duration:'dayEnd' } OR list of effects.
- Apply EFFECT_APPLY_REQUESTED (often VOTE_WEIGHT on beggar).

15) SETUP DECOUPLING
Replace setup switch statements with:
- Assign roles
- Build plugins from registry
- Create PlayerActors per seat (AI/human)
- Start night/day loop by emitting MOMENT_NIGHT_STARTED / MOMENT_BEFORE_WAKE etc.
- Apply setup modifiers via role plugins (baron, drunk) during day=1 pre-night or via explicit SETUP_* events if you add them.

DELIVERABLES
- TypeScript code implementing framework above
- Minimal runnable GameMachine with event queue + history log + plugin runner
- PlayerActor machine + human/ai service stubs
- effectsService + registrationService + storytellerService (auto storyteller)
- Virgin and Slayer implemented fully; all other TB+Travelers implemented as scaffolds with correct hooks and STKinds

QUALITY REQUIREMENTS
- Strong typing; avoid any
- Deterministic history ordering; stable IDs
- Do not leak hidden effects to players
- Plugins must not mutate GameMachine state directly; mutate by emitted events only
- Use TODO comments for rule details not implemented
```

------------------------------------------------------------

```text
CODEX PROMPT — SECTS & VIOLETS (SnV) PLUGIN OUTLINE PACK

You are implementing the BOTC plugin architecture (moments + event queue + plugins + player actors + ST arbitration + effectsService + registrationService + history log) exactly as previously specified for TB. Now add a complete “Sects & Violets” (SnV) pack: all 25 roles sketched as plugins (hooks/triggers, STKinds, effects, claims, and required engine deltas). Do NOT fully hardcode all rules; produce solid scaffolding that matches intended timing and data flow, and is future-proof for additional characters.

PRIMARY DESIGN RULES
- Never leak drunk/poison/madness/hidden flags to player actors.
- Never suppress a plugin due to drunk/poison/madness. The action occurs; resolution is arbitrated via ST_REQUEST and/or effect application policy.
- All information roles must use ST arbitration (INFO_*), allowing Vortox/drunk/poison/misregistration to distort outcomes without players knowing why.
- Support concurrency: pure info can be await:false during night.
- Determinism: log all MOMENT_*, CLAIM*, IO_*, ST_* events.

A) REQUIRED ENGINE DELTAS FOR SnV
Add/ensure these events exist (or equivalent):
1) ROLE_CHANGED { seatId, newRoleKey, reason?:string }
2) ALIGNMENT_CHANGED { seatId, newAlignment:'GOOD'|'EVIL', reason?:string }
3) NOMINATION_FINALIZED { nominatorId, nomineeId } (optional, but helps Witch timing; if not, use MOMENT_NOMINATION_STARTED and ST arbitration)
4) MADNESS_DECLARED { seatId, roleKey, until:'dusk'|'gameEnd' } (optional; you can represent as effects only)
5) MOMENT_DUSK { day:number } (recommended; simplifies “until dusk” expirations)

Add/ensure these effect types exist:
- MADNESS { roleKey, until:'dusk' } (Cerenovus)
- VORTOX { } (global effect while Vortox alive)
- NO_DASHII_POISON_AURA { sourceDemonId } (global-ish; or compute in effectsService)
- SWEETHEART_DRUNK { } (drunk transfer on death)
- EVIL_TWIN_LINK { twinA, twinB } (global linkage)
- PHILOSOPHER_USED { } (spent marker)
- ONCE_PER_GAME_USED { roleKey } (generic)

Add/ensure registrationService can handle:
- “registers as evil/minion/demon” or “registers as good” overrides when needed (minimal now)
- Seat distance measurement helper: distanceBetweenSeats(a,b) around the circle (Clockmaker)

Add/ensure storytellerService STKinds for SnV:
INFO: INFO_CLOCKMAKER, INFO_DREAMER, INFO_MATHEMATICIAN, INFO_FLOWERGIRL, INFO_TOWN_CRIER,
      INFO_ORACLE, INFO_SAVANT, INFO_SEAMSTRESS, INFO_ARTIST, INFO_JUGGLER, INFO_SAGE
RESOLUTION: VORTOX_INFO_INVERT (can be implicit), MADNESS_ENFORCEMENT, WITCH_TRIGGER_CHECK,
            EVIL_TWIN_WIN_CHECK, SNAKE_CHARMER_SWAP, PIT_HAG_CHANGE, PHILOSOPHER_GAIN,
            BARBER_SWAP, KLUTZ_PICK, SWEETHEART_DRUNK_ASSIGN, FANG_GU_JUMP, VIGORMORTIS_POISON,
            NO_DASHII_AURA, VORTOX_EXECUTION_RULE, CERENOVUS_MADNESS_ASSIGN

B) SnV ROSTER (25)
Townsfolk (13): clockmaker, dreamer, snake_charmer, mathematician, flowergirl, town_crier, oracle,
                savant, seamstress, philosopher, artist, juggler, sage
Outsiders (4): mutant, sweetheart, barber, klutz
Minions (4): evil_twin, witch, cerenovus, pit_hag
Demons (4): fang_gu, vigormortis, no_dashii, vortox

C) NIGHT ORDER TAGGING (do NOT overfit; just categorize)
- Role/Alignment change: philosopher, snake_charmer, pit_hag, fang_gu (jump), barber (on death)
- Poison/drunk sources: no_dashii, sweetheart (on death)
- Madness: cerenovus
- Kills: demons
- Info: all TF infos, oracle, etc.
Implement firstNightOrder and otherNightOrder arrays for SnV with reasonable grouping; do not worry about perfect official ordering yet.

D) PLUGIN SCAFFOLDS (ALL 25)
For each role, implement:
- roleKey, seatId
- firstNight/otherNights hooks and/or onEvent
- required ST_REQUEST calls (await true/false)
- required effects emitted via EFFECT_APPLY_REQUESTED
- any CLAIM kinds if you choose to route via MOMENT_CLAIM (recommended for day-use roles like Artist/Juggler)

TOWNSFOLK

1) clockmaker (first night, info, non-blocking)
- firstNight.beforeWake:
  truth: distance between demon and nearest minion using registrationService.distance + alive seating
  io.requestST({kind:'INFO_CLOCKMAKER', payload:{clockmakerId:seatId, truth:{distance}}},{await:false})

2) dreamer (each night, choice+info; choice blocking; info non-blocking)
- beforeWake (first + other):
  target = await io.requestChoice({prompt:'Choose a player', options:aliveExceptSelf},{await:true})
  truth: { targetId, goodRoleKey, evilRoleKey } (one correct)
  io.requestST({kind:'INFO_DREAMER', payload:{truth}}, {await:false})

3) snake_charmer (each night, choice; role/alignment swap; blocking)
- beforeWake:
  target = await requestChoice(...,{await:true})
  decision = await requestST({kind:'SNAKE_CHARMER_SWAP', payload:{charmerId:seatId, targetId}}, {await:true})
  decision returns { swap:boolean, newDemonId?:SeatId } (ST handles if target is demon and any edge)
  if swap:
    emit ROLE_CHANGED/ALIGNMENT_CHANGED events per decision (at minimum swap roles between charmer and demon)

4) mathematician (each night, info about malfunction count; non-blocking)
- otherNights.beforeWake:
  truth: { malfunctionCount:number } (count of players whose abilities malfunctioned due to drunk/poison/etc. previous day/night)
  io.requestST({kind:'INFO_MATHEMATICIAN', payload:{truth}}, {await:false})
(Engine note: you may need a “malfunction ledger” recorded as events; stub with TODO.)

5) flowergirl (each night, info about whether demon voted today; non-blocking)
- otherNights.beforeWake:
  truth: { demonVoted:boolean } (based on vote log)
  io.requestST({kind:'INFO_FLOWERGIRL', payload:{truth}}, {await:false})

6) town_crier (each night, info about whether a minion nominated today; non-blocking)
- otherNights.beforeWake:
  truth: { minionNominated:boolean } (based on nomination log)
  io.requestST({kind:'INFO_TOWN_CRIER', payload:{truth}}, {await:false})

7) oracle (each night, info: number of dead evil; non-blocking)
- otherNights.beforeWake:
  truth: { deadEvilCount:number } (use registrationService.registersAsEvil on dead seats; include recluse/spy style TODO)
  io.requestST({kind:'INFO_ORACLE', payload:{truth}}, {await:false})

8) savant (each day, learns two statements one true one false; use dusk or day start; non-blocking)
- onEvent MOMENT_DAY_STARTED:
  io.requestST({kind:'INFO_SAVANT', payload:{day, truth:{trueStatement, falseStatement}}},{await:false})
(Engine note: statements are narrative; ST decides content; truth payload can be empty and ST generates both.)

9) seamstress (once per game at night: choose 2 players, learn if same alignment; blocking choice, non-blocking info)
- local hasAbility=true
- beforeWake (first + other):
  if !hasAbility: noop
  decision = await requestST({kind:'SEAMSTRESS_OFFER_ACTION', payload:{seatId}}, {await:true})
  if decision.useNow===false: noop
  a = await requestChoice(...,{await:true}); b = await requestChoice(...,{await:true})
  io.requestST({kind:'INFO_SEAMSTRESS', payload:{truth:{a,b,sameAlignment:boolean}}},{await:false})
  hasAbility=false; emit EFFECT_APPLY_REQUESTED(NO_ABILITY roleKey='seamstress')

10) philosopher (once per game at night: gain another good ability; blocking; causes drunk self side-effect in rules—model via ST)
- local used=false
- beforeWake:
  if used: noop
  use = await requestST({kind:'PHILOSOPHER_GAIN', payload:{philoId:seatId, options:eligibleGoodRoles}}, {await:true})
  decision returns { gainedRoleKey:RoleKey, applyDrunkTo?:SeatId } (ST handles drunk target per rules)
  emit EFFECT_APPLY_REQUESTED({type:'PHILOSOPHER_USED', targetId:seatId,...})
  emit ROLE_CHANGED or “SECONDARY_ABILITY_GRANTED” (choose one approach; recommend SECONDARY_ABILITY_GRANTED effect)
  used=true
(Engine note: support “secondary ability plugin” stacking later; for now, treat as ROLE_CHANGED + store original role separately ST-only.)

11) artist (once per game by day: ask a question; answer yes/no; route via CLAIM)
- ClaimKind: CLAIM_ARTIST_QUESTION
- Actor emits MOMENT_CLAIM {kind:'CLAIM_ARTIST_QUESTION', claimId, claimantId} with payload {questionText}
- Plugin listens MOMENT_CLAIMED kind CLAIMED_ARTIST_QUESTION:
  if claimantId!=owner or no ability => ST_REQUEST fail
  else decision=await ST_REQUEST {kind:'INFO_ARTIST', payload:{questionText, truthAnswer:boolean}} await:true
  spend ability -> EFFECT NO_ABILITY('artist')

12) juggler (once per game by day: make multiple guesses; next night learn count correct; route via CLAIM + stored guesses)
- ClaimKind: CLAIM_JUGGLER
- CLAIMED_JUGGLER payload includes guesses map (seatId->roleKey)
- Plugin stores guesses in plugin local state OR emits JUGGLER_GUESSES_RECORDED event for determinism
- next night (otherNights.beforeWake) if guesses recorded and not resolved:
  io.requestST({kind:'INFO_JUGGLER', payload:{truth:{correctCount}}},{await:false})
  mark resolved; NO_ABILITY

13) sage (on death at night: learn 2 players, 1 is demon; blocking choice? Actually ST provides; model via ST)
- onEvent MOMENT_DEATH_RESOLVED:
  if targetId==seatId and died==true and cause is night/demon:
    io.requestST({kind:'INFO_SAGE', payload:{truth:{candidates:[a,b], oneIsDemon:true}}},{await:false})

OUTSIDERS

14) mutant (madness: if you claim outsider, you might be executed; enforce via ST on chat/claim events)
- onEvent IO_CHAT_SENT or MOMENT_CLAIMED:
  io.requestST({kind:'MADNESS_ENFORCEMENT', payload:{roleKey:'mutant', seatId, utterance}}, {await:false})
(Engine note: do not auto-kill; ST decides consequences, potentially emits MOMENT_DEATH_ATTEMPTED cause='EXECUTION' or special.)

15) sweetheart (on death: 1 player becomes drunk)
- onEvent MOMENT_DEATH_RESOLVED:
  if targetId==seatId and died:
    decision = await requestST({kind:'SWEETHEART_DRUNK_ASSIGN', payload:{sweetheartId:seatId, candidates:alive}}, {await:true})
    emit EFFECT_APPLY_REQUESTED({type:'DRUNK', targetId:decision.targetId, believedRoleKey:ctx.getShownRoleKey(decision.targetId), until:...})

16) barber (if you die at night: 2 players may swap characters)
- onEvent MOMENT_DEATH_RESOLVED:
  if self died and cause is night:
    decision = await requestST({kind:'BARBER_SWAP', payload:{barberId:seatId, candidates:alive}}, {await:true})
    decision returns { swap:boolean, a?:SeatId, b?:SeatId }
    if swap: emit ROLE_CHANGED events for a and b swapping roleKeys

17) klutz (when you die: choose a player; if minion, evil wins)
- onEvent MOMENT_DEATH_RESOLVED:
  if self died:
    choice = await requestChoice({prompt:'Choose a player', options:alive},{await:true})
    decision = await requestST({kind:'KLUTZ_PICK', payload:{klutzId:seatId, pickedId:choice}}, {await:true})
    decision returns { evilWins:boolean }
    if evilWins: emit GAME_ENDED {winner:'EVIL', reason:'KLUTZ_PICKED_MINION'}

MINIONS

18) evil_twin (link good+evil twins; if good twin executed, evil wins; enforce claims/madness around “I am the twin”; model via ST)
- during setup: apply EVIL_TWIN_LINK effect to both twins via ST_REQUEST
- onEvent MOMENT_DEATH_RESOLVED cause='EXECUTION':
  if executed seat is the GOOD twin per link:
    decision = await requestST({kind:'EVIL_TWIN_WIN_CHECK', payload:{executedId}}, {await:true})
    if decision.evilWins: emit GAME_ENDED {winner:'EVIL', reason:'EVIL_TWIN_EXECUTED_GOOD_TWIN'}
(Engine note: determining which is good/evil twin is ST-only; store in effect.)

19) witch (if you nominate today, you might die; usually: if you nominate, you die tonight. Model as ST arbitration tied to nomination)
- onEvent MOMENT_NOMINATION_STARTED:
  decision = await requestST({kind:'WITCH_TRIGGER_CHECK', payload:{witchId:seatId, nominatorId, nomineeId}}, {await:true})
  decision returns { markForDeath:boolean, targetId?:SeatId }
  if markForDeath: emit EFFECT_APPLY_REQUESTED({type:'MARKED_FOR_DEATH', targetId:nominatorId, until:'nightEnd', source:'witch'})
- onEvent MOMENT_NIGHT_ENDED or demon-kill resolution stage:
  resolve MARKED_FOR_DEATH into MOMENT_DEATH_ATTEMPTED cause='WITCH'

20) cerenovus (each night choose player & role; they are “mad” or face execution; model as effect + enforcement)
- otherNights.beforeWake:
  target = await requestChoice(...,{await:true})
  role = await requestChoice({options:roleKeys},{await:true})
  decision = await requestST({kind:'CERENOVUS_MADNESS_ASSIGN', payload:{cerenovusId:seatId, targetId:target, roleKey:role}}, {await:true})
  if decision.apply:
    emit EFFECT_APPLY_REQUESTED({type:'MADNESS', targetId:target, roleKey:role, until:'dusk', source:'cerenovus'})
- onEvent IO_CHAT_SENT / MOMENT_CLAIMED:
  if effectsService.has MADNESS on speaker:
    io.requestST({kind:'MADNESS_ENFORCEMENT', payload:{speakerId, requiredRoleKey, utterance}}, {await:false})

21) pit_hag (each night choose player & character; they become that; may create/remove outsiders; model via ST)
- otherNights.beforeWake:
  target = await requestChoice(...,{await:true})
  newRole = await requestChoice({options:allRoleKeys},{await:true})
  decision = await requestST({kind:'PIT_HAG_CHANGE', payload:{pitHagId:seatId, targetId:target, newRoleKey:newRole}}, {await:true})
  decision returns { apply:boolean, roleChange?:{targetId,newRoleKey}, setupAdjust?:{outsiderDelta} }
  if apply:
    emit ROLE_CHANGED {seatId:target, newRoleKey:newRole}
    if setupAdjust: emit SETUP_MODIFY or equivalent

DEMONS

22) fang_gu (demon; interacts with outsiders; on kill of outsider may jump; model via ST after demon kill resolves)
- beforeWake (each night):
  target = await requestChoice(kill target, await:true)
  emit MOMENT_DEATH_ATTEMPTED {targetId:target, cause:'DEMON_KILL'}
- onEvent MOMENT_DEATH_RESOLVED for demon kill:
  decision = await requestST({kind:'FANG_GU_JUMP', payload:{fangGuId:seatId, killedId:targetId}}, {await:true})
  decision returns { jump:boolean, newDemonId?:SeatId }
  if jump:
    emit ALIGNMENT_CHANGED {seatId:killedId, newAlignment:'EVIL'}
    emit ROLE_CHANGED {seatId:killedId, newRoleKey:'fang_gu'}
    emit ROLE_CHANGED {seatId:seatId, newRoleKey:'(former role?)'} (ST decides; keep minimal: mark old demon dead via effects)

23) vigormortis (demon; kills; dead minion keeps ability; neighbors get poisoned; model via effects + ST)
- kill like demon
- onEvent MOMENT_DEATH_RESOLVED when demon killed someone:
  decision = await requestST({kind:'VIGORMORTIS_POISON', payload:{demonId:seatId, killedId}}, {await:true})
  decision returns { poisonedNeighborIds:SeatId[] }
  apply POISONED effects accordingly
- onEvent minion death: apply effect MINION_ABILITY_PERSISTS to that minion for future plugin runner to still run their plugin while dead (engine support required: “dead can act” flag per role)

24) no_dashii (demon; poisons neighbors; townsfolk register poisoned; model as aura effect)
- onEvent MOMENT_NIGHT_STARTED:
  apply/update NO_DASHII_POISON_AURA effect while demon alive
- effectsService.isPoisoned(seatId) should return true for neighbors when aura active, except when demon is dead (per rules nuance; stub)
- kill like demon
- info roles distorted via ST

25) vortox (demon; all good info is false; if no execution, evil wins; model as global effect + end-of-day check)
- onEvent MOMENT_NIGHT_STARTED:
  apply VORTOX global effect while vortox alive
- storytellerService for all INFO_* should invert when VORTOX active (and for good players only).
- onEvent MOMENT_DAY_ENDED:
  decision = await requestST({kind:'VORTOX_EXECUTION_RULE', payload:{day, executionOccurred:boolean}}, {await:true})
  if decision.evilWins: emit GAME_ENDED {winner:'EVIL', reason:'VORTOX_NO_EXECUTION'}

E) DELIVERABLES
- Implement SnV role plugin registry with factories for all 25 roles.
- Each plugin must compile and register hooks and STKinds, even if internals are TODO.
- Provide SnV firstNightOrder and otherNightOrder arrays (approx categories ok).
- Ensure new engine deltas compile: ROLE_CHANGED, ALIGNMENT_CHANGED, MADNESS effect, VORTOX effect, dusk moment.
- Keep strict typing; do not leak hidden effects to actors.

END.
```

```text
CODEX PROMPT — BAD MOON RISING (BMR) PLUGIN OUTLINE PACK

You are implementing the BOTC plugin architecture (moments + queue + plugins + actors + ST arbitration + effects + registration + history) exactly as previously specified for TB and compatible with SnV deltas. Now add a complete “Bad Moon Rising” (BMR) pack: all 25 roles sketched as plugins (hooks/triggers, STKinds, effects, claims, and required engine deltas). Do NOT fully hardcode all rules; produce scaffolding that matches intended timing/data flow and supports later refinement.

PRIMARY DESIGN RULES
- Never leak hidden effects (poison/drunk/protection/true death status/“appears dead”) to actors.
- Never suppress plugins due to poison/drunk. Action happens; outcome is arbitrated.
- BMR has lots of death/protection/resurrection/double-kill. Treat death as a resolution pipeline: MOMENT_DEATH_ATTEMPTED -> plugins/ST -> MOMENT_DEATH_RESOLVED.

A) REQUIRED ENGINE DELTAS FOR BMR
Add/ensure these events exist (or equivalent):
1) MULTI_DEATH_ATTEMPT { targetIds:SeatId[], cause:DeathCause } (optional; you can emit multiple MOMENT_DEATH_ATTEMPTED instead)
2) PLAYER_REVIVED { seatId, reason?:string }
3) “APPEARS_DEAD” / “HIDDEN_DEAD” state: represent via effects rather than alive flag (Zombuul)
   - Add effect: APPEARS_DEAD { } and/or ZOMBUUL_FAKE_DEATH { }
4) MOMENT_DUSK { day:number } (recommended for “until dusk” expirations and Gossip timing)
5) DAY_RUMOR_RECORDED { sourceId, text } (optional; can reuse CLAIM system)

Add/ensure effect types exist:
- DRUNK (Sailor, Innkeeper, etc.)
- POISONED (Pukka)
- PROTECTED (Innkeeper, Devil’s Advocate)
- IMMUNE_ONCE (Fool)
- EXORCISED { demonId, until:'nightEnd' } (Exorcist)
- DA_PROTECTED { targetId, until:'dayEnd' } (Devil’s Advocate)
- MINSTREL_GRACE { until:'nightEnd' } (Minstrel effect)
- GOSSIP_RUMOR { day, sourceId, statementText }
- COURTIER_NERF { roleTeamOrType, until:'dusk' } (or more specific)
- SHABALOTH_REGURGITATE_MARK { targetId } (or store in demon plugin state)
- PUKKA_POISON_TRACK { victimId, day } (track poisoned victim & death timing)
- PO_CHARGING { } (Po spent night “charging”)
- GODFATHER_BONUS_KILL_READY { } (or compute on Outsider death)

Add/ensure storytellerService STKinds for BMR:
INFO: INFO_GRANDMOTHER, INFO_CHAMBERMAID, INFO_GAMBLER, INFO_GOSSIP_RESULT, INFO_COURTIER,
      INFO_TEA_LADY, INFO_PACIFIST (often resolves execution), INFO_MINSTREL, INFO_PROFESSOR,
      INFO_INNKEEPER (optional), INFO_EXORCIST (optional)
RESOLUTION: SAILOR_DRUNK_OR_DEAD, INNKEEPER_PROTECT_AND_DRUNK, EXORCIST_BLOCK_DEMON, GAMBLER_RESOLVE,
            GOSSIP_RESOLVE, COURTIER_RESOLVE, PROFESSOR_REVIVE, MINSTREL_RESOLVE, TEA_LADY_PROTECT,
            PACIFIST_PREVENT_EXECUTION, FOOL_IGNORE_DEATH_ONCE, GOON_ALIGNMENT_CHANGE,
            TINKER_DIES_CHECK, MOONCHILD_PICK, GODFATHER_BONUS_KILL, DA_PROTECT, ASSASSIN_KILL,
            MASTER_MIND_WIN_CHECK, ZOMBUUL_DEATH_MASK, PUKKA_POISON_AND_KILL, SHABALOTH_KILL_AND_REGURG,
            PO_CHARGE_AND_DOUBLEKILL

B) BMR ROSTER (25)
Townsfolk (13): grandmother, sailor, chambermaid, exorcist, innkeeper, gambler, gossip, courtier,
                professor, minstrel, tea_lady, pacifist, fool
Outsiders (4): goon, lunatic, tinker, moonchild
Minions (4): godfather, devils_advocate, assassin, mastermind
Demons (4): zombuul, pukka, shabaloth, po

C) NIGHT ORDER TAGGING (do NOT overfit; just categorize)
- Drunk/poison/protect: sailor, innkeeper, devils_advocate, pukka
- Block demon: exorcist
- Kills: demon(s), assassin, gossip (at dusk)
- Info: grandmother (first night), chambermaid, etc.
Implement firstNightOrder and otherNightOrder arrays for BMR (approx ok).

D) PLUGIN SCAFFOLDS (ALL 25)
For each role, implement hooks/onEvent, STKinds, effects, and claim kinds.

TOWNSFOLK

1) grandmother (first night info; if grandchild dies to demon, grandmother may die)
- firstNight.beforeWake: requestST INFO_GRANDMOTHER {truth:{grandchildId, shownRoleKey}}
- onEvent MOMENT_DEATH_RESOLVED:
  if killedId == grandchildId and cause=='DEMON_KILL':
    decision=await ST_REQUEST {kind:'GRANDMOTHER_DIES_CHECK', payload:{grandmotherId, grandchildId}} await:true
    if decision.die: emit MOMENT_DEATH_ATTEMPTED {targetId:grandmotherId, cause:'GRANDMOTHER_GRIEF'}

2) sailor (each night choose a player; either sailor or target is drunk, and sailor may not die)
- otherNights.beforeWake:
  target=await requestChoice(await:true)
  decision=await requestST {kind:'SAILOR_DRUNK_OR_DEAD', payload:{sailorId, targetId}} await:true
  decision returns { drunkTargetId?:SeatId, sailorImmuneTonight?:boolean }
  apply DRUNK effect as directed; apply IMMUNITY effect if needed

3) chambermaid (each night choose 2; learn how many woke)
- otherNights.beforeWake:
  a,b = await choices
  requestST INFO_CHAMBERMAID {truth:{wokeCount:0|1|2}}

4) exorcist (each night choose a player; if demon, demon doesn’t act; you learn? (ST can narrate))
- otherNights.beforeWake:
  target=await choice
  decision=await requestST {kind:'EXORCIST_BLOCK_DEMON', payload:{exorcistId, targetId}} await:true
  decision returns { blockedDemonId?:SeatId }
  if blocked: apply EXORCISED effect to demonId until nightEnd

5) innkeeper (each night choose 2; they can’t die tonight; 1 is drunk)
- otherNights.beforeWake:
  a,b = await choices
  decision=await requestST {kind:'INNKEEPER_PROTECT_AND_DRUNK', payload:{innkeeperId, targets:[a,b]}} await:true
  decision returns { protected:[a,b], drunkOne:SeatId }
  apply PROTECTED to both until nightEnd; apply DRUNK to drunkOne until nightEnd/nextDusk per rules

6) gambler (each night choose a player and guess their role; if wrong, you might die)
- otherNights.beforeWake:
  target=await choice
  guessedRole=await choice(roleKey list)
  decision=await requestST {kind:'GAMBLER_RESOLVE', payload:{gamblerId, targetId, guessedRole}} await:true
  decision returns { die:boolean }
  if die: emit MOMENT_DEATH_ATTEMPTED {targetId:gamblerId, cause:'GAMBLER_MISGUESS'}

7) gossip (each day makes a public statement; at dusk, if true, someone dies)
- Use CLAIM_GOSSIP with payload {statementText}
- Record as effect GOSSIP_RUMOR day=...
- onEvent MOMENT_DUSK:
  decision=await requestST {kind:'GOSSIP_RESOLVE', payload:{day, statementText}} await:true
  decision returns { killId?:SeatId }
  if killId: emit MOMENT_DEATH_ATTEMPTED {targetId:killId, cause:'GOSSIP'}

8) courtier (once per game at night choose a character; they are “drunk” for 3 days/nights)
- local hasAbility=true
- beforeWake:
  if not ability: noop
  useNow=await requestST {kind:'COURTIER_OFFER', payload:{courtierId}} await:true
  if useNow:
    chosenRole=await requestChoice(roleKey list, await:true)
    decision=await requestST {kind:'COURTIER_RESOLVE', payload:{courtierId, chosenRole}} await:true
    decision returns { applyToSeatIds:SeatId[], durationDays:3 }
    apply COURTIER_NERF effect to matching roles w/ expiration using day counters
    spend ability -> NO_ABILITY

9) professor (once per game at night: revive a dead player)
- local hasAbility=true
- otherNights.beforeWake:
  if not ability: noop
  deadTarget=await requestChoice(deadOnly, await:true)
  decision=await requestST {kind:'PROFESSOR_REVIVE', payload:{profId, targetId:deadTarget}} await:true
  if decision.revive:
    emit PLAYER_REVIVED {seatId:deadTarget}
  spend -> NO_ABILITY

10) minstrel (if a minion died today, all players are sober/healthy tonight)
- onEvent MOMENT_DEATH_RESOLVED (cause EXECUTION or day deaths):
  if deadRoleTeam==MINION: apply MINSTREL_GRACE global effect until nightEnd
- effectsService.isPoisoned/isDrunk should return false for everyone while MINSTREL_GRACE active (ST-only behavior)

11) tea_lady (neighbors can’t die if both alive)
- onEvent MOMENT_DEATH_ATTEMPTED:
  if targetId is tea-lady neighbor AND both neighbors alive:
    decision=await requestST {kind:'TEA_LADY_PROTECT', payload:{teaLadyId, targetId}} await:true
    if prevent: resolve died:false

12) pacifist (executions might not kill)
- onEvent MOMENT_DEATH_ATTEMPTED cause='EXECUTION':
  decision=await requestST {kind:'PACIFIST_PREVENT_EXECUTION', payload:{targetId}} await:true
  if prevent: resolve died:false

13) fool (first time you die, you don’t)
- local used=false (or effect IMMUNE_ONCE)
- onEvent MOMENT_DEATH_ATTEMPTED targeting self:
  decision=await requestST {kind:'FOOL_IGNORE_DEATH_ONCE', payload:{foolId, used}} await:true
  if prevent:
    mark used (effect IMMUNE_ONCE consumed)
    resolve died:false

OUTSIDERS

14) goon (if targeted by an evil ability, you turn evil; if targeted by good, turn good — model via ST when targeted)
- onEvent MOMENT_CLAIMED / EFFECT_APPLY_REQUESTED / MOMENT_DEATH_ATTEMPTED where targetId==goon:
  decision=await requestST {kind:'GOON_ALIGNMENT_CHANGE', payload:{goonId, sourceId, sourceTeam}} await:true
  if change: emit ALIGNMENT_CHANGED {seatId:goonId, newAlignment}

15) lunatic (thinks they are demon; “demon” actions are simulated; best handled as ST narration + fake prompts)
- otherNights.beforeWake:
  requestST {kind:'LUNATIC_FAKE_DEMON_PROMPT', payload:{lunaticId}} await:true
  ST returns a fake “who to kill” choice request; route via IO to lunatic; log choices; do not apply to board (or ST may mirror to real demon)

16) tinker (might die at any time)
- onEvent MOMENT_DAY_ENDED or MOMENT_NIGHT_ENDED:
  decision=await requestST {kind:'TINKER_DIES_CHECK', payload:{tinkerId, day}} await:true
  if die: emit MOMENT_DEATH_ATTEMPTED {targetId:tinkerId, cause:'TINKER'}

17) moonchild (when you die, choose a player; if they are evil, they die tonight)
- onEvent MOMENT_DEATH_RESOLVED:
  if self died:
    pick=await requestChoice(alive, await:true)
    decision=await requestST {kind:'MOONCHILD_PICK', payload:{moonchildId, pickedId:pick}} await:true
    if decision.killedTonight:
      emit EFFECT_APPLY_REQUESTED {type:'MARKED_FOR_DEATH', targetId:pick, until:'nightEnd', source:'moonchild'}
- onEvent night kill resolution stage: convert MARKED_FOR_DEATH to MOMENT_DEATH_ATTEMPTED cause='MOONCHILD'

MINIONS

18) godfather (bonus kill when outsider dies; plus learns outsiders? treat as ST)
- onEvent MOMENT_DEATH_RESOLVED:
  if deadTeam==OUTSIDER:
    apply GODFATHER_BONUS_KILL_READY effect until nextNightEnd
- otherNights.beforeWake:
  if bonusKillReady:
    target=await requestChoice(alive, await:true)
    decision=await requestST {kind:'GODFATHER_BONUS_KILL', payload:{godfatherId, targetId}} await:true
    if decision.kill: emit MOMENT_DEATH_ATTEMPTED {targetId, cause:'GODFATHER'}

19) devils_advocate (each night choose a living player; they can’t die tomorrow)
- otherNights.beforeWake:
  target=await choice
  decision=await requestST {kind:'DA_PROTECT', payload:{daId, targetId}} await:true
  if apply: apply DA_PROTECTED to target until dayEnd
- onEvent MOMENT_DEATH_ATTEMPTED:
  if target has DA_PROTECTED and day==tomorrow scope: prevent

20) assassin (once per game at night: kill a player)
- local hasAbility=true
- otherNights.beforeWake:
  if not ability: noop
  useNow=await requestST {kind:'ASSASSIN_OFFER', payload:{assassinId}} await:true
  if useNow:
    target=await choice
    decision=await requestST {kind:'ASSASSIN_KILL', payload:{assassinId, targetId}} await:true
    if kill: emit MOMENT_DEATH_ATTEMPTED {targetId, cause:'ASSASSIN'}
    spend -> NO_ABILITY

21) mastermind (if demon dies and no execution next day, evil wins)
- onEvent MOMENT_DEATH_RESOLVED:
  if demon died:
    apply MASTERMIND_ACTIVE effect for next day
- onEvent MOMENT_DAY_ENDED:
  if MASTERMIND_ACTIVE and noExecutionOccurred:
    decision=await requestST {kind:'MASTER_MIND_WIN_CHECK', payload:{day}} await:true
    if evilWins: emit GAME_ENDED {winner:'EVIL', reason:'MASTERMIND'}

DEMONS

22) zombuul (appears dead; kills might behave differently; model via ST + effects)
- otherNights.beforeWake:
  if not “appears dead” or depending on ST:
    target=await choice
    emit MOMENT_DEATH_ATTEMPTED {targetId, cause:'DEMON_KILL'}
- onEvent MOMENT_DEATH_ATTEMPTED targeting zombuul:
  decision=await requestST {kind:'ZOMBUUL_DEATH_MASK', payload:{zombuulId}} await:true
  decision returns { dies:boolean, appearsDead:boolean }
  apply APPEARS_DEAD effect without setting alive=false when appropriate

23) pukka (poisons target; previously poisoned dies next night; model via tracking effect)
- beforeWake each night:
  target=await choice (await:true)
  decision=await requestST {kind:'PUKKA_POISON_AND_KILL', payload:{pukkaId, newTargetId:target}} await:true
  decision returns { newPoisonedId:target, previousVictimId?:SeatId, previousDiesTonight:boolean }
  apply POISONED to new target until replaced/cleared
  if previousDiesTonight: emit MOMENT_DEATH_ATTEMPTED {targetId:previousVictimId, cause:'DEMON_KILL'}

24) shabaloth (each night choose 2 to die; some previously eaten may regurgitate and live)
- beforeWake:
  a=await choice; b=await choice
  decision=await requestST {kind:'SHABALOTH_KILL_AND_REGURG', payload:{demonId, targets:[a,b]}} await:true
  decision returns { kill:[a,b], regurgitate?:SeatId[] }
  emit death attempted for kill targets
  emit PLAYER_REVIVED for regurgitate list (timing per ST; likely at night end)

25) po (may choose to “charge”; if charged, next kill is double)
- beforeWake:
  decision=await requestST {kind:'PO_CHARGE_AND_DOUBLEKILL', payload:{poId}} await:true
  decision returns { charging:boolean }
  if charging: apply PO_CHARGING until nextNightStart; no kill this night
  else:
    target=await choice
    if PO_CHARGING was active previously:
      target2=await choice (or ST chooses) and kill two
      clear PO_CHARGING
    emit death attempted(s)

E) DELIVERABLES
- Implement BMR plugin registry with factories for all 25 roles.
- Each plugin must compile and register hooks and STKinds, even if internals are TODO.
- Provide BMR firstNightOrder and otherNightOrder arrays (approx ok).
- Ensure new engine deltas compile: PLAYER_REVIVED, APPEARS_DEAD effect, dusk moment, multi-kill support.
- Keep strict typing; do not leak hidden effects to actors.

END.
```
---------------------------------------------------------------------

The Carousel is officially “every Experimental character released so far” (no base-game characters). ([The Pandemonium Institute][1])
The BOTC wiki currently lists **79 Experimental characters** (a good roster source to scaffold against). ([wiki.bloodontheclocktower.com][2])
They also publish new character releases in the wiki changelog, which you can treat as the “additions feed.” ([wiki.bloodontheclocktower.com][3])

```text
CODEX PROMPT — CAROUSEL + ALL PUBLISHED EXPERIMENTAL CHARACTERS (SCAFFOLD PACK)

You are implementing the BOTC plugin architecture (moments + event queue + plugins + player actors + ST arbitration + effectsService + registrationService + deterministic history log) exactly as previously specified for TB + SnV + BMR. Now add a complete “Carousel / Experimental” pack that scaffolds ALL published Experimental characters (the Carousel token set is a snapshot of “all Experimental characters released to date”). Do NOT implement full game logic for all 79 roles. Instead, implement a robust framework + per-role plugin stubs that:
- Compile and register correct hooks (firstNight/otherNights/onEvent)
- Declare needed STKinds, effect types, claim kinds, and registration quirks
- Provide a minimal “ability shape” for each role so implementation can be filled in later

NON-NEGOTIABLE RULES
- Never leak hidden effects (drunk/poison/madness/true alignment/secret role swaps) to player actors.
- Never suppress a plugin due to drunk/poison/madness. The action occurs; resolution is arbitrated.
- All info delivery and “did it trigger/work?” checks go through ST_REQUEST.
- Determinism: log ALL MOMENT_*, CLAIM*, IO_*, ST_*, EFFECT_* events in order.
- Support concurrency: “pure info” operations use await:false; board-changing operations use await:true.

SCOPE
- This pack must cover:
  1) ALL Experimental Characters listed here (79 role keys)
  2) A mechanism to version/snapshot the roster (so “Carousel vX” can be pinned)
  3) A mechanism to detect/flag “new roles added since last snapshot” using a manual list update (no web calls at runtime)

A) REQUIRED ENGINE DELTAS FOR EXPERIMENTAL
You MUST add/ensure the engine supports these generic capabilities, because Experimental characters heavily rely on them:

1) MULTI-DEATH / MASS EFFECTS
- Allow multiple MOMENT_DEATH_ATTEMPTED in one chainId
- Add helper: emitMany(events) to enqueue multiple events deterministically

2) ROLE/ALIGNMENT/ABILITY MODIFICATION
- ROLE_CHANGED { seatId, newRoleKey, reason?:string }
- ALIGNMENT_CHANGED { seatId, newAlignment:'GOOD'|'EVIL', reason?:string }
- SECONDARY_ABILITY_GRANTED { seatId, abilityKey:RoleKey, source?:SeatId } (needed for Boffin/Boffin-like)
- ABILITY_DISABLED { seatId, abilityKey?:RoleKey, until?:Duration } (Preacher-like, etc.)

3) NOMINATION/VOTE CONSTRAINTS
- VOTE_LOCKED / VOTE_WEIGHT effects already exist
- Add: NOMINATION_LOCKED { seatId, until:'dayEnd' } for roles that force/forbid nominations
- Add: VOTE_HIDDEN { seatId, until:'voteEnd' } (Organ Grinder-like patterns)

4) GLOBAL RULE MODIFIERS (script-level)
Experimental includes roles that effectively “rewrite rules” (Atheist, Bootlegger, Legion, Leviathan, Riot, etc.)
Implement a concept: GlobalRulePlugin (not Fabled/Loric yet, but same shape):
- globalPlugins: Array<GlobalPlugin> that can react to events and emit further events/effects
- These are created when specific roles are in play (e.g., Leviathan, Riot)

5) SECRET INFORMATION ROUTING
- Support PRIVATE_INFO_DELIVERED { seatId, text, sourceRoleKey }
- Support PUBLIC_ANNOUNCEMENT { text }
(Both are loggable game events and are routed to player actors by the transport layer.)

6) CLAIM SYSTEM (EXPAND)
You already have MOMENT_CLAIM / MOMENT_CLAIMED.
Extend ClaimKind/ClaimedKind with experimental actions:
- CLAIM_ACROBAT, CLAIM_ALCHEMIST, CLAIM_ALSAAHIR, CLAIM_AMNESIAC, CLAIM_ATHEIST,
  CLAIM_BALLOONIST, CLAIM_BANSHEE, CLAIM_BIG_WIG, CLAIM_BOFFIN, CLAIM_BOOMDANDY,
  CLAIM_BOOTLEGGER, CLAIM_BOUNTY_HUNTER,
  CLAIM_CACKLEJACK, CLAIM_CANNIBAL, CLAIM_CHOIRBOY, CLAIM_CULT_LEADER,
  CLAIM_DAMSEL, CLAIM_DEUS_EX_FIASCO,
  CLAIM_ENGINEER,
  CLAIM_FARMER, CLAIM_FEARMONGER, CLAIM_FERRYMAN, CLAIM_FISHERMAN,
  CLAIM_GANGSTER, CLAIM_GARDENER, CLAIM_GENERAL, CLAIM_GNOME, CLAIM_GOBLIN, CLAIM_GOLEM,
  CLAIM_HARPY, CLAIM_HATTER, CLAIM_HERETIC, CLAIM_HERMIT, CLAIM_HIGH_PRIESTESS, CLAIM_HUNTSMAN,
  CLAIM_KAZALI, CLAIM_KING, CLAIM_KNIGHT,
  CLAIM_LEGION, CLAIM_LEVIATHAN, CLAIM_LIL_MONSTA, CLAIM_LLEECH, CLAIM_LORD_OF_TYPHON, CLAIM_LYCANTHROPE,
  CLAIM_MAGICIAN, CLAIM_MARIONETTE, CLAIM_MEZEPHELES,
  CLAIM_NIGHTWATCHMAN, CLAIM_NOBLE,
  CLAIM_OGRE, CLAIM_OJO, CLAIM_ORGAN_GRINDER,
  CLAIM_PIXIE, CLAIM_PLAGUE_DOCTOR, CLAIM_POLITICIAN, CLAIM_POPE, CLAIM_POPPY_GROWER,
  CLAIM_PREACHER, CLAIM_PRINCESS, CLAIM_PSYCHOPATH, CLAIM_PUZZLEMASTER,
  CLAIM_RIOT,
  CLAIM_SHUGENJA, CLAIM_SNITCH, CLAIM_STEWARD, CLAIM_STORM_CATCHER, CLAIM_SUMMONER,
  CLAIM_TOR,
  CLAIM_VILLAGE_IDIOT, CLAIM_VIZIER,
  CLAIM_WIDOW, CLAIM_WIZARD, CLAIM_WRAITH,
  CLAIM_XAAN,
  CLAIM_YAGGABABBLE,
  CLAIM_ZEALOT, CLAIM_ZENOMANCER

NOTE: You do NOT need to build UI for each claim now; just ensure claim routing scaffolds exist.

7) EFFECT TYPES (EXPAND MINIMALLY; JUST ADD NAMES + SHAPES)
Add effect specs (shape can be generic) for these recurring patterns:
- MADNESS { roleKey, until:'dusk' } (Harpy-like patterns too)
- CURSE_MARK { kind, sourceId, targetId, until }
- SILENCED / MUTED { targetId, until }
- MUST_NOMINATE { targetId, until } / MUST_VOTE { targetId, until } / CANNOT_VOTE { ... }
- EXTRA_NOMINATION / EXTRA_EXECUTION (Big Wig-like)
- KNOWS_GRIMOIRE { targetId, until } (Widow-like)
- DEMON_HOLDER { holderId } (Lil’ Monsta)
- BLUFFS_MODIFIED / BLUFFS_HIDDEN (Magician/Poppy Grower-like)
- IS_MINION_PROXY / SECRET_MINION (Marionette-like)
- NIGHT_ORDER_OVERRIDE (Bootlegger-like)
- DEAD_ACTS (Cannibal-like ability borrowing)
- “COUNTDOWN” { remainingDays } (Leviathan-like)

8) STKinds (DECLARE ONLY; IMPLEMENT LATER)
Create STKind union entries for each role below. Each role should have:
- INFO_* STKinds for any info
- *_RESOLVE / *_TRIGGER_CHECK STKinds for any resolution that could be altered by poison/drunk/rules mods

B) EXPERIMENTAL ROSTER (79 ROLE KEYS)
Create an exported const array EXPERIMENTAL_ROLE_KEYS with these values (use snake_case keys in code, keep wiki names in comments):
A:
- acrobat
- al_hadikhia
- alchemist
- alsaahir
- amnesiac
- atheist
B:
- balloonist
- banshee
- big_wig
- boffin
- boomdandy
- bootlegger
- bounty_hunter
C:
- cacklejack
- cannibal
- choirboy
- cult_leader
D:
- damsel
- deus_ex_fiasco
E:
- engineer
F:
- farmer
- fearmonger
- ferryman
- fisherman
G:
- gangster
- gardener
- general
- gnome
- goblin
- golem
H:
- harpy
- hatter
- heretic
- hermit
- high_priestess
- hindu
- huntsman
K:
- kazali
- king
- knight
L:
- legion
- leviathan
- lil_monsta
- lleech
- lord_of_typhon
- lycanthrope
M:
- magician
- marionette
- mezepheles
N:
- nightwatchman
- noble
O:
- ogre
- ojo
- organ_grinder
P:
- pixie
- plague_doctor
- politician
- pope
- poppy_grower
- preacher
- princess
- psychopath
- puzzlemaster
R:
- riot
S:
- shugenja
- snitch
- steward
- storm_catcher
- summoner
T:
- tor
V:
- village_idiot
- vizier
W:
- widow
- wizard
- wraith
X:
- xaan
Y:
- yaggababble
Z:
- zealot
- zenomancer

C) PACK OUTPUTS
Implement:
1) experimentalRegistry.ts
- export function createExperimentalPlugins(seats, ctx): RolePlugin[]
- for each roleKey above, return a plugin instance with correct hook points and STKinds declared

2) experimentalSnapshot.ts
- export type ExperimentalSnapshot = { version:string; roleKeys:RoleKey[]; createdAt:number }
- export const CAROUSEL_SNAPSHOT_V1: ExperimentalSnapshot = { version:'carousel_YYYY_MM', roleKeys:[...EXPERIMENTAL_ROLE_KEYS], createdAt:... }
- Include a helper that can compare (snapshot.roleKeys vs EXPERIMENTAL_ROLE_KEYS) and emit a warning event (DEV ONLY) if mismatch.
NO web calls.

3) experimentalNightOrder.ts
- export const experimentalFirstNightOrder: RoleKey[]
- export const experimentalOtherNightOrder: RoleKey[]
Do NOT attempt perfect ordering; instead group by categories:
  - global/setup modifiers
  - minion/demon actions
  - board-changing roles (await:true)
  - pure info roles (await:false)

D) PER-ROLE PLUGIN SKETCHES (ALL 79; KEEP EACH BRIEF)
For EACH roleKey, implement a plugin factory with:
- firstNight.beforeWake/afterWake and otherNights.beforeWake/afterWake as appropriate
- onEvent for reactive roles
- Use one of these patterns per role:
  Pattern 1: INFO ROLE
    - compute “truth proposal” (may be empty)
    - io.requestST({kind:'INFO_<ROLE>', payload:{truth,...}}, {await:false})
  Pattern 2: CHOICE + RESOLVE ROLE
    - choice(s) await:true
    - io.requestST({kind:'<ROLE>_RESOLVE', payload:{...}}, {await:true})
    - emit effects/deaths/role changes based on decision
  Pattern 3: GLOBAL RULE ROLE
    - also registers a GlobalRulePlugin behavior: onEvent(...) modifies flows
  Pattern 4: CLAIM-BASED DAY ROLE
    - actor emits MOMENT_CLAIM; game collects input; plugin reacts on MOMENT_CLAIMED

IMPORTANT: You are not required to perfectly encode every nuance here; just pick the right pattern and establish the shape.

Below is the REQUIRED sketch mapping. Implement stubs accordingly:

A — Townsfolk-ish / special
- acrobat: onEvent MOMENT_DEATH_RESOLVED / at dusk; ST checks if adjacent died by poison -> may die. (TRIGGER_CHECK)
- alchemist: firstNight: gain a minion ability (SECONDARY_ABILITY_GRANTED) via ST (ALCHEMIST_GAIN)
- alsaahir: day claim-based “name players; if correct evil dies / if incorrect you die” via ST (ALSAAHIR_RESOLVE)
- amnesiac: nightly ability unknown; always ST-driven (AMNESIAC_PROMPT/RESOLVE) (choice may be ST)
- atheist: global rule plugin; enables ST as “demon” & special win conditions (ATHEIST_RULESET)

B
- balloonist: nightly info “learn a player of a type; duplicates later” (INFO_BALLOONIST)
- banshee: on death enables public ability / extra vote/nomination; global-ish effect (BANSHEE_TRIGGER)
- big_wig: minion altering nomination/vote rules; global rule plugin (BIG_WIG_RULES)
- boffin: minion grants demon an extra ability (SECONDARY_ABILITY_GRANTED to demon) (BOFFIN_GRANT)
- boomdandy: when dies/executed triggers immediate vote/endgame; global rule plugin (BOOMDANDY_TRIGGER)
- bootlegger: global script rule overrides night order / abilities; global rule plugin (BOOTLEGGER_RULES)
- bounty_hunter: firstNight learns a minion; creates an extra evil townsfolk; alignment flip via ST (BOUNTY_HUNTER_SETUP)

C
- cacklejack: when someone dies(?) forces role change/chaos; global-ish; always ST (CACKLEJACK_TRIGGER)
- cannibal: if executed TF, gain their ability; SECONDARY_ABILITY_GRANTED / DEAD_ACTS effects (CANNIBAL_GAIN)
- choirboy: if king dies, learn demon; reactive + info (CHOIRBOY_TRIGGER/INFO)
- cult_leader: daily alignment flips based on majority; ST resolves at dusk (CULT_LEADER_CHECK)

D
- damsel: if found by huntsman; if guessed by minion evil wins; needs “guess” claim event and ST (DAMSEL_GUESS)
- deus_ex_fiasco: chaos correction on mistakes; global ST tool (DEUS_EX_FIASCO_RESOLVE)

E
- engineer: once per game change a minion/demon; role swap via ST (ENGINEER_CHANGE)

F
- farmer: on death, a dead good becomes farmer; role swap on death (FARMER_INHERIT)
- fearmonger: minion picks player; if they vote/nominate, they die; effect mark + triggers (FEARMONGER_MARK)
- ferryman: traveler-ish? treat as global: controls deaths at night; ST driven (FERRYMAN_RESOLVE)
- fisherman: once per game ask ST for advice; pure ST message (INFO_FISHERMAN)

G
- gangster: traveler-like: can kill/force; claim-based -> ST resolve -> death/effects (GANGSTER_RESOLVE)
- gardener: setup modifier picks roles distribution; setup ST (GARDENER_SETUP)
- general: nightly learns whether good is winning; info (INFO_GENERAL)
- gnome: nomination/vote weirdness; ST-enforced constraint (GNOME_RULES)
- goblin: if executed after claiming, evil wins; claim-based + execution trigger (GOBLIN_CLAIM, GOBLIN_WIN_CHECK)
- golem: once per game publicly kills if nominates; nomination trigger -> ST (GOLEM_TRIGGER)

H
- harpy: forces madness between two players; effect + enforcement on chat/claims (HARPY_ASSIGN, MADNESS_ENFORCEMENT)
- hatter: on death, players may change roles; role swap day-end (HATTER_CHANGE)
- heretic: inverts win condition; global rule plugin (HERETIC_RULES)
- hermit: registers as something; plus special info; registration override (HERMIT_REGISTER)
- high_priestess: nightly learns “who to talk to”; info (INFO_HIGH_PRIESTESS)
- hindu: (if present) treat as global/role swap; ST driven (HINDU_RESOLVE)
- huntsman: once per game find damsel; choice -> ST -> if correct, role changes (HUNTSMAN_RESOLVE)

K
- kazali: demon that creates minions by choosing players/roles; setup/night role assignment via ST (KAZALI_SETUP)
- king: if dies, choirboy triggers; may learn demon? (INFO_KING / KING_TRIGGER)
- knight: firstNight learns 2 players, 1 is minion; info (INFO_KNIGHT)

L
- legion: demon team is many; global rule plugin; modifies setup & win checks (LEGION_RULES)
- leviathan: no one dies at night; execution-only; countdown; global rule plugin (LEVIATHAN_RULES)
- lil_monsta: demon held by minion; nomination/holding rules; global plugin + DEMON_HOLDER effect (LIL_MONSTA_RULES)
- lleech: demon with host; host death kills demon; poison aura; host assignment via ST (LLEECH_HOST)
- lord_of_typhon: demon with minions adjacent; setup constraints; global plugin (TYPHON_SETUP)
- lycanthrope: nightly chooses kill; if kills demon -> good win; ST resolves (LYCANTHROPE_RESOLVE)

M
- magician: hides evil roles/bluffs; setup ST modifies bluff visibility; global plugin (MAGICIAN_SETUP)
- marionette: secret minion near demon; setup assignment; effect IS_MINION_PROXY; info distortion (MARIONETTE_SETUP)
- mezepheles: gives secret word, converts if said; chat monitoring; ST enforcement (MEZEPHELES_WORD)

N
- nightwatchman: once per game wakes someone and tells them role; choice+info (NIGHTWATCHMAN_RESOLVE)
- noble: firstNight learns 3 players, 1 is evil; info (INFO_NOBLE)

O
- ogre: firstNight picks someone; becomes their alignment; ALIGNMENT_CHANGED (OGRE_CHOOSE)
- ojo: demon learns a role, kills that role holder; choice roleKey -> death attempt (OJO_KILL)
- organ_grinder: minion hides votes; apply VOTE_HIDDEN global effect during votes (ORGAN_GRINDER_RULES)

P
- pixie: firstNight learns an in-play townsfolk; becomes mad they are that; if correct and dead gains ability (PIXIE_ASSIGN, MADNESS_ENFORCEMENT, PIXIE_GAIN)
- plague_doctor: when dies, a minion ability becomes global; global plugin after death (PLAGUE_DOCTOR_RELEASE)
- politician: if alive at end and you voted correctly? ST decides win flip; endgame ST (POLITICIAN_WIN_CHECK)
- pope: duplicates good characters in play (as per wiki); setup modifier; global plugin (POPE_SETUP) 
- poppy_grower: minions/demon don’t know each other; info gating; global plugin (POPPY_GROWER_RULES)
- preacher: each night chooses player; if minion, they lose ability; ABILITY_DISABLED effect (PREACHER_DISABLE)
- princess: special “at least first one anyway”; treat as claim-based once-per-game ability; ST (PRINCESS_RESOLVE)
- psychopath: day kill ability; claim-based -> ST -> death attempted (PSYCHOPATH_KILL)
- puzzlemaster: has “puzzle drunk” and asks question; ST resolves; DRUNK assignment and info (PUZZLEMASTER_SETUP/INFO)

R
- riot: everyone nominates simultaneously / immediate kills; global plugin modifying day structure (RIOT_RULES)

S
- shugenja: learns closest evil direction; info (INFO_SHUGENJA)
- snitch: if executed, evil learns 3 good roles; execution trigger -> ST reveals to evil (SNITCH_TRIGGER)
- steward: firstNight learns a good player; info (INFO_STEWARD)
- storm_catcher: chooses a good role; that role learns each other / can’t die? global-ish; ST (STORM_CATCHER_SETUP)
- summoner: creates demon later; timed role creation; global plugin + ROLE_CHANGED at time (SUMMONER_TRIGGER)

T
- tor: demon/minion-like that changes execution rules; global plugin; ST (TOR_RULES)

V
- village_idiot: 3 players share ability; multiple instances; needs “multi-seat linked ability” support; ST assigns (VILLAGE_IDIOT_SETUP)
- vizier: minion who must be executed? vote rules; global plugin (VIZIER_RULES)

W
- widow: minion sees grimoire and poisons; firstNight grimoire view + POISONED assignment (WIDOW_GRIMOIRE, WIDOW_POISON)
- wizard: manipulates nominations/votes; claim-based; ST (WIZARD_RULES)
- wraith: “eyes open”; night action affecting wake order/visibility; ST (WRAITH_RULES)

X
- xaan: demon that changes the day/night structure; global plugin; countdown-like (XAAN_RULES)

Y
- yaggababble: demon kills based on phrase said; chat monitoring + ST enforcement; kill triggers (YAGGABABBLE_PHRASE)

Z
- zealot: outsider-like vote behavior; extra vote/forced vote; effects (ZEALOT_RULES)
- zenomancer: time manipulation/resets; global plugin; ST (ZENOMANCER_RULES)

E) IMPLEMENTATION REQUIREMENTS (WHAT TO ACTUALLY CODE)
1) For every roleKey above, create a plugin factory that:
- registers hooks (at least one of: firstNight.beforeWake, otherNights.beforeWake, onEvent)
- calls io.requestST with role-specific STKinds (even if payload is minimal)
- emits effects/events using generic patterns (EFFECT_APPLY_REQUESTED, ROLE_CHANGED, ALIGNMENT_CHANGED, MOMENT_DEATH_ATTEMPTED)
- compiles with strict typing

2) Create a single STKind union that includes, at minimum:
- INFO_<ROLE> for every info-producing role (even if empty)
- <ROLE>_RESOLVE or <ROLE>_RULES for global/active roles
- <ROLE>_TRIGGER_CHECK for reactive roles

3) Create placeholder AutoStoryteller handlers for:
- INFO_*: return a “message string” field (does not need to be correct yet)
- *_RESOLVE: return deterministic defaults (e.g., no kill, no swap) so game runs
- *_RULES: return no-op decisions
Your goal is compile + run, not correctness.

4) Add minimal “GlobalRulePlugin” mechanism:
- if role is in GLOBAL_RULE_ROLES = [atheist, bootlegger, heretic, legion, leviathan, lil_monsta, poppy_grower, riot, tor, vizier, wraith, xaan, zenomancer, yaggababble, etc.]
  create an accompanying global plugin stub that listens on high-level moments and emits rule effects.
Do not implement full behavior now; just infrastructure.

F) SOURCES OF TRUTH / VERSIONING NOTE (NO RUNTIME WEB)
- Treat EXPERIMENTAL_ROLE_KEYS as “published experimental roster” (update manually when new roles appear).
- Treat CAROUSEL_SNAPSHOT_V1 as a pinned snapshot used by your UI to show “Carousel roles”.

DELIVERABLES
- Experimental registry + snapshot + night order arrays
- 79 plugin stubs with correct patterns + declared STKinds/effects/claims
- Global rule plugin infrastructure
- Everything compiles under strict TS

END.
```

[1]: https://bloodontheclocktower.com/blogs/news/all-about-the-carousel?utm_source=chatgpt.com "All About The Carousel – The Pandemonium Institute"
[2]: https://wiki.bloodontheclocktower.com/Category%3AExperimental_Characters "Category:Experimental Characters - Blood on the Clocktower Wiki"
[3]: https://wiki.bloodontheclocktower.com/Changelog?utm_source=chatgpt.com "Changelog"

----------------------------------------------------------------

Yes — but “full analysis of all the research into the ability of all the characters” splits into two very different things:

1. **Rules source of truth**: what each character *does* (wiki / official materials)
2. **Engine architecture**: what primitives your platform must support so *any* character can be expressed cleanly with your **INTENT / REQUEST** plugin model

I can give you a real “big picture” implementation plan right now, grounded in the official public roster structure (Base scripts + Travelers + Fabled + Loric + Experimental/Carousel), and I’ll be explicit about what’s “rules-based” vs “engine inference.” The key public anchors we can trust:

* **Carousel** contains every Experimental character released to date. ([The Pandemonium Institute][1])
* The official wiki tracks categories for **Trouble Brewing / SnV / BMR / Travellers / Fabled / Loric / Experimental**. ([Blood on the Clocktower Wiki][2])
* Experimental characters category is **79 roles** (current wiki total). ([Blood on the Clocktower Wiki][3])
* Loric are storyteller “special rules” that alter the game itself, distinct from Fabled (problem-solvers) in intent. ([Blood on the Clocktower Wiki][4])

Now here’s the “full ecosystem” view through your INTENT/REQUEST lens.

---

## The core mental model: BOTC = Intent → Request → Resolution → Broadcast

Every single ability in BOTC can be expressed as one of these patterns:

### Pattern 1: Passive listener

* “When X happens, do Y (or prevent Y).”
* Examples: Virgin, Soldier, Pacifist, Mayor, Saint, Goblin.
* Engine primitive: **event interception + resolution pipeline**.

### Pattern 2: Night action (choose target / choose option)

* Examples: Poisoner, Monk, most Demons, Dreamer, Seamstress, etc.
* Engine primitive: **REQUEST_CHOICE** + hidden **resolution policy** + effects.

### Pattern 3: Info role

* Examples: Chef, Empath, Undertaker, Clockmaker, Noble…
* Engine primitive: **REQUEST_ST(INFO_*)** returning an answer message (truth may be distorted).

### Pattern 4: Day claim action

* “I use my ability now.”
* Examples: Slayer, Gossip, Artist, Psychopath, Gunslinger…
* Engine primitive: **MOMENT_CLAIM / MOMENT_CLAIMED** (your design), then resolve.

### Pattern 5: Global rule modifier

* Examples: Vortox, Leviathan, Legion, Poppy Grower, Riot, Atheist.
* Engine primitive: **global plugins** that rewrite/augment resolution rules.

### Pattern 6: Role/alignment mutation

* Examples: Pit-Hag, Snake Charmer, Barber, Fang Gu jump, Engineer…
* Engine primitive: **ROLE_CHANGED / ALIGNMENT_CHANGED** + careful state & token cleanup rules.

If your engine supports these six patterns robustly, you can implement “the whole ecosystem” as data + plugins.

---

## What “full implementation” looks like in your architecture

### Layer 0: Deterministic event log (replay + reveal)

You already moved here: every meaningful thing is a game event.

You will log:

* MOMENT_* (phase, nomination, vote, death attempt/resolution)
* CLAIM / CLAIMED
* IO_REQUEST_* / IO_*_MADE (yes, to replay choices)
* ST_REQUEST / ST_DECISION (yes, to replay storyteller arbiters)
* EFFECT_* and ROLE_CHANGED / ALIGNMENT_CHANGED

This is the backbone.

### Layer 1: GameMachine = phase & queue processor

GameMachine responsibilities:

* Own authoritative state
* Maintain event queue (chainId/depth guards)
* Apply reducers (effects, alive/dead, role swaps)
* Invoke plugin runner for each event
* Drive night order by emitting `MOMENT_BEFORE_WAKE { day, roleKey }`

Importantly:

* GameMachine never asks “is Virgin in play?”
* It just emits moments; plugins respond.

### Layer 2: PlayerActor per seat (Human + AI same interface)

All players have an actor. It handles:

* chat sending
* choice fulfillment (human waits; AI calls serverfn)
* emits IO responses back into game

Actors never receive hidden state like poison/drunk. Ever.

### Layer 3: Role plugins (seat-owned)

Role plugins:

* react to moments
* request choices
* request storyteller resolutions
* emit effects, death attempts, role changes

### Layer 4: Global plugins (script / rules / storyteller characters)

This is where the ecosystem expands:

* **Demons like Vortox** are best modeled as global rule plugins while alive.
* **Experimental “rules” roles** (Legion, Leviathan, Riot, Atheist) absolutely require a global layer.
* **Fabled + Loric** are also global plugins (we’ll do those next, per your request).

So your plugin system becomes:

* `seatPlugins: RolePlugin[]`
* `globalPlugins: GlobalPlugin[]` (derived from roles in play + storyteller selections)

---

## The INTENT / REQUEST model (concretely)

You’ve basically invented a clean DSL:

### INTENT

Events coming from actors / UI / AI:

* `MOMENT_CLAIM { kind, claimId, claimantId, payload? }`
* `IO_CHAT_SENT` (public & private channels)
* `IO_CHOICE_MADE`

These are “human/AI intent signals.”

### REQUEST

Game asking for input:

* `IO_REQUEST_CHOICE` → actor
* `IO_REQUEST_CHAT` → actor
* `ST_REQUEST` → storyteller service (human storyteller UI or AI storyteller actor)

Everything resolves back into deterministic events:

* `IO_CHOICE_MADE`
* `ST_DECISION`

This is exactly how you avoid false synchronicity: you can issue multiple non-blocking ST requests.

---

## The “research” distilled into engine primitives

Across all published roles (base + experimental), the same recurring mechanics appear. This is your “build it once” checklist.

### 1) Death system must be a pipeline (not a direct state toggle)

You already nailed it with:

* `MOMENT_DEATH_ATTEMPTED`
* (plugins intercept: protection, immunity, bounce, substitutions)
* `MOMENT_DEATH_RESOLVED`

This supports:

* protection (Monk/Innkeeper/DA/Tea Lady)
* immunity (Soldier/Fool)
* redirection (Mayor)
* delayed deaths (Gossip/Moonchild)
* multi-kill (Shabaloth/Po)
* “appears dead” (Zombuul) via effects, not alive flag

### 2) Effects service must become the “reminder token engine”

Everything is an effect:

* poison/drunk
* protected
* no ability
* vote weight
* vote locked/hidden
* madness constraints
* marked-for-death
* “dead acts” / borrowed ability
* “global rules active”

If you do this cleanly, 80% of characters become “apply/remove effects with durations.”

### 3) Registration service must be time-scoped and observer-scoped

Because characters like Recluse/Spy and many experimental roles mess with “registers as” behavior.

Needed signatures:

* `registersAsEvil(target, observer, momentMeta)`
* `registersAsRole(target, roleKey, observer, momentMeta)`
* plus distance/neighbors helpers

### 4) Storyteller arbitration must be universal

Not just for “hard” cases.
If you standardize “all info and all trigger checks go through ST,” then:

* Vortox (false info) becomes trivial (global modifier)
* poison/drunk doesn’t leak
* homebrew/bootlegger becomes possible
* your AI storyteller can be swapped in without touching plugins

### 5) Role swaps must be first-class

You will need a consistent policy for:

* what happens to existing effects when role changes
* whether “once per game used” persists or resets
* what the player learns (actor messaging)
* deterministic log semantics

Events:

* `ROLE_CHANGED`
* `ALIGNMENT_CHANGED`
* optionally `SHOWN_ROLE_CHANGED` vs `TRUE_ROLE_CHANGED` (because Drunk/Marionette/Poppy Grower-like secrecy)

### 6) Global rule plugins are not optional

The wiki explicitly separates special categories like Loric and recognizes experimental scripts as home for complex rule changes. ([Blood on the Clocktower Wiki][5])
Pragmatically: Vortox/Leviathan/Legion/Riot/Atheist/Bootlegger-style mechanics demand a global layer.

---

## What a “complete BOTC ecosystem” implementation plan looks like

If you wanted the full platform, “done right,” it looks like this:

1. **Core engine**

   * event log + queue
   * death pipeline
   * nomination/vote pipeline
   * effects service
   * registration service
   * storyteller service interface
   * actor interface (human/ai)

2. **Base scripts as plugin packs**

   * TB pack (you started)
   * SnV pack (we sketched) ([Blood on the Clocktower Wiki][6])
   * BMR pack (we sketched)

3. **Travelers pack** (seat plugins, heavy claim-based) ([Blood on the Clocktower Wiki][7])

4. **Experimental/Carousel pack** (seat plugins + more global rules)

   * 79 Experimental roles (current wiki total) ([Blood on the Clocktower Wiki][3])
   * Carousel snapshot = “all experimental released to date” ([The Pandemonium Institute][1])

5. **Fabled + Loric** (global plugins)

   * Loric explicitly alter the game itself (ST rule modules). ([Blood on the Clocktower Wiki][4])
   * (You said “next one,” so I’m not expanding those here.)

6. **Compilation artifact**

   * Master list of moments
   * Master effect taxonomy
   * Master STKinds registry
   * Master claim kinds
   * Pitfall checklist (role swaps, hidden info, determinism)

That compilation artifact is what prevents rewrites.

---

## Biggest pitfalls (so you can get ahead of them)

### Pitfall A: “Shown state” vs “True state”

Some roles require players to believe something false (Drunk), or evil to be hidden (Marionette/Poppy Grower patterns), or “appears dead” (Zombuul).

Fix: maintain two layers:

* **truth layer** (ST-only, authoritative)
* **public layer** (what each player is allowed to see)

Your events can carry both, but visibility controls decide who receives which.

### Pitfall B: Plugin-local state breaks replay unless you event-source it

If a plugin stores `hasAbility=false` locally, replay must reconstruct that deterministically.

Two safe options:

* represent “spent” as an effect (`NO_ABILITY`) applied via events
* or emit a `PLUGIN_STATE_PATCH` event (I prefer effects for most cases)

### Pitfall C: Concurrency + determinism

Non-blocking ST requests are fine, but:

* log request + decision events
* handle out-of-order responses deterministically by “arrival order”

### Pitfall D: Global rule stacking order

Multiple global modifiers may apply (e.g., Vortox + drunk + misregistration).
You need an explicit order:

1. base truth
2. registration transforms
3. effect distortions (poison/drunk)
4. global rule transforms (Vortox “false info”, etc.)
5. storyteller override final

Write that order down as code, not vibes.

---

## What I need from you to go “full research-mode” next

You asked for “full analysis of all the research into the ability of all the characters.”

To do that in a way that’s actually trustworthy, I’d produce a structured artifact that is *derived from the wiki role pages* (public, canonical), and then map each role into:

* hooks (moments)
* required effects
* required claims
* required STKinds
* whether it needs global rule plugin support

I can do that, but it’s a big cataloging job. The good news is: the wiki categories give us complete role lists for Experimental (79) and the base scripts/travelers. ([Blood on the Clocktower Wiki][3])

If you want, the next step is: I’ll generate the **master compilation** (moments/effects/STKinds/claims) from the union of TB+SnV+BMR+Experimental patterns, even before Fabled/Loric. That gives you the “bigger picture” now, and then you can fill role implementations pack-by-pack.

[1]: https://bloodontheclocktower.com/products/the-carousel?utm_source=chatgpt.com "The Carousel - Experimental Character Collection"
[2]: https://wiki.bloodontheclocktower.com/Main_Page?utm_source=chatgpt.com "Blood on the Clocktower Wiki"
[3]: https://wiki.bloodontheclocktower.com/Category%3AExperimental_Characters?utm_source=chatgpt.com "Category:Experimental Characters"
[4]: https://wiki.bloodontheclocktower.com/Loric?utm_source=chatgpt.com "Loric"
[5]: https://wiki.bloodontheclocktower.com/Experimental?utm_source=chatgpt.com "Experimental"
[6]: https://wiki.bloodontheclocktower.com/Sects_%26_Violets?utm_source=chatgpt.com "Sects & Violets"
[7]: https://wiki.bloodontheclocktower.com/Travellers?utm_source=chatgpt.com "Travellers"

-------------------------------------------------

Yep. Two constraints up front:

* I **can** map the entire BOTC ecosystem into your **INTENT → REQUEST → RESOLUTION** model and produce the full “engine primitives” compilation right now.
* I **cannot** “grab everything from the wiki and store it” *from inside this chat session* because I don’t have a bulk-download connector here (I can open pages, but not crawl hundreds end-to-end), and mirroring the full wiki content verbatim would also run into copyright/volume issues.

What I *can* do is:

1. Give you the **complete ecosystem architecture** (moments/effects/requests/claims/global rules) that covers TB + SnV + BMR + Experimental (Carousel) + Travelers + Fabled + Loric.
2. Give you a **working scraper script** you can run locally to download and store wiki pages (including “How to Run” and examples) using the wiki’s MediaWiki API endpoint. The BOTC wiki is MediaWiki and exposes `api.php`. ([wiki.bloodontheclocktower.com][1])

---

## 1) Full ecosystem model: INTENT / REQUEST / RESOLUTION

### The unifying idea

Every ability becomes one of:

* **Intent** (a player/AI tries to do something): claim, nomination, vote, chat, night choice
* **Request** (the engine asks for input): `IO_REQUEST_*` to a player actor, or `ST_REQUEST` to storyteller arbitration
* **Resolution** (the engine decides outcomes): apply effects, kill attempts, role swaps, info delivery, rule overrides

### Why Storyteller arbitration is “always-on”

Because:

* drunk/poison must distort outcomes without telling the player
* global rules like Vortox invert info
* registration quirks (Recluse/Spy and a lot of Experimental) break naive truth checks
* Travelers/Fabled/Loric are explicitly storyteller-driven categories ([wiki.bloodontheclocktower.com][2])

---

## 2) The complete engine primitives you’ll need

### A) Master moments

You already have most. Here’s the “final form” set that scales to everything:

**Phase**

* `MOMENT_GAME_STARTED`
* `MOMENT_SETUP_STARTED`
* `MOMENT_SETUP_FINISHED`
* `MOMENT_NIGHT_STARTED { day }`
* `MOMENT_BEFORE_WAKE { day, roleKey }`
* `MOMENT_AFTER_WAKE { day, roleKey }`
* `MOMENT_NIGHT_ENDED { day }`
* `MOMENT_DAY_STARTED { day }`
* `MOMENT_DUSK { day }` (needed for “until dusk” expirations)
* `MOMENT_DAY_ENDED { day }`

**Conversation + intent**

* `MOMENT_CLAIM { claimId, claimantId, kind, payload? }`
* `MOMENT_CLAIMED { claimId, claimantId, kind, targetId?, payload? }`
* `IO_CHAT_SENT { seatId, channelId, visibility, text }` (logged; plugins may react for “madness”, “phrase demons”, etc.)

**Nomination/vote**

* `MOMENT_NOMINATION_STARTED { nominatorId, nomineeId }`
* `MOMENT_NOMINATION_CANCELLED { reason }`
* `MOMENT_VOTE_STARTED { nomineeId }`
* `MOMENT_VOTE_CAST { seatId, vote }`
* `MOMENT_VOTE_RESOLVED { nomineeId, executed }`
* `MOMENT_EXECUTION_STARTED { targetId }`
* `MOMENT_EXECUTION_RESOLVED { targetId, died }`

**Death pipeline (critical)**

* `MOMENT_DEATH_ATTEMPTED { targetId, cause, sourceId? }`
* `MOMENT_DEATH_RESOLVED { targetId, died, cause }`

**Identity changes**

* `ROLE_CHANGED { seatId, newRoleKey, reason? }`
* `ALIGNMENT_CHANGED { seatId, newAlignment, reason? }`
* `SHOWN_ROLE_CHANGED { seatId, shownRoleKey }` (for Drunk/Marionette/Poppy Grower style “what they think they are”)

**Information delivery**

* `PRIVATE_INFO_DELIVERED { seatId, sourceRoleKey, text, truthMeta?:ST_ONLY }`
* `PUBLIC_ANNOUNCEMENT { text }`

**Exile (Travelers)**

* `MOMENT_EXILE_VOTE_STARTED { travelerId }`
* `MOMENT_EXILE_VOTE_RESOLVED { travelerId, exiled }`
* `MOMENT_TRAVELER_JOINED / LEFT`

**Endgame**

* `GAME_ENDED { winner, reason }`

### B) Master requests

**Player actor**

* `IO_REQUEST_CHOICE { requestId, seatId, prompt, options, meta }`
* `IO_CHOICE_MADE { requestId, seatId, choiceId, meta }`
* `IO_REQUEST_CHAT { requestId, seatId, channelId, prompt }`

**Storyteller**

* `ST_REQUEST { requestId, kind, payload, await }`
* `ST_DECISION { requestId, kind, decision }`

### C) Master effect taxonomy (reminder token engine)

Effects are the real “rules substrate”. You need these *families* (not all specific effects on day 1):

**Core**

* `DEAD`, `ALIVE_OVERRIDE` (for “appears dead” patterns like Zombuul)
* `POISONED`, `DRUNK`, `SOBERED` (Minstrel-like), `HEALTHY_OVERRIDE`

**Protection / interference**

* `PROTECTED`, `IMMUNE_ONCE`, `REDIRECT_KILL`, `MARKED_FOR_DEATH`
* `EXORCISED` / `BLOCKED_ACTION` / `CANNOT_ACT`

**Voting / nominating**

* `VOTE_WEIGHT`, `VOTE_LOCKED`, `VOTE_HIDDEN`, `CANNOT_NOMINATE`, `MUST_NOMINATE`, `EXTRA_NOMINATION`

**Knowledge / secrecy**

* `GRIMOIRE_VIEW_GRANTED`
* `EVIL_TEAM_INFO_BLOCKED` (Poppy Grower-like)
* `BLUFFS_ASSIGNED / BLUFFS_MODIFIED`

**Ability economy**

* `NO_ABILITY { roleKey }`
* `SECONDARY_ABILITY_GRANTED { abilityKey }` (Boffin/Cannibal/Philo-like)

**Madness / speech rules**

* `MADNESS { roleKey, until:'dusk' }`
* `SILENCED` / `CANNOT_SPEAK_PUBLICLY`

**Global rules**

* `GLOBAL_RULE_ACTIVE { key }` e.g. `VORTOX`, `LEVIATHAN`, `LEGION`, `RIOT`, etc.

### D) Registration service (must be observer- + time-scoped)

At minimum:

* `registersAsEvil(targetId, observerId, momentMeta)`
* `registersAsRole(targetId, roleKey, observerId, momentMeta)`
* `neighborsOf(seatId)`, `distanceBetweenSeats(a,b)`

This is mandatory because misregistration and role/align swaps are everywhere (base + experimental).

### E) Global rule plugins (non-negotiable)

Some roles and storyteller characters are “rules engines”:

* Vortox-style info inversion
* Leviathan/Legion/Riot day structure changes
* Bootlegger-like ordering overrides
* Atheist-type special win conditions
* Fabled + Loric are explicitly “special rules” style storyteller characters ([wiki.bloodontheclocktower.com][3])

So implement:

* `seatPlugins: RolePlugin[]`
* `globalPlugins: GlobalPlugin[]` (derived from roles in play + storyteller picks like Fabled/Loric)

---

## 3) “Full research mode” data: what to extract from the wiki

Role pages consistently include **Summary** and often “How to Run” and examples (Acrobat page shows this structure clearly). ([wiki.bloodontheclocktower.com][4])
Fabled/Traveler pages are similarly structured. ([wiki.bloodontheclocktower.com][5])
Loric are explicitly a category (8 pages) and described as special-rule storyteller characters. ([wiki.bloodontheclocktower.com][6])

So for each page you want to store:

**CharacterRecord**

* `name`
* `roleKey` (snake_case)
* `category`: townsfolk/outsider/minion/demon/traveller/fabled/loric/experimental
* `edition`: TB/SnV/BMR/Experimental/None (for Travelers/Fabled/Loric)
* `summaryText` (token text)
* `howToRunText`
* `examplesText` (if present)
* `jinxes` (if present)
* `lastEdited` (if available)
* `sourceUrl`

Then you can feed these into prompts later as “ground truth snippets” without hand-copying.

---

## 4) A practical way to “grab everything” and store it locally

The BOTC wiki is MediaWiki and exposes `api.php`. ([wiki.bloodontheclocktower.com][1])
Use the Action API to list pages in each category and fetch each page’s HTML + wikitext.

Here’s a **ready-to-run Node script** that:

* pulls page titles from the category pages (Experimental, Fabled, Loric, Travellers, and also the base edition pages if you want)
* downloads each page via `api.php?action=parse`
* stores JSON files in `./botc_wiki_dump/`

> It rate-limits itself a bit. You should still be nice to their servers.

```js
// dump-botc-wiki.mjs
// Node 18+
// Usage: node dump-botc-wiki.mjs

import fs from "node:fs";
import path from "node:path";

const OUT_DIR = path.resolve("./botc_wiki_dump");
fs.mkdirSync(OUT_DIR, { recursive: true });

const API = "https://wiki.bloodontheclocktower.com/api.php";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(params) {
  const url = new URL(API);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  const res = await fetch(url, {
    headers: { "User-Agent": "botc-wiki-dumper/1.0 (personal use)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return res.json();
}

async function listCategoryMembers(categoryTitle) {
  // categoryTitle like: "Category:Experimental Characters"
  let cmcontinue = undefined;
  const titles = [];
  while (true) {
    const data = await api({
      action: "query",
      format: "json",
      list: "categorymembers",
      cmtitle: categoryTitle,
      cmlimit: "500",
      ...(cmcontinue ? { cmcontinue } : {}),
    });
    const members = data?.query?.categorymembers ?? [];
    for (const m of members) titles.push(m.title);

    cmcontinue = data?.continue?.cmcontinue;
    if (!cmcontinue) break;
    await sleep(200);
  }
  return titles;
}

async function parsePage(title) {
  // returns HTML + wikitext + some metadata
  const data = await api({
    action: "parse",
    format: "json",
    page: title,
    prop: "text|wikitext|sections",
    redirects: "1",
  });

  const parse = data?.parse;
  if (!parse) throw new Error(`No parse payload for ${title}`);

  return {
    title: parse.title,
    pageid: parse.pageid,
    sections: parse.sections ?? [],
    html: parse.text?.["*"] ?? "",
    wikitext: parse.wikitext?.["*"] ?? "",
  };
}

function safeFileName(title) {
  return title.replace(/[\/\\?%*:|"<>]/g, "_").replace(/\s+/g, "_");
}

async function dumpTitle(title, categoryHint) {
  const record = await parsePage(title);

  const out = {
    source: {
      wiki: "https://wiki.bloodontheclocktower.com/",
      api: API,
      url: `https://wiki.bloodontheclocktower.com/${encodeURIComponent(title).replaceAll("%2F", "/")}`,
      fetchedAt: new Date().toISOString(),
    },
    categoryHint,
    ...record,
  };

  const file = path.join(OUT_DIR, `${safeFileName(title)}.json`);
  fs.writeFileSync(file, JSON.stringify(out, null, 2), "utf8");
}

async function main() {
  const categories = [
    { title: "Category:Experimental Characters", hint: "experimental" },
    { title: "Category:Travellers", hint: "traveller" },
    { title: "Category:Fabled", hint: "fabled" },
    { title: "Category:Loric", hint: "loric" },
    // Optional additional coverage:
    // { title: "Category:Townsfolk", hint: "character_type_townsfolk" },
    // { title: "Category:Outsiders", hint: "character_type_outsider" },
    // { title: "Category:Minions", hint: "character_type_minion" },
    // { title: "Category:Demons", hint: "character_type_demon" },
  ];

  for (const c of categories) {
    console.log(`Listing ${c.title}...`);
    const titles = await listCategoryMembers(c.title);
    console.log(`  Found ${titles.length}`);

    for (const t of titles) {
      console.log(`  Dumping: ${t}`);
      try {
        await dumpTitle(t, c.hint);
      } catch (e) {
        console.error(`    FAILED: ${t} -> ${e.message}`);
      }
      await sleep(250);
    }
  }

  console.log("Done. Output:", OUT_DIR);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

### Notes on what you’ll get

* Each JSON includes full HTML + wikitext + sections (so you can extract “Summary”, “How to Run”, “Examples”, etc.)
* You can write a second pass that parses sections into structured fields.

This is the only realistic way to “grab everything in one pass” without manually clicking hundreds of pages.

---

## 5) What I’ll do next in-chat (no waiting, no handwaving)

If you want “full research mode” *as an artifact you can paste into Codex prompts*, the best next deliverable is:

* A **Master Implementation Spec** document that:

  * lists every character (base + experimental + travelers + fabled + loric) by roleKey
  * maps each role into one of the 6 patterns (info, night action, claim action, passive, mutation, global rule)
  * lists required **STKinds**, **claim kinds**, and **effect types** per role
  * lists any required new **moments** (rare)
  * highlights engine pitfalls (role swap semantics, “appears dead”, madness enforcement, phrase demons, etc.)

I can generate that structure now, but I’m not going to pretend I can faithfully restate the full text and examples for hundreds of pages inside one chat response. The script above is how you get the exact wiki wording stored locally for later prompt grounding.

If you want, I’ll follow up by producing a single “Master Spec” (engine deltas + per-role pattern mapping) that assumes you have the wiki dump on disk, and it’ll point to the exact JSON fields to feed into prompts when you start writing the AI storyteller/player instructions.

[1]: https://wiki.bloodontheclocktower.com/api.php?action=rsd&utm_source=chatgpt.com "https://wiki.bloodontheclocktower.com/api.php?action=rsd"
[2]: https://wiki.bloodontheclocktower.com/Travellers?utm_source=chatgpt.com "Travellers"
[3]: https://wiki.bloodontheclocktower.com/Loric?utm_source=chatgpt.com "Loric"
[4]: https://wiki.bloodontheclocktower.com/Acrobat?utm_source=chatgpt.com "Acrobat"
[5]: https://wiki.bloodontheclocktower.com/Bureaucrat?utm_source=chatgpt.com "Bureaucrat"
[6]: https://wiki.bloodontheclocktower.com/Category%3ALoric?utm_source=chatgpt.com "Category:Loric"

Below is a **Master Implementation Spec** for your BOTC engine using the **INTENT → REQUEST → RESOLUTION** plugin model. It’s designed to be:

* **Actionable**: concrete lists of *Moments*, *STKinds*, *ClaimKinds*, *EffectTypes*, and *engine deltas*.
* **Extensible**: assumes you’ll add/adjust as new characters ship.
* **Compatible with your wiki dump**: includes a “how to feed JSON fields into prompts” section (without restating wiki text).

I’m going to be blunt: those “six patterns” are basically right, but there are **two hidden categories** you should treat as first-class:
**(7) Speech/Compliance enforcement** (madness, phrase demons, silence), and **(8) Setup/Distribution constraints** (Kazali, Legion, Lord of Typhon, Gardener, Pope, etc.). They’re not fully covered by “global rules” unless you model them explicitly. I’ll include them.

---

# Master Implementation Spec: BOTC Ecosystem

## 0) Glossary

* **Seat**: a player position in the circle, owned by a PlayerActor (human or AI).
* **Role plugin**: seat-owned logic for a character.
* **Global plugin**: ruleset-level logic that modifies core flows (phase, info truth transforms, win conditions, etc.).
* **ST**: storyteller service (human UI or AI storyteller actor) receiving `ST_REQUEST`, returning `ST_DECISION`.
* **Intent**: player-driven input (`MOMENT_CLAIM`, chat, nomination, vote).
* **Request**: engine asks for choice/chat (`IO_REQUEST_*`) or arbitration (`ST_REQUEST`).
* **Resolution**: engine applies effects, death outcomes, swaps, info delivery.

---

## 1) Pattern taxonomy (8 patterns)

These are the stable “expressiveness buckets” for all published characters (base + travelers + experimental + fabled + loric).

### P1 Passive listener

Triggers off moments, may prevent/alter outcomes.

* Examples: Virgin, Soldier, Pacifist, Tea Lady, Saint, Goblin.

### P2 Scheduled action (night/day phase action)

Triggered by `MOMENT_BEFORE_WAKE` or `MOMENT_AFTER_WAKE`, usually with targeting.

* Examples: Poisoner, Monk, most demons, Dreamer, Chambermaid.

### P3 Information provider

Never “computes truth directly to players.” Always goes through `ST_REQUEST(INFO_*)`.

* Examples: Chef, Empath, Clockmaker, Noble, Oracle.

### P4 Claim-based action (explicit “I use ability now”)

Triggered by `MOMENT_CLAIM` / `MOMENT_CLAIMED`.

* Examples: Slayer, Gossip, Artist, Psychopath, Gunslinger, Thief.

### P5 Identity mutation

Role/alignment swaps, inheritance, creation, removal.

* Examples: Pit-Hag, Snake Charmer, Barber, Fang Gu jump, Summoner, Farmer.

### P6 Global rule modifier

Alters fundamental truth transforms, day/night structure, win conditions, secrecy.

* Examples: Vortox, Leviathan, Legion, Riot, Atheist, Poppy Grower, Bootlegger.

### P7 Speech/compliance enforcement

Listens to chat/claim logs; enforces “madness,” forbidden words, silence.

* Examples: Cerenovus, Mutant, Harpy, Mezepheles, Yaggababble.

### P8 Setup/distribution constraint

Modifies starting role distribution, seating constraints, info visibility.

* Examples: Baron, Drunk, Kazali, Lord of Typhon, Gardener, Pope, Legion.

**Conclusion:** yes, the “six” are basically true, but you’ll absolutely want P7 and P8 called out explicitly in your engine requirements and STKinds.

---

## 2) Canonical event model (Moments)

### 2.1 Required core moments

These are the minimum that keep you from rewrites later:

**Game lifecycle**

* `MOMENT_GAME_STARTED`
* `MOMENT_SETUP_STARTED`
* `MOMENT_SETUP_FINISHED`

**Night/day**

* `MOMENT_NIGHT_STARTED { day }`
* `MOMENT_BEFORE_WAKE { day, roleKey }`
* `MOMENT_AFTER_WAKE { day, roleKey }`
* `MOMENT_NIGHT_ENDED { day }`
* `MOMENT_DAY_STARTED { day }`
* `MOMENT_DUSK { day }`
* `MOMENT_DAY_ENDED { day }`

**Intent (player-facing actions)**

* `MOMENT_CLAIM { claimId, claimantId, kind, payload? }`
* `MOMENT_CLAIMED { claimId, claimantId, kind, targetId?, payload? }`
* `IO_CHAT_SENT { seatId, channelId, visibility, text }`

**Nomination/vote/execution**

* `MOMENT_NOMINATION_STARTED { nominatorId, nomineeId }`
* `MOMENT_NOMINATION_CANCELLED { reason }`
* `MOMENT_VOTE_STARTED { nomineeId }`
* `MOMENT_VOTE_CAST { seatId, vote }`
* `MOMENT_VOTE_RESOLVED { nomineeId, executed }`
* `MOMENT_EXECUTION_STARTED { targetId }`
* `MOMENT_EXECUTION_RESOLVED { targetId, died }`

**Death pipeline**

* `MOMENT_DEATH_ATTEMPTED { targetId, cause, sourceId? }`
* `MOMENT_DEATH_RESOLVED { targetId, died, cause }`
* `PLAYER_REVIVED { seatId, reason? }` (you will need this)

**Identity**

* `ROLE_CHANGED { seatId, newRoleKey, reason? }`
* `ALIGNMENT_CHANGED { seatId, newAlignment, reason? }`
* `SHOWN_ROLE_CHANGED { seatId, shownRoleKey, reason? }` (Drunk/Marionette/etc.)

**Exile (Travelers)**

* `MOMENT_EXILE_STARTED { travelerId }`
* `MOMENT_EXILE_VOTE_CAST { seatId, vote }`
* `MOMENT_EXILE_RESOLVED { travelerId, exiled }`
* `MOMENT_TRAVELER_JOINED/LEFT`

**Info delivery**

* `PRIVATE_INFO_DELIVERED { seatId, sourceRoleKey, text }`
* `PUBLIC_ANNOUNCEMENT { text }`

**End**

* `GAME_ENDED { winner:'GOOD'|'EVIL', reason }`

### 2.2 Optional but strongly recommended moments (reduce pain)

* `MOMENT_NOMINATION_FINALIZED` (if you separate “started” vs “locked”)
* `MOMENT_ACTION_WINDOW_OPENED { windowKey }` (day action menus)
* `MOMENT_STATE_CHECKPOINT { label }` (debug/replay anchors, not required)

---

## 3) Master request model

### 3.1 Player IO (always via PlayerActor)

* `IO_REQUEST_CHOICE { requestId, seatId, prompt, options, meta }`
* `IO_CHOICE_MADE { requestId, seatId, choiceId, meta }`
* `IO_REQUEST_CHAT { requestId, seatId, channelId, prompt }`

### 3.2 Storyteller arbitration (always via storytellerService)

* `ST_REQUEST { requestId, kind, payload, await }`
* `ST_DECISION { requestId, kind, decision }`

You will use `ST_REQUEST` for:

* all info delivery (even “true” info)
* all trigger checks that can be distorted (drunk/poison/global rules)
* all role swaps that require discretion
* all enforcement of speech rules / madness / phrase demons
* any “storyteller chooses who dies” patterns

---

## 4) Master Effect taxonomy

Instead of listing 200 specific effects now, define **effect families** with clear shapes. You’ll add named effects as needed.

### 4.1 Core state

* `DEAD {}` (or alive flag + dead effects; pick one)
* `APPEARS_DEAD {}` (Zombuul-like)
* `ALIVE_OVERRIDE { alive:boolean }` (rare but useful)

### 4.2 Impairments

* `POISONED { sourceId, until }`
* `DRUNK { sourceId, believedRoleKey?, until }`
* `SOBERED_GLOBAL { until }` (Minstrel-like)
* `ABILITY_DISABLED { abilityKey?, until, sourceId }`
* `NO_ABILITY { roleKey, sourceId }` (spent marker)

### 4.3 Protection/kill manipulation

* `PROTECTED { sourceId, until }`
* `IMMUNE_ONCE { reason, used:boolean }`
* `REDIRECT_KILL { toSeatId, until }`
* `MARKED_FOR_DEATH { cause, until, sourceId }`
* `KILL_BLOCKED { until }`

### 4.4 Voting/nominating

* `VOTE_WEIGHT { delta, until }`
* `VOTE_LOCKED { until, mode:'match_other'|'forbidden'|'forced' }`
* `VOTE_HIDDEN { until }`
* `CANNOT_NOMINATE { until }`
* `MUST_NOMINATE { until }`
* `EXTRA_NOMINATION { count, until }`

### 4.5 Knowledge/secrecy

* `GRIMOIRE_VIEW_GRANTED { until }`
* `EVIL_TEAM_INFO_BLOCKED { until }` (Poppy Grower style)
* `BLUFFS_ASSIGNED { bluffs, until }`
* `SECRET_MINION {}` (Marionette style)
* `DEMON_HOLDER { holderId }` (Lil’ Monsta style)

### 4.6 Speech/compliance

* `MADNESS { roleKey, until }`
* `SILENCED { until }`
* `FORBIDDEN_PHRASE { phrase, until }`

### 4.7 Global rules

* `GLOBAL_RULE_ACTIVE { key, data?, until? }`
  Examples: `VORTOX`, `LEVIATHAN`, `LEGION`, `RIOT`, `ATHEIST`, `HERETIC`, etc.

### 4.8 Linking/relationships

* `LINKED_PAIR { kind, a, b, data? }` (Evil Twin, etc.)
* `HOSTED_BY { hostId }` (Lleech)
* `MINION_ABILITY_PERSISTS_WHEN_DEAD {}` (Vigormortis-like)

---

## 5) Master ClaimKinds (INTENT vocabulary)

Don’t hardcode 150 claim kinds in the engine. Do this:

* `ClaimKind = string` (open-ended)
* Maintain a curated `claimKinds.ts` registry for UI menus + validation
* Plugins declare the claimKinds they respond to

Still, you’ll want a baseline set:

### 5.1 Core claim families

* `CLAIM_USE_ABILITY_ONCE` (generic)
* `CLAIM_DAY_ACTION` (generic)
* `CLAIM_NIGHT_ACTION_OVERRIDE` (rare)
* Scripted explicit:

  * TB: `CLAIM_SLAYER`, `CLAIM_GOSSIP`, etc.
  * SnV: `CLAIM_ARTIST_QUESTION`, `CLAIM_JUGGLER`, etc.
  * Travelers: `CLAIM_GUNSLINGER`, `CLAIM_THIEF`, etc.
  * Experimental: lots (Psychopath, Alsaahir, Preacher, etc.)

**Rule:** claims should carry payload that is either:

* a targetId
* a list of targets
* a question string
* a map of guesses
* a structured “proposal” that ST resolves

---

## 6) Master STKind registry (REQUEST vocabulary)

You don’t want 300 ad-hoc kinds with no structure. Use a naming convention and categories.

### 6.1 STKind naming standard

* `INFO/<roleKey>` — info results
* `TRIGGER/<roleKey>/<triggerName>` — “does this fire?”
* `RESOLVE/<roleKey>/<actionName>` — action outcomes
* `RULES/<ruleKey>` — global rule transforms
* `SETUP/<roleKey>` — setup constraints/assignments
* `ENFORCE/<mechanic>` — madness/phrases/speech constraints
* `WINCHECK/<ruleKey>` — special win conditions

Examples:

* `INFO/chef`
* `TRIGGER/virgin/nomination`
* `RESOLVE/slayer/shot`
* `RULES/vortox`
* `ENFORCE/madness`
* `WINCHECK/leviathan`

This gives you:

* predictable handlers in AutoStoryteller
* clean logs
* easy prompt templating later

---

## 7) Engine deltas checklist (what you must build “now”)

This is the “avoid rewrites” list.

### 7.1 Two-layer identity (Truth vs Shown)

You must support:

* `trueRoleKey` (ST-only)
* `shownRoleKey` (what the player believes/what UI shows them)
* `shownTeam` sometimes differs (rare but possible)

Events:

* `ROLE_CHANGED` updates truth
* `SHOWN_ROLE_CHANGED` updates player-facing belief

### 7.2 Role swap semantics

When `ROLE_CHANGED` occurs:

* decide which effects persist, which reset, which transfer
  Make it explicit in code: `roleChangePolicy(roleFrom, roleTo, effects[])`.

### 7.3 Global plugin order

Define a deterministic order for transforms:

1. base truth
2. registration transforms
3. impairment transforms (drunk/poison)
4. global rules (Vortox, etc.)
5. ST final decision

### 7.4 Speech enforcement bus

Plugins must be able to react to:

* `IO_CHAT_SENT`
* `MOMENT_CLAIMED`
  and request enforcement decisions:
* `ST_REQUEST ENFORCE/madness`, etc.

### 7.5 Setup constraint pipeline

You must represent setup as a pipeline:

* seat assignment
* role distribution modifiers
* links/hosts/holders
* secrecy constraints (poppy grower)
* starting info schedules (first night order)

### 7.6 “Dead can act” support

Some roles act while dead or inherit abilities:

* represent with an effect (e.g., `DEAD_ACTS` / `SECONDARY_ABILITY_GRANTED`)
* plugin runner must consult these to decide whether a seat plugin runs.

### 7.7 Multi-kill and revive

* multiple death attempts in a chain
* revive events that restore alive status without leaking cause

---

## 8) Per-role mapping format (how the master spec should be structured)

You’ll generate this from your wiki dump later, but here’s the schema.

```ts
type RoleSpec = {
  roleKey: string;
  category: 'townsfolk'|'outsider'|'minion'|'demon'|'traveller'|'fabled'|'loric'|'experimental';
  edition?: 'TB'|'SnV'|'BMR'|'Experimental'|'N/A';
  patterns: Array<'P1'|'P2'|'P3'|'P4'|'P5'|'P6'|'P7'|'P8'>;

  hooks: {
    firstNight?: { beforeWake?: boolean; afterWake?: boolean };
    otherNights?: { beforeWake?: boolean; afterWake?: boolean };
    onEvents?: string[]; // MOMENT_* or IO_CHAT_SENT etc.
  };

  claimKinds?: string[];
  stKinds: string[];
  effectTypes?: string[];
  requiredMoments?: string[]; // only if truly new
  notes?: string[]; // pitfalls, hidden info, special transforms
};
```

You can store these in `masterSpec.json` / `masterSpec.ts`.

---

## 9) Master “catalog” (high level, not every role listed)

You asked for the master spec without fully restating each role. So here’s a **role-family mapping** you can implement immediately, and then fill role-by-role as you parse your wiki JSON.

### 9.1 Role families → patterns

**Info roles** → P3 (+ usually P2 for timing)
**Targeting night actions** → P2
**Once-per-game day abilities** → P4
**Protection/immunity** → P1 + death pipeline
**Speech/madness/phrases** → P7
**Role swaps / alignment swaps / inheritance** → P5
**Global demons/rules** → P6
**Setup modifiers** → P8
**Travelers** → mostly P4 + P1 + ST-heavy
**Fabled/Loric** → P6 + P8 + P7 depending

---

## 10) Feeding your wiki JSON into prompts (exactly how)

Your dumper stores per-page JSON:

* `title`
* `wikitext`
* `html`
* `sections[]`

You’re going to build a parser that extracts these sections (names vary but are consistent-ish):

* “Summary” / the token text
* “How to Run”
* “Examples”
* “Jinxes”
* “Interactions” (sometimes)

### 10.1 Recommended derived fields (store alongside your dump)

Create a normalized object per page:

```ts
type WikiRoleDoc = {
  roleKey: string;
  title: string;
  url: string;
  categoryHint: string;

  // extracted
  summary: string;     // short
  howToRun: string;    // medium
  examples: string;    // medium/long
  jinxes: string;      // optional
  rulings: string;     // optional

  // raw refs
  source: { fetchedAt: string; pageid: number };
};
```

### 10.2 Prompt assembly pattern

When generating prompts for AI players/storyteller, do NOT dump whole pages. Provide:

* summary (short)
* 1–3 key how-to-run bullet snippets (short)
* 1 example (short)

Example prompt template inputs:

```ts
type PromptRoleContext = {
  roleKey: string;
  summary: string;
  howToRunHighlights: string[];
  exampleHighlights: string[];
  engineConstraints: {
    hiddenInfoRules: string[]; // “don’t reveal drunk/poison”
    availableActions: string[]; // claimKinds
  };
};
```

Then your serverfn prompt can include:

* **Role Summary**
* **What you can do now (claimKinds)**
* **What you must never reveal**
* **Current state view** (public-only for player AI; ST-only for storyteller AI)

### 10.3 Where to point in your repo

* `botc_wiki_dump/*.json` (raw)
* `botc_wiki_dump_normalized/*.json` (parsed fields)
* `prompts/roleContext/{roleKey}.json` (the distilled “prompt role context”)

---

## 11) “Big compilation” you can code right now (without parsing wiki)

These are the files you should generate immediately:

### 11.1 `enginePrimitives.ts`

Exports:

* `MomentType[]`
* `EffectType[]`
* `STKindPrefix[]`
* `GlobalRuleKeys[]`
* `PatternEnum`

### 11.2 `stKinds.ts`

Defines the naming convention and a typed helper:

* `makeInfoKind(roleKey)`
* `makeResolveKind(roleKey, action)`
* `makeTriggerKind(roleKey, trigger)`
* `makeRulesKind(ruleKey)`
* `makeEnforceKind(mechanic)`
* `makeWinCheckKind(ruleKey)`

### 11.3 `roleSpecTemplate.ts`

The `RoleSpec` schema and an empty catalog for:

* TB + SnV + BMR + Travelers + Experimental + Fabled + Loric

You can fill these programmatically later from wiki dump, and then hand-adjust when needed.

---

## 12) What “full implementation” looks like with this spec

1. Implement the engine primitives and services (effects, registration, ST arbitration, history log).
2. Implement role packs incrementally (TB, then SnV, then BMR, then Travelers, then Experimental).
3. Implement Fabled + Loric as **global plugins** using the same STKind naming and effect system.
4. Use your wiki dump to generate a “RoleSpec catalog” and a “PromptRoleContext catalog.”

At that point, “adding a new character” is:

* add wiki JSON
* add a RoleSpec entry (or auto-generate)
* add plugin stub
* wire any new effect types (rare)

---

If you want the next tangible artifact after this spec: I can produce a **single Codex prompt** that tells Codex to generate `enginePrimitives.ts`, `stKinds.ts`, `roleSpecTemplate.ts`, and a skeleton `catalogBuilder.ts` that reads your normalized wiki JSON and emits RoleSpec + PromptRoleContext. That’s the shortest route from “architecture” to “working pipeline.”

### Quick clarifications before the Codex prompt (so you don’t bake in wrong assumptions)

**Structured proposal (from point 5 / claim payloads):**
This is your “don’t explode ClaimKinds” trick. Instead of inventing `CLAIM_XYZ` for every micro-action, you use a small set of claim kinds and stick the *real intent* in a typed payload. Example:

* `MOMENT_CLAIM { kind:'CLAIM_USE_ABILITY', payload:{ ability:'slayer', targetMode:'single' } }`
* `MOMENT_CLAIMED { kind:'CLAIM_USE_ABILITY', payload:{ ability:'slayer', targetId:'p3' } }`

The plugin filters on `payload.ability === 'slayer'`.
Same mechanism also covers weird actions like “Artist asks a yes/no question” (payload includes `questionText`), “Juggler guesses” (payload includes `guesses[]`), etc.

**ROLE_CHANGED vs SHOWN_ROLE_CHANGED (your “masking” intuition is correct):**

* `ROLE_CHANGED` = the *truth* character on the grimoire changes. Pit-Hag, Snake Charmer, Barber swaps, Fang Gu jump, Summoner, Engineer, etc.
* `SHOWN_ROLE_CHANGED` = the player’s *belief/UI* changes (“masking”). Drunk, Marionette-style secrecy, Lunatic, and any effect that changes what the player thinks they are.

So yes: what you called “masking” = `SHOWN_ROLE_CHANGED` plus a `MASKED_BY`/`SECRET_MINION`-type effect in the truth layer.

**Jinxes:**
You’re thinking about it the right way. Model it as a **registrar** run during setup that computes a set of active jinx rules. Then:

* store `activeJinxes` in truth state (ST-only)
* expose `jinxService.has(jinxKey)` in PluginAPI
* optionally: inject “jinx modifiers” as global plugins that adjust resolution centrally (best for cross-role rule changes)

That way plugins can branch behavior based on jinx presence without hardcoding cross-role logic everywhere.

---

## Codex prompt: generate point 11 artifacts + catalog builder pipeline

```text
You are an expert TypeScript engineer working on a BOTC (Blood on the Clocktower) engine using:
- XState (v5 preferred) for orchestration
- TanStack React on the UI side
- Redux for projections (not required in this task)
- ServerFn for OpenAI calls (not required in this task)

TASK
Implement the “Point 11” foundational artifacts and the pipeline scaffolding described below:
1) enginePrimitives.ts
2) stKinds.ts
3) roleSpecTemplate.ts (RoleSpec schema + empty catalogs)
4) catalogBuilder.ts (reads normalized wiki JSON and produces RoleSpec catalog + PromptRoleContext)
5) promptRoleContext schema + generator
6) jinx registry scaffolding (placeholder now, but wired)
7) exports/index.ts that re-exports the above

DO NOT implement full game logic, GameMachine, or role plugins here. This task is only the spec/catalog/prompt pipeline.

NON-NEGOTIABLE
- Strict TypeScript. Avoid any; use unknown + narrowing.
- Keep naming consistent, predictable, and future-proof.
- Provide clean, documented types.
- Make all “lists” extensible (string unions where stable, but allow unknown extensions via string).
- Provide minimal unit tests with jest/ts-jest for key functions (stKind helpers, catalog parsing).
- No runtime web calls. All inputs come from local JSON dumps.

ASSUMED INPUT (Normalized wiki dump)
There is a folder: ./botc_wiki_dump_normalized/
Each file is a JSON object with this shape (exact fields):
{
  "roleKey": "snake_case_key",
  "title": "Page Title",
  "url": "https://wiki....",
  "categoryHint": "experimental|traveller|fabled|loric|...",
  "summary": "string",
  "howToRun": "string",
  "examples": "string",
  "jinxes": "string",
  "rulings": "string",
  "source": { "fetchedAt": "ISO", "pageid": 123 }
}
Some fields may be empty strings.

OUTPUT FOLDERS
Write generated files to:
- ./src/spec/enginePrimitives.ts
- ./src/spec/stKinds.ts
- ./src/spec/roleSpecTemplate.ts
- ./src/spec/jinxes.ts
- ./src/spec/catalogBuilder.ts
- ./src/spec/generated/roleSpecCatalog.json (generated)
- ./src/spec/generated/promptRoleContextCatalog.json (generated)
- ./src/spec/index.ts

Also create tests:
- ./src/spec/__tests__/stKinds.test.ts
- ./src/spec/__tests__/catalogBuilder.test.ts

PART 1: enginePrimitives.ts
Export:
- Pattern enum with 8 patterns:
  P1_PASSIVE_LISTENER
  P2_SCHEDULED_ACTION
  P3_INFO_PROVIDER
  P4_CLAIM_ACTION
  P5_IDENTITY_MUTATION
  P6_GLOBAL_RULE
  P7_SPEECH_ENFORCEMENT
  P8_SETUP_CONSTRAINT
- MomentType as string union of the canonical moments (export an array MOMENT_TYPES and type MomentType = typeof MOMENT_TYPES[number], but allow extension by accepting string where needed).
Include at least:
  MOMENT_GAME_STARTED
  MOMENT_SETUP_STARTED
  MOMENT_SETUP_FINISHED
  MOMENT_NIGHT_STARTED
  MOMENT_BEFORE_WAKE
  MOMENT_AFTER_WAKE
  MOMENT_NIGHT_ENDED
  MOMENT_DAY_STARTED
  MOMENT_DUSK
  MOMENT_DAY_ENDED
  MOMENT_CLAIM
  MOMENT_CLAIMED
  MOMENT_NOMINATION_STARTED
  MOMENT_NOMINATION_CANCELLED
  MOMENT_VOTE_STARTED
  MOMENT_VOTE_CAST
  MOMENT_VOTE_RESOLVED
  MOMENT_EXECUTION_STARTED
  MOMENT_EXECUTION_RESOLVED
  MOMENT_DEATH_ATTEMPTED
  MOMENT_DEATH_RESOLVED
  PLAYER_REVIVED
  ROLE_CHANGED
  ALIGNMENT_CHANGED
  SHOWN_ROLE_CHANGED
  PRIVATE_INFO_DELIVERED
  PUBLIC_ANNOUNCEMENT
  GAME_ENDED
- EffectType as a curated list of effect families (export EFFECT_TYPES array + type EffectType).
Include:
  DEAD
  APPEARS_DEAD
  POISONED
  DRUNK
  PROTECTED
  IMMUNE_ONCE
  REDIRECT_KILL
  MARKED_FOR_DEATH
  VOTE_WEIGHT
  VOTE_LOCKED
  VOTE_HIDDEN
  CANNOT_NOMINATE
  MUST_NOMINATE
  EXTRA_NOMINATION
  GRIMOIRE_VIEW_GRANTED
  EVIL_TEAM_INFO_BLOCKED
  BLUFFS_ASSIGNED
  SECRET_MINION
  DEMON_HOLDER
  NO_ABILITY
  SECONDARY_ABILITY_GRANTED
  ABILITY_DISABLED
  MADNESS
  SILENCED
  FORBIDDEN_PHRASE
  GLOBAL_RULE_ACTIVE
  LINKED_PAIR
  HOSTED_BY
  DEAD_ACTS
- GlobalRuleKey curated list (string union + array):
  VORTOX, LEVIATHAN, LEGION, RIOT, ATHEIST, HERETIC, POPPY_GROWER, BOOTLEGGER, LIL_MONSTA, XAAN, ZENOMANCER, YAGGABABBLE
(Allow extension.)
- ClaimKind is a string type, but provide a curated CLAIM_KIND_SUGGESTIONS array and a helper for namespacing.

PART 2: stKinds.ts
Implement STKind as string.
Implement helpers enforcing naming conventions:
- infoKind(roleKey) => `INFO/${roleKey}`
- triggerKind(roleKey, triggerName) => `TRIGGER/${roleKey}/${triggerName}`
- resolveKind(roleKey, actionName) => `RESOLVE/${roleKey}/${actionName}`
- rulesKind(ruleKey) => `RULES/${ruleKey}`
- enforceKind(mechanic) => `ENFORCE/${mechanic}`
- winCheckKind(ruleKey) => `WINCHECK/${ruleKey}`
Add runtime validators:
- isInfoKind, isTriggerKind, etc. using regex
Add tests for these helpers.

PART 3: roleSpecTemplate.ts
Define types:
- RoleCategory: 'townsfolk'|'outsider'|'minion'|'demon'|'traveller'|'fabled'|'loric'|'experimental'
- Edition: 'TB'|'SnV'|'BMR'|'Experimental'|'N/A'
- RoleSpec:
  roleKey: string
  title?: string
  url?: string
  category: RoleCategory
  edition: Edition
  patterns: Pattern[]
  hooks: {
    firstNight?: { beforeWake?: boolean; afterWake?: boolean }
    otherNights?: { beforeWake?: boolean; afterWake?: boolean }
    onEvents?: string[]
  }
  claimKinds: string[]
  stKinds: string[]
  effectTypes: string[]
  requiredMoments: string[]
  jinxKeys: string[]  // computed or manually assigned later
  notes: string[]
- PromptRoleContext:
  roleKey: string
  title?: string
  summary: string
  howToRunHighlights: string[]
  exampleHighlights: string[]
  jinxNotes: string[]
  engineConstraints: {
    hiddenInfoRules: string[]
    allowedClaimKinds: string[]
  }
  stKindHints: {
    infoKind?: string
    resolveKinds?: string[]
    triggerKinds?: string[]
  }
Also export:
- EMPTY_ROLE_SPEC_CATALOG: RoleSpec[] (empty)
- EMPTY_PROMPT_CONTEXT_CATALOG: PromptRoleContext[] (empty)

PART 4: jinxes.ts (scaffolding)
Create types:
- JinxKey = string
- JinxRule { key: JinxKey; roles: [string, string]; summary: string; stNotes: string }
Export:
- KNOWN_JINX_RULES: JinxRule[] = [] (empty for now)
- computeActiveJinxes(inPlayRoleKeys: string[]): JinxKey[] (match unordered role pairs)
- NOTE: this is just infrastructure; do not populate rules yet.

PART 5: catalogBuilder.ts
Implement a Node-compatible builder (no TS node config needed; just export functions; tests call them).
Responsibilities:
1) Read all JSON in ./botc_wiki_dump_normalized (path passed in)
2) Produce:
  - roleSpecCatalog: RoleSpec[]
  - promptRoleContextCatalog: PromptRoleContext[]
3) Write JSON outputs to ./src/spec/generated/*.json when invoked by a small CLI function (optional).

Key behaviors:
- Determine RoleCategory from categoryHint if possible; otherwise leave as 'experimental' and add a note.
- Determine Edition:
  - if roleKey is in TB/SnV/BMR roster maps (you will hardcode the rosters from earlier work),
  - else if categoryHint is experimental => 'Experimental'
  - travellers/fabled/loric => 'N/A'
- Determine patterns using heuristics on summary/howToRun text:
  - If contains “Each night” or “Each day” => P2
  - If contains “learn” / “you know” / “is told” => P3
  - If contains “once per game” and not night => P4
  - If contains “becomes” / “swap” / “change character” => P5
  - If contains “rules” / “win” / “cannot die at night” => P6
  - If contains “mad” / “must claim” / “if you say” => P7
  - If contains “setup” / “adds” / “extra” / “starts knowing” => P8
Always include manual override: if ambiguous, add note and keep patterns minimal.
- Generate stKinds:
  - Always include infoKind(roleKey) if P3 true OR if text includes “learn/know/told”.
  - Include resolveKind(roleKey, 'action') if P2 or P4 is true.
  - Include triggerKind(roleKey, 'trigger') if P1/P7 implies enforcement.
- Generate claimKinds:
  - For P4, add `CLAIM/${roleKey}` by default (string)
  - For roles containing “question” (Artist-like) add `CLAIM/${roleKey}/question`
  - For guess-based roles, add `CLAIM/${roleKey}/guess`
- Generate effectTypes:
  - Based on keywords:
    poison -> POISONED
    drunk -> DRUNK
    protect -> PROTECTED
    cannot vote -> VOTE_LOCKED
    extra vote -> VOTE_WEIGHT
    mad -> MADNESS
    silence -> SILENCED
    “appears dead” -> APPEARS_DEAD
    “becomes” -> ROLE_CHANGED (note in requiredMoments)
  Store these as strings (not strict unions) but prefer enginePrimitives names.
- Generate PromptRoleContext:
  - summary = normalized.summary
  - howToRunHighlights: split howToRun into short bullet-like chunks (max 3), truncate each to ~200 chars
  - exampleHighlights: split examples similarly (max 2)
  - jinxNotes: include normalized.jinxes truncated (max 2 chunks)
  - engineConstraints.hiddenInfoRules default:
      [
        "Never reveal hidden effects (drunk/poison/madness) to players.",
        "Do not reveal true roles or alignments unless rules explicitly say so.",
        "If uncertain, ask the Storyteller (ST_REQUEST) rather than guessing."
      ]
  - allowedClaimKinds = claimKinds derived
  - stKindHints: include generated kinds

PART 6: index.ts
Re-export everything from these spec modules.

TESTS
- stKinds.test.ts verifies helper outputs and regex validators.
- catalogBuilder.test.ts uses a small in-memory fixture set (write temp files) and asserts:
  - patterns get assigned
  - stKinds generated
  - claimKinds generated
  - prompt context highlight truncation works
  - edition mapping works for a known TB roleKey

DELIVERABLE: RUNNABLE GENERATION
Provide a small exported function in catalogBuilder.ts:
- buildCatalogs({ inputDir, outputDir }): Promise<void>
that reads normalized wiki JSON and writes the two generated JSON catalogs.

END.
```

If you want, after you run this once and it generates catalogs, the next step is super mechanical: use the generated `RoleSpec` list to scaffold plugin stubs (one file per roleKey) and have Codex fill in hook skeletons automatically.
