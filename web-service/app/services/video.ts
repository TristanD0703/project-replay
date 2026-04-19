import { randomUUID } from 'crypto';

import DatabaseConnection from '../db';
import {
  CreateRecordingMetadataInput,
  RecordingMetadata,
  RecordingMetadataUpdate,
  UpdateRecordingMetadataInput,
} from '../db/models/recording';
import AppError from '../utils/app-error';
import { User } from '../db/models/user';

export default class VideoService {
  static async queueRecording(
    metadata: CreateRecordingMetadataInput,
    userId: string,
  ) {
    const conn = DatabaseConnection.getConnection();
    const id = randomUUID();

    try {
      const ret = await conn
        .insertInto('recording_metadata')
        .values({
          ...metadata,
          created_by_id: userId,
          id,
        })
        .returningAll()
        .executeTakeFirst();
      return ret;
    } catch (e: any) {
      console.log(e.constructor.name);
    }

    //TODO: Create a queue item to record this replay code
  }

  static async getVideosByUserId(
    id: string,
    skip: number,
    count: number,
    currentUserId: string,
    isUserAdmin: boolean
  ) {
    const conn = DatabaseConnection.getConnection();
    let query = conn
      .selectFrom('recording_metadata')
      .selectAll()
      .where('created_by_id', '=', id)
      .orderBy('created_at', 'desc')
      .offset(skip)
      .limit(count);

    const onlyPublic = currentUserId !== id && !isUserAdmin;

    if (onlyPublic) {
      query = query.where('is_public', '=', true);
    }

    const ret = await query.execute();

    return ret;
  }

  static async getVideoStatus(id: string, user: User) {
    const conn = DatabaseConnection.getConnection();

    if (!(await this.canUserViewVideoId(user, id))) {
      throw new AppError(403, 'User does not own this video');
    }

    const ret = await conn
      .selectFrom('recording_metadata')
      .select('status')
      .where('id', '=', id)
      .executeTakeFirstOrThrow();

    return ret;
  }

  static async getVideoId(id: string, user: User) {
    const conn = DatabaseConnection.getConnection();

    const ret = await conn
      .selectFrom('recording_metadata')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirstOrThrow();

    if (!this.canUserViewVideo(user, ret))
      throw new AppError(403, 'User does not own this video');

    return ret;
  }

  static async updateVideoMetadata(
    metadata: UpdateRecordingMetadataInput,
    user: User
  ) {
    const conn = DatabaseConnection.getConnection();
    const { id, ...updateData } = metadata;

    if (!(await this.canUserViewVideoId(user, id))) {
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

  static async deleteVideoById(id: string, user: User) {
    const conn = DatabaseConnection.getConnection();

    if (!(await this.canUserViewVideoId(user, id))) {
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

  private static async canUserViewVideo(
    user: User,
    video: RecordingMetadata
  ): Promise<boolean> {
    return user.is_admin || video.created_by_id === user.id
  }

  private static async canUserViewVideoId(user: User, videoId: string): Promise<boolean> {
    if (user.is_admin) return true;

    const conn = DatabaseConnection.getConnection();

    const video = await conn
      .selectFrom('recording_metadata')
      .selectAll()
      .where('id', '=', videoId)
      .where('created_by_id', '=', user.id)
      .executeTakeFirst();

    return video !== null && video !== undefined
  }

}
