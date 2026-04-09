# SiloForge — AI Handoff Document

> Give this document to your AI assistant on the new computer to resume work exactly where it was left off.

---

## What Is SiloForge?

**SiloForge** is the project/brand name for a suite of lightweight, offline-capable farm management web apps built as standalone HTML files. Each app targets a specific farm operation. The first two apps are fully built and UAT-ready.

There is no backend framework, no npm, no build step. Each app is a **single `.html` file** that runs in any browser. Data currently uses `localStorage`. The next major step is migrating storage to **Firebase Firestore** so multiple users on the same farm can sync data in real-time.

---

## Repository Plan

- **GitHub repository**: single repo named e.g. `farm-apps` or `siloforge`
- **GitHub Pages**: enabled on `main` branch — each `.html` file becomes a live URL
- **Firebase**: one Firebase project shared across all apps, data scoped per `farmCode`

Planned live URLs (once deployed):
```
yourusername.github.io/siloforge/LayerTrack.html
yourusername.github.io/siloforge/BroodTrack.html
```

---

## Files in This Folder

| File | Description |
|---|---|
| `LayerTrack.html` | Complete layer farm management app (~1787 lines) |
| `BroodTrack.html` | Complete brooding/POL management app (~1325 lines) |
| `PoulTrack_archive.html` | Original egg-tracking prototype (archived, not actively used) |
| `HANDOFF.md` | This document |

---

## App 1: LayerTrack.html

### Purpose
Full management app for a **layer farm** (hens producing eggs for sale).

### Navigation Tabs
| Tab | What it does |
|---|---|
| Home | Daily KPI dashboard — eggs collected today, production rate, total birds, broken eggs, crack rate. Shows 7-day summary. |
| Eggs | Egg collection engine. Farm hierarchy: Farm → Pen → Line → Stand → Cell. Multiple collection rounds per day per cell. |
| Flock | Daily bird status log — opening count, deaths, culls, closing count, age in weeks. |
| Feed | Daily feed usage log — feed type, kg used, kg required, age. |
| Health | Daily health log — water consumed, droppings observation, vaccinations/medications. |
| Finance | Expenses, Sales (cash or credit), Receivables (auto-populated from credit sales), per-month margin + cash collected KPIs. |
| Reports | Analytics across Eggs, Flock, Feed, Finance modules. Date filter: All Time / Last 7 Days / Last 30 Days / specific day. |
| Setup | Farm setup: name, pens, lines, stands, cells, bird counts, expected/warn production rates, market price per crate. |

### Key Design Decisions
- **Egg collection hierarchy**: Farm → Pen → Line → Stand → Cell (each cell has a bird count)
- **Multi-round collection**: Multiple rounds per day allowed; daily egg total per cell cannot exceed bird count in that cell
- **Production rate**: calculated as `total eggs / total birds × 100`. Birds are deduplicated per day (not inflated by multiple rounds)
- **Historical rate snapshots**: When a collection session begins, current `expectedRate` and `warnRate` are snapshotted onto the record (`col.exp`, `col.warn`). Past analytics use the rate that was set at the time, not the current rate.
- **Deleted pen filtering**: Analytics filter out records from pens that no longer exist in the current farm setup
- **Credit sales**: Sale form has `payment_type: 'cash' | 'credit'`. Cash = paid immediately. Credit = auto-creates a receivable. No separate receivable entry needed. `markSalePaid()` updates the sale record directly.
- **`getFarmTotalBirds(farm)`**: helper that sums birds from the current live farm structure — used as denominator for production rate in KPIs

### LocalStorage Keys
```javascript
const KEYS = {
  farm:     'lt_farm_v1',      // single object: farm config, pens, lines, stands, cells
  cols:     'lt_cols_v1',      // array: egg collection sessions
  birds:    'lt_birds_v1',     // array: daily bird status logs
  feed:     'lt_feed_v1',      // array: daily feed usage logs
  health:   'lt_health_v1',    // array: daily health logs
  expenses: 'lt_expenses_v1',  // array: expense records
  sales:    'lt_sales_v1',     // array: sale records (includes payment_type, paid, due_date)
  recv:     'lt_recv_v1'       // legacy (unused, kept for backward compat)
};
```

### Sale Record Shape (important for Firebase migration)
```javascript
{
  id, date, product, quantity, unit_price_ngn, total_amount_ngn,
  payment_type: 'cash' | 'credit',
  paid: true | false,       // cash = always true; credit = false until markSalePaid()
  due_date: 'YYYY-MM-DD' | null,
  customer: string,
  notes: string
}
```

### Egg Collection Session (col) Shape
```javascript
{
  id, date, round, roundLabel, penId, side,
  exp: number,   // snapshotted expectedRate at time of session start
  warn: number,  // snapshotted warnRate at time of session start
  entries: [
    { standId, tier, cellNum, birds, eggs, broken }
  ]
}
```

---

## App 2: BroodTrack.html

### Purpose
Management app for **brooding and POL (Point of Lay) sales**. Tracks chicks from Day-Old Chick (DOC) arrival through brooding, growth, and sale as POL birds. Different attendants manage this vs the layer farm.

### Navigation Tabs
| Tab | What it does |
|---|---|
| Home | Active batch cards — shows age, bird count, last log date, mortality, survival rate. Quick-add log button. |
| Batches | Create/manage batches. DOC purchase is auto-logged as expense on batch creation. |
| Daily Log | Daily logs per batch — mortality, culls, feed consumed (kg), water consumed (L), min/max temperature, humidity. Alerts for temp/humidity out of range. |
| Weight | Weekly weight tracking per batch, compared against breed benchmarks (ISA Brown, Lohmann Brown, Hy-Line Brown, Bovans Brown, Generic). |
| Health | Vaccination and medication records per batch. |
| Finance | Expenses (batch-tagged), POL Sales (cash or credit, same pattern as LayerTrack), Receivables (auto from credit sales), Batch P&L. |
| Reports | Batch analytics — survival rate, FCR (Feed Conversion Ratio), weight vs benchmark, financial summary. |
| Settings | Farm setup, breed benchmarks, export JSON. |

### Key Design Decisions
- **Batch lifecycle**: status flows `Active → Sold` (or `Terminated` if birds die/culled out)
- **Auto-expense on batch creation**: When a batch is created with `price_per_bird_ngn > 0`, a `DOC Purchase` expense is auto-logged against that batch
- **Batch P&L**: sums all expenses where `expense.batch_id === batch.id` and all sales where `sale.batch_id === batch.id`. Farm-wide expenses (no batch_id) are excluded from per-batch P&L.
- **Credit sales & batch status**: For cash sales, batch is immediately set to `Sold`. For credit sales, batch only moves to `Sold` when `markSalePaid()` is called — because the deal isn't financially closed until cash arrives.
- **Batch P&L owed warning**: If a batch has unpaid credit sales, the P&L card shows an amber notice: "₦X still owed by buyer — not yet collected"
- **Breed benchmarks**: weight targets per week stored per breed for weight-vs-benchmark charts

### LocalStorage Keys
```javascript
const KEYS = {
  farm:     'bt_farm_v1',      // single object: farm config
  batches:  'bt_batches_v1',   // array: batch records
  daily:    'bt_daily_v1',     // array: daily log records
  weight:   'bt_weight_v1',    // array: weekly weight records
  health:   'bt_health_v1',    // array: health/vaccination records
  expenses: 'bt_expenses_v1',  // array: expense records (with batch_id)
  sales:    'bt_sales_v1'      // array: sale records (same payment_type pattern as LayerTrack)
};
```

### Sale Record Shape
```javascript
{
  id, date, batch_id, batch_name, breed,
  quantity, age_weeks_at_sale, price_per_bird_ngn, total_amount_ngn,
  payment_type: 'cash' | 'credit',
  paid: true | false,
  due_date: 'YYYY-MM-DD' | null,
  buyer: string,
  notes: string
}
```

---

## Shared Design System

Both apps use identical CSS variables and component classes:

```css
:root {
  --g1:#1b4332; --g2:#2d6a4f; --g3:#40916c; --g4:#74c69d; --g5:#d8f3dc;
  --amber:#e9a319; --amberBg:#fef3cd;
  --red:#d62839;   --redBg:#fde8ea;
  --blue:#4895ef;  --blueBg:#e8f4fd;
  --gray:#6c757d;  --light:#f0f4f1; --white:#fff;
  --shadow:0 2px 10px rgba(0,0,0,.1);
  --radius:14px; --nav-h:64px;
}
```

Shared component classes: `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-sm`, `.card`, `.kpi`, `.kpi-sm`, `.kpi-row-3`, `.kpi-row-5`, `.field`, `.badge`, `.badge-green/.badge-amber/.badge-red`, `.list-item`, `.inner-tabs`, `.inner-tab`, `.modal`, `.topbar`, `.nav-btn`, `.alert-item`

---

## Next Steps (What to Do Next)

### 1 — Firebase Integration (HIGHEST PRIORITY)

**Goal**: Replace `localStorage` with Firebase Firestore so multiple users sync data in real-time. A phone being lost = no data loss.

**Architecture**:
- One Firebase project for all SiloForge apps
- Login screen: user enters a **Farm Code** (shared passcode for all staff on a farm)
- All Firestore data scoped under `/farms/{farmCode}/layertrack/...` and `/farms/{farmCode}/broodtrack/...`
- Offline persistence enabled (Firestore SDK caches locally, syncs when connected)

**What the AI needs to do**:
1. Add Firebase SDK (v9 compat CDN) to both HTML files
2. Replace the `DB` object's `_get`, `_set`, `_arr`, `_push`, `_del`, `_upd` methods with Firestore equivalents
3. Add a Farm Code login screen that gates the app (renders before `renderHome()`)
4. Keep the rest of the app logic identical

**User needs to provide**:
- The `firebaseConfig` object from their Firebase Console (Project Settings → Your Apps → Web)
- The Firestore database must be created in **test mode** initially

**Firebase config shape to look for**:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "yourproject.firebaseapp.com",
  projectId: "yourproject",
  storageBucket: "yourproject.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

### 2 — GitHub Pages Deployment

**Goal**: Host both apps publicly (or at a shareable URL) so any staff member can open it on any phone without installation.

**Steps**:
1. Create GitHub repo (e.g. `siloforge`)
2. Push the `SiloForge/` folder contents to the repo root
3. Enable GitHub Pages: repo Settings → Pages → Deploy from `main` branch
4. Add the GitHub Pages domain (`yourusername.github.io`) to Firebase authorized domains

**Note**: Firebase will refuse to work on an unauthorized domain. After deploying to GitHub Pages, go to Firebase Console → Authentication → Settings → Authorized domains and add `yourusername.github.io`.

### 3 — Future Apps

When building new apps for this project:
- Follow the same single-HTML-file pattern
- Use the same CSS design tokens (copy the `:root` block)
- Use the same `DB` object pattern (once Firebase is integrated, copy the Firebase DB layer)
- Drop the new `.html` file in the same GitHub repo
- Scope Firestore data under `/farms/{farmCode}/{appname}/`

---

## Context on the Owner

- Running a poultry farm in Nigeria (currency: NGN ₦)
- Has a **layer farm** (hens for egg production) and a **brood farm** (raising DOC to POL for sale)
- Different attendants manage the two farms
- Wants daily data logging by attendants, manager-level reporting
- Plans to eventually export data to PostgreSQL for unified reporting across farms

---

## Issues Already Solved (Don't Re-solve These)

1. **Egg quota validation**: `eggs <= birds` per cell per round enforced in `onEggInput()`. Cross-round daily totals also checked.
2. **Production rate bird count**: Birds deduplicated per day (not multiplied by number of rounds). `getFarmTotalBirds()` used as denominator.
3. **Deleted pen data pollution**: `validPenIds` filter applied before all analytics so deleted pens don't inflate totals.
4. **Historical rate snapshots**: `col.exp` and `col.warn` snapshotted at `beginSession()` time.
5. **Credit sales double-entry eliminated**: Sale has `payment_type` field. Credit sales auto-appear in Receivables. No separate receivable record needed.
6. **Past record logging**: All date inputs have `max=today` but allow past dates. Informational banners in forms explain this to users.

---

*Generated: February 2026 | Project: SiloForge | Apps: LayerTrack v1, BroodTrack v1*
