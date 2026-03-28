import { ColumnType, Insertable, Selectable, Updateable } from 'kysely';

export interface RecordingModel {
    id: string; // uuid
    name?: string;
    s3_path: string;
    thumbnail_link: string;
    recorded_by: string;
    created_at: ColumnType<Date, string | undefined, never>;
    updated_at: ColumnType<Date, string | undefined, never>;
}

export interface RecordingStatusModel {
    id: string;
    created_by_id: string;
    status: 'QUEUED' | 'RECORDING' | 'READY' | 'FAILED';
    created_at: ColumnType<Date, string | undefined, never>;
    updated_at: ColumnType<Date, string | undefined, never>;
}

export type RecordingStatus = Selectable<RecordingStatusModel>;
export type RecordingStatusUpdate = Updateable<RecordingStatusModel>;
export type NewRecordingStatus = Insertable<RecordingStatusModel>;

export type Recording = Selectable<RecordingModel>;
export type RecordingUpdate = Updateable<RecordingModel>;
export type NewRecording = Insertable<RecordingModel>;
