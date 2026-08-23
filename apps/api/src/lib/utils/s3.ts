import { config } from '@api/config';
import { AwsClient } from 'aws4fetch';

const { IMAGES_S3_URL, IMAGES_S3_ACCESS_KEY, IMAGES_S3_SECRET_KEY } = config;

let client: AwsClient | undefined;
if (IMAGES_S3_URL && IMAGES_S3_ACCESS_KEY && IMAGES_S3_SECRET_KEY) {
  client = new AwsClient({
    accessKeyId: IMAGES_S3_ACCESS_KEY,
    secretAccessKey: IMAGES_S3_SECRET_KEY,
    region: 'something',
    service: 's3',
  });
} else {
  client = undefined;
}

export async function uploadImage(file: ArrayBuffer, name: string) {
  if (!client) {
    throw new Error('s3 details missing');
  }
  const s3ImageUrl = `${IMAGES_S3_URL}/${name}`;
  const { status } = await client.fetch(s3ImageUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': 'image/avif',
      'Content-Length': file.byteLength.toString(),
    },
  });
  if (status !== 200) throw new Error('s3 upload failed');
  return `https://learnablemeta.com/images/${name}`;
}
