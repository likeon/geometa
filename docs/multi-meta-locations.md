# Multiple metas per location

## Status (2026-07-26, branch `multi-meta-locations`, stacked on `map-group-collaboration`)

**Shipped** — a location can be assigned to any number of metas:

- `map_group_location_metas (location_id, meta_id)` is the single source of truth. `map_group_locations`
  keeps `UNIQUE (map_group_id, pano_id)`, so coordinates and `is_on_street_view` are still stored once
  per physical pano.
- Migration `0036_location_metas.sql` creates the table, backfills 2,322,479 links from the old
  `extra_tag` join, rebuilds `location_metas_view` / `map_locations_view` / `meta_locations_count_view`
  against it, and makes `extra_tag` nullable.
- `synced_locations` needed no schema change — its PK was already `(synced_meta_id, pano_id)`.
- Authoring is the map-making.app JSON round-trip only (`extra.tags` accepts more than one tag now).
- The userscript note shows one tab per meta, ordered by `md5(pano_id || meta_id)` so no meta is
  permanently the first (or last) tab across a whole map.
- Renaming a meta's tag no longer orphans its locations, because links are by `meta_id`. Previously
  the string join broke and the next sync deleted every synced location for that meta.

---

## Follow-up work

### 1. Migration 0037 — drop `map_group_locations.extra_tag`

**Not written yet, on purpose.** 0036 deliberately keeps the column and uploads keep writing the
first tag into it, even though nothing reads it.

*Why we want to do it:* it is a dead column on a 2.4M-row table plus a now-unused index
(`map_group_locations_map_group_tag_idx`), and a populated column nothing reads is exactly the kind of
thing a future reader mistakes for authoritative. The transitional write in the upload handler
(`extraTag: tags[0]`) is meaningless once multi-tag uploads are normal — with several tags, "the first
one" has no meaning.

*Why not in the same release:* the API runs migrations at boot. The moment the first new pod starts,
old pods still serving traffic would `SELECT mgl.extra_tag` against a dropped column — 500s on the
dashboard's location endpoints and failing syncs for the couple of minutes a rolling deploy takes.
The player path reads `synced_locations` and would stay up, which is not much consolation.

*Precondition:* 0036 and its code are fully rolled out, with no pre-0036 pods left.

```sql
DROP INDEX map_group_locations_map_group_tag_idx;
ALTER TABLE map_group_locations DROP COLUMN extra_tag;
```

...plus deleting the transitional write in `POST /:id/locations/upload` and the legacy `extraTag`
fallback in its request schema, and the `extraTag` column from `schema.ts`.

There is no urgency. If we decide to keep the column instead, reword the comment on
`mapGroupLocations.extraTag` in `schema.ts` so it reads as retained legacy data rather than a pending
removal.

### 2. Per-map meta balance view

*Why we want it:* with overlapping metas, a meta's share of rounds drifts in a way that raw
"locations per meta" no longer reveals. Exposure is `links(meta) / distinct locations in map`, and the
denominator is shared, so relative balance still depends only on link count — but overlap makes those
counts diverge even when the author adds "10 each". Worked example: 10 A-only + 10 B-only + 5 AB +
5 BC gives A 50%, B 66.7%, C 16.7% of rounds.

Only a meta's *exclusive* (single-meta) locations are freely adjustable; shared ones are coupled, so
removing one moves two metas at once. For every meta to reach the same link count `T`:
`exclusive(meta) = T - shared(meta)`. If `shared(meta) > T` that meta is stuck above target and
untagging is the only lever.

Two conditions matter more than equality, because a shared location teaches several metas in one
round and exposure is no longer zero-sum:

- **No meta below ~15% of rounds.** Below that most players finish a session never seeing it
  (a 15% meta shows up in 56% of 5-round games; a 5% meta in 23%).
- **Every meta has a few exclusive locations.** A meta that only ever appears alongside others never
  gets the player's undivided attention, however high its percentage looks.

Should live on the maps page rather than the group page: filters and levels change which metas are in
play, and a location shared by three metas only contributes to the ones a given map includes, so
group-wide numbers can be badly wrong for an individual map.

### 3. Rarest-meta-first tab ordering

*Why we might want it:* the current hash ordering is fair but blind — it spreads the first-tab slot
evenly without knowing that a meta with zero exclusive locations needs the attention most. Ordering by
ascending location count would give the meta that most needs a solo showing the default tab, and demote
the common meta that already gets shown alone elsewhere.

*Why it's parked:* it needs a `locations_count` column on `synced_metas` populated at sync time —
counting per request is out, `synced_locations` is 373 MB. And it is a behavioural choice ("the system
decides which meta you read first") that is easier to justify once the balance view shows whether
rare-meta attention is a real problem in our maps or a theoretical one. Composes fine later: rarest
first, hash as tie-breaker.

### 4. Known pre-existing issue: same-second upload race

`full` and `tagReplace` decide what to delete with `updated_at < currentTimestamp`, at second
granularity. Two uploads inside the same wall-clock second leave the older locations undeleted. This
predates multi-meta and is unrelated to it; the link reconciliation is scoped to the uploaded location
ids specifically so that a surviving location keeps its metas rather than being left orphaned. A real
fix needs a per-upload marker rather than a timestamp.

### Deliberately not doing

- **Orphan re-adoption.** Deleting a meta leaves its locations with zero links and no record of what
  they were for; recovery means re-uploading the location JSON. The old behaviour (re-creating a meta
  with the same tag silently re-adopted its locations) fell out of the string join, was never designed,
  and mostly existed to undo the rename footgun that no longer exists. 143,717 pre-existing orphans
  (5.8% of locations, 72% of them one group's misplaced data) stay as anonymous rows and can be pruned
  with a one-line delete if they ever become a nuisance.
- **In-app UI for attaching/detaching metas on existing locations.** Authoring stays the
  map-making.app round-trip.
- **Author-controlled per-location tab order.** The most "correct" answer to tab ordering, but it needs
  per-link priority editing in the dashboard.

---

## Related open work from `map-group-collaboration` (PR #69)

Shipping in the same release, tracked here so it is not only in scratch notes:

- Owner revert buttons on the change log — all `old_value` data is already captured.
- Retention pruning of `map_group_changes` (~90 days). Measured ~831 bytes/row including the index;
  location uploads log one summary row regardless of size, so growth is slow and this is not urgent.
- Per-map public update log: diff `synced_map_metas` / `synced_metas` inside `syncMapGroup()` before the
  MERGE, store in a `sync_releases` table, diff by ids not names.
- Accepted limitation: the change log's unsynced box caps at 500 entries with no indicator, and overflow
  is unreachable in the UI until the next sync. Fix-if-needed is `COUNT(*)` plus a "500 of N shown"
  header.
