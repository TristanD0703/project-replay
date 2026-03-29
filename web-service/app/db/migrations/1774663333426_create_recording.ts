import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
    // up migration code goes here...
    // note: up migrations are mandatory. you must implement this function.
    // For more info, see: https://kysely.dev/docs/migrations

    await db.schema
        .createTable('recording_status')
        .addColumn('id', 'uuid', (col) => col.primaryKey())
        .addColumn('status', 'text', (col) => col.notNull().defaultTo('QUEUED'))
        .addColumn('is_public', 'boolean', (col) =>
            col.notNull().defaultTo(false),
        )
        .addColumn('created_by_id', 'uuid', (col) =>
            col.notNull().references('user.id'),
        )
        .addColumn('updated_at', 'date', (col) =>
            col.notNull().defaultTo(sql`now()`),
        )
        .addColumn('created_at', 'date', (col) =>
            col.notNull().defaultTo(sql`now()`),
        )
        .execute();

    await db.schema
        .createTable('recording')
        .addColumn('id', 'uuid', (col) =>
            col
                .primaryKey()
                .references('recording_status.id')
                .onDelete('cascade'),
        )
        .addColumn('thumbnail_link', 'text', (col) => col.notNull())
        .addColumn('name', 'text')
        .addColumn('s3_path', 'text', (col) => col.notNull())
        .addColumn('recorded_by', 'uuid', (col) =>
            col.notNull().references('user.id'),
        )
        .addColumn('created_at', 'date', (col) =>
            col.notNull().defaultTo(sql`now()`),
        )
        .addColumn('updated_at', 'date', (col) =>
            col.notNull().defaultTo(sql`now()`),
        )
        .execute();

    await db.schema
        .createIndex('status_id_index')
        .on('recording_status')
        .column('id')
        .execute();

    await db.schema
        .createIndex('status_created_by_index')
        .on('recording_status')
        .column('created_by_id')
        .execute();

    await db.schema
        .createIndex('recording_id_index')
        .on('recording')
        .column('id')
        .execute();

    await db.schema
        .createIndex('recording_name_index')
        .on('recording')
        .column('name')
        .execute();
}

// `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
export async function down(db: Kysely<any>): Promise<void> {
    // down migration code goes here...
    // note: down migrations are optional. you can safely delete this function.
    // For more info, see: https://kysely.dev/docs/migrations
    await db.schema.dropTable('recording').execute();
    await db.schema.dropTable('recording_status').execute();
}
