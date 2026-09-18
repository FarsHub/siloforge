# Splitting LayerTrack and BroodTrack into modules

Plan only — no code has been changed. Written 2026-09-10.

## 1. What the two files are today

| | LayerTrack.html | BroodTrack.html |
|---|---|---|
| Total | 385 KB / 5,460 lines | 283 KB / 3,883 lines |
| CSS (`<style>`) | 53 KB | 49 KB |
| **JS (one `<script>`)** | **326 KB** | **228 KB** |
| Markup | 6 KB | 6 KB |
| Top-level functions | 230 | 167 |

Each app is a single self-contained HTML file: two Firebase compat scripts from
the CDN, then one 200 KB+ inline `<script>`. There is no build step for the JS,
no bundler, no `node_modules`, no service worker and no manifest.

The JS is already divided by `// ═══` banner comments into ~20 blocks. Those
banners are the module boundaries — the seams exist, they are just not files.

## 2. Why not native ES modules

`<script type="module">` with real `import`/`export` is the closest thing to
Python's model, and needs no build step. Three costs rule it out as a first move:

1. **Inline handlers break silently.** LayerTrack has **274** inline
   `onclick=` / `oninput=` / `onchange=` attributes calling **98** distinct
   functions by bare name; BroodTrack has 180 calling 62. Module scope is not
   global, so every one of those becomes a `ReferenceError` on click — with no
   error at load time. Fixing it means 98 × `window.foo = foo`, or converting
   the whole app to event delegation.
2. **`file://` stops working.** Module loading is subject to CORS, so the file
   can no longer be opened by double-clicking; it needs a local HTTP server.
3. **One request becomes ~20.** On a farm phone connection that is 20 chances
   to stall rather than one, and there is no service worker to cache them.

A bundler (esbuild/Vite) solves 1–3 but adds Node and a build you must not
forget before pushing to Pages.

## 3. The chosen shape

Split the **source**, keep shipping **one file**:

```
src/
  core/          shared by both apps
  layertrack/    LayerTrack-only modules
  broodtrack/    BroodTrack-only modules
build_apps.py    concatenates src/ into the <script> block of both HTML files
```

`build_apps.py` replaces the content between two markers, exactly as
`inject_receipt_css.py` already does for the receipt stylesheet:

```
// ==== BEGIN GENERATED APP SCRIPT — build_apps.py ====
// ==== END GENERATED APP SCRIPT ====
```

This is the pattern the repo already chose. `inject_receipt_css.py` says so in
its own docstring: *"Both apps are single self-contained HTML files, so the
shared document styles live in `receipt-src/document.css` and get copied in by
this script rather than duplicated by hand."* Same reasoning, applied to JS.

Editing feels like Python modules. The shipped artifact is unchanged in kind:
one request, works from `file://`, no CORS, `db.enablePersistence()` untouched,
all 274 inline handlers keep working because the concatenated functions stay in
global scope.

Bonus: `build_apps.py` can stamp `APP_VERSION` (LayerTrack.html:599,
BroodTrack.html:556) from the date and git hash instead of by hand.

## 4. The real prize: 108 duplicated functions

**108 function names exist in both apps.** Of those:

- **60 are byte-for-byte identical** — `isLocked`, `addDays`, `daysBetween`,
  `uid`, `toast`, `openModal`, `closeModal`, `confirmSave`, `fmtDate`,
  `fmtMoney`, `fmtBags`, `farmRef`, `farmDoc`, `trashRef`, `_track`,
  `renderSyncBadge`, `feedStockLedger`, `feedStockEvents`, `feedBookKg`,
  `getFeedStoreStatus`, `getFeedStockByType`, `feedStoreTypes`, `feedTimeline`,
  `feedAlerts`, `feedCoverWorst`, `renderFeedTicker`, `saveFeedCount`,
  `getFeedPolicy`, `bagsFor`, `kgToBags`, `makeDocRef`, `nextDocRef`,
  `ensureDocRef`, `getSaleBalance`, `lockGuard`, `lockMinDate`, and 24 more.
- **48 share a name but have drifted.** Sorted by how far apart they are, most
  of the drift is cosmetic:

| function | lines | line similarity | what differs |
|---|---|---|---|
| `_computeFeedStoreStatus` | 63 | **98%** | 1 line |
| `calcFeedCount` | 39 | **97%** | 1 line — `var(--g1)` vs `var(--p1)` |
| `openSaleDoc` | 31 | **97%** | 1 line |
| `feedStoreBody` | 170 | **96%** | 7 lines |
| `feedHomeStrip` | 44 | 93% | 3 lines |
| `saveFeedPurchase` | 21 | 91% | 3 lines |
| `buildSaleDocHTML` | 105 | 88% | 17 lines |
| `openFeedCount` | 25 | 84% | 4 lines |
| … | | | |
| `renderHome` | 162 | 17% | genuinely different app |
| `renderReports` | 570 | 9% | genuinely different app |

`calcFeedCount` is the whole argument in one function: 39 lines, and the *only*
difference between the two copies is one CSS variable — LayerTrack's green
`--g1` against BroodTrack's purple `--p1`. Identical logic, kept in two places
because of a colour.

That drift is why today's lock fix had to be applied twice, and why the two
`saveFeedLog` bodies needed two different guard lines.

### The theming blocker, and its one-line fix

Both `:root` blocks already define `--g1`…`--g5` with identical values.
BroodTrack additionally defines its brand purple `--p1`…`--p5`. So:

```css
/* LayerTrack :root */   --acc1:var(--g1); --acc2:var(--g2); … --acc5:var(--g5);
/* BroodTrack :root */   --acc1:var(--p1); --acc2:var(--p2); … --acc5:var(--p5);
```

Shared modules use `--acc*`. Each app keeps its own identity, and the ~60 KB
feed-store + receipt subsystem becomes genuinely common code.

## 5. Module inventory

### `src/core/` — shared

| file | from | KB |
|---|---|---|
| `sync.js` | FIREBASE & SYNC (LT 407-594, BT 365-551) | 9 |
| `utils.js` | UTILITIES + `LOCK_DAYS`/`isLocked`/`lockGuard`/`lockMinDate` | 4 |
| `feedstore.js` | FEED STORE (LT 863-1276, BT 885-1297) | 20 |
| `document.js` | RECEIPT / INVOICE (LT 3070-3941, BT 2816-3212) | 20 of 47 |
| `modal.js` | `openModal`, `closeModal`, `toast`, `confirmSave` | 2 |

The FIREBASE & SYNC blocks are 9.2 KB in both files and already identical.

### `src/layertrack/`

| file | section | lines | KB |
|---|---|---|---|
| `constants.js` | CONSTANTS | 596-748 | 8 |
| `db.js` | DATA LAYER + EGG STOCK | 750-861 | 6 |
| `nav.js` | NAVIGATION + PEN CONTEXT | 1283-1333 | 2 |
| `home.js` | HOME | 1414-1607 | 13 |
| `eggs.js` | EGGS — EGG COLLECTION | 1609-1846 | 17 |
| `flock.js` | FLOCK | 1848-1955 | 8 |
| `feed.js` | FEED — DAILY USAGE | 1957-2483 | 36 |
| `health.js` | HEALTH | 2485-2588 | 9 |
| `finance.js` | CUSTOMER/PAYMENT + FINANCE | 2590-3068 | 29 |
| `reports.js` | REPORTS + FEED ANALYTICS | 3943-4792 | 65 |
| `settings.js` | SETTINGS | 4794-5428 | 43 |
| `init.js` | INIT | 5430-5461 | 1 |

`reports.js` at 65 KB and `settings.js` at 43 KB are the two worst offenders and
would each split further once the mechanical move is done.

### `src/broodtrack/`

`constants.js` (16 KB), `db.js` (3), `nav.js` (2), `home.js` (7),
`batches.js` (13), `dailylog.js` (10), `weight.js` (8), `feed.js` (36),
`health.js` (8), `finance.js` (38), `reports.js` (23), `settings.js` (23),
`init.js`.

## 6. Constraints the build must respect

- **Concatenation order = current source order.** The top-level `let`s
  (`SYNC_PENDING`, `FARM_CODE`, `_FS_STAMP`, `SES`, `COLLECT_DATE`, `FEED_TAB`,
  `_activePenId`, `REP_TAB`, …) are in the temporal dead zone until executed, so
  any module whose top-level code touches them must come after. Function
  declarations hoist, so function-to-function calls are order-free.
- **Everything stays in one global scope.** No `import`/`export`, no IIFE
  wrappers — the 274 inline handlers depend on globals.
- **`_activePenId` (LayerTrack) vs `_activeBatchId` (BroodTrack)** is the main
  reason `renderHome`/`renderReports` differ. Shared modules must not reference
  either; pass the scope in as an argument.
- **No Node.** Python 3 only, matching `build_deck.py` and
  `inject_receipt_css.py`.
- The generated HTML files stay committed, because GitHub Pages serves them
  directly.

## 7. Migration order

Each slice ends with both apps working and a diff you can actually read.

**Slice 0 — prove the extractor is faithful.**
Write `build_apps.py` and the `src/` tree by pure mechanical cut-and-paste, then
assert the build reproduces `LayerTrack.html` and `BroodTrack.html`
**byte-for-byte** against the committed versions. No behaviour change is
possible if the bytes match. This is the whole safety net; do not skip it.

**Slice 1 — `--acc*` aliases.** Add the five aliases to both `:root` blocks.
Purely additive; nothing uses them yet.

**Slice 2 — `src/core/utils.js` + `modal.js`.** The 60 byte-identical
functions. Deleting them from both apps and rebuilding should again produce
byte-identical output, modulo the position of the moved block.

**Slice 3 — `src/core/sync.js`.** Already identical in both files.

**Slice 4 — `src/core/feedstore.js`.** The first real unification: reconcile
`_computeFeedStoreStatus` (1 line), `calcFeedCount` (1 line, the colour),
`feedStoreBody` (7 lines), `feedHomeStrip` (3), `openFeedCount` (4),
`saveFeedPurchase` (3), `delFeedStock` (1), `renderFeed` (1). Read each diff,
switch the colour to `--acc*`, keep the LayerTrack version where they disagree
on substance. ~20 KB stops being duplicated.

**Slice 5 — `src/core/document.js`.** `buildSaleDocHTML` differs by 17 of 105
lines, mostly the unit label (`crates` vs `birds`); `getDocUnitLabel` already
exists as the seam for exactly that.

**Slice 6 — split the per-app view modules.** Mechanical; byte-identical output
again.

**Slice 7 — optional.** Break `reports.js` and `settings.js` down further, and
have `build_apps.py` stamp `APP_VERSION`.

## 8. Verification at each slice

1. `python build_apps.py` then `git diff --stat` — for slices 0, 2, 3 and 6 the
   diff should be moves only.
2. `node --check` on the extracted `<script>` (already used while fixing the
   feed locks).
3. Grep every name in the inline-handler list and confirm it is still a
   top-level `function` in the built output — a cheap script that catches the
   one failure mode this design has.
4. Manual pass on the farm-critical paths before pushing: login, egg collection
   pass, stock count, feed usage, a sale with a receipt, export.

## 9. Risks

- **The mechanical move is large** (~9,300 lines). Slice 0's byte-identical
  assertion is what makes it safe; without it this is not worth doing.
- **A forgotten build.** The HTML is what deploys, so editing it directly after
  the split silently diverges from `src/`. Mitigation: `build_apps.py --check`
  in a pre-commit hook or the existing GitHub Actions workflow.
- **Unifying drifted twins can change behaviour**, unlike the moves. Slices 4
  and 5 are the only ones where that is true — they deserve the manual pass.
- **Not addressed here:** the 122 LayerTrack-only and 59 BroodTrack-only
  functions stay where they are. Splitting is not the same as deduplicating, and
  only the 108 shared names are worth deduplicating.

## 10. Rough effort

| slice | effort |
|---|---|
| 0 — build script + byte-identical proof | half a day |
| 1–3 — aliases, utils, sync | short |
| 4–5 — feed store, document (needs review) | the bulk of the work |
| 6 — per-app view modules | mechanical, low risk |
| 7 — further splits | as needed |

Sequenced this way, you can stop after any slice and still be better off than
today, with both apps shipping.
