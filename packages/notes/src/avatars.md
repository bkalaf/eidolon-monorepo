Got it. Two big moves here:

1. **Stop making “N=2, N=3, N=9…” components.** Make **one** flexible “TarotRow” + “AvatarGrid” system and let props handle the layout. You’ll thank yourself later.
2. **Do not ship binary avatar blobs over websockets.** Ship **URLs** (preferably signed + cached). Binary through WS will hurt you in latency, memory, serialization, and state machine sanity.

Below is a clean, shadcn-friendly plan with concrete component + schema shapes.

---

## Data + storage: how avatars should work

### Best practice (recommended)

Store avatars in object storage (S3 / Cloudflare R2 / GCS) and store **a URL (or key)** in Mongo.

* Mongo user doc: `avatarKey` or `avatarUrl`
* Client gets a normal URL (or signed URL)
* Avatars load with `<img src=... />`
* Caching becomes trivial
* Websocket messages remain tiny and serializable

### “Store binary in Mongo” (you can, but don’t)

If you store binary in Mongo (Buffer), you still should **not** broadcast it via WS. Instead:

* Server exposes `GET /users/:id/avatar`
* Client loads via URL
* Server can cache and add `ETag`/`Cache-Control`

If you *really* want “stored in DB”, use **GridFS**, but you’ll still serve it via HTTP.

### Game machine context

Keep it serializable and small:

```ts
type PlayerImagesBySeat = Record<number, { userId: string; avatarUrl: string | null }>;
```

No blobs. No Buffers. No base64 unless you enjoy pain.

---

## Mongoose: add avatar fields

Add fields that support either hosted URL or an object-store key.

```ts
// user.schema.ts
import { Schema, model } from "mongoose";

const UserSchema = new Schema(
  {
    name: { type: String, required: true },

    // Preferred:
    avatarUrl: { type: String, default: null }, // e.g. signed URL or public URL
    avatarKey: { type: String, default: null }, // e.g. "avatars/userId.png"

    // If you insist on DB binary (not recommended):
    // avatar: { data: Buffer, contentType: String },

  },
  { timestamps: true }
);

export const User = model("User", UserSchema);
```

If you later choose object storage, `avatarKey` is the durable truth, and `avatarUrl` can be a signed URL generated on demand.

---

## UI primitives

### 1) `PlayerAvatar` (75x75, name banner)

This is the “atom” everything else uses. It always renders the symmetrical banner.

* 75x75 image
* bottom banner with name (frame style)
* optionally a token slot beneath or overlaid (your call)

```tsx
// PlayerAvatar.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export type PlayerAvatarProps = {
  name: string;
  imgSrc?: string | null;
  size?: number; // default 75
  tokenSlot?: React.ReactNode; // optional, displayed under or on top
  className?: string;
};

export function PlayerAvatar({
  name,
  imgSrc,
  size = 75,
  tokenSlot,
  className,
}: PlayerAvatarProps) {
  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <div
        className="relative overflow-hidden rounded-md border bg-muted"
        style={{ width: size, height: size }}
      >
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={name}
            className="h-full w-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            NO IMG
          </div>
        )}

        {/* Name banner */}
        <div className="absolute bottom-0 left-0 right-0">
          <div className="mx-1 mb-1 rounded-sm border bg-background/90 px-1 py-0.5 text-center text-[10px] font-medium leading-tight">
            <span className="block truncate">{name}</span>
          </div>
        </div>
      </div>

      {tokenSlot ? <div className="min-h-[18px]">{tokenSlot}</div> : null}
    </div>
  );
}
```

---

### 2) Tarot header row layout: `TarotPanel`

This replaces all your “title text”. The tarot card image is the left “header”, everything else goes on the right.

```tsx
// TarotPanel.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

type TarotPanelProps = {
  tarotImgSrc: string;
  tarotAlt?: string;
  children: React.ReactNode;
  className?: string;

  // Sizing knobs
  tarotWidth?: number; // e.g. 90
};

export function TarotPanel({
  tarotImgSrc,
  tarotAlt = "Tarot card",
  children,
  className,
  tarotWidth = 90,
}: TarotPanelProps) {
  return (
    <div className={cn("flex w-full items-stretch gap-3", className)}>
      <div
        className="shrink-0 overflow-hidden rounded-lg border bg-muted"
        style={{ width: tarotWidth }}
      >
        <img
          src={tarotImgSrc}
          alt={tarotAlt}
          className="h-full w-full object-cover"
          draggable={false}
        />
      </div>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
```

---

### 3) `AvatarGrid` that auto-lays out (1xN, 2x2, 3x3, 4x4, etc.)

You said “if 4 avatars do 4x4” — I assume you meant “use a grid that fits nicely”, not literally 16 slots. The usual rule: pick columns based on count.

This version:

* 1–2: 2 columns max
* 3–4: 2 columns
* 5–9: 3 columns
* 10+: 4 columns

```tsx
// AvatarGrid.tsx
import * as React from "react";
import { PlayerAvatar, PlayerAvatarProps } from "./PlayerAvatar";
import { cn } from "@/lib/utils";

export type AvatarItem = Omit<PlayerAvatarProps, "className"> & {
  id: string;
};

function columnsForCount(n: number) {
  if (n <= 1) return 1;
  if (n <= 4) return 2;
  if (n <= 9) return 3;
  return 4;
}

export function AvatarGrid({
  items,
  className,
}: {
  items: AvatarItem[];
  className?: string;
}) {
  const cols = columnsForCount(items.length);

  return (
    <div
      className={cn("grid gap-3", className)}
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {items.map((p) => (
        <div key={p.id} className="flex justify-center">
          <PlayerAvatar {...p} />
        </div>
      ))}
    </div>
  );
}
```

Now you can handle:

* “YOU SEE” with 2 or 3 people → same component, different array length
* “MINIONS” 1–5 → same
* “DEMONS” 1–9 → same

No component explosion.

---

## Select Player component (shadcn primitives)

You want:

* shows current selection in a select/dropdown
* when opened, show **all eligible players** with avatar + name
* filtering: alive only / dead only / etc
* “maybe modal is better”: yes, use **Dialog + Command** for a nice searchable picker (shadcn style)

### Types

```ts
export type PlayerStatus = "alive" | "dead";

export type PlayerOption = {
  id: string;
  name: string;
  seat: number;
  status: PlayerStatus;
  avatarUrl?: string | null;
};

export type PlayerFilter =
  | { mode: "all" }
  | { mode: "alive" }
  | { mode: "dead" }
  | { mode: "custom"; predicate: (p: PlayerOption) => boolean };
```

### Component: `SelectPlayer`

This uses:

* `Button` to open dialog
* `Dialog` to show full-screen-ish list
* `Command` to search
* each item shows `PlayerAvatar`

```tsx
// SelectPlayer.tsx
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { PlayerAvatar } from "./PlayerAvatar";

export type PlayerStatus = "alive" | "dead";

export type PlayerOption = {
  id: string;
  name: string;
  seat: number;
  status: PlayerStatus;
  avatarUrl?: string | null;
};

export type PlayerFilter =
  | { mode: "all" }
  | { mode: "alive" }
  | { mode: "dead" }
  | { mode: "custom"; predicate: (p: PlayerOption) => boolean };

function applyFilter(players: PlayerOption[], filter: PlayerFilter) {
  switch (filter.mode) {
    case "all":
      return players;
    case "alive":
      return players.filter((p) => p.status === "alive");
    case "dead":
      return players.filter((p) => p.status === "dead");
    case "custom":
      return players.filter(filter.predicate);
  }
}

export function SelectPlayer({
  players,
  valueId,
  onChange,
  filter = { mode: "all" },
  label = "Select player",
}: {
  players: PlayerOption[];
  valueId: string | null;
  onChange: (playerId: string) => void;
  filter?: PlayerFilter;
  label?: string;
}) {
  const [open, setOpen] = React.useState(false);

  const eligible = React.useMemo(
    () => applyFilter(players, filter),
    [players, filter]
  );

  const selected = players.find((p) => p.id === valueId) ?? null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          <span className="truncate">
            {selected ? selected.name : label}
          </span>
          <span className="text-muted-foreground text-xs">
            {selected ? `Seat ${selected.seat}` : ""}
          </span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Select a player</DialogTitle>
        </DialogHeader>

        <Command>
          <CommandInput placeholder="Search players..." />
          <CommandList>
            <CommandEmpty>No matching players.</CommandEmpty>

            <CommandGroup heading="Eligible players">
              {eligible.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`${p.name} ${p.seat}`}
                  onSelect={() => {
                    onChange(p.id);
                    setOpen(false);
                  }}
                  className="flex items-center gap-3"
                >
                  <PlayerAvatar name={p.name} imgSrc={p.avatarUrl} size={48} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Seat {p.seat} • {p.status.toUpperCase()}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
```

This is more usable than a tiny dropdown when you have 10–15 players.

---

## Putting it together: replacing all those “title components”

Example: “You see (2 players)” becomes:

```tsx
import { TarotPanel } from "./TarotPanel";
import { AvatarGrid } from "./AvatarGrid";

<TarotPanel tarotImgSrc={tarotCardUrl}>
  <AvatarGrid items={[playerA, playerB]} />
</TarotPanel>
```

Example: “These are your minions (1–5)”:

```tsx
<TarotPanel tarotImgSrc={minionsTarotUrl}>
  <AvatarGrid items={minionsArray} />
</TarotPanel>
```

Example: “This player is [avatar] + [token] horizontally”
That’s just a specialized right-side layout:

```tsx
<TarotPanel tarotImgSrc={thisPlayerIsTarotUrl}>
  <div className="flex items-center gap-4">
    <PlayerAvatar name={p.name} imgSrc={p.avatarUrl} />
    <div>{tokenNode}</div>
  </div>
</TarotPanel>
```

If you later want per-avatar token slots, pass `tokenSlot` in each `items[]`.

---

## The “createObjectURL / revokeObjectURL” thing

Only do this if your server returns raw blobs and you convert to object URLs on the client. It’s doable but it’s fussier:

* you need a cache
* you need cleanup
* you need ref counting if multiple components use the same blob
* you need re-fetch logic

If you can use normal URLs (even signed ones), you avoid all that complexity and let the browser handle caching.

---

## Bottom line

* **Use URLs for avatars**; don’t WS blobs.
* Add `avatarKey/avatarUrl` to Mongo user schema.
* Build **one** `TarotPanel` + **one** `AvatarGrid` + **one** `PlayerAvatar`.
* Use **Dialog + Command** for selecting players with filtering.

If you start wiring this into your tanstack ServerFn layer, the clean pattern is: ServerFn returns player list with `{id, name, seat, status, avatarUrl}` and the UI just renders it—no binary gymnastics, no websocket disasters.
