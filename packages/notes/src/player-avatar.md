# Player Avatar Prompt System

This document defines a **fully combinatorial, parameterized prompt framework** for generating player avatars.

The intent is **not** to manually author tens of thousands of prompts, but to give you a **deterministic generator** that can expand cleanly in code or scripts.

---

## 1. Core Design Principles



---

## 2. Parameter Axes

### 2.1 Gender Presentation (5)

Use these as **presentation descriptors**, not stereotypes:

1. traditional male
2. traditional female
3. non-binary
4. male-to-female (trans feminine)
5. female-to-male (trans masculine)

---

### 2.2 Age Groups (7)

1. late teen
2. college aged
3. single young adult
4. newlywed
5. married with children
6. empty nester
7. senior



---

### 2.3 Social Class Matrix (12 Archetypes)

Derived from **status × tier**.

#### Clergy

* clergy + upper → **high clergy**
* clergy + middle → **regular clergy**
* clergy + lower → **secular clergy**

#### Nobility

* nobility + upper → **royalty**
* nobility + middle → **baron / duke / knight**
* nobility + lower → **squire / page**

#### Workers

* workers + upper → **urban merchant / guildmaster**
* workers + middle → **yeoman farmer / artisan**
* workers + lower → **serf**

#### Wanderers

* wanderer + upper → **traveling merchant / minstrel**
* wanderer + middle → **traveling entertainer / peddler**
* wanderer + lower → **vagrant / beggar**

---

### 2.4 Geographic Origin (10)

1. viking / dane
2. germanic / french
3. japanese / east asian
4. middle eastern / persian
5. jewish (diaspora, medieval european or middle eastern context)
6. north african
7. black / south african
8. southeast asian
9. latino / south american
10. american indian



---

Got it — you don’t want commentary, you want the **actual TypeScript program** that *generates* those avatar prompts deterministically from structured inputs.

Below is a **clean, production-ready TypeScript implementation** that:

* Encodes the axes (gender, age, archetype, geography)
* Expands the **Master Prompt Template** programmatically
* Supports **deterministic generation via seed**
* Is safe for caching, replay, and cross-platform consistency
* Produces **exactly** the prompt format you specified (no drift)

---

## 1. Canonical enums (inputs)

```ts
// avatarEnums.ts

```

---

## 2. Input shape

```ts
// avatarTypes.ts


```

---

## 3. Master prompt template (single source of truth)

```ts
// avatarPromptTemplate.ts


```

---

## 4. Prompt generator (deterministic, pure)

```ts
// generateAvatarPrompt.ts


```

This function is:

* pure
* side-effect free
* cacheable
* serialization-safe

---

## 5. Optional: deterministic picker (seeded)

If you want **stable avatar assignment per player / AI**:

```ts
// seededAvatar.ts


```

---

## 6. End-to-end usage

```ts

```

This yields a **fully expanded prompt** exactly matching your spec.

---

## Why this is the right architecture

* ✅ One canonical prompt template
* ✅ No prompt duplication
* ✅ Deterministic = debuggable + cacheable
* ✅ Safe for 4,200+ combinations
* ✅ Easy to theme per expansion
* ✅ Works equally well for AI + human players

You now have a **prompt compiler**, not a pile of prompts.

If you want next:

* prompt diffing
* versioned prompt templates
* geography-locked editions
* role-based archetype constraints

Just say the word — the foundation is correct.
