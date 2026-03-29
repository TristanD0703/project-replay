import { randomUUID } from 'crypto';

import { CreateUserInput } from '../db/models/user';
import DatabaseConnection from '../db';

export default class UserService {
    static async createUser(user: CreateUserInput) {
        const conn = DatabaseConnection.getConnection();

        const id = randomUUID();
        const ret = await conn
            .insertInto('user')
            .values({
                ...user,
                id,
            })
            .returningAll()
            .executeTakeFirst();

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
        await conn
            .selectFrom('user')
            .selectAll()
            .where('discord_username', '=', name)
            .execute();
    }

    static async deleteUser(id: string) {
        const conn = DatabaseConnection.getConnection();
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
