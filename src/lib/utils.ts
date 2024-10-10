import { CLOUDFLARE_BEARER, CLOUDFLARE_KV_NAMESPACE_ID } from '$env/static/private';
import { db } from '$lib/drizzle';
import { and, eq } from 'drizzle-orm';
import { mapGroupPermissions } from '$lib/db/schema';
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

export async function cloudflareKvBulkPut(data: any) {
  const url = `https://api.cloudflare.com/client/v4/accounts/a38064a092904c941dedaf866ea6977e/storage/kv/namespaces/${CLOUDFLARE_KV_NAMESPACE_ID}/bulk`;

  if (!CLOUDFLARE_KV_NAMESPACE_ID || !CLOUDFLARE_BEARER) {
    throw new Error('set cloudflare variables');
  }

  const headers = {
    Authorization: `Bearer ${CLOUDFLARE_BEARER}`,
    'Content-Type': 'application/json'
  };

  const response = await fetch(url, {
    method: 'PUT',
    headers: headers,
    body: JSON.stringify(data)
  });

  if (response.status !== 200) {
    throw new Error(`Request failed with status code ${response.status}`);
  }
}

export async function ensurePermissions(userId: string | undefined, groupId: number | undefined) {
  if (!userId || !groupId) {
    error(403, 'Permission denied');
  }
  const permission = await db.query.mapGroupPermissions.findFirst({
    where: and(eq(mapGroupPermissions.userId, userId), eq(mapGroupPermissions.mapGroupId, groupId))
  });

  if (!permission) {
    error(403, 'Permission denied');
  }
}
