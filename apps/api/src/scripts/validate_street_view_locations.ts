import { mapGroupLocations, maps } from '@api/lib/db/schema';
import { db } from '@api/lib/drizzle';
import { chunkArray } from '@api/lib/internal/sync/utils';
import { streetViewFromPanoid } from '@api/lib/utils/google';
import { and, eq, inArray, isNull, or } from 'drizzle-orm';
import { pick } from 'remeda';

async function main() {
  console.log('Starting Street View validation script...');

  const mapGroupsWithPublishedMaps = await db
    .selectDistinct({ mapGroupId: maps.mapGroupId })
    .from(maps)
    .where(eq(maps.isPublished, true));

  console.log(
    `Found ${mapGroupsWithPublishedMaps.length} map groups with published maps.`,
  );

  for (const { mapGroupId } of mapGroupsWithPublishedMaps) {
    console.log(`\nProcessing map group ID: ${mapGroupId}`);

    const locations = await db
      .select(pick(mapGroupLocations, ['id', 'panoId', 'isOnStreetView']))
      .from(mapGroupLocations)
      .where(
        and(
          eq(mapGroupLocations.mapGroupId, mapGroupId!),
          or(
            isNull(mapGroupLocations.isOnStreetView),
            eq(mapGroupLocations.isOnStreetView, true),
          ),
        ),
      )
      .orderBy(mapGroupLocations.id);

    console.log(
      `Found ${locations.length} locations to validate for map group ${mapGroupId}.`,
    );

    if (locations.length === 0) {
      console.log('No locations to process, skipping.');
      continue;
    }

    const batches = chunkArray(locations, 500);
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(
        `Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} locations)...`,
      );

      // flip isOnStreetView to true when it's null
      const firstFoundLocationIds: number[] = [];
      const unfoundLocationIds: number[] = [];

      for (const location of batch) {
        if (!location.panoId) {
          console.log(
            `Location ${location.id} has no panoId, marking as not on Street View.`,
          );
          unfoundLocationIds.push(location.id);
          continue;
        } else if (location.isOnStreetView === null) {
          firstFoundLocationIds.push(location.id);
        }

        try {
          const result = await streetViewFromPanoid(location.panoId);

          if (result === null) {
            unfoundLocationIds.push(location.id);
          }
        } catch (error) {
          console.error(
            `Error checking location ${location.id} with panoId ${location.panoId}:`,
            error,
          );
          unfoundLocationIds.push(location.id);
        }
      }

      console.log(
        `Batch ${batchIndex + 1} complete: ${unfoundLocationIds.length} locations not found on Street View.`,
      );

      if (unfoundLocationIds.length > 0) {
        await db
          .update(mapGroupLocations)
          .set({ isOnStreetView: false })
          .where(inArray(mapGroupLocations.id, unfoundLocationIds));

        console.log(
          `Updated ${unfoundLocationIds.length} locations to isOnStreetView = false.`,
        );
      }
      if (firstFoundLocationIds.length > 0) {
        await db
          .update(mapGroupLocations)
          .set({ isOnStreetView: true })
          .where(inArray(mapGroupLocations.id, firstFoundLocationIds));
      }
    }

    console.log(`Completed processing map group ${mapGroupId}.`);
  }

  console.log('Script finished successfully.');
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
