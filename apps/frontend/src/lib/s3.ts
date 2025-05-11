import { AwsClient } from 'aws4fetch';
import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';

const R2_URL = `https://a38064a092904c941dedaf866ea6977e.r2.cloudflarestorage.com/${dev ? 'geometa-dev' : 'geometa'}`;

export async function uploadFile(file: File, name: string) {
  const client = new AwsClient({
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY
  });
  await client.fetch(`${R2_URL}/${name}`, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type
    }
  });
}
