import { metaImages } from '@api/lib/db/schema';
import { db } from '@api/lib/drizzle';
import { uploadImage } from '@api/lib/utils/s3';
import { eq, like } from 'drizzle-orm';

const CLOUDFLARE_TRANSFORM_BASE = 'https://learnablemeta.com/cdn-cgi/image';
const STATIC_DOMAIN_PREFIX = 'https://static.learnablemeta.com/';

async function processImage(metaImage: typeof metaImages.$inferSelect) {
  console.log(
    `Processing image ID: ${metaImage.id}, URL: ${metaImage.image_url}`,
  );

  if (
    !metaImage.image_url ||
    !metaImage.image_url.startsWith(STATIC_DOMAIN_PREFIX)
  ) {
    console.log(
      `Skipping image ID: ${metaImage.id} due to invalid or non-static URL.`,
    );
    return;
  }

  const originalImageUrl = metaImage.image_url;
  const transformOptions =
    'format=avif,quality=70,width=1000,height=1000,fit=contain';
  const transformedImageUrl = `${CLOUDFLARE_TRANSFORM_BASE}/${transformOptions}/${originalImageUrl}`;

  let imageBuffer: ArrayBuffer;
  let newFileName: string;
  let finalImageUrlForS3 = '';

  const imagePathAndNameWithOldExt = originalImageUrl.substring(
    STATIC_DOMAIN_PREFIX.length,
  );
  const lastDotIndex = imagePathAndNameWithOldExt.lastIndexOf('.');
  const imageNameWithoutExtension =
    lastDotIndex === -1
      ? imagePathAndNameWithOldExt
      : imagePathAndNameWithOldExt.substring(0, lastDotIndex);

  try {
    console.log(
      `Attempting to download transformed image: ${transformedImageUrl}`,
    );
    const response = await fetch(transformedImageUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to download transformed image: ${response.status} ${response.statusText}`,
      );
    }
    imageBuffer = await response.arrayBuffer();
    newFileName = `${imageNameWithoutExtension}.avif`;
    finalImageUrlForS3 = transformedImageUrl;
    console.log(
      `Successfully downloaded transformed image. New file name: ${newFileName}`,
    );
  } catch (transformError) {
    console.warn(
      `Failed to transform image ID: ${metaImage.id}. Error: ${(transformError as Error).message}`,
    );
    console.log(`Falling back to original image: ${originalImageUrl}`);
    try {
      const response = await fetch(originalImageUrl);
      if (!response.ok) {
        throw new Error(
          `Failed to download original image: ${response.status} ${response.statusText}`,
        );
      }
      imageBuffer = await response.arrayBuffer();
      newFileName = imagePathAndNameWithOldExt; // Use the full original path and name with its extension
      finalImageUrlForS3 = originalImageUrl;
      console.log(
        `Successfully downloaded original image. New file name: ${newFileName}`,
      );
    } catch (originalDownloadError) {
      console.error(
        `Failed to download original image ID: ${metaImage.id}. Error: ${(originalDownloadError as Error).message}`,
      );
      return; // Skip this image
    }
  }

  if (!imageBuffer || !newFileName) {
    console.error(
      `Could not obtain image buffer or filename for image ID: ${metaImage.id}`,
    );
    return;
  }

  try {
    console.log(`Uploading ${newFileName} to S3...`);
    const uploadedImageUrl = await uploadImage(imageBuffer, newFileName);
    console.log(
      `Successfully uploaded image ID: ${metaImage.id} to S3. New URL: ${uploadedImageUrl}`,
    );

    await db
      .update(metaImages)
      .set({ image_url: uploadedImageUrl })
      .where(eq(metaImages.id, metaImage.id));
    console.log(`Successfully updated database for image ID: ${metaImage.id}`);
  } catch (uploadOrDbError) {
    console.error(
      `Error during S3 upload or DB update for image ID: ${metaImage.id}. Error: ${(uploadOrDbError as Error).message}`,
    );
  }
}

async function main() {
  console.log('Starting image processing script...');

  const imagesToProcess = await db
    .select()
    .from(metaImages)
    .where(like(metaImages.image_url, `${STATIC_DOMAIN_PREFIX}%`));

  console.log(`Found ${imagesToProcess.length} images to process.`);

  for (const image of imagesToProcess) {
    // Consider adding a delay or batching if you have many images
    // to avoid overwhelming the server or hitting rate limits.
    await processImage(image);
  }

  console.log('Image processing script finished.');
}

main().catch((error) => {
  console.error('Unhandled error in main script:', error);
  process.exit(1);
});
