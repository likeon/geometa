import { CLOUDFLARE_BEARER, CLOUDFLARE_KV_NAMESPACE_ID } from '$env/static/private';
import { db } from '$lib/drizzle';
import { and, eq } from 'drizzle-orm';
import { mapGroupPermissions, users } from '$lib/db/schema';
import { error } from '@sveltejs/kit';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeSanitize from 'rehype-sanitize';
import rehypeExternalLinks from 'rehype-external-links';
import rehypeStringify from 'rehype-stringify';
import { env } from '$env/dynamic/private';

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

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function cloudflareKvBulkPut(data: any[]) {
  console.log('In KvBultPut function');
  const url = `https://api.cloudflare.com/client/v4/accounts/a38064a092904c941dedaf866ea6977e/storage/kv/namespaces/${CLOUDFLARE_KV_NAMESPACE_ID}/bulk`;

  if (!CLOUDFLARE_KV_NAMESPACE_ID || !CLOUDFLARE_BEARER) {
    throw new Error('Set Cloudflare variables');
  }

  const headers = {
    Authorization: `Bearer ${CLOUDFLARE_BEARER}`,
    'Content-Type': 'application/json'
  };
  let count = 0;
  const chunks = chunkArray(data, 10000);
  for (const chunk of chunks) {
    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: headers,
        body: JSON.stringify(chunk)
      });

      if (!response.ok) {
        console.log('here1');
        console.log(response.status);
        throw new Error(`Request failed with status ${response.status}`);
      }

      console.log('request was good ' + count);
      count++;
    } catch (error) {
      console.log('here2');
      console.log(error);
      throw new Error(`There was an error: ${error}`);
    }
  }
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

export async function markdown2Html(markdown: string) {
  const vfile = await unified()
    .use(remarkParse)
    .use(remarkRehype)
    .use(rehypeSanitize)
    .use(rehypeExternalLinks, { target: '_blank' })
    .use(rehypeStringify)
    .process(markdown);
  return String(vfile);
}

export function checkIfValidCountry(countryName: string): Boolean {
  return countryNames.some(
    (country) => country.toLocaleLowerCase().trim() == countryName.toLocaleLowerCase()
  );
}

export function generatePlonkitLink(countryName: string) {
  let countryUrl: string;

  switch (countryName) {
    case 'Israel':
      countryUrl = 'israel-west-bank';
      break;
    default:
      countryUrl = countryName.toLowerCase().replace(/ /g, '-');
      break;
  }

  return `https://www.plonkit.net/${countryUrl}`;
}

export async function generateFooter(countryName: string, creditPlonkit: boolean): Promise<string> {
  const plonkitCountryUrl = generatePlonkitLink(countryName);

  if (checkIfValidCountry(countryName)) {
    if (creditPlonkit) {
      return await markdown2Html(
        `Description and images taken from: [${plonkitCountryUrl}](${plonkitCountryUrl}).`
      );
    }
    return await markdown2Html(
      `Check out [${plonkitCountryUrl}](${plonkitCountryUrl}) for more clues.`
    );
  }

  if (creditPlonkit) {
    return await markdown2Html(
      `Description and images taken from: [https://www.plonkit.net/](https://www.plonkit.net/).`
    );
  }

  return '';
}

export const countryNames = [
  'Afghanistan',
  'Albania',
  'Algeria',
  'Andorra',
  'Angola',
  'Argentina',
  'Armenia',
  'Australia',
  'Austria',
  'Azerbaijan',
  'Bahamas',
  'Bahrain',
  'Bangladesh',
  'Barbados',
  'Belarus',
  'Belgium',
  'Belize',
  'Benin',
  'Bhutan',
  'Bolivia',
  'Bosnia and Herzegovina',
  'Botswana',
  'Brazil',
  'Brunei',
  'Bulgaria',
  'Burkina Faso',
  'Burundi',
  'Cabo Verde',
  'Cambodia',
  'Cameroon',
  'Canada',
  'Central African Republic',
  'Chad',
  'Chile',
  'China',
  'Colombia',
  'Comoros',
  'Congo',
  'Costa Rica',
  'Croatia',
  'Cuba',
  'Curacao',
  'Cyprus',
  'Czechia',
  'Christmas Island',
  'Democratic Republic of the Congo',
  'Denmark',
  'Djibouti',
  'Dominica',
  'Dominican Republic',
  'Ecuador',
  'Egypt',
  'El Salvador',
  'Equatorial Guinea',
  'Eritrea',
  'Estonia',
  'Eswatini',
  'Ethiopia',
  'Fiji',
  'Finland',
  'France',
  'Gabon',
  'Gambia',
  'Georgia',
  'Germany',
  'Ghana',
  'Greece',
  'Grenada',
  'Guam',
  'Guatemala',
  'Guinea',
  'Guinea-Bissau',
  'Guyana',
  'Haiti',
  'Honduras',
  'Hungary',
  'Iceland',
  'India',
  'Indonesia',
  'Iran',
  'Iraq',
  'Ireland',
  'Israel',
  'Italy',
  'Jamaica',
  'Japan',
  'Jordan',
  'Kazakhstan',
  'Kenya',
  'Kiribati',
  'Kuwait',
  'Kyrgyzstan',
  'Laos',
  'Latvia',
  'Lebanon',
  'Lesotho',
  'Liberia',
  'Libya',
  'Liechtenstein',
  'Lithuania',
  'Luxembourg',
  'Madagascar',
  'Malawi',
  'Malaysia',
  'Maldives',
  'Mali',
  'Malta',
  'Marshall Islands',
  'Mauritania',
  'Mauritius',
  'Mexico',
  'Micronesia',
  'Moldova',
  'Monaco',
  'Mongolia',
  'Montenegro',
  'Morocco',
  'Mozambique',
  'Myanmar',
  'Namibia',
  'Nauru',
  'Nepal',
  'Netherlands',
  'New Zealand',
  'Nicaragua',
  'Niger',
  'Nigeria',
  'North Korea',
  'North Macedonia',
  'Northern Mariana Islands',
  'Norway',
  'Oman',
  'Pakistan',
  'Palau',
  'Palestine State',
  'Panama',
  'Papua New Guinea',
  'Paraguay',
  'Peru',
  'Philippines',
  'Poland',
  'Portugal',
  'Puerto Rico',
  'Qatar',
  'Romania',
  'Russia',
  'Rwanda',
  'Saint Kitts and Nevis',
  'Saint Lucia',
  'Saint Vincent and the Grenadines',
  'Samoa',
  'San Marino',
  'Sao Tome and Principe',
  'Saudi Arabia',
  'Senegal',
  'Serbia',
  'Seychelles',
  'Sierra Leone',
  'Singapore',
  'Slovakia',
  'Slovenia',
  'Solomon Islands',
  'Somalia',
  'South Africa',
  'South Korea',
  'South Sudan',
  'Spain',
  'Sri Lanka',
  'Sudan',
  'Suriname',
  'Sweden',
  'Switzerland',
  'Syria',
  'Taiwan',
  'Tajikistan',
  'Tanzania',
  'Thailand',
  'Timor-Leste',
  'Togo',
  'Tonga',
  'Trinidad and Tobago',
  'Tunisia',
  'Turkey',
  'Turkmenistan',
  'Tuvalu',
  'Uganda',
  'Ukraine',
  'United Arab Emirates',
  'United Kingdom',
  'United States of America',
  'United States',
  'Uruguay',
  'Uzbekistan',
  'Vanuatu',
  'Vatican City',
  'Venezuela',
  'Vietnam',
  'Yemen',
  'Zambia',
  'Zimbabwe'
];

export async function geoguessrAPIFetch(
  url: string,
  { method = 'GET', headers, ...restOptions }: RequestInit = {}
) {
  const ncfaToken = env.NFCA_TOKEN || null;

  if (ncfaToken == null) {
    throw new Error('NFCA_TOKEN IS MISSING');
  }

  const defaultHeaders: HeadersInit = {
    Cookie: `_ncfa=${ncfaToken}`,
    'Content-Type': 'application/json'
  };

  const mergedHeaders: HeadersInit = {
    ...defaultHeaders,
    ...(headers || {})
  };

  return await fetch(url, {
    method,
    headers: mergedHeaders,
    ...restOptions
  });
}

type GeoguessrMapInfo = {
  id: string;
  numberOfGamesPlayed: number;
};

export async function geoguessrGetMapInfo(geoguessrId: string) {
  const url = `https://www.geoguessr.com/api/v3/search/map?page=0&count=1&q=${geoguessrId}`;

  const response = await geoguessrAPIFetch(url);
  if (!response.ok) throw error(response.status, 'Failed to fetch map info');
  const data = (await response.json()) as GeoguessrMapInfo[];

  if (!data.length) {
    return null;
  }

  const mapInfo = data[0];
  if (mapInfo.id != geoguessrId) {
    // found map id doesn't match the requested id
    // probably in cases where not an actual map id was provided
    // treat it the same as map not found
    return null;
  }

  return mapInfo;
}
