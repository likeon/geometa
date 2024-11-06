import { CLOUDFLARE_BEARER, CLOUDFLARE_KV_NAMESPACE_ID } from '$env/static/private';
import { db } from '$lib/drizzle';
import { and, eq } from 'drizzle-orm';
import { mapGroupPermissions, users } from '$lib/db/schema';
import { error } from '@sveltejs/kit';

export function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join(
    ''
  );
}

export function getFileExtension(file: File): string {
  const fileName = file.name;
  const lastDotIndex = fileName.lastIndexOf('.');
  return lastDotIndex === -1 ? '' : fileName.slice(lastDotIndex + 1);
}

export async function extractJsonData(file: File) {
  try {
    // Read the file content as text
    const text = await file.text();

    // Parse the text as JSON
    const jsonData = JSON.parse(text);

    // Return or process the JSON data
    return jsonData;
  } catch (error) {
    // Handle errors (e.g., invalid JSON)
    console.error('Error parsing JSON:', error);
    throw error;
  }
}

export function getCountryFromTagName(tagName: string) {
  const countryRaw = tagName.split('-')[0];

  if (countryRaw === 'UsVirginIslands') {
    return 'US Virgin Islands';
  }
  return countryRaw.replace(/([a-z])([A-Z])/g, '$1 $2').trim();
}

export function cutToTwoDecimals(num: number): string {
  const fixed = num.toFixed(2);
  // Remove trailing zeros after the decimal point
  return fixed.replace(/\.?0+$/, '');
}

export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function cloudflareKvBulkPut(data: any[]) {
  const url = `https://api.cloudflare.com/client/v4/accounts/a38064a092904c941dedaf866ea6977e/storage/kv/namespaces/${CLOUDFLARE_KV_NAMESPACE_ID}/bulk`;

  if (!CLOUDFLARE_KV_NAMESPACE_ID || !CLOUDFLARE_BEARER) {
    throw new Error('Set Cloudflare variables');
  }

  const headers = {
    Authorization: `Bearer ${CLOUDFLARE_BEARER}`,
    'Content-Type': 'application/json'
  };

  const chunks = chunkArray(data, 1000);

  await Promise.all(
    chunks.map(async (chunk) => {
      const response = await fetch(url, {
        method: 'PUT',
        headers: headers,
        body: JSON.stringify(chunk)
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
    })
  );
}

export async function ensurePermissions(userId: string | undefined, groupId: number | undefined) {
  if (!userId || !groupId) {
    error(403, 'Permission denied');
  }
  const [permission, superadminUser] = await Promise.all([
    db.query.mapGroupPermissions.findFirst({
      where: and(
        eq(mapGroupPermissions.userId, userId),
        eq(mapGroupPermissions.mapGroupId, groupId)
      )
    }),
    db.query.users.findFirst({ where: and(eq(users.id, userId), eq(users.isSuperadmin, true)) })
  ]);

  if (!(permission || superadminUser)) {
    error(403, 'Permission denied');
  }
}

export function isDeepEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true;

  if (typeof obj1 !== 'object' || obj1 === null || typeof obj2 !== 'object' || obj2 === null) {
    return false;
  }

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    if (!keys2.includes(key) || !isDeepEqual(obj1[key], obj2[key])) {
      return false;
    }
  }

  return true;
}
