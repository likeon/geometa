import { AwsClient } from 'aws4fetch';
import { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY } from '$env/static/private';
import { dev } from '$app/environment';

const client = new AwsClient({
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY
});

const R2_URL = `https://a38064a092904c941dedaf866ea6977e.r2.cloudflarestorage.com/${dev ? 'geometa-dev' : 'geometa'}`;

export async function uploadFile(file: File, name: string) {
  await client.fetch(`${R2_URL}/${name}`, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type
    }
  });
}
