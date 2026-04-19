import { Kysely, PostgresDialect } from 'kysely';
import { Database } from './database';
import { Pool } from 'pg';
import ConfigService from '../services/config';

export default class DatabaseConnection {
    private static connection?: Kysely<Database>;
    private static pool?: Pool;

    static connect() {
        this.pool = new Pool({
            connectionString: ConfigService.getValue(
                'DATABASE_CONNECTION_STRING',
            ),
        });

        const dialect = new PostgresDialect({
            pool: this.pool,
        });

        this.connection = new Kysely<Database>({
            dialect,
        });
    }

    static disconnect() {
        if (!this.connection) return;
        this.connection.destroy();
        this.connection = undefined;
    }

    static getConnection(): Kysely<Database> {
        if (!this.connection) {
            throw new Error('Database not connected');
        }
        return this.connection;
    }

    static getPool(): Pool {
        if (!this.pool) {
            throw new Error('Database not connected');
        }

        return this.pool;
    }
}
