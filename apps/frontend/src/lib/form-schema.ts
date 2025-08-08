import { z } from 'zod';

export const insertMapGroupSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').default('')
});
export const updateMapGroupSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').default(''),
  id: z.number()
});

export type InsertMetasSchema = typeof insertMetasSchema;
export const insertMetasSchema = z.object({
  id: z.number().optional(),
  mapGroupId: z.number().default(-1),
  tagName: z.string().min(1, 'Tag cannot be empty').default(''),
  name: z.string().min(1, 'Name cannot be empty').default(''),
  note: z.string().default(''),
  noteFromPlonkit: z.boolean().default(false),
  levels: z.array(z.number()).default([]),
  footer: z.string().optional().default('')
});

// Schema for generating defaults without validation constraints
export const insertMetasDefaultSchema = insertMetasSchema.extend({
  tagName: z.string().default(''),
  name: z.string().default('')
});

export type MapUploadSchema = typeof mapUploadSchema;
export const mapUploadSchema = z.object({
  file: z
    .instanceof(File, { message: 'Please upload a file.' })
    .refine((file) => file.type === 'application/json', {
      message: 'File must be a JSON file.'
    }),
  partialUpload: z.boolean().default(true)
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
  file: z.instanceof(File, { message: 'Please upload a file.' }),
  partialUpload: z.boolean().default(true)
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
    mapGroupId: z.number().default(-1),
    name: z.string().min(1, 'Name cannot be empty').default(''),
    geoguessrId: z.string().min(1, 'GeoguessrId cannot be empty').default(''),
    description: z.string().nullable(),
    isPublished: z.boolean().default(false),
    isShared: z.boolean().default(false),
    authors: z.string().nullable().default(''),
    ordering: z.coerce.number().default(0),
    autoUpdate: z.boolean().default(false),
    footer: z.string().default(''),
    isVerified: z.boolean().default(false),
    includeFilters: z.array(z.string()).default([]),
    excludeFilters: z.array(z.string()).default([]),
    regions: z.array(z.number()).default([]),
    levels: z.array(z.number()).default([]),
    difficulty: z.coerce.number().default(0)
  })
  .refine((data) => !data.isPublished || data.difficulty !== 0, {
    message: 'You need to set difficulty to publish the map.',
    path: ['difficulty']
  })
  .refine((data) => !data.isPublished || data.regions.length > 0, {
    message: 'You must select region to publish the map.',
    path: ['regions']
  })
  .refine((data) => !data.isPublished || (data.authors !== null && data.authors.trim() !== ''), {
    message: 'You must set author to publish the map.',
    path: ['authors']
  })
  .refine(
    (data) => !data.isPublished || (data.description !== null && data.description.trim() !== ''),
    {
      message: 'You must set description to publish the map.',
      path: ['description']
    }
  );

export type InsertMapsSchema = typeof insertMapsSchema;

export const insertLevelsSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').default(''),
  id: z.number().optional(),
  mapGroupId: z.number()
});
export type InsertLevelsSchema = typeof insertLevelsSchema;
