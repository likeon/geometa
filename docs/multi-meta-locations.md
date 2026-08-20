# Multiple metas per location

## Current design

Migration `0041_location_metas.sql` introduces
`map_group_location_metas (location_id, meta_id, map_group_id)` as the source of truth for meta
membership. Composite foreign keys ensure the location and meta belong to the recorded group, and
both owner deletes cascade through the link table.

`map_group_locations` still stores each `(map_group_id, pano_id)` once. Coordinates, camera framing,
Street View state, and legacy extra-pano fields therefore remain properties of the physical pano,
while any number of metas can link to it.

The release also:

- merges duplicate pano rows during upload (last coordinates win, tags are unioned);
- syncs one `synced_locations` row per linked meta and pano;
- exports and fingerprints each pano once, even when several metas include it;
- preserves existing target coordinates when copying or sharing a meta;
- returns every distinct meta to the userscript and renders accessible, keyboard-operable tabs;
- calculates the map balance page from live link data; and
- keeps `extra_tag` as a rolling-deploy compatibility column only.

## Deploying migration 0041

The Drizzle migrator runs a migration inside a transaction. The two supporting unique indexes are
therefore built without `CONCURRENTLY`, and the backfill scans the locations table. Before production:

1. Run `0041` against a recent production-sized clone and record index-build, backfill, and total
   migration time.
2. Schedule a maintenance window if that measurement shows an unacceptable write-lock interval.
3. Record the rollout start as an epoch second before starting the first new API pod.
4. Do not run a map-group sync until every pre-0041 pod has drained. Old pods can still write
   `extra_tag` without creating a link, and syncing during that window could publish incomplete data.
5. After the rollout, audit only zero-link locations written during the rollout window:

```sql
SELECT mgl.id, mgl.map_group_id, mgl.pano_id, mgl.extra_tag, mgl.updated_at
FROM map_group_locations mgl
WHERE mgl.updated_at >= :rollout_started_at
  AND NOT EXISTS (
    SELECT 1
    FROM map_group_location_metas lm
    WHERE lm.location_id = mgl.id
  )
ORDER BY mgl.updated_at, mgl.id;
```

Existing zero-link rows are not evidence of rollout loss: deleting a meta intentionally leaves its
locations orphaned. Do not run a blanket `extra_tag` backfill after deployment. Review candidates
against rollout activity, then backfill only confirmed location IDs:

```sql
WITH reviewed(location_id) AS (
  VALUES
    (123::bigint),
    (456::bigint)
)
INSERT INTO map_group_location_metas (location_id, meta_id, map_group_id)
SELECT mgl.id, m.id, mgl.map_group_id
FROM reviewed r
JOIN map_group_locations mgl ON mgl.id = r.location_id
JOIN metas m
  ON m.map_group_id = mgl.map_group_id
 AND m.tag_name = mgl.extra_tag
ON CONFLICT DO NOTHING;
```

Verify the reviewed IDs have links before re-enabling sync. If no rollout candidates exist, no repair
query is needed.

## Removing `extra_tag` later

This release deliberately keeps writing the first tag to `map_group_locations.extra_tag` so old pods
remain compatible. Remove it only after `0041` has baked long enough that rolling back to older code is
off the table:

1. Deploy code that removes the transitional write, legacy request fallback, schema field, and all
   remaining references.
2. After that code is on every pod, ship migration `0042` to drop
   `map_group_locations_map_group_tag_idx` and the column.

Do not combine those releases: a still-running old pod would fail its uploads as soon as the column
disappeared.

## Known pre-existing races

`full` and `tagReplace` uploads use a second-granularity `updated_at` cutoff. Two replacement uploads
within the same second can retain rows from the older upload. A long upload that overlaps a sync can
also receive a `modified_at` before the sync's new boundary and be skipped by the next incremental
sync. Both need a per-upload marker; neither is introduced by multi-meta relationships.
