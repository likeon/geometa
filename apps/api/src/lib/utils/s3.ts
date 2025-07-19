import { AwsClient } from 'aws4fetch';

const s3Url = process.env.IMAGES_S3_URL;
const s3AccessKey = process.env.IMAGES_S3_ACCESS_KEY;
const s3SecretKey = process.env.IMAGES_S3_SECRET_KEY;

let client: AwsClient | undefined;
if (s3Url && s3AccessKey && s3SecretKey) {
  client = new AwsClient({
    accessKeyId: s3AccessKey,
    secretAccessKey: s3SecretKey,
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
  const s3ImageUrl = `${s3Url}/${name}`;
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
