import { Kysely, PostgresDialect } from 'kysely';
import { Database } from './database';
import { Pool } from 'pg';

export default class DatabaseConnection {
    private static connection?: Kysely<Database>;
    private static pool?: Pool;

    static connect() {
        this.pool = new Pool({
            host: '127.0.0.1',
            database: 'project_rewind',
            user: 'postgres',
            password: 'postgres',
            port: 5432,
            max: 10,
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
