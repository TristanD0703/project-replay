import { ColumnType, Insertable, Selectable, Updateable } from 'kysely';

export interface UserModel {
    id: string;
    discord_username: string;
    discord_id: string;
    discord_avatar_hash?: string;
    is_streamer: boolean;
    is_admin: boolean;
    stream_key?: string;
    created_at: ColumnType<Date, string | undefined, never>;
    updated_at: ColumnType<Date, string | undefined, never>;
}

export type User = Selectable<UserModel>;
export type RecordingUpdate = Updateable<UserModel>;
export type NewRecording = Insertable<UserModel>;
