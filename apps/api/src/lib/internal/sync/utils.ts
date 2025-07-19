export function getImageUrl(url: string): string {
  const geometa_storage_prefix = 'https://static.learnablemeta.com/';

  if (url.startsWith(geometa_storage_prefix)) {
    return `https://learnablemeta.com/cdn-cgi/image/format=avif,quality=80/${url}`;
  }

  return url;
}

export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}
