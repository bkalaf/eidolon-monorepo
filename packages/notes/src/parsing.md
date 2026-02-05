New discoveries:
1. The very first line in summary section that becomes our abilityText field.
2. Remaining summary lines should get stored as advice in the object.

type Cadence =
  | 'firstNight'
  | 'eachNight'
  | 'eachNightNoFirst'
  | 'oncePerGame'
  | 'passive'
  | 'triggered';

type Trigger =
  | 'nightBeforeWake'
  | 'nightAfterWake'
  | 'dayAction'
  | 'nominationStarted'
  | 'voteResolved'
  | 'executionResolved'
  | 'deathAttempted'
  | 'deathResolved'
  | 'claimResolved'
  | 'setup';

type Trigger =
  | 'nightBeforeWake'
  | 'nightAfterWake'
  | 'dayAction'
  | 'nominationStarted'
  | 'voteResolved'
  | 'executionResolved'
  | 'deathAttempted'
  | 'deathResolved'
  | 'claimResolved'
  | 'setup';

Top ability trigrams
1. each night STAR — 27
2. night STAR choose — 21
3. once per game — 21
4. each night choose — 18
5. choose player they — 17
6. night choose player — 14
7. STAR choose player — 14
8. player they die — 13
9. per game night — 9
10. choose 2 players — 6
11. choose player yourself — 6
12. game night choose — 6
13. player if they — 6
14. 1 outsider ACCEPT_MODIFIER — 5
15. drunk until dusk — 5
16. each night learn — 5
17. even if dead — 5
18. learn how many — 5
19. they die if — 5
20. 1 2 players — 4
21. 1 good player — 4
22. all players know — 4
23. choose player if — 4
24. if demon kills — 4
25. night choose 2 — 4
26. night STAR learn — 4
27. player might die — 4
28. player they poisoned — 4
29. 2 players particular — 3
30. can t die — 3
31. choose alive player — 3
32. choose living player — 3
33. each day may — 3
34. executed evil wins — 3
35. game during day — 3
36. game night STAR — 3
37. knowing that 1 — 3
38. learn which player — 3
39. night learn how — 3
40. per game during — 3
41. start knowing 1 — 3
42. start knowing that — 3
43. that 1 2 — 3
44. they die ACCEPT_MODIFIER — 3
45. 0 1 outsider — 2
46. 1 alive player — 2
47. 1 player drunk — 2
48. 1st time die — 2
49. 2 players they — 2
50. 3 players live — 2
51. 5 more players — 2
52. ACCEPT_MODIFIER 0 1 — 2
53. ACCEPT_MODIFIER 1 outsider — 2
54. ACCEPT_MODIFIER evil characters — 2
55. alive neighbor if — 2
56. alive player if — 2
57. all players learn — 2
58. bad might happen — 2
59. become their alignment — 2
60. both might die — 2
61. but demon knows — 2
62. character s ability — 2
63. choose 1 alive — 2
64. choose 3 players — 2
65. choose character they — 2
66. choose dead player — 2
67. choose player different — 2
68. choose player learn — 2
69. day after 1st — 2
70. day may choose — 2
71. demon doesn t — 2
72. demon even if — 2
73. demon knows who — 2
74. demon may choose — 2
75. demon they die — 2
76. die ACCEPT_MODIFIER 1 — 2
77. died publicly choose — 2
78. died today choose — 2
79. died today tonight — 2
80. different last night — 2
81. doesn t kill — 2

1. each night — 56
2. choose player — 37
3. night STAR — 31
4. night choose — 26
5. they die — 23
6. once per — 22
7. per game — 21
8. STAR choose — 21
9. player they — 20
10. start knowing — 16
11. 2 players — 13
12. each day — 13
13. may choose — 13
14. good player — 12
15. if they — 11
16. all players — 9
17. even if — 9
18. game night — 9
19. might die — 9
20. player if — 9
21. die if — 8
22. how many — 8
23. until dusk — 8
24. 3 players — 7
25. choose 2 — 7
26. if dead — 7
27. if demon — 7
28. alive player — 6
29. don t — 6
30. learn how — 6
31. learn which — 6
32. night learn — 6
33. player yourself — 6
34. their ability — 6
35. 1 good — 5
36. 1 outsider — 5
37. ACCEPT_MODIFIER 1 — 5
38. can t — 5
39. day if — 5
40. drunk until — 5
41. good character — 5
42. if die — 5
43. more players — 5
44. outsider ACCEPT_MODIFIER — 5
45. player might — 5
46. publicly choose — 5
47. team loses — 5
48. their character — 5
49. 1 2 — 4
50. character they — 4
51. day may — 4
52. dead player — 4
53. demon kills — 4
54. die ACCEPT_MODIFIER — 4
55. died today — 4
56. during day — 4
57. evil player — 4
58. evil players — 4
59. evil wins — 4
60. if executed — 4
61. if good — 4
62. last night — 4
63. learn if — 4
64. learn their — 4
65. living player — 4
66. outsiders ACCEPT_MODIFIER — 4
67. player different — 4
68. players know — 4
69. players learn — 4
70. players may — 4
71. STAR learn — 4
72. t die — 4
73. their alignment — 4
74. they learn — 4
75. they poisoned — 4
76. 1 alive — 3
77. 1 player — 3
78. 1st night — 3
79. 1st time — 3
80. ability if — 3
81. ACCEPT_MODIFIER 0 — 3
82. alive neighbor — 3
83. character but — 3
84. character if — 3
85. choose alive — 3
86. choose living — 3
87. choose which — 3

To be clear of all the major facts about the Trouble Brewing Characters are defined below:
These are misregistration : spy, recluse
These are ongoing info roles : fortuneteller, undertaker, empath
These are one-time info roles : ravenkeeper
These have active abilities : slayer
These are protection roles : monk, soldier, mayor
These are voting restriction roles : butler
These are setup modifiers : drunk, baron
These are masking roles: drunk
These have on attempted execution conditions : saint, virgin
These check registration : virgin, empath, chef
These have make a choice roles : fortuneteller, monk, butler, poisoner, slayer, ravenkeeper
These have on demon death checks : imp, soldier, monk
These are win condition modifiers : saint, imp
These have conditionals tied to players alive : monk
These have night order actions : spy, poisoner, scarletwoman, imp, butler, washerwoman, chef, librarian, investigator, monk, fortuneteller, undertaker, ravenkeepeer
These are first night only roles : washerwoman, chef, librarian, investigator
These are every night roles except the first night : imp, scarletwoman, ravenkeeper, undertaker,   
These are every night roles : poisoner, monk, butler, fortuneteller, empath

In the imp rolespec file it defines this as a passive ability: {
      "kind": "GLOBAL_RULE",
      "ruleKey": "IMP",
      "activeWhile": "alive",
      "resolution": "automatic",
      "evidence": [
        "good wins (text)"
      ]
    }
It's kind of like a backwards passive. It should be defined as a win condition. If we define it this way how do we check this realistically? 

I'd like to define what we do with the choice the imp makes. We have this in resolution of the active ability : "RESOLVE/imp/action". Can we define the resolution as an emit action "ATTEMPTED_DEATH" like we've talked about before? Is that appropriate?   

In the poisoner we have this:
"spend": {
        "marksNoAbilityEffect": true
      }
I think it would be better to define the EFFECT that is a result of the poisoner choice (ie it's resolution).

let's use this previously define type: 
EffectType =
  'requestChoice'
| 'requestInfo'
| 'applyEffect'
| 'removeEffect'
| 'killAttempt'
| 'preventDeath'
| 'redirectDeath'
| 'modifySetup'
| 'modifyRegistration'
| 'modifyVote'
| 'endGame';

and apply that throughout the trouble brewing characters as well

important types we need to define and start using:

type NightCardType = 
    | { type: 'ZERO', equals: '0' } 
    | { type: 'ONE', equals: '1' }
    | { type: 'TWO', equals: '2' }
    
In howToRun here are some other tokens to extract:
* `Show them fingers (0, 1, or 2)`: this clearly indicates the kind of message we send to the character and puts a hard restriction on the information can only be 0 1 or 2. Let's add that conditional guard.
* `2 alive neighbors are evil`: important things to pick up on
    * `alive neighbors`: that would mean that each neighbor must be the first alive person that is encountered on either side of the player
    * `are evil`: checks alignment (not characterType!) there can be good minions and evil townsfolk
* `Put the Empath to sleep.`: this can be generalized as /Put the .* to sleep/ this indicates the end of the wake for that character so emit { event: 'PUT_TO_SLEEP' } or something like that that makes sense with our defintion and setup.
* `you see the Grimoire`: indicates an action in the case of the spy its a 'SPY_GRIMOIRE_VIEW' per the below but I'm not 100% locked into this if theres better naming etc
* `even if dead.`: we need to mark abilities that persist through death with this

more on the spy: in howToRun this is the text
`Each time the Spy is targeted by an ability that detects or affects good characters, choose what character and alignment the Spy registers as. (Do whatever is appropriate, such as showing a good character token, nodding, giving finger signals, or allowing an ability to work that would normally only affect good, Townsfolk, or Outsider players.)`
it feels like `choose what character and alignment the <<CHARACTER ROLE>> registers as` is trigger text for registration and a st_choice

in the poisoner how to run:
`They have no ability, but they think they do`: this is the marksNoAbilityEffect: true we talked about previously.
`Each dusk, the poisoned player becomes healthy—remove their POISONED reminder.`
It feels like this previous discussion wasn't ever implemented. Can we incorporate this into our roleSpec: here's where we get the until part for our effect = POISONED { targetId, source:"poisoner", until:"nextDusk" }

1) The new shape: Moments + Effects + Registration + History
Canonical “moment” events (game emits these)

Night loop:

MOMENT_NIGHT_STARTED { day }

MOMENT_BEFORE_WAKE { day, roleKey } ✅ (your proposal)

MOMENT_AFTER_WAKE { day, roleKey } (optional but useful)

MOMENT_NIGHT_ENDED { day }

Day loop:

MOMENT_DAY_STARTED { day }

MOMENT_NOMINATION_STARTED { nominatorId, nomineeId }

MOMENT_VOTE_STARTED { nomineeId }

MOMENT_EXECUTION_RESOLVED { targetId, died }

MOMENT_DAY_ENDED { day }

Resolution moments:

MOMENT_DEATH_ATTEMPTED { targetId, cause }

MOMENT_DEATH_RESOLVED { targetId, died, cause }

Arbitration + player IO:

IO_REQUEST_CHOICE { requestId, seatId, prompt, options, visibility }

IO_CHOICE_MADE { requestId, seatId, choice }

IO_REQUEST_CHAT { requestId, seatId, channelId, prompt }

IO_CHAT_SENT { seatId, channelId, text, visibility }

ST_REQUEST { requestId, kind, payload }

ST_DECISION { requestId, decision }

Two services the game owns (not players)

registrationService: “When someone checks alignment/role, what do they register as?”

effectsService: reminder tokens / statuses / durations / sources (poisoned, protected, dead, vote mods, etc.)

History log (event sourcing-lite)

You log only canonical game events (and optionally IO + ST decisions depending on replay mode). My recommendation:

GameLog (replayable): all MOMENT_*, ST_*, IO_*, plus state-changing commands like EFFECT_APPLIED, PLAYER_DIED, etc.

DevLog (non-replay): errors, debug, traces.

This gives you replays + reveal stage without storing full state snapshots.

2) Plugin contract: “before/after wake” + concurrency-safe IO

Each role plugin has these hooks:

type NightHook = (args: {
  day: number;
  seatId: string;          // who owns this role
  roleKey: RoleKey;        // "chef", "monk", etc.
  ctx: PluginCtx;          // read-only selectors + services
  io: PluginIO;            // requestChoice/requestST (async)
  emit: (e: GameEvent) => void; // emit game events (sync)
}) => Promise<void> | void;

type RolePlugin = {
  roleKey: RoleKey;
  seatId: string;

  firstNight?: {
    beforeWake?: NightHook;
    afterWake?: NightHook;
  };

  otherNights?: {
    beforeWake?: NightHook;
    afterWake?: NightHook;
  };

  // non-night hooks:
  onEvent?: (event: GameEvent, helpers: ...) => void | Promise<void>;
};


Key detail: plugins can be async, but the game machine controls what it awaits.

3) How “no false synchronicity” works

You want to launch info prompts in flight even if earlier roles haven’t answered yet, as long as the choices won’t affect the board.

So we classify role hooks into blocking and non-blocking operations.

Plugin IO API supports “fire and forget” vs “must await”
type PluginIO = {
  requestChoice: (req: ChoiceRequest, opts?: { await: boolean }) => Promise<ChoiceResult | void>;
  requestST: (req: StorytellerRequest, opts?: { await: boolean }) => Promise<StorytellerDecision | void>;
};


Then your night runner does:

For each roleKey in night order:

emit MOMENT_BEFORE_WAKE { day, roleKey }

call plugin hook

if hook requires a blocking result (e.g., Poisoner target → affects kills), it uses await: true

if hook is pure info (Chef, Investigator…), it uses await: false and the hook continues later when responses arrive, emitting info delivery events when ready.

This avoids false synchronicity while still letting mechanics roles block correctly.

Important: you still need deterministic replays. So even if you don’t await, you do log the eventual IO_CHOICE_MADE / ST_DECISION events in the order they occur. Replay will reproduce that order.

4) Drunk/poison: never suppress; instead “resolution policy”

Your fix is conceptually: actions still execute, but their outcomes may be altered by hidden effects.

So instead of gating plugins, you do:

Plugins always run.

When a plugin requests info or resolves an effect, it goes through a Resolution Layer that can distort/negate results without telling the player why.

Concretely:

A) Info roles never compute truth directly

Chef/Empath/etc. should not calculate and then “lie sometimes.”
They should request a truth proposal and let ST / rules engine finalize:

Plugin emits ST_REQUEST { kind:"INFO", payload:{ roleKey:"chef", day, truth:{...} } }

Resolution layer:

checks effects (drunk/poison) on that seat for that moment

if affected, returns an altered value (or asks storyteller AI/human to pick)

Then game emits PRIVATE_INFO_DELIVERED { seatId, roleKey, message, truthMeta? }

Player actor only sees the message, never the “you were poisoned” fact.

B) Active abilities that “fail”

Poisoned Monk still “chooses”; the choice is recorded; protection may be silently not applied.

Implement via effect application policy:

Plugin tries to apply effect: emit(EFFECT_APPLY_REQUESTED { ... })

Resolution layer decides:

apply / partially apply / do nothing

Then emit EFFECT_APPLIED or EFFECT_DENIED (but denial is not shown to the player).

This keeps “Keep your information to yourself” intact.

5) Registration service + effects service (the two workhorses)
registrationService

Provides stable queries used by info roles:

registersAsEvil(seatId, observerSeatId, moment) => boolean

registersAsRole(seatId, roleKey, observerSeatId, moment) => boolean

getNeighbors(seatId) => { leftId, rightId } etc.

It consults:

base role (Spy/Recluse)

temporary effects (poisoned might alter “truth,” depending on how you model it)

storyteller overrides (for edge cases)

effectsService

Stores status/reminder tokens as structured data:

apply(effect) / remove(effectId) / has(effectType, seatId, moment)

durations: until:"nextDusk", untilNightEnd, forDay: N, etc.

sources: sourceRoleKey, sourceSeatId

Examples:

POISONED { targetId, source:"poisoner", until:"nextDusk" }

PROTECTED { targetId, source:"monk", until:"nightEnd" }

DEAD { ... }

VOTE_WEIGHT { seatId, delta:+2, until:"voteEnd" }

This is your reminder token layer and it’ll save you.

6) Night order with your MOMENT_BEFORE_WAKE

Yes: roleKey is “chef”, “poisoner”, etc. Night order runner:

emit MOMENT_NIGHT_STARTED { day }

for each roleKey in that script’s night order:

emit MOMENT_BEFORE_WAKE { day, roleKey }

run all seats with that roleKey (usually 0/1, but could be >1 in custom)

emit MOMENT_AFTER_WAKE { day, roleKey }

emit MOMENT_NIGHT_ENDED { day }

First night vs other nights: plugin checks day === 1 and uses firstNight hooks, like you said.

7) TB sketch under the new system

Below is the TB roster mapped into the new hooks. I’m focusing on what they do under beforeWake/afterWake and which are blocking.

Townsfolk

Washerwoman (first night, info, non-blocking)

firstNight.beforeWake: io.requestST({kind:"INFO_WASHERWOMAN", truth:{...}}, {await:false})

Librarian (first night, info, non-blocking)

similar INFO_LIBRARIAN

Investigator (first night, info, non-blocking)

INFO_INVESTIGATOR

Chef (first night, info, non-blocking)

INFO_CHEF

Empath (other nights, info, non-blocking)

otherNights.beforeWake: INFO_EMPATH (neighbors computed via registrationService)

Fortune Teller (every night, choice+info, usually blocking for that seat only)

beforeWake: io.requestChoice(pick two, await:true) (blocking for FT seat)

then io.requestST(INFO_FT, await:false) (info delivery can be async)

Undertaker (other nights, info, non-blocking)

beforeWake: uses last executed player from state, INFO_UNDERTAKER

Monk (other nights, choice, blocking)

beforeWake: requestChoice(target, await:true)

emit EFFECT_APPLY_REQUESTED(PROTECTED...) (resolution layer may deny if poisoned)

Ravenkeeper (reactive on death, blocking when triggered)

onEvent(PLAYER_DIED at night for self): requestChoice(target, await:true)

requestST(INFO_RAVENKEEPER, await:false)

Virgin (reactive on nomination)

onEvent(MOMENT_NOMINATION_STARTED):

if first time and nominee is virgin:

emit MOMENT_NOMINATION_CANCELLED

emit MOMENT_EXECUTION_STARTED on nominator (or MOMENT_DEATH_ATTEMPTED cause="VIRGIN")

Slayer (day action, blocking)

onEvent(DAY_ACTION_SLAYER_REQUESTED) (you’ll have a generic “day actions” channel):

requestChoice(target, await:true)

requestST(DECIDE_SLAYER_HIT, await:true or false)

emit MOMENT_DEATH_ATTEMPTED if hit

Soldier (reactive on demon-kill attempt)

onEvent(MOMENT_DEATH_ATTEMPTED cause="DEMON_KILL"):

if target is soldier: emit DEATH_PREVENT_REQUESTED → resolution denies death

Mayor (reactive on demon-kill attempt)

onEvent(MOMENT_DEATH_ATTEMPTED cause="DEMON_KILL"):

if target is mayor:

requestST(DECIDE_MAYOR_BOUNCE, await:true) (or rules engine picks)

emit new MOMENT_DEATH_ATTEMPTED to bounced target

emit DEATH_PREVENT_REQUESTED for mayor

Outsiders

Butler (vote constraint, reactive)

effectsService stores BUTLER_MASTER

onEvent(MOMENT_VOTE_CAST by butler): if mismatched, requestST or auto-enforce

Drunk (setup modifier)

applied during setup: EFFECT_APPLIED(DRUNK, believedRoleKey=...)

The seat’s role plugin is still the believed role plugin; resolution layer makes info unreliable

Recluse (registration modifier)

registrationService: registersAsEvil sometimes true; registersAsMinion/Demon if needed

Saint (reactive on execution death)

onEvent(MOMENT_DEATH_RESOLVED cause="EXECUTION"): if target saint and died → GAME_ENDED

Minions

Poisoner (other nights, blocking)

beforeWake: choice target await:true

emit EFFECT_APPLY_REQUESTED(POISONED until nextDusk)

Spy (first night, info, non-blocking)

firstNight.beforeWake: io.requestST(SPY_GRIMOIRE_VIEW, await:false)

registrationService: spy may register as good/townsfolk

Scarlet Woman (reactive on demon death)

onEvent(MOMENT_DEATH_RESOLVED cause includes demon):

if alive players >= 5, emit ROLE_SWAP_REQUESTED { scarlet->imp } (resolved by game)

Baron (setup modifier)

setup emits SETUP_MODIFY outsidersDelta:+2

Demon

Imp (every night, blocking)

beforeWake: choice kill target await:true

emit MOMENT_DEATH_ATTEMPTED { targetId, cause:"DEMON_KILL" }

star-pass: if chooses self (or separate action):

emit death attempted self cause="STAR_PASS"

requestST(select minion, await:true)

emit role swap to imp

Travelers (TB five)

All travelers become “day action + ST arbitration + effects tokens”.

Bureaucrat: applies vote weight token

Thief: steals tokens/rights (effects)

Gunslinger: death attempted

Scapegoat: disables voters (effects)

Beggar: ST mediates vote tokens (effects)

8) The one thing to be strict about: Determinism + event order

When you allow “non-blocking” info roles, you must still produce a deterministic log. Solution:

Every IO request gets a requestId.

Every response logs IO_CHOICE_MADE / ST_DECISION with timestamps or a monotonically increasing eventIndex.

The game processes emitted events in the order they’re received, but your replay replays that exact same order from the log.

You also mentioned meta { depth }. Do it, plus:

chainId per root moment

maxDepth guard

maxEventsPerTick guard

9) How this integrates with your websocket routing

Player actors are the websocket boundary.

Game emits:

IO_REQUEST_CHOICE → routed to that seat’s PlayerActor
Player actor emits back:

IO_CHOICE_MADE → routed into game queue

Same for chat:

game can request chat (“please announce X”), actor sends over websocket; or human sends chat, actor forwards to game as IO_CHAT_SENT which can be logged for replays.

AI actor is identical, except it fulfills IO_REQUEST_* by calling your ServerFn and then emits IO_*_MADE/SENT.

10) Effect tokens: your boardgame reminder layer

Make effects first-class, because tons of characters (beyond TB) depend on them.

Minimal effect model:

effectId

type

targets: seatId[]

source: { roleKey, seatId }

timing: { startEventIndex, expiresAt: { kind, day } }

visibility: "ST_ONLY" | "OWNER_ONLY" | "PUBLIC" (almost always ST_ONLY)

Then resolution helpers:

isPoisoned(seatId, moment)

isDrunk(seatId, moment)

isProtected(seatId, moment)

getVoteWeight(seatId, moment)

Players never see the raw effects unless rules say so.

11) Practical takeaway: your “setup switch statement” goes away cleanly

Instead of:

switch(role) { case Chef: doChefSetup() }

You do:

assign roles

create plugins (role factories)

run night 1 with MOMENT_BEFORE_WAKE according to script night order

plugins handle first-night info and actions via IO and ST arbitration

Setup becomes phase orchestration, not role logic.

I feel the need to say this: while I'm defining a lot of specifics for each of these character in this and the past 4 prompts, these are NOT meant to be overrides. These are to be direction from me so that we can backwards engineer a parsing system that works across all the characters. Don't simply put an override in place, try to reason out how to get the result I'm giving you from the parsed wiki data. Please, reconsider all the data I've given thus far for RoleSpec definitions with this in mind and refactor extensively.

----------------------------

The fortune teller is not a start knowing role - i've told you this 4 times now.

{
      "kind": "SETUP_CONSTRAINT",
      "constraintKey": "REMINDER_TOKEN_RED_HERRING",
      "payload": {
        "token": "RED HERRING",
        "placement": "any good character",
        "description": "Place the RED HERRING reminder token by any good character."
      },
      "reason": "Reminder token instructions detected",
      "evidence": [
        "'s RED HERRING reminder token by any good character token"
      ]
    },
    {
      "kind": "SETUP_CONSTRAINT",
      "constraintKey": "MARKER_PERSISTENCE",
      "payload": {
        "description": "The marker stays on the same player for the entire game, even if the storyteller source dies.",
        "duration": "permanent"
      },
      "reason": "Permanent marker phrase detected",
      "evidence": [
        "same player throughout the entire game (text)"
      ]
    }

This is incorrectly reasoned and set up. The MARKER_PERSISTENCE constraint appears to apply to the whole character when it should just apply to the RED HERRING token. also, placement is a bad descriptor. It should be constraint { alignment: 'good' }
