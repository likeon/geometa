import { mapGroupChanges } from '@api/lib/db/schema';
import type { db } from '@api/lib/drizzle';

type Tx = Parameters<Parameters<typeof db.$primary.transaction>[0]>[0];
type DbOrTx = Tx | typeof db.$primary;

export type ChangeEntry = {
  mapGroupId: number;
  userId: string;
  entityType:
    | 'meta'
    | 'meta_image'
    | 'meta_geojson'
    | 'meta_levels'
    | 'location_batch'
    | 'level'
    | 'map'
    | 'group'
    | 'settings'
    | 'sync';
  entityId?: number | null;
  entityLabel?: string | null;
  operation: 'create' | 'update' | 'delete';
  oldValue?: unknown;
  newValue?: unknown;
  // override for entries that must sit exactly on a boundary (sync markers)
  createdAt?: number;
};

export async function logChange(
  dbOrTx: DbOrTx,
  entries: ChangeEntry | ChangeEntry[],
) {
  // no-op updates (identical before/after) are not worth a log entry;
  // value-less updates (e.g. sync markers) are always kept
  const list = (Array.isArray(entries) ? entries : [entries]).filter(
    (entry) =>
      entry.operation !== 'update' ||
      (entry.oldValue === undefined && entry.newValue === undefined) ||
      JSON.stringify(entry.oldValue ?? null) !==
        JSON.stringify(entry.newValue ?? null),
  );
  if (list.length === 0) {
    return;
  }
  const createdAt = Math.floor(Date.now() / 1000);
  const rows = list.map((entry) => ({
    mapGroupId: entry.mapGroupId,
    userId: entry.userId,
    entityType: entry.entityType,
    entityId: entry.entityId ?? null,
    entityLabel: entry.entityLabel ?? null,
    operation: entry.operation,
    oldValue: entry.oldValue ?? null,
    newValue: entry.newValue ?? null,
    createdAt: entry.createdAt ?? createdAt,
  }));
  // chunked to stay well below the postgres bind-parameter limit on bulk logs
  const BATCH_SIZE = 1000;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    await dbOrTx.insert(mapGroupChanges).values(rows.slice(i, i + BATCH_SIZE));
  }
}

// The subset of meta fields worth diffing in the change log (raw markdown, not
// the rendered html).
export function metaSnapshot(meta: {
  tagName: string;
  name: string;
  note: string;
  footer: string | null;
  noteFromPlonkit?: boolean;
}) {
  return {
    tagName: meta.tagName,
    name: meta.name,
    note: meta.note,
    footer: meta.footer,
    noteFromPlonkit: meta.noteFromPlonkit,
  };
}
