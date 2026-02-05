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

