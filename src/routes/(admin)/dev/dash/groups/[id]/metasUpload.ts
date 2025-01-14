import { db } from '$lib/drizzle';
import { levels, metaImages, metaLevels, metas } from '$lib/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { markdown2Html } from '$lib/utils';
import { inArray, notInArray } from 'drizzle-orm/sql/expressions/conditions';
import type { MetasUploadContentSchemaSafeParse } from '$routes/(admin)/dev/dash/groups/[id]/+page.server';

export async function uploadMetas(
  groupId: number,
  validationResult: MetasUploadContentSchemaSafeParse,
  partialUpload: boolean
) {
  await db.transaction(async (tx) => {
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
    const levelsData = await db.select().from(levels).where(eq(levels.mapGroupId, groupId));
    const levelIdByName: Map<string, number> = new Map(
      levelsData.map((level) => [level.name, level.id])
    );

    for (const sourceItem of validationResult.data!) {
      const noteHtml = await markdown2Html(sourceItem.note);
      const metaData = {
        mapGroupId: groupId,
        tagName: sourceItem.tagName,
        name: sourceItem.metaName,
        note: sourceItem.note,
        noteHtml: noteHtml,
        modifiedAt: currentTimestamp
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
        Object.assign(metaData, { footer: sourceItem.footer, footerHtml: footerHtml });
      }
    }
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
          footerHtml: sql`excluded.footer_html`
        }
      })
      .returning({ id: metas.id, tagName: metas.tagName });
    if (!partialUpload) {
      await tx.delete(metas).where(
        and(
          eq(metas.mapGroupId, groupId),
          notInArray(
            metas.id,
            metasInsertResult.map((row) => row.id)
          )
        )
      );
    }
    const metaTagNameToId: Map<string, number> = new Map(
      metasInsertResult.map((item) => [item.tagName, item.id])
    );
    if (levelsByTagName.size) {
      const metaLevelsInsertValues: { metaId: number; levelId: number }[] = [];
      for (const [tagName, value] of levelsByTagName.entries()) {
        const metaId = metaTagNameToId.get(tagName);
        for (const level of value) {
          const levelId = levelIdByName.get(level);
          if (!levelId) {
            tx.rollback();
            // return setError(form, 'file', `Level with name="${level}" not found`);
          }
          metaLevelsInsertValues.push({ metaId: metaId!, levelId: levelId! });
        }
      }
      let updatedLevels: { id: number }[];
      if (metaLevelsInsertValues.length) {
        updatedLevels = await tx
          .insert(metaLevels)
          .values(metaLevelsInsertValues)
          .onConflictDoUpdate({
            target: [metaLevels.metaId, metaLevels.levelId],
            set: {
              metaId: sql`excluded
              .
              meta_id`
            }
          }) // only updating so the row shows up in returning
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
            updatedLevels.map((row) => row.id)
          )
        )
      );
    }

    if (imagesByTagName.size) {
      const metaImagesInsertValues: { metaId: number; image_url: string }[] = [];
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
            set: {
              image_url: sql`excluded
              .
              image_url`
            }
          }) // only updating so the row shows up in returning
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
            updatedImages.map((row) => row.id)
          )
        )
      );
    }
  });
}
