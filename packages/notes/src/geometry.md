//chats/geometry.md
Yep — the earlier math assumed **20px overhang**. You’re now saying: **only 40% of the big token’s diameter overlaps the square**, and **60% hangs out** (toward the circle center). That’s a totally different geometry, and it actually makes the layout *easier* radially (the token mostly lives outside the square).

### Token placement with “60% overhang”

Let big token diameter be **D**.

* overlap into square (along the radial line): **0.4D**
* overhang outside square (toward center): **0.6D**
* token radius: **R = 0.5D**

So the **token center** sits *outside* the square edge (toward center) by:

[
\text{center outside edge} = R - 0.4D = 0.5D - 0.4D = 0.1D
]

So if D=100, the center is 10px outside the square edge, and the token hangs 60px beyond the square edge.

---

## What you asked for: square size + big circle size for 15 / 20 / 30 seats

You didn’t pin an absolute big-token size anymore, only proportions:

* big token has the 60/40 overhang rule
* “large circle is double the size of the smaller circles” ⇒ small diameter = **D/2**

But there’s still one missing link: **how big should D be relative to the avatar square S?**
To answer with concrete numbers, I used the same aesthetic ratio you were implicitly using before (100 token vs 125 square):
[
D \approx 0.8S
]
That’s a sane default (big token looks big but doesn’t swallow the avatar).

Also: these maxima are based on **seat tiles around a circle not overlapping on the ring**, using a 20px viewport margin. (No extra “reminder runway” count included here; if you still want 3 reminder tokens inward, circle capacity drops and S must shrink.)

### 1440×900 (circle layout)

| Seats | Max avatar square **S** | Big token **D = 0.8S** | Small token **D/2** |
| ----: | ----------------------: | ---------------------: | ------------------: |
|    15 |              **148 px** |             **118 px** |           **59 px** |
|    20 |              **116 px** |              **93 px** |           **47 px** |
|    30 |               **81 px** |              **65 px** |           **33 px** |

### 1280×720 (circle layout)

| Seats | Max avatar square **S** | Big token **D = 0.8S** | Small token **D/2** |
| ----: | ----------------------: | ---------------------: | ------------------: |
|    15 |              **117 px** |              **94 px** |           **47 px** |
|    20 |               **92 px** |              **74 px** |           **37 px** |
|    30 |               **64 px** |              **52 px** |           **26 px** |

---

## One blunt warning (because geometry is a tyrant)

If you really mean **3–4 reminder tokens inward per seat** (like you described earlier), **30 seats on a circle at 1280×720 will get comically tiny** unless you:

* reduce reminder count,
* shrink reminders,
* or switch to the **square grimoire** for big lobbies.

Circle is great for ~15-ish. Square perimeter is your “20–30 without ant-sized UI” mode.

If you want, I can run the same tables again including **(a)** 3 reminders inward and **(b)** 4 reminders inward, but I’ll pick reasonable default gaps and token stacking rules and just give you the numbers (no extra back-and-forth).


Here’s the consolidated view, with **Square layout** and **Circle layout** side-by-side.

Assumptions baked in (same as before):

* Viewport margin: **20px**
* Seat component is a square avatar tile of side **S**
* Big character token diameter **D = 0.8·S**
* Small reminder token diameter **d = D/2**
* Your **60% overhang** rule affects *where the big token sits on the seat*, but the **fit math** here is dominated by seat spacing on the table shape.

---

### 1440×900

| Seats | **Square layout (max component sizes)** |                      |                        | **Circle layout (max component sizes)** |                      |                        |
| ----: | --------------------------------------: | -------------------: | ---------------------: | --------------------------------------: | -------------------: | ---------------------: |
|       |                         **Seat S (px)** | **Big token D (px)** | **Small token d (px)** |                         **Seat S (px)** | **Big token D (px)** | **Small token d (px)** |
|    15 |                                     215 |                  172 |                     86 |                                     148 |                  118 |                     59 |
|    20 |                                     175 |                  140 |                     70 |                                     116 |                   93 |                     46 |
|    30 |                                     127 |                  102 |                     51 |                                      81 |                   65 |                     32 |

---

### 1280×720

| Seats | **Square layout (max component sizes)** |                      |                        | **Circle layout (max component sizes)** |                      |                        |
| ----: | --------------------------------------: | -------------------: | ---------------------: | --------------------------------------: | -------------------: | ---------------------: |
|       |                         **Seat S (px)** | **Big token D (px)** | **Small token d (px)** |                         **Seat S (px)** | **Big token D (px)** | **Small token d (px)** |
|    15 |                                     177 |                  142 |                     71 |                                     117 |                   94 |                     47 |
|    20 |                                     155 |                  124 |                     62 |                                      91 |                   73 |                     36 |
|    30 |                                     112 |                   90 |                     45 |                                      64 |                   51 |                     26 |

---

If you want this to reflect your earlier “3 reminder tokens on the inward axis” constraint *as a hard packing constraint*, I can regenerate the same tables with that included (it will mostly hammer the **circle** numbers, especially at 1280×720).
