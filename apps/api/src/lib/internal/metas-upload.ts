import { levels, metaImages, metaLevels, metas } from '@api/lib/db/schema';
import { db } from '@api/lib/drizzle';
import { markdown2Html } from '@api/lib/utils/markdown';
import { and, eq, inArray, notInArray, sql } from 'drizzle-orm';

export class MissingLevelsError extends Error {
  constructor(missingLevelsList: string) {
    super(
      `Missing levels: ${missingLevelsList}. Enable auto-create levels option or create these levels manually first.`,
    );
  }
}

export type MetaUploadItem = {
  tagName: string;
  metaName: string;
  note: string;
  footer?: string | null;
  levels?: string[] | null;
  images?: string[] | null;
};

export async function uploadMetas(
  groupId: number,
  items: MetaUploadItem[],
  partialUpload: boolean,
  autoCreateLevels: boolean,
) {
  const currentTimestamp = Math.floor(Date.now() / 1000);

  const metasInsertData: {
    mapGroupId: number;
    tagName: string;
    name: string;
    note: string;
    noteHtml: string;
    modifiedAt: number;
    footer?: string;
    footerHtml?: string;
  }[] = [];
  const levelsByTagName: Map<string, string[]> = new Map();
  const imagesByTagName: Map<string, string[]> = new Map();

  for (const sourceItem of items) {
    const noteHtml = await markdown2Html(sourceItem.note);
    const metaData = {
      mapGroupId: groupId,
      tagName: sourceItem.tagName,
      name: sourceItem.metaName,
      note: sourceItem.note,
      noteHtml: noteHtml,
      modifiedAt: currentTimestamp,
    };

    metasInsertData.push(metaData);

    if (sourceItem.levels) {
      levelsByTagName.set(sourceItem.tagName, sourceItem.levels);
    }
    if (sourceItem.images) {
      imagesByTagName.set(sourceItem.tagName, sourceItem.images);
    }

    if (sourceItem.footer) {
      const footerHtml = await markdown2Html(sourceItem.footer);
      Object.assign(metaData, {
        footer: sourceItem.footer,
        footerHtml: footerHtml,
      });
    }
  }

  await db.$primary.transaction(async (tx) => {
    const levelsData = await tx
      .select()
      .from(levels)
      .where(eq(levels.mapGroupId, groupId));
    const levelIdByName: Map<string, number> = new Map(
      levelsData.map((level) => [level.name, level.id]),
    );

    const metasInsertResult = await tx
      .insert(metas)
      .values(metasInsertData)
      .onConflictDoUpdate({
        target: [metas.mapGroupId, metas.tagName],
        set: {
          name: sql`excluded.name`,
          note: sql`excluded.note`,
          noteHtml: sql`excluded.note_html`,
          modifiedAt: sql`excluded.modified_at`,
          footer: sql`excluded.footer`,
          footerHtml: sql`excluded.footer_html`,
        },
      })
      .returning({ id: metas.id, tagName: metas.tagName });
    if (!partialUpload) {
      await tx.delete(metas).where(
        and(
          eq(metas.mapGroupId, groupId),
          notInArray(
            metas.id,
            metasInsertResult.map((row) => row.id),
          ),
        ),
      );
    }
    const metaTagNameToId: Map<string, number> = new Map(
      metasInsertResult.map((item) => [item.tagName, item.id]),
    );

    // Auto-create missing levels if enabled
    if (autoCreateLevels && levelsByTagName.size > 0) {
      const allLevelNames = new Set<string>();
      for (const levelNameArray of levelsByTagName.values()) {
        levelNameArray.forEach((levelName) => {
          allLevelNames.add(levelName);
        });
      }

      const missingLevelNames = Array.from(allLevelNames).filter(
        (levelName) => !levelIdByName.has(levelName),
      );

      if (missingLevelNames.length > 0) {
        const newLevelsData = missingLevelNames.map((levelName) => ({
          name: levelName,
          mapGroupId: groupId,
        }));

        const insertedLevels = await tx
          .insert(levels)
          .values(newLevelsData)
          .returning({ id: levels.id, name: levels.name });

        insertedLevels.forEach((level) => {
          levelIdByName.set(level.name, level.id);
        });
      }
    }

    if (levelsByTagName.size) {
      // Check for missing levels first if auto-create is disabled
      if (!autoCreateLevels) {
        const missingLevels = new Set<string>();
        for (const levelNameArray of levelsByTagName.values()) {
          levelNameArray.forEach((levelName) => {
            if (!levelIdByName.has(levelName)) {
              missingLevels.add(levelName);
            }
          });
        }

        if (missingLevels.size > 0) {
          throw new MissingLevelsError(Array.from(missingLevels).join(', '));
        }
      }

      const metaLevelsInsertValues: { metaId: number; levelId: number }[] = [];
      for (const [tagName, value] of levelsByTagName.entries()) {
        const metaId = metaTagNameToId.get(tagName);
        for (const level of value) {
          const levelId = levelIdByName.get(level)!;
          metaLevelsInsertValues.push({ metaId: metaId!, levelId: levelId });
        }
      }
      let updatedLevels: { id: number }[];
      if (metaLevelsInsertValues.length) {
        updatedLevels = await tx
          .insert(metaLevels)
          .values(metaLevelsInsertValues)
          .onConflictDoUpdate({
            target: [metaLevels.metaId, metaLevels.levelId],
            // only updating so the row shows up in returning
            set: { metaId: sql`excluded.meta_id` },
          })
          .returning({ id: metaLevels.id });
      } else {
        updatedLevels = [];
      }

      const metaIdsWithTags: number[] = [];
      for (const tagName of levelsByTagName.keys()) {
        const metaId = metaTagNameToId.get(tagName);
        metaIdsWithTags.push(metaId!);
      }
      await tx.delete(metaLevels).where(
        and(
          inArray(metaLevels.metaId, metaIdsWithTags),
          notInArray(
            metaLevels.id,
            updatedLevels.map((row) => row.id),
          ),
        ),
      );
    }

    if (imagesByTagName.size) {
      const metaImagesInsertValues: { metaId: number; image_url: string }[] =
        [];
      for (const [tagName, images] of imagesByTagName.entries()) {
        const metaId = metaTagNameToId.get(tagName);
        for (const image of images) {
          metaImagesInsertValues.push({ metaId: metaId!, image_url: image });
        }
      }
      let updatedImages: { id: number }[];
      if (metaImagesInsertValues.length) {
        updatedImages = await tx
          .insert(metaImages)
          .values(metaImagesInsertValues)
          .onConflictDoUpdate({
            target: [metaImages.metaId, metaImages.image_url],
            // only updating so the row shows up in returning
            set: { image_url: sql`excluded.image_url` },
          })
          .returning({ id: metaImages.id });
      } else {
        updatedImages = [];
      }
      const metaIdsWithImages: number[] = [];
      for (const tagName of imagesByTagName.keys()) {
        const metaId = metaTagNameToId.get(tagName);
        metaIdsWithImages.push(metaId!);
      }
      await tx.delete(metaImages).where(
        and(
          inArray(metaImages.metaId, metaIdsWithImages),
          notInArray(
            metaImages.id,
            updatedImages.map((row) => row.id),
          ),
        ),
      );
    }
  });
}
