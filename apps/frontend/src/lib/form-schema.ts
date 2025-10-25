import { z } from 'zod/v4';

export const insertMapGroupSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').prefault('')
});
export const updateMapGroupSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').prefault(''),
  id: z.number()
});

export type InsertMetasSchema = typeof insertMetasSchema;
export const insertMetasSchema = z.object({
  id: z.number().optional(),
  mapGroupId: z.number().prefault(-1),
  tagName: z.string().min(1, 'Tag cannot be empty').prefault(''),
  name: z.string().min(1, 'Name cannot be empty').prefault(''),
  note: z.string().prefault(''),
  noteFromPlonkit: z.boolean().prefault(false),
  levels: z.array(z.number()).prefault([]),
  footer: z.string().optional().prefault('')
});

// Schema for generating defaults without validation constraints
export const insertMetasDefaultSchema = insertMetasSchema.extend({
  tagName: z.string().prefault(''),
  name: z.string().prefault('')
});

export type MapUploadSchema = typeof mapUploadSchema;
export const mapUploadSchema = z.object({
  file: z
    .instanceof(File, {
      error: 'Please upload a file.'
    })
    .refine((file) => file.type === 'application/json', {
      error: 'File must be a JSON file.'
    }),
  partialUpload: z.boolean().prefault(true)
});

export const metasUploadContentSchema = z
  .object({
    tagName: z.string(),
    metaName: z.string(),
    note: z.string(),
    footer: z.string().optional().nullable(),
    levels: z.string().array().optional().nullable(),
    images: z.string().array().optional().nullable()
  })
  .array();
export type MetasUploadContentSchemaSafeParse = ReturnType<
  typeof metasUploadContentSchema.safeParse
>;
export const metasUploadSchema = z.object({
  file: z.instanceof(File, {
    error: 'Please upload a file.'
  }),
  partialUpload: z.boolean().prefault(true),
  autoCreateLevels: z.boolean().prefault(true)
});
export type MetasUploadSchema = typeof metasUploadSchema;

export const insertPersonalMap = z.object({
  id: z.number().nullable(),
  name: z.string().min(1, 'Name cannot be empty'),
  geoguessrId: z.string().min(1, 'GeoguessrId cannot be empty')
});
export type InsertPersonalMapSchema = typeof insertPersonalMap;

export const insertMapsSchema = z
  .object({
    id: z.number().optional(),
    mapGroupId: z.number().prefault(-1),
    name: z.string().min(1, 'Name cannot be empty').prefault(''),
    geoguessrId: z.string().min(1, 'GeoguessrId cannot be empty').prefault(''),
    description: z.string().nullable(),
    isPublished: z.boolean().prefault(false),
    isShared: z.boolean().prefault(false),
    authors: z.string().nullable().prefault(''),
    ordering: z.coerce.number().prefault(0),
    autoUpdate: z.boolean().prefault(false),
    footer: z.string().prefault(''),
    isVerified: z.boolean().prefault(false),
    includeFilters: z.array(z.string()).prefault([]),
    excludeFilters: z.array(z.string()).prefault([]),
    regions: z.array(z.number()).prefault([]),
    levels: z.array(z.number()).prefault([]),
    difficulty: z.coerce.number().prefault(0)
  })
  .refine((data) => !data.isPublished || data.difficulty !== 0, {
    path: ['difficulty'],
    error: 'You need to set difficulty to publish the map.'
  })
  .refine((data) => !data.isPublished || data.regions.length > 0, {
    path: ['regions'],
    error: 'You must select region to publish the map.'
  })
  .refine((data) => !data.isPublished || (data.authors !== null && data.authors.trim() !== ''), {
    path: ['authors'],
    error: 'You must set author to publish the map.'
  })
  .refine(
    (data) => !data.isPublished || (data.description !== null && data.description.trim() !== ''),
    {
      path: ['description'],
      error: 'You must set description to publish the map.'
    }
  );

export type InsertMapsSchema = typeof insertMapsSchema;

export const insertLevelsSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').prefault(''),
  id: z.number().optional(),
  mapGroupId: z.number()
});
export type InsertLevelsSchema = typeof insertLevelsSchema;
