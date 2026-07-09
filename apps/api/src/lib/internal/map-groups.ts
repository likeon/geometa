import { mapGroupPermissions, mapGroups } from '@api/lib/db/schema';
import { db } from '@api/lib/drizzle';

// Creates a map group and grants the given user permission on it, atomically.
// Shared so every group-creation path (manual create, first-login setup) applies
// the same invariants.
export async function createMapGroup(userId: string, name: string) {
  return db.$primary.transaction(async (tx) => {
    const inserted = await tx
      .insert(mapGroups)
      .values({ name })
      .returning({ id: mapGroups.id });
    await tx
      .insert(mapGroupPermissions)
      .values({ mapGroupId: inserted[0].id, userId });
    return inserted[0].id;
  });
}
