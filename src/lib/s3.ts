import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY } from '$env/static/private';
import { dev } from '$app/environment';

const client = new S3Client({
  endpoint: 'https://a38064a092904c941dedaf866ea6977e.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY
  },
  region: 'auto'
});

export async function uploadFile(file: File, key: string) {
  const upload = new Upload({
    client,
    params: {
      Bucket: dev ? 'geometa-dev' : 'geometa',
      Key: key,
      Body: file
    }
  });

  await upload.done();
}
