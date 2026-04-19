import { randomUUID } from 'crypto';

import { CreateUserInput, User } from '../db/models/user';
import DatabaseConnection from '../db';
import AppError from '../utils/app-error';
import AuthService from './auth';

export default class UserService {
  static async getOrCreateUser(user: CreateUserInput) {
    const conn = DatabaseConnection.getConnection();
    const id = randomUUID();

    const other = await this.getUserByDiscordId(user.discord_id);

    if (other) {
      return other;
    }

    const ret = await conn
      .insertInto('user')
      .values({
        ...user,
        id,
      })
      .returningAll()
      .executeTakeFirst();

    if (!ret) throw new AppError(500, 'Create user failed');

    return ret;
  }

  static async getUserById(id: string) {
    const conn = DatabaseConnection.getConnection();
    const ret = await conn
      .selectFrom('user')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirstOrThrow();
    return ret;
  }

  static async getUserByName(name: string) {
    const conn = DatabaseConnection.getConnection();
    return await conn
      .selectFrom('user')
      .selectAll()
      .where('discord_username', '=', name)
      .executeTakeFirstOrThrow();
  }

  static async getUserByDiscordIdAndThrow(discordId: string) {
    const conn = DatabaseConnection.getConnection();
    return await conn
      .selectFrom('user')
      .selectAll()
      .where('discord_id', '=', discordId)
      .executeTakeFirstOrThrow();
  }

  static async getUserByDiscordId(discordId: string) {
    const conn = DatabaseConnection.getConnection();
    return await conn
      .selectFrom('user')
      .selectAll()
      .where('discord_id', '=', discordId)
      .executeTakeFirst();
  }

  static async deleteUser(id: string, currUser: User) {
    const conn = DatabaseConnection.getConnection();
    if (currUser.id !== id || !currUser.is_admin) return;

    const ret = await conn
      .deleteFrom('user')
      .where('id', '=', id)
      .executeTakeFirst();
    if (ret.numDeletedRows == 0n) {
      throw new Error('Not found');
    }
    return ret;
  }
}
