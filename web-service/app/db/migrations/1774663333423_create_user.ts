import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
    // up migration code goes here...
    // note: up migrations are mandatory. you must implement this function.
    // For more info, see: https://kysely.dev/docs/migrations

    await db.schema
        .createTable('user')
        .addColumn('id', 'uuid', (col) => col.primaryKey())
        .addColumn('discord_id', 'text', (col) => col.notNull())
        .addColumn('discord_username', 'text', (col) => col.notNull())
        .addColumn('discord_avatar_hash', 'text')
        .addColumn('is_streamer', 'boolean', (col) =>
            col.notNull().defaultTo(false),
        )
        .addColumn('is_admin', 'boolean', (col) =>
            col.notNull().defaultTo(false),
        )
        .addColumn('stream_key', 'text')
        .addColumn('updated_at', 'date', (col) =>
            col.notNull().defaultTo(sql`now()`),
        )
        .addColumn('created_at', 'date', (col) =>
            col.notNull().defaultTo(sql`now()`),
        )
        .execute();

    await db.schema
        .createIndex('user_id_index')
        .on('user')
        .column('id')
        .execute();
}

// `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
export async function down(db: Kysely<any>): Promise<void> {
    // down migration code goes here...
    // note: down migrations are optional. you can safely delete this function.
    // For more info, see: https://kysely.dev/docs/migrations
    await db.schema.dropTable('user').execute();
}
