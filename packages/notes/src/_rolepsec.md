//chats/_rolepsec.md
Got it — **plain text Codex prompt only**, no formatting tricks, no commentary. You can paste this directly into Codex.

---

You are Codex. Implement a RoleSpec compiler for Blood on the Clocktower.

GOAL
Transform normalized wiki-derived role data into declarative RoleSpec objects that align with the engine architecture. This compiler converts parsed wiki data plus n-gram analysis into structured, engine-ready specifications.

The compiler must be conservative, transparent, and deterministic:

* Fill fields only when signals are strong
* Add TODOs when ambiguity or Storyteller discretion exists
* Never invent mechanics not present in source text

INPUTS

1. Parsed wiki output directory (produced by parseWikiDump):

* roleRecords.json
* normalizedPages/<roleKey>.json

2. Ability text n-gram analysis outputs:

* ability_bigrams.json
* ability_trigrams.json
* ability_token_counts.json

3. Optional configuration file:

* compilerConfig.json (phrase thresholds, overrides, forced mappings)

OUTPUTS

* roleSpecs.json (array of RoleSpec)
* roleSpecs/<roleKey>.json (optional per-role files)
* compilerReport.json (stats and unresolved TODOs)

---

TARGET ROLE SPEC SHAPE

interface RoleSpec {
roleKey: string;
title: string;
category: 'townsfolk' | 'outsider' | 'minion' | 'demon' | 'traveller' | 'fabled' | 'loric';
editionTags: string[];

abilityText: string;
summary: string;
howToRun?: string;
examples?: string[];

setupModifications: SetupModificationSpec[];
nightOrderSteps: NightOrderStepSpec[];
onMoments: OnMomentSpec[];
passiveAbilities: PassiveAbilitySpec[];
activeAbilities: ActiveAbilitySpec[];

jinxes: JinxSpec[];

tags: RoleTagSpec;
stKinds: string[];

todos?: string[];
}

---

COMPILER LOGIC

A) BASE POPULATION

* Copy roleKey, title, category, editionTags
* Copy abilityText, summary, howToRun, examples
* Copy jinxes verbatim

B) SIGNAL DETECTION (TEXT + N-GRAMS)

Use both regex over text and bigram/trigram presence.

Key phrase detectors (examples):

* "each night STAR" → actsAtNight
* "each night" → actsAtNight
* "first night" → firstNightOnly
* "once per game" → usage = once_per_game
* "during the day" or "publicly choose" → day claim
* "choose a player" → active ability with targetCount = 1
* "you start knowing" → setupModifications.START_KNOWING
* "register as" → passiveAbilities.REGISTRATION_MODIFIER
* "becomes evil" or "becomes the demon" → ROLE_CHANGED (setup or onMoment)
* "if you die" or "when you die" → MOMENT_DEATH_RESOLVED
* "cannot die" or "does not die" → DEATH_PREVENTION
* "wins" or "loses" → GLOBAL_RULE or win-condition tag

Prefer n-gram matches when available. Fallback to regex only when needed.

C) SETUP MODIFICATIONS

Emit SetupModificationSpec when:

* abilityText contains setup phrases
* role alters bag, role counts, or starting info
* role implies masking (Drunk, Lunatic, Marionette)

If unclear, emit TODO instead of guessing.

D) NIGHT ORDER STEPS

Emit when:

* role acts at night
* determine when: firstNight / otherNights / everyNight
* blocksNight = true if choice or ST input is required

Do NOT assign absolute ordering here.

E) ACTIVE ABILITIES

Emit when:

* ability requires player choice, targeting, or claim

Infer:

* kind: night_action or day_claim
* usage from phrases (once per game, each night)
* intent.requestChoice (target count inferred from text)
* resolution.stKind = RESOLVE/<roleKey>/<action>
* spend.marksNoAbilityEffect if once per game

F) PASSIVE ABILITIES

Emit when:

* ability modifies registration, info reliability, death, voting, or win conditions

Examples:

* Drunk → INFO_DISTORTION (st_request)
* Recluse → REGISTRATION_MODIFIER
* Vortox → GLOBAL_RULE

G) ON MOMENTS

Emit when:

* ability triggers conditionally

Map to moments such as:

* MOMENT_NOMINATION_STARTED
* MOMENT_DEATH_RESOLVED
* MOMENT_VOTE_CAST
* MOMENT_CLAIMED
* IO_CHAT_SENT (madness / goblin-style)

H) TAG DERIVATION

Populate RoleTagSpec:

* isInfoRole
* isSetupModifier
* actsAtNight
* actsByClaim
* hasRoleSwap
* hasAlignmentSwap
* hasRegistrationWeirdness
* isGlobalRule

I) TODO TRACKING

Whenever:

* Storyteller discretion is required
* timing is ambiguous
* signals conflict

Add a clear human-readable string to RoleSpec.todos.

---

CONFIGURATION

Support compilerConfig.json:

{
"phraseThresholds": {
"nightAction": 2,
"dayClaim": 1
},
"forcedOverrides": {
"virgin": { "onMoments": ["MOMENT_NOMINATION_STARTED"] }
}
}

---

COMPILER REPORT

Emit compilerReport.json:

{
"rolesProcessed": number,
"rolesWithActiveAbilities": number,
"rolesWithTodos": number,
"commonTodos": {
"ST discretion required": number,
"Ambiguous timing": number
}
}

---

NON-GOALS

* Do not encode full game logic
* Do not remove or reinterpret jinxes
* Do not auto-resolve Storyteller discretion
* Do not assume Trouble Brewing–only rules

---

IMPLEMENTATION NOTES

* TypeScript, strict mode
* Deterministic output (stable sorting)
* Clear comments explaining inference rules
* Prefer transparency over completeness

[
  "BOTC Card Design Ideas",
  "Dwarf Strategic Surveyor Design",
  "Image Request Limit",
  "Mythbound Gladiator Character Design",
  "Shadow Prince Character Design",
  "Royal Chronicler Character Design",
  "Cartographic Savant Concept",
  "Folk Oracle Character Design",
  "Image Alignment in Android",
  "Text Replacement Request",
  "Blood of my Blood",
  "Text Modification Request",
  "CSV to XLSX Ubuntu",
  "Center and Resize QR Code",
  "Image Request Void Sovereign",
  "Image Request",
  "Dispossessed Heir Character Design",
  "Mill Overseer Character Design",
  "Wolf Astrological Observer Design",
  "Wandering Strongarm Concept",
  "Hellenic Greek Town Archivist",
  "Orc Hunter-Tracker Design",
  "Serpent Planar Envoy Design",
  "Estate Administrator Character Design",
  "Gradle Java Toolchain Error",
  "Candle-Seer Character Design",
  "Minotaur Dock Porter Concept",
  "Dark Elf Royal Chronicler",
  "Hellenic Greek Foundry Mauler",
  "Halfling Prophetic Navigator Design",
  "Omniscient Observer Character Design",
  "Hunter-Tracker Character Design",
  "Military Pathfinder Character Design",
  "Maori Imperial Shock Troop",
  "Ruin Sneak Character Design",
  "Landed Adjudicator Character Design",
  "Find OpenJDK17 Location",
  "Legendary Freeblade Character Design",
  "Minotaur Cartographic Savant",
  "New chat",
  "Gnome Treasury Assessor Design",
  "Halfling Disowned Pathfinder Design",
  "Halfling Disowned Pathfinder Design",
  "Shrine Thaumaturge Illustration",
  "Non-binary Tannery Laborer",
  "Tiger Flagellant Guardian Design",
  "Sigil Engraver Character Design",
  "Pilgrim Guide Character Design",
  "Branch · Revised Token Estimate",
  "Warlord Noble Character Design",
  "Pilgrim Guide Character Design",
  "Alchemical Brewer Character Design",
  "Jewish Grand Enchanter Design",
  "Pilgrim Guide Character Design",
  "Curse Peddler Character Design",
  "World-Walker Character Design",
  "Living Relic Guardian Concept",
  "Latino Heavy Infantryman Concept",
  "Dispossessed Heir Illustration",
  "Halfling Fallen House Retainer",
  "Hunter-Tracker Character Design",
  "Halfling Shrine Thaumaturge Design",
  "Minotaur High Hierophant Design",
  "Fieldhand Gatherer Character Design",
  "Iron Duke Character Design",
  "Cartographic Savant Character Design",
  "Icon size request",
  "Text Removal Request",
  "Remove Curse of Common Man",
  "Excalibur Icon Red",
  "Image Design Request",
  "Ogre Diplomatic Envoy Design",
  "Treasury Assessor Concept Art",
  "Grand Enchanter Character Design",
  "Landed Adjudicator Character Design",
  "Ogre Curse Peddler Design",
  "Tar command unpacking",
  "Fox City Watch Enforcer",
  "Scandinavian City Scout",
  "Dark Elf Titan-Hired Muscle",
  "Jewish Contract Courier",
  "Temple Penitent Character Design",
  "Arcane Advisor Character Design",
  "Ogre High Theologian Concept",
  "Sigil Engraver Character Design",
  "Jewish Philosophical Chancellor",
  "Alchemical Brewer Character Design",

  
  "Imperial Arcanist Character Design",
  "Town Archivist Character Design",
  "Dwarf Inquisitorial Guard Design",
  "Orc Imperial Arcanist Design",
  "Sacred Juggernaut Character Design",
  "Hellenic Greek Court Wizard",
  "Imperial Recon Master Design",
  "Maori Imperial Recon Master",
  "Candle-Seer Character Design",
  "Road Enforcer Character Design",
  "Guild Surveyor Character Design",
  "Minotaur Curse Peddler Design",
  "Minotaur Legendary Wayfinder Design",
  "Fallen House Retainer",
  "Orc Siege Loader Concept",
  "Royal Chronicler Illustration Request",
  "Guild Surveyor Character Design",
  "Wolf Treasury Assessor Design",
  "Fallen House Bruiser Design",
  "Astral Mathematician Portrait",
  "Serpent Disowned Champion Design",
  "Bastard Knight Character Design",
  "Bastard Mage-Scion Concept",
  "Candle-Seer Character Design",
  "Scottish City Watch Enforcer",
  "Scottish Grand Enchanter Design",
  "Dragon Caravan Guard Design",
  "Romani Guild Artisan Design",
  "Curse Peddler Character Design",
  "Tiger Town Archivist Design",
  "Prophetic Navigator Character Design",
  "Dwarf Dispossessed Heir Concept",
  "Myth Route Seeker Design",
  "Bastard Knight Character Design",
  "Divine Punisher Character Design",
  "Fate Cartographer Character Design",
  "Landed Adjudicator Concept",
  "Dwarf House Champion Design",
  "Bastard Huntmaster Character Design",
  "Shrine Attendant Concept Art",
  "Road Enforcer Character Design",
  "Aboriginal Armored Retainer",
  "Curse Peddler Illustration",
  "Character Design Request",
  "High Elf Courtly Emissary",
  "Ruin Sneak Character Design",
  "Hedge Witch Character Design",
  "Titan-Hired Muscle Character Design",
  "Indigenous Estate Administrator",
  "Legendary Freeblade Illustration",
  "Orc Titan-Hired Muscle",
  "Dwarf Minor Court Official",
  "Fallen House Bruiser Concept",
  "Folk Oracle Character Design"
]