import { ColumnType, Insertable, Selectable, Updateable } from 'kysely';
import { z } from 'zod';

const recordingDateSchema = z
    .union([z.date(), z.string(), z.number()])
    .pipe(z.coerce.date());

const recordingStatusValueSchema = z.enum([
    'QUEUED',
    'RECORDING',
    'READY',
    'FAILED',
]);

export const videoSchema = z
    .object({
        id: z.uuid(),
        name: z.string().min(1).or(z.undefined()),
        s3_path: z.string().min(1),
        thumbnail_link: z.string().min(1),
        recorded_by: z.uuid(),
        created_at: recordingDateSchema,
        updated_at: recordingDateSchema,
    })
    .strict();

export const createVideoSchema = videoSchema
    .omit({
        id: true,
        created_at: true,
        updated_at: true,
    })
    .extend({
        name: z.string().min(1).optional(),
    });

export const updateVideoSchema = createVideoSchema
    .omit({ s3_path: true })
    .partial();

export const recordingMetadataSchema = z
    .object({
        id: z.uuid(),
        created_by_id: z.uuid(),
        status: recordingStatusValueSchema,
        is_public: z.boolean(),
        created_at: recordingDateSchema,
        updated_at: recordingDateSchema,
    })
    .strict();

export const createRecordingMetadataSchema = recordingMetadataSchema
    .omit({
        id: true,
        created_at: true,
        updated_at: true,
    })
    .extend({
        status: recordingStatusValueSchema.optional().default('QUEUED'),
        is_public: z.boolean().optional().default(false),
    });

export const updateRecordingStatusSchema =
    createRecordingMetadataSchema.partial();

type VideoSchema = z.infer<typeof videoSchema>;
type RecordingMetadataSchema = z.infer<typeof recordingMetadataSchema>;

export interface VideoModel extends Omit<
    VideoSchema,
    'created_at' | 'updated_at'
> {
    created_at: ColumnType<
        VideoSchema['created_at'],
        string | undefined,
        never
    >;
    updated_at: ColumnType<
        VideoSchema['updated_at'],
        string | undefined,
        never
    >;
}

export interface RecordingMetadataModel extends Omit<
    RecordingMetadataSchema,
    'created_at' | 'updated_at'
> {
    created_at: ColumnType<
        RecordingMetadataSchema['created_at'],
        string | undefined,
        never
    >;
    updated_at: ColumnType<
        RecordingMetadataSchema['updated_at'],
        string | undefined,
        never
    >;
}

export type RecordingStatus = Selectable<RecordingMetadataModel>;
export type RecordingStatusInput = RecordingMetadataSchema;
export type CreateRecordingMetadataInput = z.infer<
    typeof createRecordingMetadataSchema
>;
export type UpdateRecordingMetadataInput = z.infer<
    typeof updateRecordingStatusSchema
>;
export type RecordingMetadataUpdate = Updateable<RecordingMetadataModel>;
export type NewRecordingMetadata = Insertable<RecordingMetadataModel>;

export type Video = Selectable<VideoModel>;
export type VideoInput = VideoSchema;
export type CreateVideoInput = z.infer<typeof createVideoSchema>;
export type UpdateVideoInput = z.infer<typeof updateVideoSchema>;
export type VideoUpdate = Updateable<VideoModel>;
export type NewVideo = Insertable<VideoModel>;
