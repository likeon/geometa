import { mapGroups } from '@api/lib/db/schema';
import { db } from '@api/lib/drizzle';
import { syncMapGroup } from '@api/lib/internal/sync';
import { isNull } from 'drizzle-orm';

async function main() {
  console.log('Starting to sync unsynced map groups...');

  const unsyncedGroups = await db
    .select({
      id: mapGroups.id,
      syncedAt: mapGroups.syncedAt,
    })
    .from(mapGroups)
    .where(isNull(mapGroups.syncedAt));

  if (unsyncedGroups.length === 0) {
    console.log('No unsynced map groups found.');
    return;
  }

  console.log(`Found ${unsyncedGroups.length} unsynced map group(s).`);

  for (const group of unsyncedGroups) {
    try {
      console.log(`Syncing map group with ID: ${group.id}`);
      // The syncMapGroup function expects syncedAt to be number | null.
      // The select query ensures group.syncedAt is indeed null here, but typescript might not infer it strictly.
      // However, since the DB stores it as integer and we query for null, it should be fine.
      await syncMapGroup({ id: group.id, syncedAt: group.syncedAt });
      console.log(`Successfully synced map group with ID: ${group.id}`);
    } catch (error) {
      console.error(`Error syncing map group with ID: ${group.id}`, error);
    }
  }

  console.log('Finished syncing map groups.');
}

main()
  .then(() => {
    console.log('Script completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
