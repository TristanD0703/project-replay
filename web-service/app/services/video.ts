import { randomUUID } from 'crypto';

import DatabaseConnection from '../db';
import {
    CreateRecordingMetadataInput,
    RecordingMetadataUpdate,
    UpdateRecordingMetadataInput,
} from '../db/models/recording';
import AppError from '../app-error';

export default class VideoService {
    static async queueRecording(metadata: CreateRecordingMetadataInput) {
        const conn = DatabaseConnection.getConnection();
        const id = randomUUID();

        const ret = await conn
            .insertInto('recording_metadata')
            .values({
                ...metadata,
                id,
            })
            .returningAll()
            .executeTakeFirst();

        return ret;
    }

    static async getVideosByUserId(id: string, skip: number, count: number) {
        const conn = DatabaseConnection.getConnection();

        const ret = await conn
            .selectFrom('recording_metadata')
            .selectAll()
            .where('created_by_id', '=', id)
            .orderBy('created_at', 'desc')
            .offset(skip)
            .limit(count)
            .execute();

        return ret;
    }

    static async getVideoStatus(id: string) {
        const conn = DatabaseConnection.getConnection();

        const ret = await conn
            .selectFrom('recording_metadata')
            .select('status')
            .where('id', '=', id)
            .executeTakeFirstOrThrow();

        return ret;
    }

    static async getVideoId(id: string) {
        const conn = DatabaseConnection.getConnection();

        const ret = await conn
            .selectFrom('recording_metadata')
            .selectAll()
            .where('id', '=', id)
            .executeTakeFirstOrThrow();

        return ret;
    }

    static async updateVideoMetadata(
        metadata: UpdateRecordingMetadataInput,
        userId: string,
    ) {
        const conn = DatabaseConnection.getConnection();
        const { id, ...updateData } = metadata;

        if (!(await this.doesUserOwnVideoId(userId, id))) {
            throw new AppError(403, 'User does not own this video');
        }

        const values: RecordingMetadataUpdate = {
            ...updateData,
            updated_at: new Date(),
        };

        const ret = await conn
            .updateTable('recording_metadata')
            .set(values)
            .where('id', '=', id)
            .returningAll()
            .executeTakeFirst();

        if (!ret) {
            throw new AppError(404, 'Video not found');
        }

        return ret;
    }

    static async deleteVideoById(id: string, userId: string) {
        const conn = DatabaseConnection.getConnection();

        if (!(await this.doesUserOwnVideoId(userId, id))) {
            throw new AppError(403, 'User does not own this video');
        }

        const ret = await conn
            .deleteFrom('recording_metadata')
            .where('id', '=', id)
            .executeTakeFirst();

        if (ret.numDeletedRows === 0n) {
            throw new AppError(404, 'Video not found');
        }

        return ret;
    }

    private static async doesUserOwnVideoId(
        userId: string,
        videoId: string,
    ): Promise<boolean> {
        const conn = DatabaseConnection.getConnection();
        const res = await conn
            .selectFrom('recording_metadata')
            .select('id')
            .where('id', '=', videoId)
            .where('created_by_id', '=', userId)
            .executeTakeFirst();
        return !!res;
    }
}
